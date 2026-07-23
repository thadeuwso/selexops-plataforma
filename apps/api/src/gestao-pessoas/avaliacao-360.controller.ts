import { BadRequestException, Body, Controller, Get, NotFoundException, Param, Patch, Put, Req } from '@nestjs/common';
import type { Request } from 'express';
import { ZodError, z } from 'zod';
import { Permissoes, UsuarioAutenticado } from '../core/auth/autenticacao.guard';
import { PrismaService } from '../compartilhado/prisma/prisma.service';
import { resolverAvaliacao } from './nota-avaliacao';

type ReqAut = Request & { usuario: UsuarioAutenticado };

export const TIPOS_AVALIADOR = ['AUTO', 'GESTOR', 'PAR', 'LIDERADO', 'COMITE', 'CLIENTE_INTERNO'] as const;

const esquemaModelo = z.object({
  nome: z.string().min(2).max(160).optional(),
  avaliadores: z
    .array(
      z.object({
        tipo: z.enum(TIPOS_AVALIADOR),
        peso: z.coerce.number().int().min(1).max(10).default(1),
        obrigatorio: z.boolean().default(true),
      }),
    )
    .min(1),
});
const esquemaCompetenciasCargo = z.object({
  competencias: z
    .array(
      z.object({
        nome: z.string().min(1).max(160),
        nivelEsperado: z.coerce.number().int().min(1).max(5),
        criticidade: z.enum(['ALTA', 'MEDIA', 'BAIXA']).default('MEDIA'),
        descricao: z.string().max(2000).optional(),
        justificativa: z.string().max(2000).optional(),
      }),
    )
    .max(50),
});
const esquemaAtribuir = z.object({ codUsuAvaliador: z.coerce.bigint() });
const esquemaNotaPart = z.object({
  codComp: z.coerce.bigint(),
  nota: z.coerce.number().int().min(1).max(5),
  comentario: z.string().max(2000).optional(),
});

function validar<T extends z.ZodTypeAny>(esquema: T, corpo: unknown): z.infer<T> {
  try {
    return esquema.parse(corpo);
  } catch (erro) {
    if (erro instanceof ZodError) throw new BadRequestException({ mensagem: 'Dados inválidos', detalhes: erro.issues });
    throw erro;
  }
}

/**
 * Avaliação 360 configurável por cargo (performance-360, RN-GP-025).
 *
 * Config do modelo por cargo, participantes de uma avaliação (instanciados do
 * modelo ao enturmar) e as notas de cada participante. A nota final é sempre a
 * consolidação ponderada — ver `resolverAvaliacao`.
 */
@Controller('gestao-pessoas')
export class Avaliacao360Controller {
  constructor(private readonly prisma: PrismaService) {}

  // ---- Modelo 360 por cargo ----

  /** Lista cargos com o resumo do modelo 360 (para a tela de configuração). */
  @Get('modelos-360')
  @Permissoes('gestaopessoas.avaliacoes.ler')
  async listarModelos(@Req() req: ReqAut) {
    return this.prisma.executarNoTenant(req.usuario.codTen, async (tx) => {
      const cargos = await tx.cargo.findMany({
        where: { ativo: 'S' },
        orderBy: { nomeCar: 'asc' },
        select: {
          codCar: true,
          nomeCar: true,
          modelos360: {
            where: { ativo: 'S' },
            select: { codMod: true, avaliadores: { where: { ativo: 'S' }, select: { tipo: true, peso: true } } },
          },
        },
      });
      return cargos.map((c) => {
        const modelo = c.modelos360[0] ?? null;
        return {
          codCar: c.codCar,
          nomeCar: c.nomeCar,
          temModelo: !!modelo,
          tipos: modelo?.avaliadores.map((a) => a.tipo) ?? [],
        };
      });
    });
  }

  @Get('cargos/:codCar/modelo-360')
  @Permissoes('gestaopessoas.avaliacoes.ler')
  async obterModelo(@Req() req: ReqAut, @Param('codCar') codCar: string) {
    return this.prisma.executarNoTenant(req.usuario.codTen, async (tx) => {
      const cargo = await tx.cargo.findFirst({
        where: { codCar: BigInt(codCar), ativo: 'S' },
        select: { codCar: true, nomeCar: true },
      });
      if (!cargo) throw new NotFoundException('Cargo inexistente neste tenant');
      const modelo = await tx.modeloAvaliacao360.findFirst({
        where: { codCar: BigInt(codCar), ativo: 'S' },
        include: { avaliadores: { where: { ativo: 'S' }, orderBy: { codModAval: 'asc' } } },
      });
      return {
        cargo,
        modelo: modelo
          ? {
              codMod: modelo.codMod,
              nome: modelo.nome,
              avaliadores: modelo.avaliadores.map((a) => ({
                tipo: a.tipo,
                peso: a.peso,
                obrigatorio: a.obrigatorio === 'S',
              })),
            }
          : null,
      };
    });
  }

  @Put('cargos/:codCar/modelo-360')
  @Permissoes('gestaopessoas.avaliacoes.criar')
  async salvarModelo(@Req() req: ReqAut, @Param('codCar') codCar: string, @Body() corpo: unknown) {
    const dados = validar(esquemaModelo, corpo);
    return this.prisma.executarNoTenant(req.usuario.codTen, async (tx) => {
      const cargo = await tx.cargo.findFirst({ where: { codCar: BigInt(codCar), ativo: 'S' } });
      if (!cargo) throw new NotFoundException('Cargo inexistente neste tenant');

      const modelo = await tx.modeloAvaliacao360.upsert({
        where: { codTen_codCar: { codTen: req.usuario.codTen, codCar: BigInt(codCar) } },
        create: {
          codTen: req.usuario.codTen,
          codCar: BigInt(codCar),
          nome: dados.nome ?? `Modelo 360 — ${cargo.nomeCar}`,
          codUsuInc: req.usuario.codUsu,
        },
        update: { nome: dados.nome, ativo: 'S' },
      });

      const tiposInformados = new Set(dados.avaliadores.map((a) => a.tipo));
      // Upsert dos tipos informados (ativo='S').
      for (const a of dados.avaliadores) {
        await tx.modeloAvaliador360.upsert({
          where: { codMod_tipo: { codMod: modelo.codMod, tipo: a.tipo } },
          create: {
            codTen: req.usuario.codTen,
            codMod: modelo.codMod,
            tipo: a.tipo,
            peso: a.peso,
            obrigatorio: a.obrigatorio ? 'S' : 'N',
          },
          update: { peso: a.peso, obrigatorio: a.obrigatorio ? 'S' : 'N', ativo: 'S' },
        });
      }
      // Soft-remove dos tipos que saíram (sem DELETE — selx_app não tem).
      const existentes = await tx.modeloAvaliador360.findMany({ where: { codMod: modelo.codMod, ativo: 'S' } });
      for (const e of existentes) {
        if (!tiposInformados.has(e.tipo as (typeof TIPOS_AVALIADOR)[number])) {
          await tx.modeloAvaliador360.update({ where: { codModAval: e.codModAval }, data: { ativo: 'N' } });
        }
      }
      return { ok: true, codMod: modelo.codMod };
    });
  }

  // ---- Competências esperadas do cargo (role-fit) ----

  @Get('cargos/:codCar/competencias-esperadas')
  @Permissoes('gestaopessoas.avaliacoes.ler')
  async competenciasEsperadas(@Req() req: ReqAut, @Param('codCar') codCar: string) {
    return this.prisma.executarNoTenant(req.usuario.codTen, async (tx) => {
      const cargo = await tx.cargo.findFirst({ where: { codCar: BigInt(codCar), ativo: 'S' }, select: { nomeCar: true } });
      if (!cargo) throw new NotFoundException('Cargo inexistente neste tenant');
      const competencias = await tx.competenciaCargo.findMany({
        where: { codCar: BigInt(codCar), ativo: 'S' },
        orderBy: [{ ordem: 'asc' }, { codCarComp: 'asc' }],
        select: { codCarComp: true, nome: true, descricao: true, nivelEsperado: true, criticidade: true, justificativa: true },
      });
      return { cargo: { nomeCar: cargo.nomeCar }, competencias };
    });
  }

  @Put('cargos/:codCar/competencias-esperadas')
  @Permissoes('gestaopessoas.avaliacoes.criar')
  async salvarCompetenciasEsperadas(@Req() req: ReqAut, @Param('codCar') codCar: string, @Body() corpo: unknown) {
    const dados = validar(esquemaCompetenciasCargo, corpo);
    return this.prisma.executarNoTenant(req.usuario.codTen, async (tx) => {
      const cargo = await tx.cargo.findFirst({ where: { codCar: BigInt(codCar), ativo: 'S' } });
      if (!cargo) throw new NotFoundException('Cargo inexistente neste tenant');
      // Substitui o conjunto: inativa as atuais (sem DELETE) e recria as novas.
      await tx.competenciaCargo.updateMany({ where: { codCar: BigInt(codCar), ativo: 'S' }, data: { ativo: 'N' } });
      if (dados.competencias.length > 0) {
        await tx.competenciaCargo.createMany({
          data: dados.competencias.map((c, i) => ({
            codTen: req.usuario.codTen,
            codCar: BigInt(codCar),
            nome: c.nome,
            descricao: c.descricao,
            nivelEsperado: c.nivelEsperado,
            criticidade: c.criticidade,
            justificativa: c.justificativa,
            ordem: i,
            codUsuInc: req.usuario.codUsu,
          })),
        });
      }
      return { ok: true, total: dados.competencias.length };
    });
  }

  // ---- Participantes de uma avaliação ----

  @Get('avaliacoes/:codAval/participantes')
  @Permissoes('gestaopessoas.avaliacoes.ler')
  async participantes(@Req() req: ReqAut, @Param('codAval') codAval: string) {
    return this.prisma.executarNoTenant(req.usuario.codTen, async (tx) => {
      const aval = await tx.avaliacaoDesempenho.findFirst({
        where: { codAval: BigInt(codAval) },
        include: {
          ciclo: { select: { status: true, competencias: { orderBy: [{ ordem: 'asc' }, { codComp: 'asc' }], select: { codComp: true, nome: true, peso: true } } } },
          notas: { select: { codComp: true, nota: true } },
          participantes: {
            orderBy: { codAvalPart: 'asc' },
            include: { avaliador: { select: { nomeUsu: true } }, notas: { select: { codComp: true, nota: true, comentario: true } } },
          },
        },
      });
      if (!aval) throw new NotFoundException('Avaliação inexistente neste tenant');

      const resolvida = resolverAvaliacao(
        aval.ciclo.competencias,
        aval.notas,
        aval.participantes.map((p) => ({ peso: p.peso, notas: p.notas })),
      );

      return {
        codAval: aval.codAval,
        cicloStatus: aval.ciclo.status,
        modo: resolvida.modo,
        notaFinal: resolvida.notaFinal,
        competencias: aval.ciclo.competencias,
        participantes: aval.participantes.map((p) => ({
          codAvalPart: p.codAvalPart,
          tipo: p.tipo,
          peso: p.peso,
          status: p.status,
          avaliador: p.avaliador?.nomeUsu ?? null,
          codUsuAvaliador: p.codUsuAvaliador,
          notas: p.notas,
        })),
      };
    });
  }

  @Patch('participantes/:codAvalPart')
  @Permissoes('gestaopessoas.avaliacoes.criar')
  async atribuir(@Req() req: ReqAut, @Param('codAvalPart') codAvalPart: string, @Body() corpo: unknown) {
    const dados = validar(esquemaAtribuir, corpo);
    return this.prisma.executarNoTenant(req.usuario.codTen, async (tx) => {
      const part = await tx.participanteAvaliacao.findFirst({ where: { codAvalPart: BigInt(codAvalPart) } });
      if (!part) throw new NotFoundException('Participante inexistente neste tenant');
      await tx.participanteAvaliacao.update({
        where: { codAvalPart: part.codAvalPart },
        data: { codUsuAvaliador: dados.codUsuAvaliador },
      });
      return { ok: true };
    });
  }

  @Patch('participantes/:codAvalPart/notas')
  @Permissoes('gestaopessoas.avaliacoes.criar')
  async lancarNotaParticipante(@Req() req: ReqAut, @Param('codAvalPart') codAvalPart: string, @Body() corpo: unknown) {
    const dados = validar(esquemaNotaPart, corpo);
    return this.prisma.executarNoTenant(req.usuario.codTen, async (tx) => {
      const part = await tx.participanteAvaliacao.findFirst({
        where: { codAvalPart: BigInt(codAvalPart) },
        include: { avaliacao: { select: { codCiclo: true, ciclo: { select: { status: true } } } } },
      });
      if (!part) throw new NotFoundException('Participante inexistente neste tenant');
      if (part.status === 'CONCLUIDA') throw new BadRequestException('Participante já concluiu — não aceita mudança');
      if (part.avaliacao.ciclo.status !== 'ABERTO') throw new BadRequestException('Ciclo não está aberto para avaliação');

      const comp = await tx.competenciaCiclo.findFirst({ where: { codComp: dados.codComp, codCiclo: part.avaliacao.codCiclo } });
      if (!comp) throw new BadRequestException('Competência não pertence ao ciclo desta avaliação');

      const existente = await tx.notaParticipante.findFirst({ where: { codAvalPart: part.codAvalPart, codComp: dados.codComp } });
      if (existente) {
        await tx.notaParticipante.update({ where: { codNotaPart: existente.codNotaPart }, data: { nota: dados.nota, comentario: dados.comentario } });
      } else {
        await tx.notaParticipante.create({
          data: { codTen: req.usuario.codTen, codAvalPart: part.codAvalPart, codComp: dados.codComp, nota: dados.nota, comentario: dados.comentario },
        });
      }
      if (part.status === 'PENDENTE') {
        await tx.participanteAvaliacao.update({ where: { codAvalPart: part.codAvalPart }, data: { status: 'EM_ANDAMENTO' } });
      }
      return { ok: true };
    });
  }

  @Patch('participantes/:codAvalPart/concluir')
  @Permissoes('gestaopessoas.avaliacoes.criar')
  async concluirParticipante(@Req() req: ReqAut, @Param('codAvalPart') codAvalPart: string) {
    return this.prisma.executarNoTenant(req.usuario.codTen, async (tx) => {
      const part = await tx.participanteAvaliacao.findFirst({
        where: { codAvalPart: BigInt(codAvalPart) },
        include: {
          avaliacao: { select: { codCiclo: true, ciclo: { select: { competencias: { select: { codComp: true } } } } } },
          notas: { select: { codComp: true } },
        },
      });
      if (!part) throw new NotFoundException('Participante inexistente neste tenant');
      if (part.status === 'CONCLUIDA') return { ok: true, jaConcluido: true };
      // Só conclui com todas as competências avaliadas por este participante.
      if (part.notas.length < part.avaliacao.ciclo.competencias.length) {
        throw new BadRequestException('Avalie todas as competências antes de concluir');
      }
      await tx.participanteAvaliacao.update({
        where: { codAvalPart: part.codAvalPart },
        data: { status: 'CONCLUIDA', dhConclusao: new Date() },
      });
      return { ok: true };
    });
  }
}
