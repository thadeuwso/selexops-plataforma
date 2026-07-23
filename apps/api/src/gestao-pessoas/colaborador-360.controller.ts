import { BadRequestException, Controller, Get, Param, Query, Req } from '@nestjs/common';
import type { Request } from 'express';
import { Permissoes, UsuarioAutenticado } from '../core/auth/autenticacao.guard';
import { PrismaService } from '../compartilhado/prisma/prisma.service';
import { notaFinal } from './avaliacao-desempenho';
import { progressoDoPlano } from './pdi';
import { calcularAderencia } from './aderencia';

type ReqAut = Request & { usuario: UsuarioAutenticado };

/**
 * Painel 360 do Colaborador (performance-360, Fase 3 — estrutura base).
 *
 * Agregador ENXUTO do topo do painel: cabeçalho do colaborador, ciclo atual,
 * nota da avaliação, contadores de PDI/feedback e aderência. Só compõe dados
 * que JÁ existem — nenhuma entidade nova nesta fase. As abas pesadas carregam
 * sob demanda pelos endpoints de domínio (fases seguintes).
 *
 * Consultas em paralelo (Promise.all) para não empilhar latência.
 */
@Controller('gestao-pessoas/colaboradores')
export class Colaborador360Controller {
  constructor(private readonly prisma: PrismaService) {}

  @Get(':codFun/360')
  @Permissoes('gestaopessoas.avaliacoes.ler')
  async painel360(
    @Req() req: ReqAut,
    @Param('codFun') codFunParam: string,
    @Query('cicloId') cicloIdParam?: string,
  ) {
    const codFun = BigInt(codFunParam);
    return this.prisma.executarNoTenant(req.usuario.codTen, async (tx) => {
      const funcionario = await tx.funcionario.findFirst({
        where: { codFun, ativo: 'S' },
        select: {
          codFun: true,
          nomeFun: true,
          numCad: true,
          dtAdm: true,
          situacao: true,
          empresa: { select: { nomeFantasia: true } },
          cargo: { select: { nomeCar: true } },
          departamento: { select: { codDep: true, descrDep: true } },
        },
      });
      if (!funcionario) throw new BadRequestException('Colaborador inexistente neste tenant');

      // Avaliação de desempenho a exibir: do ciclo pedido, senão a mais recente.
      const avaliacao = await tx.avaliacaoDesempenho.findFirst({
        where: { codFun, ...(cicloIdParam ? { codCiclo: BigInt(cicloIdParam) } : {}) },
        orderBy: { codAval: 'desc' },
        select: {
          codAval: true,
          status: true,
          dhConclusao: true,
          avaliador: { select: { nomeUsu: true } },
          ciclo: {
            select: {
              codCiclo: true,
              nome: true,
              dtInicio: true,
              dtFim: true,
              status: true,
              competencias: { select: { codComp: true, peso: true } },
            },
          },
          notas: { select: { codComp: true, nota: true } },
        },
      });

      // Ciclo anterior concluído (para a tendência) — o segundo mais recente.
      const [planos, feedbacks, avaliacoesConcluidas] = await Promise.all([
        tx.planoDesenvolvimento.findMany({
          where: { codFun, status: 'ATIVO' },
          select: { acoes: { select: { status: true, progresso: true, prazo: true } } },
        }),
        tx.feedback.findMany({
          where: { codFun },
          select: { tipo: true, cienteFun: true },
        }),
        tx.avaliacaoDesempenho.findMany({
          where: { codFun, status: 'CONCLUIDA' },
          orderBy: { codAval: 'desc' },
          take: 2,
          select: {
            ciclo: { select: { nome: true, competencias: { select: { codComp: true, peso: true } } } },
            notas: { select: { codComp: true, nota: true } },
          },
        }),
      ]);

      const notaDe = (
        comps: { codComp: bigint; peso: number }[],
        notas: { codComp: bigint; nota: number }[],
      ) => {
        const pesos = new Map(comps.map((c) => [c.codComp.toString(), c.peso]));
        return notaFinal(notas.map((n) => ({ nota: n.nota, peso: pesos.get(n.codComp.toString()) ?? 1 })));
      };

      const notaAtual = avaliacao ? notaDe(avaliacao.ciclo.competencias, avaliacao.notas) : null;
      const notas2 = avaliacoesConcluidas.map((a) => notaDe(a.ciclo.competencias, a.notas));
      const notaAnterior = notas2.length >= 2 ? notas2[1] : null;
      const tendencia =
        notaAtual !== null && notaAnterior !== null
          ? Math.round((notaAtual - notaAnterior) * 10) / 10
          : null;

      // Sinais de aderência (reusa a regra pura; sinais coletados aqui).
      const hoje = new Date();
      const progressos = planos.map((p) => progressoDoPlano(p.acoes));
      const progressoMedio =
        progressos.length === 0
          ? null
          : Math.round(progressos.reduce((s, n) => s + n, 0) / progressos.length);
      const acoesAtrasadas = planos.reduce(
        (soma, p) =>
          soma +
          p.acoes.filter((a) => a.prazo && a.prazo < hoje && a.status !== 'CONCLUIDA' && a.status !== 'CANCELADA')
            .length,
        0,
      );
      const feedbacksSemCiencia = feedbacks.filter(
        (f) => f.tipo === 'CONSTRUTIVO' && f.cienteFun !== 'S',
      ).length;
      const aderencia = calcularAderencia({
        planosAtivos: planos.length,
        progressoMedio,
        acoesAtrasadas,
        feedbacksConstrutivosSemCiencia: feedbacksSemCiencia,
        ultimaNotaDesempenho: notas2[0] ?? null,
      });

      const acoesPendentes = planos.reduce(
        (s, p) => s + p.acoes.filter((a) => a.status !== 'CONCLUIDA' && a.status !== 'CANCELADA').length,
        0,
      );

      return {
        colaborador: {
          codFun: funcionario.codFun,
          nome: funcionario.nomeFun,
          numCad: funcionario.numCad,
          cargo: funcionario.cargo?.nomeCar ?? null,
          departamento: funcionario.departamento?.descrDep ?? null,
          empresa: funcionario.empresa?.nomeFantasia ?? null,
          dtAdm: funcionario.dtAdm,
          situacao: funcionario.situacao,
        },
        avaliacao: avaliacao
          ? {
              codAval: avaliacao.codAval,
              status: avaliacao.status,
              dhConclusao: avaliacao.dhConclusao,
              avaliador: avaliacao.avaliador?.nomeUsu ?? null,
              notaAtual,
              notaAnterior,
              tendencia,
              competenciasComNota: avaliacao.notas.length,
              totalCompetencias: avaliacao.ciclo.competencias.length,
              ciclo: {
                codCiclo: avaliacao.ciclo.codCiclo,
                nome: avaliacao.ciclo.nome,
                dtInicio: avaliacao.ciclo.dtInicio,
                dtFim: avaliacao.ciclo.dtFim,
                status: avaliacao.ciclo.status,
              },
            }
          : null,
        resumo: {
          planosAtivos: planos.length,
          acoesPendentes,
          feedbacks: feedbacks.length,
          feedbacksSemCiencia,
        },
        aderencia,
      };
    });
  }
}
