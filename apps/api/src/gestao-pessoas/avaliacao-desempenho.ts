/**
 * Regras puras da avaliação de desempenho (RN-GP-022), testáveis sem banco.
 */

/**
 * Nota final = média **ponderada** das notas por competência.
 *
 * Derivada, nunca um campo à parte — como o progresso do PDI. Um campo separado
 * poderia dizer "8,5" enquanto as competências somam outra coisa; derivar
 * impede a contradição.
 *
 * Competência ainda sem nota fica de fora do cálculo: a média é sobre o que foi
 * avaliado. Sem nenhuma nota, devolve `null` (não zero) — avaliação em branco
 * não é nota zero, é ausência de avaliação.
 */
export function notaFinal(itens: { nota: number; peso: number }[]): number | null {
  const avaliadas = itens.filter((i) => Number.isFinite(i.nota));
  if (avaliadas.length === 0) return null;
  const pesoTotal = avaliadas.reduce((s, i) => s + i.peso, 0);
  // Peso total zero (todas com peso 0) cairia em divisão por zero; nesse caso a
  // média simples é a leitura honesta.
  if (pesoTotal === 0) {
    const soma = avaliadas.reduce((s, i) => s + i.nota, 0);
    return Math.round((soma / avaliadas.length) * 10) / 10;
  }
  const somaPonderada = avaliadas.reduce((s, i) => s + i.nota * i.peso, 0);
  return Math.round((somaPonderada / pesoTotal) * 10) / 10;
}

/**
 * A avaliação só pode ser concluída quando **todas** as competências do ciclo
 * têm nota. Concluir com competência em branco entregaria uma nota final que
 * ignora parte do que se combinou avaliar.
 */
export function podeConcluir(totalCompetencias: number, competenciasComNota: number): boolean {
  return totalCompetencias > 0 && competenciasComNota >= totalCompetencias;
}
