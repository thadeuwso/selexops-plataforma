/**
 * Campos estruturados do candidato (RN-REC-016).
 *
 * Formação, pretensão e disponibilidade eram texto solto no currículo: o
 * recrutador lia um a um e não conseguia filtrar. Tipados, entram em busca,
 * ordenação e comparação.
 */

/**
 * Níveis de formação em ordem. O índice é o que permite filtrar por "superior
 * completo ou mais" sem espalhar comparações de string pelo código.
 */
export const NIVEIS_FORMACAO = [
  'FUNDAMENTAL',
  'MEDIO',
  'TECNICO',
  'SUPERIOR',
  'POS',
  'MESTRADO',
  'DOUTORADO',
] as const;

export type NivelFormacao = (typeof NIVEIS_FORMACAO)[number];

export const ordemNivel = (nivel: string): number => NIVEIS_FORMACAO.indexOf(nivel as NivelFormacao);

/**
 * Maior nível **concluído**. Cursando não conta: tratar os dois como iguais
 * faria a triagem aprovar quem ainda não se formou, que é exatamente o erro
 * que o campo estruturado existe para evitar.
 */
export function maiorNivelConcluido(
  formacoes: { nivel: string; situacao: string }[],
): NivelFormacao | null {
  let melhor = -1;
  for (const f of formacoes) {
    if (f.situacao !== 'CONCLUIDO') continue;
    const i = ordemNivel(f.nivel);
    if (i > melhor) melhor = i;
  }
  return melhor >= 0 ? NIVEIS_FORMACAO[melhor] : null;
}

/** Atende ao mínimo pedido pela vaga? Sem formação concluída, não atende. */
export function atendeNivelMinimo(
  formacoes: { nivel: string; situacao: string }[],
  minimo: string,
): boolean {
  const maior = maiorNivelConcluido(formacoes);
  if (!maior) return false;
  return ordemNivel(maior) >= ordemNivel(minimo);
}

export const TIPOS_DISPONIBILIDADE = ['IMEDIATA', 'AVISO_PREVIO', 'A_PARTIR_DE'] as const;

/**
 * Em quantos dias o candidato pode começar, a partir de hoje.
 *
 * Serve para ordenar e comparar candidatos numa escala só. Disponibilidade não
 * informada devolve `null` — e ausência tem de continuar sendo ausência, não
 * virar "imediata" por otimismo.
 */
export function diasAteDisponivel(
  candidato: { dispTipo: string | null; dispAvisoDias: number | null; dispData: Date | null },
  hoje = new Date(),
): number | null {
  switch (candidato.dispTipo) {
    case 'IMEDIATA':
      return 0;
    case 'AVISO_PREVIO':
      return candidato.dispAvisoDias ?? null;
    case 'A_PARTIR_DE': {
      if (!candidato.dispData) return null;
      const dias = Math.ceil((candidato.dispData.getTime() - hoje.getTime()) / (24 * 60 * 60 * 1000));
      // Data já passada significa disponível agora, não "faltam -12 dias".
      return Math.max(0, dias);
    }
    default:
      return null;
  }
}

/** Texto curto para a lista e para o resumo. */
export function rotuloDisponibilidade(candidato: {
  dispTipo: string | null;
  dispAvisoDias: number | null;
  dispData: Date | null;
}): string | null {
  switch (candidato.dispTipo) {
    case 'IMEDIATA':
      return 'Imediata';
    case 'AVISO_PREVIO':
      return candidato.dispAvisoDias ? `Após aviso prévio (${candidato.dispAvisoDias} dias)` : 'Após aviso prévio';
    case 'A_PARTIR_DE':
      return candidato.dispData
        ? `A partir de ${candidato.dispData.toLocaleDateString('pt-BR')}`
        : 'A partir de data a combinar';
    default:
      return null;
  }
}
