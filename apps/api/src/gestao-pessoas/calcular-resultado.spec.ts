/**
 * RN-GP-006/007/009 — motor de pontuação da Avaliação Comportamental.
 * Determinístico e sem IA: a IA só explica um resultado já calculado.
 * Valores esperados calculados à mão a partir de "03 - Motor de Pontuação.md".
 */
import {
  calcularAderenciaVaga,
  calcularConsistencia,
  calcularFaixaInterpretativa,
  calcularPontosResposta,
  calcularResultadoPorFaceta,
  calcularResultadoPorFator,
  type PerfilVagaFator,
  type RespostaFator,
} from './calcular-resultado';

function resposta(over: Partial<RespostaFator> = {}): RespostaFator {
  return { codFat: 'DIR', tipo: 'DIRETA', peso: 1, valor: 3, ...over };
}

describe('calcularPontosResposta', () => {
  it('pergunta direta usa o valor cru', () => {
    expect(calcularPontosResposta(5, 'DIRETA', 1)).toBe(5);
    expect(calcularPontosResposta(1, 'DIRETA', 1)).toBe(1);
  });

  it('pergunta reversa inverte na escala 1-5 (6 - valor)', () => {
    expect(calcularPontosResposta(5, 'REVERSA', 1)).toBe(1);
    expect(calcularPontosResposta(1, 'REVERSA', 1)).toBe(5);
    expect(calcularPontosResposta(3, 'REVERSA', 1)).toBe(3); // neutro é simétrico
  });

  it('aplica o peso da pergunta', () => {
    expect(calcularPontosResposta(4, 'DIRETA', 2)).toBe(8);
    expect(calcularPontosResposta(4, 'REVERSA', 1.5)).toBe(3); // (6-4)*1.5
  });
});

describe('calcularFaixaInterpretativa (FAIXA_V1)', () => {
  it('respeita os limites documentados', () => {
    expect(calcularFaixaInterpretativa(0)).toBe('muito_baixa');
    expect(calcularFaixaInterpretativa(20)).toBe('muito_baixa');
    expect(calcularFaixaInterpretativa(20.1)).toBe('baixa');
    expect(calcularFaixaInterpretativa(40)).toBe('baixa');
    expect(calcularFaixaInterpretativa(40.1)).toBe('moderada');
    expect(calcularFaixaInterpretativa(60)).toBe('moderada');
    expect(calcularFaixaInterpretativa(60.1)).toBe('alta');
    expect(calcularFaixaInterpretativa(80)).toBe('alta');
    expect(calcularFaixaInterpretativa(80.1)).toBe('muito_alta');
    expect(calcularFaixaInterpretativa(100)).toBe('muito_alta');
  });
});

describe('calcularResultadoPorFator', () => {
  it('normaliza a pontuação bruta dentro do mínimo/máximo possível do fator', () => {
    // 2 perguntas peso 1: mínimo possível 2, máximo 10.
    // DIRETA 5 → 5 ; REVERSA 1 → 5  → bruta 10 = máximo → 100%
    const [r] = calcularResultadoPorFator([
      resposta({ tipo: 'DIRETA', valor: 5 }),
      resposta({ tipo: 'REVERSA', valor: 1 }),
    ]);
    expect(r.pontuacaoBruta).toBe(10);
    expect(r.minimoPossivel).toBe(2);
    expect(r.maximoPossivel).toBe(10);
    expect(r.percentualNormalizado).toBe(100);
    expect(r.faixaInterpretativa).toBe('muito_alta');
    expect(r.media).toBe(5);
    expect(r.desvio).toBe(0);
  });

  it('responder tudo com 5 num fator equilibrado dá exatamente 50% (direta e reversa se anulam)', () => {
    // É o cenário do smoke test: o candidato "concorda com tudo" e o fator não infla.
    const [r] = calcularResultadoPorFator([
      resposta({ tipo: 'DIRETA', valor: 5 }), // 5
      resposta({ tipo: 'REVERSA', valor: 5 }), // 1
    ]);
    expect(r.pontuacaoBruta).toBe(6); // min 2, max 10 → (6-2)/8 = 50%
    expect(r.percentualNormalizado).toBe(50);
    expect(r.faixaInterpretativa).toBe('moderada');
  });

  it('tudo neutro cai no meio da escala', () => {
    const [r] = calcularResultadoPorFator([
      resposta({ tipo: 'DIRETA', valor: 3 }),
      resposta({ tipo: 'DIRETA', valor: 3 }),
    ]);
    expect(r.percentualNormalizado).toBe(50);
    expect(r.media).toBe(3);
  });

  it('agrupa por fator, sem misturar', () => {
    const resultado = calcularResultadoPorFator([
      resposta({ codFat: 'DIR', tipo: 'DIRETA', valor: 5 }),
      resposta({ codFat: 'CON', tipo: 'DIRETA', valor: 1 }),
    ]);
    expect(resultado).toHaveLength(2);
    expect(resultado.find((r) => r.codFat === 'DIR')!.percentualNormalizado).toBe(100);
    expect(resultado.find((r) => r.codFat === 'CON')!.percentualNormalizado).toBe(0);
  });

  it('calcula o desvio das respostas do fator', () => {
    // pontos 5 e 1 → média 3, desvio = sqrt(((5-3)² + (1-3)²)/2) = sqrt(4) = 2
    const [r] = calcularResultadoPorFator([
      resposta({ tipo: 'DIRETA', valor: 5 }),
      resposta({ tipo: 'DIRETA', valor: 1 }),
    ]);
    expect(r.media).toBe(3);
    expect(r.desvio).toBe(2);
  });
});

describe('calcularResultadoPorFaceta', () => {
  it('agrupa por fator + faceta e conta quantas perguntas sustentam cada uma', () => {
    const facetas = calcularResultadoPorFaceta([
      { ...resposta({ tipo: 'DIRETA', valor: 5 }), faceta: 'Iniciativa' },
      { ...resposta({ tipo: 'REVERSA', valor: 1 }), faceta: 'Iniciativa' },
      { ...resposta({ tipo: 'DIRETA', valor: 1 }), faceta: 'Autonomia' },
    ]);
    expect(facetas).toHaveLength(2);

    const iniciativa = facetas.find((f) => f.faceta === 'Iniciativa')!;
    expect(iniciativa.quantidade).toBe(2);
    expect(iniciativa.percentualNormalizado).toBe(100); // 5 + 5 = 10 = máximo

    const autonomia = facetas.find((f) => f.faceta === 'Autonomia')!;
    expect(autonomia.quantidade).toBe(1);
    expect(autonomia.percentualNormalizado).toBe(0); // valor 1 = mínimo
  });

  it('a mesma faceta em fatores diferentes não é misturada', () => {
    const facetas = calcularResultadoPorFaceta([
      { ...resposta({ codFat: 'DIR', valor: 5 }), faceta: 'Comunicação' },
      { ...resposta({ codFat: 'CON', valor: 1 }), faceta: 'Comunicação' },
    ]);
    expect(facetas).toHaveLength(2);
  });
});

describe('calcularConsistencia', () => {
  it('respostas 100% uniformes sinalizam baixa consistência', () => {
    const r = calcularConsistencia([5, 5, 5, 5]);
    expect(r.percRespUniformes).toBe(100);
    expect(r.indicadorConsistencia).toBe('BAIXA_CONSISTENCIA');
  });

  it('excesso de neutras (>40%) pede atenção, sem reprovar', () => {
    // 10 respostas, 5 neutras (50% > 40); alternativa mais frequente = 5 (50% <= 85)
    const r = calcularConsistencia([3, 3, 3, 3, 3, 1, 1, 2, 2, 4]);
    expect(r.percRespNeutras).toBe(50);
    expect(r.percRespUniformes).toBe(50);
    expect(r.indicadorConsistencia).toBe('REQUER_ATENCAO');
  });

  it('uniformidade tem precedência sobre neutralidade (tudo neutro é uniforme)', () => {
    const r = calcularConsistencia([3, 3, 3, 3]);
    expect(r.percRespNeutras).toBe(100);
    expect(r.indicadorConsistencia).toBe('BAIXA_CONSISTENCIA');
  });

  it('respostas variadas são consideradas adequadas', () => {
    const r = calcularConsistencia([1, 2, 3, 4, 5]);
    expect(r.percRespNeutras).toBe(20);
    expect(r.percRespUniformes).toBe(20);
    expect(r.indicadorConsistencia).toBe('ADEQUADA');
  });

  // Fronteiras dos limiares — fixam as constantes 85% (uniformidade) e 40% (neutras).
  // Sem estes casos, mover o limiar de 85 pra 95 passaria despercebido.
  it('uniformidade de 90% (acima de 85) sinaliza', () => {
    const r = calcularConsistencia([5, 5, 5, 5, 5, 5, 5, 5, 5, 1]);
    expect(r.percRespUniformes).toBe(90);
    expect(r.indicadorConsistencia).toBe('BAIXA_CONSISTENCIA');
  });

  it('uniformidade de exatamente 85% NÃO sinaliza (o limiar é estritamente maior)', () => {
    // 17 respostas iguais em 20 = 85%; as outras 3 não são neutras
    const valores = [...Array(17).fill(5), 1, 2, 4];
    const r = calcularConsistencia(valores);
    expect(r.percRespUniformes).toBe(85);
    expect(r.indicadorConsistencia).toBe('ADEQUADA');
  });

  it('neutras de exatamente 40% NÃO pedem atenção (o limiar é estritamente maior)', () => {
    // 4 neutras em 10 = 40%; alternativa mais frequente também 40% (<= 85)
    const r = calcularConsistencia([3, 3, 3, 3, 1, 1, 2, 2, 4, 5]);
    expect(r.percRespNeutras).toBe(40);
    expect(r.indicadorConsistencia).toBe('ADEQUADA');
  });

  it('neutras logo acima de 40% já pedem atenção', () => {
    // 5 neutras em 10 = 50%, uniformidade 50% (não dispara baixa consistência)
    const r = calcularConsistencia([3, 3, 3, 3, 3, 1, 1, 2, 2, 4]);
    expect(r.percRespNeutras).toBe(50);
    expect(r.indicadorConsistencia).toBe('REQUER_ATENCAO');
  });

  it('não quebra com lista vazia', () => {
    const r = calcularConsistencia([]);
    expect(r.percRespNeutras).toBe(0);
    expect(r.percRespUniformes).toBe(0);
    expect(r.indicadorConsistencia).toBe('ADEQUADA');
  });
});

describe('calcularAderenciaVaga', () => {
  const resultado = [
    { codFat: 'DIR', pontuacaoBruta: 6, minimoPossivel: 2, maximoPossivel: 10, percentualNormalizado: 50, media: 3, desvio: 0, faixaInterpretativa: 'moderada' },
    { codFat: 'PRE', pontuacaoBruta: 6, minimoPossivel: 2, maximoPossivel: 10, percentualNormalizado: 50, media: 3, desvio: 0, faixaInterpretativa: 'moderada' },
  ];

  it('dentro da faixa desejada dá aderência cheia', () => {
    const perfil: PerfilVagaFator[] = [{ codFat: 'PRE', minimo: 40, maximo: 100, peso: 1, eliminatorio: false }];
    const r = calcularAderenciaVaga(resultado, perfil);
    expect(r.fatores[0].dentroDaFaixa).toBe(true);
    expect(r.fatores[0].distanciaFaixa).toBe(0);
    expect(r.fatores[0].aderenciaDimensao).toBe(100);
    expect(r.aderenciaGeral).toBe(100);
  });

  it('fora da faixa reduz 1 ponto de aderência por ponto de distância', () => {
    // percentual 50, mínimo 60 → distância 10 → aderência 90
    const perfil: PerfilVagaFator[] = [{ codFat: 'DIR', minimo: 60, maximo: 100, peso: 1, eliminatorio: false }];
    const r = calcularAderenciaVaga(resultado, perfil);
    expect(r.fatores[0].distanciaFaixa).toBe(10);
    expect(r.fatores[0].aderenciaDimensao).toBe(90);
    expect(r.fatores[0].dentroDaFaixa).toBe(false);
  });

  it('acima do máximo também conta como distância', () => {
    const acima = [{ ...resultado[0], percentualNormalizado: 95 }];
    const perfil: PerfilVagaFator[] = [{ codFat: 'DIR', minimo: 40, maximo: 80, peso: 1, eliminatorio: false }];
    const r = calcularAderenciaVaga(acima, perfil);
    expect(r.fatores[0].distanciaFaixa).toBe(15);
    expect(r.fatores[0].aderenciaDimensao).toBe(85);
  });

  it('faz a média ponderada pelo peso de cada fator', () => {
    // Mesmo caso exercitado pela fumaça: DIR fora (90) com peso 2, PRE dentro (100) com peso 1
    // (90*2 + 100*1) / 3 = 93.333
    const perfil: PerfilVagaFator[] = [
      { codFat: 'DIR', minimo: 60, maximo: 100, peso: 2, eliminatorio: false },
      { codFat: 'PRE', minimo: 40, maximo: 100, peso: 1, eliminatorio: false },
    ];
    const r = calcularAderenciaVaga(resultado, perfil);
    expect(r.aderenciaGeral).toBeCloseTo(93.333, 3);
  });

  it('fator sem resultado é tratado como zero (não some da conta)', () => {
    const perfil: PerfilVagaFator[] = [{ codFat: 'SUS', minimo: 60, maximo: 100, peso: 1, eliminatorio: false }];
    const r = calcularAderenciaVaga(resultado, perfil);
    // percentual assumido 0 → distância 60 → aderência 40
    expect(r.fatores[0].aderenciaDimensao).toBe(40);
    expect(r.aderenciaGeral).toBe(40);
  });

  it('aderência da dimensão nunca fica negativa', () => {
    const perfil: PerfilVagaFator[] = [{ codFat: 'AUSENTE', minimo: 100, maximo: 100, peso: 1, eliminatorio: false }];
    const r = calcularAderenciaVaga(resultado, perfil);
    expect(r.fatores[0].distanciaFaixa).toBe(100);
    expect(r.fatores[0].aderenciaDimensao).toBe(0);
  });
});
