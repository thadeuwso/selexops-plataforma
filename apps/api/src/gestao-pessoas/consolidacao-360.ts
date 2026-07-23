import { notaFinal } from './avaliacao-desempenho';

/**
 * Consolidação da avaliação 360 (performance-360, Fase 5) — regra pura.
 *
 * Duas camadas de média ponderada, reaproveitando `notaFinal` (já validado):
 *  1. por competência: média das notas dos avaliadores, ponderada pelo **peso do
 *     tipo** (a nota do gestor pode pesar mais que a de um par);
 *  2. final: média das competências consolidadas, ponderada pelo **peso da
 *     competência** — igual à avaliação de avaliador único.
 *
 * Competência sem nenhuma nota fica de fora (não vira zero). Sem nenhuma nota em
 * lugar nenhum, devolve null — ausência de avaliação, não nota zero.
 */

export interface CompetenciaConsolidar {
  peso: number;
  /** Notas dos participantes nesta competência, cada uma com o peso do seu tipo. */
  notas: { nota: number; pesoTipo: number }[];
}

/** Nota consolidada de uma competência (média ponderada pelo peso do tipo). */
export function consolidarCompetencia(notas: { nota: number; pesoTipo: number }[]): number | null {
  return notaFinal(notas.map((n) => ({ nota: n.nota, peso: n.pesoTipo })));
}

/** Nota final 360: consolida cada competência e depois pondera pelo peso da competência. */
export function notaConsolidada360(competencias: CompetenciaConsolidar[]): number | null {
  const porComp = competencias
    .map((c) => ({ nota: consolidarCompetencia(c.notas), peso: c.peso }))
    .filter((c): c is { nota: number; peso: number } => c.nota !== null);
  return notaFinal(porComp);
}
