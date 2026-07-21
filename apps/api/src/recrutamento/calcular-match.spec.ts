/**
 * RN-REC-006 — match determinístico. Porte fiel da fórmula validada em produção
 * no SelX 1.0 (`compatibilityV1.ts`). Os valores esperados aqui são calculados à
 * mão a partir da fórmula documentada, não capturados da implementação: se
 * alguém mexer num peso, o teste falha (que é exatamente o objetivo).
 */
import {
  calcularFitCultural,
  calcularHashEntrada,
  calcularMatch,
  calcularScoreRequisito,
  type RequisitoScoring,
} from './calcular-match';

const EVIDENCIA_VALIDA = 'Liderei a migração dos pipelines por 2 anos.'; // >= 12 caracteres
const EVIDENCIA_CURTA = 'sim'; // < 12 caracteres, não pontua

function req(over: Partial<RequisitoScoring> = {}): RequisitoScoring {
  return {
    codVagReq: '1',
    descrReq: 'SQL avançado',
    tipoReq: 'OBRIGATORIO',
    peso: 5,
    nivelEsperado: 4,
    tempoEspMeses: 24,
    ...over,
  };
}

describe('calcularScoreRequisito', () => {
  it('com tempo esperado: pondera 0.55 nível + 0.35 tempo + 0.10 evidência', () => {
    // nível 4/4 = 1, tempo 24/24 = 1, evidência = 1  →  0.55 + 0.35 + 0.10 = 1
    expect(calcularScoreRequisito(req(), { nivel: 4, tempoMeses: 24, evidenciaTexto: EVIDENCIA_VALIDA })).toBe(1);

    // nível 2/4 = 0.5, tempo 12/24 = 0.5, sem evidência  →  0.55*0.5 + 0.35*0.5 = 0.45
    expect(calcularScoreRequisito(req(), { nivel: 2, tempoMeses: 12, evidenciaTexto: null })).toBeCloseTo(0.45, 10);
  });

  it('sem tempo esperado: cai para a fórmula 0.80 nível + 0.20 evidência', () => {
    const semTempo = req({ tempoEspMeses: null });
    expect(calcularScoreRequisito(semTempo, { nivel: 4, tempoMeses: null, evidenciaTexto: EVIDENCIA_VALIDA })).toBe(1);
    expect(calcularScoreRequisito(semTempo, { nivel: 2, tempoMeses: null, evidenciaTexto: null })).toBeCloseTo(0.4, 10);
  });

  it('evidência só conta com pelo menos 12 caracteres', () => {
    const semTempo = req({ tempoEspMeses: null });
    // nível 4/4 = 1 → 0.80; evidência curta não soma os 0.20
    expect(calcularScoreRequisito(semTempo, { nivel: 4, tempoMeses: null, evidenciaTexto: EVIDENCIA_CURTA })).toBeCloseTo(0.8, 10);
  });

  it('a fronteira da evidência é exatamente 12 caracteres', () => {
    const semTempo = req({ tempoEspMeses: null, nivelEsperado: 4 });
    const onze = 'x'.repeat(11);
    const doze = 'x'.repeat(12);
    expect(calcularScoreRequisito(semTempo, { nivel: 4, tempoMeses: null, evidenciaTexto: onze })).toBeCloseTo(0.8, 10);
    expect(calcularScoreRequisito(semTempo, { nivel: 4, tempoMeses: null, evidenciaTexto: doze })).toBe(1);
  });

  it('espaços em branco não contam como evidência', () => {
    const semTempo = req({ tempoEspMeses: null });
    expect(calcularScoreRequisito(semTempo, { nivel: 4, tempoMeses: null, evidenciaTexto: '                ' })).toBeCloseTo(0.8, 10);
  });

  it('nível acima do esperado satura em 1 (não dá bônus)', () => {
    const facil = req({ nivelEsperado: 2, tempoEspMeses: null });
    expect(calcularScoreRequisito(facil, { nivel: 4, tempoMeses: null, evidenciaTexto: null })).toBeCloseTo(0.8, 10);
  });

  it('sem autoavaliação, pontua zero', () => {
    expect(calcularScoreRequisito(req(), undefined)).toBe(0);
  });

  it('sem nível esperado definido, normaliza o nível pela escala 0-4', () => {
    const semNivel = req({ nivelEsperado: null, tempoEspMeses: null });
    // 2/4 = 0.5 → 0.80*0.5 = 0.4
    expect(calcularScoreRequisito(semNivel, { nivel: 2, tempoMeses: null, evidenciaTexto: null })).toBeCloseTo(0.4, 10);
  });

  it('nível esperado zero vira "tem ou não tem"', () => {
    const opcional = req({ nivelEsperado: 0, tempoEspMeses: null });
    expect(calcularScoreRequisito(opcional, { nivel: 1, tempoMeses: null, evidenciaTexto: null })).toBeCloseTo(0.8, 10);
    expect(calcularScoreRequisito(opcional, { nivel: 0, tempoMeses: null, evidenciaTexto: null })).toBe(0);
  });
});

describe('calcularFitCultural', () => {
  const ideal = { autonomy: 4, pace: 3, collaboration: 5, structure: 3, dataDriven: 4, directCommunication: 5 };

  it('perfis idênticos dão 100', () => {
    expect(calcularFitCultural(ideal, { ...ideal })).toBe(100);
  });

  it('distância máxima numa dimensão zera aquela dimensão', () => {
    // única dimensão comparável, |1-5|/4 = 1 → 1-1 = 0 → 0%
    expect(calcularFitCultural({ autonomy: 5 }, { autonomy: 1 })).toBe(0);
  });

  it('só compara dimensões presentes nos dois perfis', () => {
    // autonomy bate (1.0); pace só existe no ideal e é ignorado → média = 100
    expect(calcularFitCultural({ autonomy: 4, pace: 3 }, { autonomy: 4 })).toBe(100);
  });

  it('média das dimensões comparáveis', () => {
    // autonomy: |4-4|=0 → 1 ; pace: |3-1|=2 → 1-0.5 = 0.5 ; média = 0.75 → 75
    expect(calcularFitCultural({ autonomy: 4, pace: 3 }, { autonomy: 4, pace: 1 })).toBe(75);
  });

  it('valores fora da escala 1-5 são limitados antes de comparar', () => {
    // ideal 10 vira 5, candidato 0 vira 1 → |1-5|/4 = 1 → 0
    expect(calcularFitCultural({ autonomy: 10 }, { autonomy: 0 })).toBe(0);
  });

  it('retorna null quando falta um dos perfis ou não há dimensão em comum', () => {
    expect(calcularFitCultural(null, ideal)).toBeNull();
    expect(calcularFitCultural(ideal, null)).toBeNull();
    expect(calcularFitCultural({}, {})).toBeNull();
    expect(calcularFitCultural({ autonomy: 4 }, { pace: 3 })).toBeNull();
  });
});

describe('calcularMatch', () => {
  const obrigatorio = req({ codVagReq: '1', descrReq: 'SQL avançado', tipoReq: 'OBRIGATORIO', peso: 8, nivelEsperado: 4, tempoEspMeses: 24 });
  const desejavel = req({ codVagReq: '2', descrReq: 'Terraform', tipoReq: 'DESEJAVEL', peso: 3, nivelEsperado: 2, tempoEspMeses: null });
  const perfilIdeal = { autonomy: 4, pace: 3, collaboration: 5, structure: 3, dataDriven: 4, directCommunication: 5 };

  it('vaga sem requisitos não gera match (nada a medir)', () => {
    expect(calcularMatch({ requisitos: [], autoavaliacoes: {}, perfilIdeal: null, perfilCandidato: null })).toBeNull();
  });

  it('candidata forte: média ponderada sem penalidade, fit cultural perfeito', () => {
    const r = calcularMatch({
      requisitos: [obrigatorio, desejavel],
      autoavaliacoes: {
        '1': { nivel: 4, tempoMeses: 24, evidenciaTexto: EVIDENCIA_VALIDA }, // score01 = 1
        '2': { nivel: 2, tempoMeses: 0, evidenciaTexto: null }, // score01 = 0.80
      },
      perfilIdeal,
      perfilCandidato: { ...perfilIdeal },
    })!;

    // (1*8 + 0.8*3) / 11 * 100 = 10.4/11*100 = 94.545 → 95 (sem obrigatório reprovado)
    expect(r.scoreGeral).toBe(95);
    expect(r.qtdGapsCrit).toBe(0);
    expect(r.qtdGapsMelh).toBe(0);
    expect(r.scoreCultura).toBe(100);
    // driver = maior peso*score01: 8*1 = 8  vs  3*0.8 = 2.4
    expect(r.driverPrincipal).toBe('SQL avançado');
    // 0.65*95 + 0.20*100 + 0.10*100 + 0.05*(0.5*100) = 61.75 + 20 + 10 + 2.5 = 94.25 → 94
    expect(r.scoreContratacao).toBe(94);
  });

  it('obrigatório reprovado aplica a penalidade de 8% e conta gap crítico', () => {
    const r = calcularMatch({
      requisitos: [obrigatorio, desejavel],
      autoavaliacoes: {
        '1': { nivel: 1, tempoMeses: 3, evidenciaTexto: null }, // 0.55*0.25 + 0.35*0.125 = 0.18125
        '2': { nivel: 0, tempoMeses: 0, evidenciaTexto: null }, // 0
      },
      perfilIdeal,
      perfilCandidato: null,
    })!;

    // bruto = (0.18125*8)/11*100 = 13.1818 ; com 1 obrigatório reprovado: *0.92 = 12.127 → 12
    expect(r.scoreGeral).toBe(12);
    expect(r.qtdGapsCrit).toBe(1); // o obrigatório
    expect(r.qtdGapsMelh).toBe(1); // o desejável (score01 < 0.5, fora dos críticos)
    expect(r.scoreCultura).toBeNull(); // sem perfil do candidato
    // sem cultura, os pesos são renormalizados por 0.80:
    // (0.65*12 + 0.10*0 + 0.05*0) / 0.80 = 7.8/0.8 = 9.75 → 10
    expect(r.scoreContratacao).toBe(10);
  });

  it('requisito desejável de peso alto (>=7) também vira gap crítico', () => {
    const desejavelPesado = req({ codVagReq: '3', descrReq: 'Kafka', tipoReq: 'DESEJAVEL', peso: 7, nivelEsperado: 4, tempoEspMeses: null });
    const r = calcularMatch({
      requisitos: [desejavelPesado],
      autoavaliacoes: { '3': { nivel: 0, tempoMeses: null, evidenciaTexto: null } },
      perfilIdeal: null,
      perfilCandidato: null,
    })!;
    expect(r.qtdGapsCrit).toBe(1);
    // sem nenhum obrigatório, a saúde de obrigatórios é 100 (não penaliza)
    // (0.65*0 + 0.10*100 + 0.05*0)/0.80 = 12.5 → 13
    expect(r.scoreContratacao).toBe(13);
  });

  it('a fronteira de reprovação do obrigatório é score01 < 0.6', () => {
    // Mesmo requisito, duas respostas que só diferem pela evidência:
    // 0.55*1 + 0.35*0 = 0.55 (reprova)  vs  + 0.10 de evidência = 0.65 (passa)
    const soNivel = { nivel: 4, tempoMeses: 0, evidenciaTexto: null };
    const comEvidencia = { nivel: 4, tempoMeses: 0, evidenciaTexto: EVIDENCIA_VALIDA };

    const abaixo = calcularMatch({ requisitos: [obrigatorio], autoavaliacoes: { '1': soNivel }, perfilIdeal: null, perfilCandidato: null })!;
    expect(abaixo.qtdGapsCrit).toBe(1);

    const acima = calcularMatch({ requisitos: [obrigatorio], autoavaliacoes: { '1': comEvidencia }, perfilIdeal: null, perfilCandidato: null })!;
    expect(acima.qtdGapsCrit).toBe(0);
  });

  it('gaps de melhoria são limitados aos 5 piores', () => {
    const muitos = Array.from({ length: 8 }, (_, i) =>
      req({ codVagReq: String(i), descrReq: `Req ${i}`, tipoReq: 'DESEJAVEL', peso: 1, nivelEsperado: 4, tempoEspMeses: null }),
    );
    const r = calcularMatch({ requisitos: muitos, autoavaliacoes: {}, perfilIdeal: null, perfilCandidato: null })!;
    expect(r.qtdGapsMelh).toBe(5);
  });
});

describe('calcularHashEntrada', () => {
  const base = {
    requisitos: [req()],
    autoavaliacoes: { '1': { nivel: 3, tempoMeses: 12, evidenciaTexto: null } },
    perfilIdeal: { autonomy: 4, pace: 3 },
    perfilCandidato: { pace: 3, autonomy: 4 },
    versaoMatch: 'v1',
  };

  it('é estável à ordem das chaves (mesma entrada = mesmo hash)', () => {
    const outraOrdem = { ...base, perfilCandidato: { autonomy: 4, pace: 3 } };
    expect(calcularHashEntrada(base)).toBe(calcularHashEntrada(outraOrdem));
  });

  it('muda quando a entrada muda', () => {
    const comOutroNivel = { ...base, autoavaliacoes: { '1': { nivel: 4, tempoMeses: 12, evidenciaTexto: null } } };
    expect(calcularHashEntrada(base)).not.toBe(calcularHashEntrada(comOutroNivel));
  });

  it('muda quando a versão do algoritmo muda (invalida cache antigo)', () => {
    expect(calcularHashEntrada(base)).not.toBe(calcularHashEntrada({ ...base, versaoMatch: 'v2' }));
  });
});
