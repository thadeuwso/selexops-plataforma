/**
 * Matriz 9-box (performance-360, Fase 8) — regra pura.
 *
 * Cruza desempenho × potencial (cada eixo 1..3 = baixo/médio/alto) e devolve o
 * quadrante. É uma **classificação preliminar** — o rótulo apoia a conversa, não
 * decide promoção nem sucessão. A revisão humana é obrigatória (campo próprio).
 * Faixas/rótulos fixos aqui; configuráveis por tenant numa fase futura.
 */

export interface Quadrante {
  chave: string;
  rotulo: string;
  /** 1..9 — posição no grid, útil para pintar a matriz (1 = canto inferior-esq). */
  celula: number;
}

// grid[desempenho-1][potencial-1]
const GRID: Quadrante[][] = [
  // desempenho BAIXO
  [
    { chave: 'QUESTIONAVEL', rotulo: 'Questionável', celula: 1 },
    { chave: 'ENIGMA', rotulo: 'Enigma', celula: 4 },
    { chave: 'POTENCIAL_INEXPLORADO', rotulo: 'Potencial inexplorado', celula: 7 },
  ],
  // desempenho MÉDIO
  [
    { chave: 'EFICAZ', rotulo: 'Eficaz', celula: 2 },
    { chave: 'MANTENEDOR', rotulo: 'Mantenedor', celula: 5 },
    { chave: 'CRESCIMENTO', rotulo: 'Crescimento', celula: 8 },
  ],
  // desempenho ALTO
  [
    { chave: 'ESPECIALISTA', rotulo: 'Especialista de alto desempenho', celula: 3 },
    { chave: 'FORTE_DESEMPENHO', rotulo: 'Forte desempenho', celula: 6 },
    { chave: 'ESTRELA', rotulo: 'Estrela', celula: 9 },
  ],
];

function faixa(v: number): 1 | 2 | 3 {
  if (v <= 1) return 1;
  if (v >= 3) return 3;
  return 2;
}

export function quadrante9box(desempenho: number, potencial: number): Quadrante {
  return GRID[faixa(desempenho) - 1][faixa(potencial) - 1];
}
