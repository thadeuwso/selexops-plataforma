import type { PerfilCultural } from './calcular-match';

/**
 * Apuração do perfil cultural a partir das respostas do candidato (RN-REC-014).
 *
 * Até aqui o perfil cultural era **digitado pelo recrutador** no cadastro da
 * candidatura — um palpite alimentando 20% do score de contratação. Agora quem
 * responde é o candidato, e o número passa a ter origem.
 *
 * A escala é 1–5 (discordo totalmente → concordo totalmente), a mesma do
 * questionário comportamental, e pelo mesmo motivo: quem responde já a conhece,
 * e ela mapeia direto na escala 1–5 do perfil ideal da vaga, sem conversão.
 */

export interface RespostaCulturalApuracao {
  dimensao: string;
  /** 'S' inverte o valor: concordar com "evito apontar problemas" é *menos* comunicação direta. */
  reversa: string;
  valor: number;
}

/**
 * Média por dimensão, com a reversa invertida antes de entrar na conta.
 *
 * Dimensão sem nenhuma resposta fica **de fora** do perfil, em vez de virar um
 * valor neutro: ausência precisa continuar sendo ausência, senão o fit cultural
 * é calculado contra um número que ninguém informou.
 */
export function apurarPerfilCultural(respostas: RespostaCulturalApuracao[]): PerfilCultural {
  const somaPorDimensao = new Map<string, { soma: number; qtd: number }>();

  for (const r of respostas) {
    if (!Number.isFinite(r.valor)) continue;
    const valor = r.reversa === 'S' ? 6 - r.valor : r.valor;
    const atual = somaPorDimensao.get(r.dimensao) ?? { soma: 0, qtd: 0 };
    somaPorDimensao.set(r.dimensao, { soma: atual.soma + valor, qtd: atual.qtd + 1 });
  }

  const perfil: Record<string, number> = {};
  for (const [dimensao, { soma, qtd }] of somaPorDimensao) {
    // Arredonda para inteiro porque o perfil ideal da vaga é inteiro de 1 a 5:
    // comparar 3,5 com 4 daria uma precisão que a escala não tem.
    const media = Math.round(soma / qtd);
    perfil[dimensao] = Math.min(5, Math.max(1, media));
  }
  return perfil as PerfilCultural;
}

/** Quantas dimensões distintas foram respondidas — usado para saber se está completo. */
export function dimensoesRespondidas(respostas: RespostaCulturalApuracao[]): number {
  return new Set(respostas.map((r) => r.dimensao)).size;
}
