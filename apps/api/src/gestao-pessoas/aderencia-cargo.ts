/**
 * Aderência ao cargo (performance-360, Fase 5b) — regra pura, testável sem banco.
 *
 * Compara a nota **atual** de uma competência com o **nível esperado** do cargo.
 * Faixas hoje fixas e simétricas (config por tenant numa fase futura). "Acima do
 * esperado" é **neutro**, não um elogio automático — pode indicar excesso onde
 * não era o foco (RN-GP: o sistema explica, não julga).
 */

export type SituacaoCargo = 'SEM_DADO' | 'ABAIXO' | 'PARCIAL' | 'ADERENTE' | 'ACIMA';

export const ROTULO_SITUACAO: Record<SituacaoCargo, string> = {
  SEM_DADO: 'Sem dados suficientes',
  ABAIXO: 'Abaixo do esperado',
  PARCIAL: 'Parcialmente aderente',
  ADERENTE: 'Aderente',
  ACIMA: 'Acima do esperado',
};

export interface ResultadoCargo {
  distancia: number | null;
  situacao: SituacaoCargo;
}

/**
 * @param atual nota atual da competência (1..5) ou null quando não avaliada.
 * @param esperado nível esperado do cargo (1..5).
 */
export function situacaoAderenciaCargo(atual: number | null, esperado: number): ResultadoCargo {
  if (atual === null || !Number.isFinite(atual)) return { distancia: null, situacao: 'SEM_DADO' };
  const distancia = Math.round((atual - esperado) * 10) / 10;
  let situacao: SituacaoCargo;
  if (distancia >= 0.5) situacao = 'ACIMA';
  else if (distancia >= -0.5) situacao = 'ADERENTE';
  else if (distancia >= -1.5) situacao = 'PARCIAL';
  else situacao = 'ABAIXO';
  return { distancia, situacao };
}
