/**
 * Regras puras das metas (performance-360, Fase 6). Testáveis sem banco.
 *
 * O status é **derivado** de progresso + prazo + cancelamento — nunca um campo à
 * parte que pudesse contradizer o progresso (mesmo princípio do PDI). "Concluir"
 * é levar o progresso a 100; "cancelar" é uma marca própria.
 */

export type StatusMeta = 'PENDENTE' | 'ANDAMENTO' | 'CONCLUIDA' | 'ATRASADA' | 'CANCELADA';

export interface MetaAvaliavel {
  progresso: number;
  prazo: Date | null;
  cancelada: boolean;
  peso: number;
}

export function statusDaMeta(m: { progresso: number; prazo: Date | null; cancelada: boolean }, hoje: Date): StatusMeta {
  if (m.cancelada) return 'CANCELADA';
  if (m.progresso >= 100) return 'CONCLUIDA';
  if (m.prazo && m.prazo < hoje) return 'ATRASADA';
  if (m.progresso > 0) return 'ANDAMENTO';
  return 'PENDENTE';
}

/**
 * Meta em risco: viva, não concluída, com prazo chegando (≤ 7 dias) e progresso
 * ainda baixo (< 70%). Um alerta ANTES de virar atraso.
 */
export function metaEmRisco(m: { progresso: number; prazo: Date | null; cancelada: boolean }, hoje: Date): boolean {
  if (m.cancelada || m.progresso >= 100 || !m.prazo) return false;
  if (m.prazo < hoje) return false; // já é atraso, não "risco"
  const diasRestantes = (m.prazo.getTime() - hoje.getTime()) / 86_400_000;
  return diasRestantes <= 7 && m.progresso < 70;
}

export interface ResumoMetas {
  total: number;
  concluidas: number;
  andamento: number;
  pendentes: number;
  atrasadas: number;
  canceladas: number;
  emRisco: number;
  /** Média do progresso ponderada pelo peso, ignorando as canceladas. */
  progressoPonderado: number;
}

export function resumoMetas(metas: MetaAvaliavel[], hoje: Date): ResumoMetas {
  const conta = { total: metas.length, concluidas: 0, andamento: 0, pendentes: 0, atrasadas: 0, canceladas: 0, emRisco: 0 };
  for (const m of metas) {
    const st = statusDaMeta(m, hoje);
    if (st === 'CONCLUIDA') conta.concluidas++;
    else if (st === 'ANDAMENTO') conta.andamento++;
    else if (st === 'PENDENTE') conta.pendentes++;
    else if (st === 'ATRASADA') conta.atrasadas++;
    else if (st === 'CANCELADA') conta.canceladas++;
    if (metaEmRisco(m, hoje)) conta.emRisco++;
  }
  const vivas = metas.filter((m) => !m.cancelada);
  const pesoTotal = vivas.reduce((s, m) => s + m.peso, 0);
  const progressoPonderado =
    vivas.length === 0
      ? 0
      : pesoTotal === 0
        ? Math.round(vivas.reduce((s, m) => s + m.progresso, 0) / vivas.length)
        : Math.round(vivas.reduce((s, m) => s + m.progresso * m.peso, 0) / pesoTotal);
  return { ...conta, progressoPonderado };
}
