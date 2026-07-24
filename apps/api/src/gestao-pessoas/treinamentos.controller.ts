import { BadRequestException, Body, Controller, Get, NotFoundException, Param, Patch, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import { ZodError, z } from 'zod';
import { Permissoes, UsuarioAutenticado } from '../core/auth/autenticacao.guard';
import { PrismaService } from '../compartilhado/prisma/prisma.service';
import { calcularVencimento, resumoTreinamentos, statusMatricula } from './treinamentos';

type ReqAut = Request & { usuario: UsuarioAutenticado };

const TIPOS = ['CURSO', 'PALESTRA', 'CERTIFICACAO', 'LEITURA', 'MENTORIA', 'WORKSHOP', 'OUTRO'] as const;
const ORIGENS = ['OBRIGATORIO', 'GESTOR', 'RH', 'IA', 'INTERESSE'] as const;

const esquemaTreino = z.object({
  nome: z.string().min(2).max(200),
  descricao: z.string().max(4000).optional(),
  tipo: z.enum(TIPOS).default('CURSO'),
  competencia: z.string().max(160).optional(),
  cargaHoraria: z.coerce.number().int().min(0).max(10000).optional(),
  obrigatorio: z.boolean().default(false),
  validadeMeses: z.coerce.number().int().min(1).max(600).optional(),
});
const esquemaMatricular = z.object({
  codTreino: z.coerce.bigint(),
  origem: z.enum(ORIGENS).default('GESTOR'),
  justificativa: z.string().max(2000).optional(),
  codPdi: z.coerce.bigint().optional(),
});
const esquemaMatriculaPatch = z.object({
  status: z.enum(['RECOMENDADO', 'PENDENTE', 'EM_ANDAMENTO', 'CONCLUIDO', 'CANCELADO']).optional(),
  progresso: z.coerce.number().int().min(0).max(100).optional(),
  certificado: z.string().max(400).nullish(),
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
 * Treinamentos (performance-360, RN-GP-030): catálogo + matrículas do colaborador.
 * A IA/gestor recomenda (status RECOMENDADO); ninguém é matriculado sem aceitar.
 */
@Controller('gestao-pessoas')
export class TreinamentosController {
  constructor(private readonly prisma: PrismaService) {}

  // ---- Catálogo ----

  @Get('treinamentos')
  @Permissoes('gestaopessoas.avaliacoes.ler')
  async catalogo(@Req() req: ReqAut) {
    return this.prisma.executarNoTenant(req.usuario.codTen, (tx) =>
      tx.treinamento.findMany({
        where: { ativo: 'S' },
        orderBy: { nome: 'asc' },
        select: { codTreino: true, nome: true, descricao: true, tipo: true, competencia: true, cargaHoraria: true, obrigatorio: true, validadeMeses: true },
      }),
    );
  }

  @Post('treinamentos')
  @Permissoes('gestaopessoas.avaliacoes.criar')
  criarTreino(@Req() req: ReqAut, @Body() corpo: unknown) {
    const dados = validar(esquemaTreino, corpo);
    return this.prisma.executarNoTenant(req.usuario.codTen, (tx) =>
      tx.treinamento.create({
        data: {
          codTen: req.usuario.codTen,
          nome: dados.nome,
          descricao: dados.descricao,
          tipo: dados.tipo,
          competencia: dados.competencia,
          cargaHoraria: dados.cargaHoraria,
          obrigatorio: dados.obrigatorio ? 'S' : 'N',
          validadeMeses: dados.validadeMeses,
          codUsuInc: req.usuario.codUsu,
        },
      }),
    );
  }

  @Patch('treinamentos/:codTreino')
  @Permissoes('gestaopessoas.avaliacoes.criar')
  async editarTreino(@Req() req: ReqAut, @Param('codTreino') codTreino: string, @Body() corpo: unknown) {
    const dados = validar(esquemaTreino.partial(), corpo);
    return this.prisma.executarNoTenant(req.usuario.codTen, async (tx) => {
      const t = await tx.treinamento.findFirst({ where: { codTreino: BigInt(codTreino), ativo: 'S' } });
      if (!t) throw new NotFoundException('Treinamento inexistente neste tenant');
      await tx.treinamento.update({
        where: { codTreino: t.codTreino },
        data: {
          nome: dados.nome,
          descricao: dados.descricao,
          tipo: dados.tipo,
          competencia: dados.competencia,
          cargaHoraria: dados.cargaHoraria,
          obrigatorio: dados.obrigatorio === undefined ? undefined : dados.obrigatorio ? 'S' : 'N',
          validadeMeses: dados.validadeMeses,
        },
      });
      return { ok: true };
    });
  }

  @Patch('treinamentos/:codTreino/remover')
  @Permissoes('gestaopessoas.avaliacoes.criar')
  async removerTreino(@Req() req: ReqAut, @Param('codTreino') codTreino: string) {
    return this.prisma.executarNoTenant(req.usuario.codTen, async (tx) => {
      const t = await tx.treinamento.findFirst({ where: { codTreino: BigInt(codTreino) } });
      if (!t) throw new NotFoundException('Treinamento inexistente neste tenant');
      await tx.treinamento.update({ where: { codTreino: t.codTreino }, data: { ativo: 'N' } });
      return { ok: true };
    });
  }

  // ---- Matrículas do colaborador ----

  @Get('colaboradores/:codFun/treinamentos')
  @Permissoes('gestaopessoas.avaliacoes.ler')
  async doColaborador(@Req() req: ReqAut, @Param('codFun') codFunParam: string) {
    const codFun = BigInt(codFunParam);
    return this.prisma.executarNoTenant(req.usuario.codTen, async (tx) => {
      const hoje = new Date();
      const [matriculas, catalogo] = await Promise.all([
        tx.matriculaTreinamento.findMany({
          where: { codFun },
          orderBy: { codMat: 'desc' },
          include: { treinamento: { select: { nome: true, tipo: true, competencia: true, cargaHoraria: true, obrigatorio: true } } },
        }),
        tx.treinamento.findMany({ where: { ativo: 'S', obrigatorio: 'S' }, select: { codTreino: true, nome: true, competencia: true } }),
      ]);

      const itens = matriculas.map((m) => ({
        codMat: m.codMat,
        codTreino: m.codTreino,
        nome: m.treinamento.nome,
        tipo: m.treinamento.tipo,
        competencia: m.treinamento.competencia,
        cargaHoraria: m.treinamento.cargaHoraria,
        obrigatorio: m.treinamento.obrigatorio === 'S',
        origem: m.origem,
        progresso: m.progresso,
        dtConclusao: m.dtConclusao,
        dtVencimento: m.dtVencimento,
        certificado: m.certificado,
        status: statusMatricula({ status: m.status, dtVencimento: m.dtVencimento }, hoje),
      }));
      const resumo = resumoTreinamentos(
        matriculas.map((m) => ({ status: m.status, dtVencimento: m.dtVencimento, cargaHoraria: m.treinamento.cargaHoraria })),
        hoje,
      );

      // Sugestões por regra: obrigatórios que o colaborador ainda não tem matrícula viva.
      const comMatricula = new Set(
        matriculas.filter((m) => m.status !== 'CANCELADO').map((m) => m.codTreino.toString()),
      );
      const sugestoes = catalogo
        .filter((t) => !comMatricula.has(t.codTreino.toString()))
        .map((t) => ({ codTreino: t.codTreino, nome: t.nome, competencia: t.competencia, origem: 'OBRIGATORIO' as const }));

      return { itens, resumo, sugestoes };
    });
  }

  @Post('colaboradores/:codFun/treinamentos')
  @Permissoes('gestaopessoas.avaliacoes.criar')
  async matricular(@Req() req: ReqAut, @Param('codFun') codFunParam: string, @Body() corpo: unknown) {
    const codFun = BigInt(codFunParam);
    const dados = validar(esquemaMatricular, corpo);
    return this.prisma.executarNoTenant(req.usuario.codTen, async (tx) => {
      const func = await tx.funcionario.findFirst({ where: { codFun, ativo: 'S' } });
      if (!func) throw new BadRequestException('Colaborador inexistente neste tenant');
      const treino = await tx.treinamento.findFirst({ where: { codTreino: dados.codTreino, ativo: 'S' } });
      if (!treino) throw new BadRequestException('Treinamento inexistente neste tenant');
      // IA nunca matricula direto: entra como RECOMENDADO. Os demais entram PENDENTE.
      const status = dados.origem === 'IA' ? 'RECOMENDADO' : 'PENDENTE';
      return tx.matriculaTreinamento.create({
        data: {
          codTen: req.usuario.codTen,
          codFun,
          codTreino: dados.codTreino,
          status,
          origem: dados.origem,
          justificativa: dados.justificativa,
          codPdi: dados.codPdi,
          codUsuInc: req.usuario.codUsu,
        },
      });
    });
  }

  @Patch('matriculas/:codMat')
  @Permissoes('gestaopessoas.avaliacoes.criar')
  async atualizarMatricula(@Req() req: ReqAut, @Param('codMat') codMat: string, @Body() corpo: unknown) {
    const dados = validar(esquemaMatriculaPatch, corpo);
    return this.prisma.executarNoTenant(req.usuario.codTen, async (tx) => {
      const m = await tx.matriculaTreinamento.findFirst({
        where: { codMat: BigInt(codMat) },
        include: { treinamento: { select: { validadeMeses: true } } },
      });
      if (!m) throw new NotFoundException('Matrícula inexistente neste tenant');

      const data: {
        status?: string;
        progresso?: number;
        certificado?: string | null;
        dtInicio?: Date;
        dtConclusao?: Date | null;
        dtVencimento?: Date | null;
      } = { certificado: dados.certificado ?? undefined, progresso: dados.progresso };

      if (dados.status) {
        data.status = dados.status;
        if (dados.status === 'EM_ANDAMENTO' && !m.dtInicio) data.dtInicio = new Date();
        if (dados.status === 'CONCLUIDO') {
          const hoje = new Date();
          data.progresso = 100;
          data.dtConclusao = hoje;
          data.dtVencimento = calcularVencimento(hoje, m.treinamento.validadeMeses);
        }
      } else if (dados.progresso !== undefined && dados.progresso > 0 && m.status === 'PENDENTE') {
        data.status = 'EM_ANDAMENTO';
        if (!m.dtInicio) data.dtInicio = new Date();
      }

      await tx.matriculaTreinamento.update({ where: { codMat: m.codMat }, data });
      return { ok: true };
    });
  }
}
