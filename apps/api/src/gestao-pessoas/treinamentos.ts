/**
 * Regras puras dos treinamentos (performance-360, Fase 7). Testáveis sem banco.
 *
 * O status **VENCIDO é derivado**: uma certificação concluída cujo prazo de
 * validade passou vira "vencida" na leitura — não um campo que alguém precise
 * lembrar de virar. Recomendação é o status RECOMENDADO (a IA/gestor sugere,
 * mas ninguém é matriculado sem aceitar).
 */

export type StatusMatricula = 'RECOMENDADO' | 'PENDENTE' | 'EM_ANDAMENTO' | 'CONCLUIDO' | 'VENCIDO' | 'CANCELADO';

export function statusMatricula(m: { status: string; dtVencimento: Date | null }, hoje: Date): StatusMatricula {
  if (m.status === 'CONCLUIDO' && m.dtVencimento && m.dtVencimento < hoje) return 'VENCIDO';
  return m.status as StatusMatricula;
}

export interface ResumoTreinamentos {
  total: number;
  concluidos: number;
  emAndamento: number;
  pendentes: number;
  recomendados: number;
  vencidos: number;
  cancelados: number;
  /** Soma da carga horária dos treinamentos efetivamente concluídos (inclui os vencidos, que foram feitos). */
  cargaHorariaConcluida: number;
}

export function resumoTreinamentos(
  matriculas: { status: string; dtVencimento: Date | null; cargaHoraria: number | null }[],
  hoje: Date,
): ResumoTreinamentos {
  const r: ResumoTreinamentos = {
    total: matriculas.length,
    concluidos: 0,
    emAndamento: 0,
    pendentes: 0,
    recomendados: 0,
    vencidos: 0,
    cancelados: 0,
    cargaHorariaConcluida: 0,
  };
  for (const m of matriculas) {
    const st = statusMatricula(m, hoje);
    if (st === 'CONCLUIDO') r.concluidos++;
    else if (st === 'EM_ANDAMENTO') r.emAndamento++;
    else if (st === 'PENDENTE') r.pendentes++;
    else if (st === 'RECOMENDADO') r.recomendados++;
    else if (st === 'VENCIDO') r.vencidos++;
    else if (st === 'CANCELADO') r.cancelados++;
    if ((st === 'CONCLUIDO' || st === 'VENCIDO') && m.cargaHoraria) r.cargaHorariaConcluida += m.cargaHoraria;
  }
  return r;
}

/** Vencimento = conclusão + validade (meses). Null quando não há validade. */
export function calcularVencimento(dtConclusao: Date | null, validadeMeses: number | null): Date | null {
  if (!dtConclusao || !validadeMeses) return null;
  const d = new Date(dtConclusao);
  d.setMonth(d.getMonth() + validadeMeses);
  return d;
}
