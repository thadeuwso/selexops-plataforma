/**
 * IA de desempenho (performance-360, Fase 9) — prompts, esquemas e montagem do
 * dossiê. Segue o gateway (ADR-0003): purpose versionado, JSON Schema de saída,
 * a IA **explica, não decide**. Nenhum número sai daqui — a nota é do motor.
 */

export const VERSAO_RESUMO = 'desempenho.resumo-executivo@v1';
export const VERSAO_ROTEIRO = 'desempenho.roteiro-feedback@v1';

/** Sistema comum aos purposes de desempenho (§32). */
export const PROMPT_SISTEMA = `Você é o assistente de gestão de desempenho do SelexOps. Você APOIA gestores e RH; você NUNCA decide.

Sua função é explicar dados JÁ registrados e ajudar a preparar conversas e planos.

Você NÃO pode: alterar notas; inventar fatos; diagnosticar condições; inferir atributos sensíveis (saúde, família, religião, orientação, política, raça); determinar demissão ou promoção; afirmar causalidade sem evidência; classificar a pessoa como boa ou ruim.

Baseie-se EXCLUSIVAMENTE nos dados fornecidos. Quando faltar dado, diga que falta — não preencha.

Sempre separe: fato observado; interpretação possível; recomendação; ponto que exige validação humana.

Linguagem profissional, neutra e respeitosa. Responda SOMENTE com JSON válido no formato pedido.`;

// Campos de lista aceitam array OU objeto: um modelo escrevendo em português às
// vezes devolve {chave: valor} onde pedimos uma lista. Rejeitar a geração inteira
// por isso desperdiça uma chamada paga — tolera-se no schema e normaliza-se na
// volta (`normalizarLista`), como já se fez com a severidade da análise de candidato.
const LISTA = { type: ['array', 'object'] } as const;

/** Resumo executivo (§7): fatos, tendência, recomendações, validação humana, evidências. */
// Só `resumo` é exigido (o texto central). Os campos de lista o modelo às vezes
// omite ou muda de forma — em vez de descartar a geração paga, normaliza-se na
// volta (campos ausentes viram lista vazia).
export const EsquemaResumo = {
  type: 'object',
  required: ['resumo'],
  properties: {
    resumo: { type: 'string', minLength: 30 },
    fatos: LISTA,
    tendencia: { type: 'string' },
    recomendacoes: LISTA,
    validacaoHumana: LISTA,
    evidenciasUsadas: LISTA,
  },
} as const;

/** Roteiro de feedback (§20): reconhecer, desenvolver, perguntas, acordos. */
export const EsquemaRoteiro = {
  type: 'object',
  required: ['resumoConversa'],
  properties: {
    resumoConversa: { type: 'string', minLength: 20 },
    reconhecer: LISTA,
    desenvolver: LISTA,
    perguntas: LISTA,
    acordosSugeridos: LISTA,
  },
} as const;

/** Coage um campo de lista para array de strings (aceita array, objeto ou string). */
export function normalizarLista(v: unknown): string[] {
  if (Array.isArray(v)) return v.map((x) => (typeof x === 'string' ? x : `${JSON.stringify(x)}`));
  if (v && typeof v === 'object') return Object.entries(v as Record<string, unknown>).map(([k, val]) => `${k}: ${val}`);
  if (typeof v === 'string' && v.trim()) return [v];
  return [];
}

const CAMPOS_RESUMO = ['fatos', 'recomendacoes', 'validacaoHumana', 'evidenciasUsadas'] as const;
const CAMPOS_ROTEIRO = ['reconhecer', 'desenvolver', 'perguntas', 'acordosSugeridos'] as const;

export function normalizarResumo(conteudo: unknown): unknown {
  if (!conteudo || typeof conteudo !== 'object') return conteudo;
  const c = { ...(conteudo as Record<string, unknown>) };
  for (const campo of CAMPOS_RESUMO) c[campo] = normalizarLista(c[campo]);
  return c;
}

export function normalizarRoteiro(conteudo: unknown): unknown {
  if (!conteudo || typeof conteudo !== 'object') return conteudo;
  const c = { ...(conteudo as Record<string, unknown>) };
  for (const campo of CAMPOS_ROTEIRO) c[campo] = normalizarLista(c[campo]);
  return c;
}

export interface DossieDesempenho {
  nome: string;
  cargo: string | null;
  ciclo: string | null;
  notaAtual: number | null;
  notaAnterior: number | null;
  classificacao: string | null;
  destaques: { competencia: string; nota: number }[];
  atencao: { competencia: string; nota: number }[];
  aderencia: { score: number; nivel: string; motivos: string[] };
  metas: { total: number; concluidas: number; atrasadas: number; progresso: number };
  feedbacksRecentes: { tipo: string; mensagem: string }[];
  pdiAcoesPendentes: number;
  treinos: { concluidos: number; pendentes: number; vencidos: number };
}

/** Fatos que a IA verá — leituras determinísticas, na mesma ordem sempre (o hash depende disso). */
export function montarDossieTexto(d: DossieDesempenho): string {
  const l: string[] = [];
  l.push(`Colaborador: ${d.nome}${d.cargo ? ` (${d.cargo})` : ''}.`);
  if (d.ciclo) l.push(`Ciclo atual: ${d.ciclo}.`);
  l.push(`Nota geral: ${d.notaAtual ?? 'sem avaliação'}${d.classificacao ? ` (${d.classificacao})` : ''}. Ciclo anterior: ${d.notaAnterior ?? 'sem'}.`);
  if (d.destaques.length) l.push(`Destaques: ${d.destaques.map((c) => `${c.competencia} ${c.nota.toFixed(1)}`).join(', ')}.`);
  if (d.atencao.length) l.push(`Pontos de atenção: ${d.atencao.map((c) => `${c.competencia} ${c.nota.toFixed(1)}`).join(', ')}.`);
  l.push(`Aderência ao desenvolvimento: ${d.aderencia.score}/100 (${d.aderencia.nivel}).${d.aderencia.motivos.length ? ` Motivos: ${d.aderencia.motivos.join('; ')}.` : ''}`);
  l.push(`Metas: ${d.metas.concluidas}/${d.metas.total} concluídas, ${d.metas.atrasadas} atrasadas, progresso ${d.metas.progresso}%.`);
  l.push(`PDI: ${d.pdiAcoesPendentes} ação(ões) pendente(s). Treinamentos: ${d.treinos.concluidos} concluídos, ${d.treinos.pendentes} em curso, ${d.treinos.vencidos} vencidos.`);
  if (d.feedbacksRecentes.length) {
    l.push('Feedbacks recentes:');
    for (const f of d.feedbacksRecentes) l.push(`- [${f.tipo}] ${f.mensagem}`);
  }
  return l.join('\n');
}

export function montarPromptResumo(d: DossieDesempenho): string {
  return `Gere um RESUMO EXECUTIVO deste colaborador para o gestor, a partir SÓ dos dados abaixo.\n\n${montarDossieTexto(
    d,
  )}\n\nResponda em JSON. Os campos de lista (fatos, recomendacoes, validacaoHumana, evidenciasUsadas) DEVEM ser arrays de strings — cada item uma frase curta, NUNCA um objeto. Campos: resumo (parágrafo curto e fundamentado), fatos (observações diretas dos dados), tendencia (leitura possível da evolução, sem afirmar causa), recomendacoes (ações de apoio), validacaoHumana (o que um humano precisa confirmar), evidenciasUsadas (quais dados sustentam o resumo).`;
}

export function montarPromptRoteiro(d: DossieDesempenho): string {
  return `Prepare um ROTEIRO para a conversa de feedback do gestor com este colaborador, a partir SÓ dos dados abaixo.\n\n${montarDossieTexto(
    d,
  )}\n\nResponda em JSON. Os campos de lista (reconhecer, desenvolver, perguntas, acordosSugeridos) DEVEM ser arrays de strings — cada item uma frase, NUNCA um objeto. Campos: resumoConversa, reconhecer (o que valorizar), desenvolver (o que evoluir), perguntas (abertas, para o colaborador refletir), acordosSugeridos.`;
}
