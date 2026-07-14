import { BadRequestException, Body, Controller, Get, Param, Patch, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import { ZodError, z } from 'zod';
import { Permissoes, UsuarioAutenticado } from '../core/auth/autenticacao.guard';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../compartilhado/prisma/prisma.service';

export const ESTAGIOS = [
  'applied', 'screening', 'analysis', 'knockout', 'shortlist', 'interview',
  'offer', 'approved', 'not_selected', 'rejected', 'hired', 'archived',
] as const;

const esquemaCanal = z.object({
  nomeCanal: z.string().min(2),
  tipoCanal: z.enum(['conector', 'importacao', 'manual']).default('manual'),
  vlrCustoMes: z.coerce.number().min(0).optional(),
});

const esquemaCandidato = z.object({
  nomeCand: z.string().min(2),
  email: z.string().email(),
  fone: z.string().optional(),
  cgc: z.string().optional(),
  linkedin: z.string().optional(),
  cidade: z.string().optional(),
});

const esquemaCandidatura = z.object({
  candidato: esquemaCandidato,
  codCanal: z.coerce.bigint(),
  idExterno: z.string().optional(),
  respostas: z.record(z.string(), z.unknown()).optional(),
});

function validar<T extends z.ZodTypeAny>(esquema: T, corpo: unknown): z.infer<T> {
  try {
    return esquema.parse(corpo);
  } catch (erro) {
    if (erro instanceof ZodError) {
      throw new BadRequestException({ mensagem: 'Dados inválidos', detalhes: erro.issues });
    }
    throw erro;
  }
}

type ReqAut = Request & { usuario: UsuarioAutenticado };
type Tx = Parameters<Parameters<PrismaService['executarNoTenant']>[1]>[0];

/** Dedup de candidato por e-mail (e CPF quando houver) no tenant — RN-REC-009. */
async function upsertCandidato(
  tx: Tx,
  codTen: bigint,
  codUsu: bigint,
  dados: z.infer<typeof esquemaCandidato>,
) {
  const email = dados.email.toLowerCase();
  const existente = await tx.candidato.findFirst({
    where: {
      OR: [{ email }, ...(dados.cgc ? [{ cgc: dados.cgc }] : [])],
      ativo: 'S',
    },
  });
  if (existente) {
    return {
      candidato: await tx.candidato.update({
        where: { codCand: existente.codCand },
        data: {
          nomeCand: dados.nomeCand,
          fone: dados.fone ?? existente.fone,
          cgc: dados.cgc ?? existente.cgc,
          linkedin: dados.linkedin ?? existente.linkedin,
          cidade: dados.cidade ?? existente.cidade,
          codUsuAlt: codUsu,
        },
      }),
      deduplicado: true,
    };
  }
  return {
    candidato: await tx.candidato.create({
      data: { codTen, ...dados, email, codUsuInc: codUsu },
    }),
    deduplicado: false,
  };
}

@Controller()
export class CandidatosController {
  constructor(private readonly prisma: PrismaService) {}

  // ===== Canais de captação =====
  @Get('canais')
  @Permissoes('recrutamento.candidatos.ler')
  listarCanais(@Req() req: ReqAut) {
    return this.prisma.executarNoTenant(req.usuario.codTen, (tx) =>
      tx.canal.findMany({ where: { ativo: 'S' }, orderBy: { codCanal: 'asc' } }),
    );
  }

  @Post('canais')
  @Permissoes('recrutamento.candidatos.criar')
  criarCanal(@Req() req: ReqAut, @Body() corpo: unknown) {
    const dados = validar(esquemaCanal, corpo);
    return this.prisma.executarNoTenant(req.usuario.codTen, (tx) =>
      tx.canal.create({
        data: { codTen: req.usuario.codTen, ...dados, codUsuInc: req.usuario.codUsu },
      }),
    );
  }

  // ===== Banco de talentos =====
  @Get('candidatos')
  @Permissoes('recrutamento.candidatos.ler')
  listarCandidatos(@Req() req: ReqAut) {
    return this.prisma.executarNoTenant(req.usuario.codTen, (tx) =>
      tx.candidato.findMany({
        where: { ativo: 'S' },
        orderBy: { codCand: 'desc' },
        select: {
          codCand: true,
          nomeCand: true,
          email: true,
          fone: true,
          cidade: true,
          dhInc: true,
          _count: { select: { candidaturas: true } },
        },
      }),
    );
  }

  /** Cadastro rápido com dedup por e-mail/CPF (RN-REC-009). */
  @Post('candidatos')
  @Permissoes('recrutamento.candidatos.criar')
  criarCandidato(@Req() req: ReqAut, @Body() corpo: unknown) {
    const dados = validar(esquemaCandidato, corpo);
    return this.prisma.executarNoTenant(req.usuario.codTen, async (tx) => {
      const { candidato, deduplicado } = await upsertCandidato(
        tx, req.usuario.codTen, req.usuario.codUsu, dados,
      );
      return { codCand: candidato.codCand, nomeCand: candidato.nomeCand, deduplicado };
    });
  }

  // ===== Candidaturas =====
  /** Registra candidatura: dedup de candidato + única por vaga+candidato + idempotência por canal+idExterno. */
  @Post('vagas/:codVag/candidaturas')
  @Permissoes('recrutamento.candidatos.criar')
  candidatar(@Req() req: ReqAut, @Param('codVag') codVag: string, @Body() corpo: unknown) {
    const dados = validar(esquemaCandidatura, corpo);
    return this.prisma.executarNoTenant(req.usuario.codTen, async (tx) => {
      const vaga = await tx.vaga.findFirst({ where: { codVag: BigInt(codVag), ativo: 'S' } });
      if (!vaga) throw new BadRequestException('Vaga inexistente neste tenant');
      if (vaga.status !== 'ABERTA') {
        throw new BadRequestException(`Vaga ${vaga.status} não recebe candidaturas`);
      }
      const canal = await tx.canal.findFirst({ where: { codCanal: dados.codCanal, ativo: 'S' } });
      if (!canal) throw new BadRequestException('Canal de captação inexistente');

      // Idempotência por (canal, idExterno) — RN-REC-009
      if (dados.idExterno) {
        const repetida = await tx.candidatura.findFirst({
          where: { codCanal: dados.codCanal, idExterno: dados.idExterno },
        });
        if (repetida) return { codCdt: repetida.codCdt, estagio: repetida.estagio, idempotente: true };
      }

      const { candidato } = await upsertCandidato(
        tx, req.usuario.codTen, req.usuario.codUsu, dados.candidato,
      );

      // Única por vaga+candidato — reentrada atualiza origem (RN-REC-003)
      const existente = await tx.candidatura.findUnique({
        where: { codVag_codCand: { codVag: vaga.codVag, codCand: candidato.codCand } },
      });
      if (existente) {
        await tx.candidaturaHistorico.create({
          data: {
            codTen: req.usuario.codTen,
            codCdt: existente.codCdt,
            tipoEvento: 'reentrada_canal',
            metadadosJson: { codCanal: dados.codCanal.toString(), idExterno: dados.idExterno ?? null },
            tipoAtor: 'usuario',
            codUsuInc: req.usuario.codUsu,
          },
        });
        return { codCdt: existente.codCdt, estagio: existente.estagio, reentrada: true };
      }

      const candidatura = await tx.candidatura.create({
        data: {
          codTen: req.usuario.codTen,
          codVag: vaga.codVag,
          codCand: candidato.codCand,
          codCanal: dados.codCanal,
          idExterno: dados.idExterno,
          respostasJson: (dados.respostas as Prisma.InputJsonValue) ?? undefined,
          codUsuInc: req.usuario.codUsu,
        },
      });
      await tx.candidaturaHistorico.create({
        data: {
          codTen: req.usuario.codTen,
          codCdt: candidatura.codCdt,
          tipoEvento: 'candidatura_recebida',
          estagioNovo: 'applied',
          rotuloPub: 'Candidatura recebida',
          tipoAtor: 'usuario',
          metadadosJson: { canal: canal.nomeCanal },
          codUsuInc: req.usuario.codUsu,
        },
      });
      return { codCdt: candidatura.codCdt, codCand: candidato.codCand, estagio: 'applied' };
    });
  }

  @Get('vagas/:codVag/candidaturas')
  @Permissoes('recrutamento.candidatos.ler')
  listarCandidaturas(@Req() req: ReqAut, @Param('codVag') codVag: string) {
    return this.prisma.executarNoTenant(req.usuario.codTen, (tx) =>
      tx.candidatura.findMany({
        where: { codVag: BigInt(codVag), ativo: 'S' },
        orderBy: { codCdt: 'asc' },
        select: {
          codCdt: true,
          estagio: true,
          dhInc: true,
          candidato: { select: { codCand: true, nomeCand: true, email: true, cidade: true } },
          canal: { select: { nomeCanal: true } },
          match: { select: { scoreGeral: true } },
        },
      }),
    );
  }

  /** Move a candidatura de estágio, gravando a timeline (RN-REC-005). Transições são humanas. */
  @Patch('candidaturas/:codCdt/estagio')
  @Permissoes('recrutamento.candidatos.criar')
  moverEstagio(@Req() req: ReqAut, @Param('codCdt') codCdt: string, @Body() corpo: unknown) {
    const dados = validar(
      z.object({ estagio: z.enum(ESTAGIOS), nota: z.string().optional() }),
      corpo,
    );
    return this.prisma.executarNoTenant(req.usuario.codTen, async (tx) => {
      const cdt = await tx.candidatura.findFirst({ where: { codCdt: BigInt(codCdt), ativo: 'S' } });
      if (!cdt) throw new BadRequestException('Candidatura inexistente neste tenant');
      if (cdt.estagio === dados.estagio) return { codCdt: cdt.codCdt, estagio: cdt.estagio };

      const atualizada = await tx.candidatura.update({
        where: { codCdt: cdt.codCdt },
        data: { estagio: dados.estagio, codUsuAlt: req.usuario.codUsu },
        select: { codCdt: true, estagio: true },
      });
      await tx.candidaturaHistorico.create({
        data: {
          codTen: req.usuario.codTen,
          codCdt: cdt.codCdt,
          tipoEvento: 'mudanca_estagio',
          estagioAnt: cdt.estagio,
          estagioNovo: dados.estagio,
          notaInterna: dados.nota,
          tipoAtor: 'usuario',
          codUsuInc: req.usuario.codUsu,
        },
      });
      return atualizada;
    });
  }

  @Get('candidaturas/:codCdt/timeline')
  @Permissoes('recrutamento.candidatos.ler')
  timeline(@Req() req: ReqAut, @Param('codCdt') codCdt: string) {
    return this.prisma.executarNoTenant(req.usuario.codTen, (tx) =>
      tx.candidaturaHistorico.findMany({
        where: { codCdt: BigInt(codCdt) },
        orderBy: { codCdtHis: 'asc' },
      }),
    );
  }
}
