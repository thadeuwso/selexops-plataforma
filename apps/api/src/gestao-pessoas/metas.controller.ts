import { BadRequestException, Body, Controller, Get, NotFoundException, Param, Patch, Post, Query, Req } from '@nestjs/common';
import type { Request } from 'express';
import { ZodError, z } from 'zod';
import { Permissoes, UsuarioAutenticado } from '../core/auth/autenticacao.guard';
import { PrismaService } from '../compartilhado/prisma/prisma.service';
import { metaEmRisco, resumoMetas, statusDaMeta } from './metas';

type ReqAut = Request & { usuario: UsuarioAutenticado };

const esquemaMeta = z.object({
  codFun: z.coerce.bigint(),
  titulo: z.string().min(2).max(200),
  descricao: z.string().max(4000).optional(),
  peso: z.coerce.number().int().min(1).max(10).default(1),
  prazo: z.coerce.date().optional(),
  impactoAvaliacao: z.string().max(400).optional(),
  codCiclo: z.coerce.bigint().optional(),
  codPdi: z.coerce.bigint().optional(),
});
const esquemaMetaPatch = z.object({
  titulo: z.string().min(2).max(200).optional(),
  descricao: z.string().max(4000).nullish(),
  peso: z.coerce.number().int().min(1).max(10).optional(),
  prazo: z.coerce.date().nullish(),
  impactoAvaliacao: z.string().max(400).nullish(),
  resultado: z.string().max(4000).nullish(),
});
const esquemaProgresso = z.object({
  progresso: z.coerce.number().int().min(0).max(100),
  comentario: z.string().max(2000).optional(),
  evidencia: z.string().max(400).optional(),
});
const esquemaAcao = z.object({ acao: z.enum(['CONCLUIR', 'REABRIR', 'CANCELAR']) });

function validar<T extends z.ZodTypeAny>(esquema: T, corpo: unknown): z.infer<T> {
  try {
    return esquema.parse(corpo);
  } catch (erro) {
    if (erro instanceof ZodError) throw new BadRequestException({ mensagem: 'Dados inválidos', detalhes: erro.issues });
    throw erro;
  }
}

/**
 * Metas do colaborador (performance-360, RN-GP-029). Status derivado; progresso
 * com trilha imutável (ProgressoMeta). Acompanhadas ao lado da nota — não a
 * alteram nesta leva.
 */
@Controller('gestao-pessoas/metas')
export class MetasController {
  constructor(private readonly prisma: PrismaService) {}

  /** Metas de um funcionário + resumo (contadores e progresso ponderado). */
  @Get()
  @Permissoes('gestaopessoas.avaliacoes.ler')
  async listar(@Req() req: ReqAut, @Query('codFun') codFun?: string) {
    if (!codFun) throw new BadRequestException('Informe o funcionário (codFun)');
    return this.prisma.executarNoTenant(req.usuario.codTen, async (tx) => {
      const metas = await tx.meta.findMany({
        where: { codFun: BigInt(codFun) },
        orderBy: { codMeta: 'desc' },
        include: { responsavel: { select: { nomeUsu: true } } },
      });
      const hoje = new Date();
      const itens = metas.map((m) => ({
        codMeta: m.codMeta,
        titulo: m.titulo,
        descricao: m.descricao,
        peso: m.peso,
        prazo: m.prazo,
        progresso: m.progresso,
        cancelada: m.cancelada === 'S',
        impactoAvaliacao: m.impactoAvaliacao,
        resultado: m.resultado,
        responsavel: m.responsavel?.nomeUsu ?? null,
        status: statusDaMeta({ progresso: m.progresso, prazo: m.prazo, cancelada: m.cancelada === 'S' }, hoje),
        emRisco: metaEmRisco({ progresso: m.progresso, prazo: m.prazo, cancelada: m.cancelada === 'S' }, hoje),
      }));
      const resumo = resumoMetas(
        metas.map((m) => ({ progresso: m.progresso, prazo: m.prazo, cancelada: m.cancelada === 'S', peso: m.peso })),
        hoje,
      );
      return { itens, resumo };
    });
  }

  /** Detalhe de uma meta com a trilha de progresso. */
  @Get(':codMeta')
  @Permissoes('gestaopessoas.avaliacoes.ler')
  async detalhar(@Req() req: ReqAut, @Param('codMeta') codMeta: string) {
    return this.prisma.executarNoTenant(req.usuario.codTen, async (tx) => {
      const m = await tx.meta.findFirst({
        where: { codMeta: BigInt(codMeta) },
        include: {
          responsavel: { select: { nomeUsu: true } },
          progressos: { orderBy: { codMetaProg: 'desc' } },
        },
      });
      if (!m) throw new NotFoundException('Meta inexistente neste tenant');
      const hoje = new Date();
      return {
        codMeta: m.codMeta,
        titulo: m.titulo,
        descricao: m.descricao,
        peso: m.peso,
        prazo: m.prazo,
        progresso: m.progresso,
        cancelada: m.cancelada === 'S',
        impactoAvaliacao: m.impactoAvaliacao,
        resultado: m.resultado,
        responsavel: m.responsavel?.nomeUsu ?? null,
        status: statusDaMeta({ progresso: m.progresso, prazo: m.prazo, cancelada: m.cancelada === 'S' }, hoje),
        progressos: m.progressos.map((p) => ({ progresso: p.progresso, comentario: p.comentario, evidencia: p.evidencia, dhInc: p.dhInc })),
      };
    });
  }

  @Post()
  @Permissoes('gestaopessoas.avaliacoes.criar')
  async criar(@Req() req: ReqAut, @Body() corpo: unknown) {
    const dados = validar(esquemaMeta, corpo);
    return this.prisma.executarNoTenant(req.usuario.codTen, async (tx) => {
      const func = await tx.funcionario.findFirst({ where: { codFun: dados.codFun, ativo: 'S' } });
      if (!func) throw new BadRequestException('Funcionário inexistente neste tenant');
      return tx.meta.create({
        data: {
          codTen: req.usuario.codTen,
          codFun: dados.codFun,
          titulo: dados.titulo,
          descricao: dados.descricao,
          peso: dados.peso,
          prazo: dados.prazo,
          impactoAvaliacao: dados.impactoAvaliacao,
          codCiclo: dados.codCiclo,
          codPdi: dados.codPdi,
          codUsuInc: req.usuario.codUsu,
        },
      });
    });
  }

  @Patch(':codMeta')
  @Permissoes('gestaopessoas.avaliacoes.criar')
  async editar(@Req() req: ReqAut, @Param('codMeta') codMeta: string, @Body() corpo: unknown) {
    const dados = validar(esquemaMetaPatch, corpo);
    return this.prisma.executarNoTenant(req.usuario.codTen, async (tx) => {
      const m = await tx.meta.findFirst({ where: { codMeta: BigInt(codMeta) } });
      if (!m) throw new NotFoundException('Meta inexistente neste tenant');
      await tx.meta.update({ where: { codMeta: m.codMeta }, data: dados });
      return { ok: true };
    });
  }

  /** Atualiza o progresso: registra a trilha (ProgressoMeta) e move o atual. */
  @Post(':codMeta/progresso')
  @Permissoes('gestaopessoas.avaliacoes.criar')
  async registrarProgresso(@Req() req: ReqAut, @Param('codMeta') codMeta: string, @Body() corpo: unknown) {
    const dados = validar(esquemaProgresso, corpo);
    return this.prisma.executarNoTenant(req.usuario.codTen, async (tx) => {
      const m = await tx.meta.findFirst({ where: { codMeta: BigInt(codMeta) } });
      if (!m) throw new NotFoundException('Meta inexistente neste tenant');
      if (m.cancelada === 'S') throw new BadRequestException('Meta cancelada não recebe progresso');
      await tx.progressoMeta.create({
        data: { codTen: req.usuario.codTen, codMeta: m.codMeta, progresso: dados.progresso, comentario: dados.comentario, evidencia: dados.evidencia, codUsuInc: req.usuario.codUsu },
      });
      await tx.meta.update({ where: { codMeta: m.codMeta }, data: { progresso: dados.progresso } });
      return { ok: true };
    });
  }

  /** Concluir (progresso 100), reabrir (volta a andamento) ou cancelar. */
  @Patch(':codMeta/acao')
  @Permissoes('gestaopessoas.avaliacoes.criar')
  async acaoMeta(@Req() req: ReqAut, @Param('codMeta') codMeta: string, @Body() corpo: unknown) {
    const { acao } = validar(esquemaAcao, corpo);
    return this.prisma.executarNoTenant(req.usuario.codTen, async (tx) => {
      const m = await tx.meta.findFirst({ where: { codMeta: BigInt(codMeta) } });
      if (!m) throw new NotFoundException('Meta inexistente neste tenant');
      if (acao === 'CONCLUIR') {
        await tx.progressoMeta.create({ data: { codTen: req.usuario.codTen, codMeta: m.codMeta, progresso: 100, comentario: 'Concluída', codUsuInc: req.usuario.codUsu } });
        await tx.meta.update({ where: { codMeta: m.codMeta }, data: { progresso: 100, cancelada: 'N' } });
      } else if (acao === 'REABRIR') {
        await tx.meta.update({ where: { codMeta: m.codMeta }, data: { progresso: m.progresso >= 100 ? 90 : m.progresso, cancelada: 'N' } });
      } else {
        await tx.meta.update({ where: { codMeta: m.codMeta }, data: { cancelada: 'S' } });
      }
      return { ok: true };
    });
  }
}
