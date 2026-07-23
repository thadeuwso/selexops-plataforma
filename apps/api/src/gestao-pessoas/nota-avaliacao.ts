import { notaFinal } from './avaliacao-desempenho';
import { consolidarCompetencia } from './consolidacao-360';

/**
 * Resolve a nota de UMA avaliação, escondendo dos endpoints a diferença entre
 * avaliador único e 360 (performance-360, Fase 5).
 *
 * - **Sem participantes com nota** → caminho de sempre: `NotaCompetencia` direto.
 *   (Toda avaliação atual cai aqui — comportamento idêntico.)
 * - **Com participantes** → consolida por competência (peso do tipo) e depois
 *   pondera pela competência.
 *
 * Devolve a nota final e a nota resolvida por competência (para distribuição /
 * destaques), sem que cada endpoint precise saber qual caminho tomou.
 */

type Id = bigint | string;
const k = (v: Id) => v.toString();

export interface CompRef {
  codComp: Id;
  peso: number;
}
export interface NotaSimples {
  codComp: Id;
  nota: number;
}
export interface ParticipanteNotas {
  peso: number;
  notas: NotaSimples[];
}

export interface AvaliacaoResolvida {
  modo: 'SIMPLES' | '360';
  notaFinal: number | null;
  /** Nota resolvida por competência (chave = codComp em string). */
  porCompetencia: Map<string, number>;
}

export function resolverAvaliacao(
  competencias: CompRef[],
  notasSimples: NotaSimples[],
  participantes: ParticipanteNotas[],
): AvaliacaoResolvida {
  const temParticipanteComNota = participantes.some((p) => p.notas.length > 0);
  const pesoComp = new Map(competencias.map((c) => [k(c.codComp), c.peso]));
  const porCompetencia = new Map<string, number>();

  if (!temParticipanteComNota) {
    // Caminho simples — inalterado.
    for (const n of notasSimples) porCompetencia.set(k(n.codComp), n.nota);
    const nf = notaFinal(notasSimples.map((n) => ({ nota: n.nota, peso: pesoComp.get(k(n.codComp)) ?? 1 })));
    return { modo: 'SIMPLES', notaFinal: nf, porCompetencia };
  }

  // Caminho 360 — consolida por competência as notas dos participantes.
  const notasPorComp = new Map<string, { nota: number; pesoTipo: number }[]>();
  for (const p of participantes) {
    for (const n of p.notas) {
      const arr = notasPorComp.get(k(n.codComp)) ?? [];
      arr.push({ nota: n.nota, pesoTipo: p.peso });
      notasPorComp.set(k(n.codComp), arr);
    }
  }
  const paraFinal: { nota: number; peso: number }[] = [];
  for (const c of competencias) {
    const consolidada = consolidarCompetencia(notasPorComp.get(k(c.codComp)) ?? []);
    if (consolidada !== null) {
      porCompetencia.set(k(c.codComp), consolidada);
      paraFinal.push({ nota: consolidada, peso: c.peso });
    }
  }
  return { modo: '360', notaFinal: notaFinal(paraFinal), porCompetencia };
}
