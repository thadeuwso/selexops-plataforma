import { normalizarLista, normalizarResumo, normalizarRoteiro } from './ia-desempenho';

describe('normalizarLista (IA de desempenho)', () => {
  it('array de strings passa direto', () => {
    expect(normalizarLista(['a', 'b'])).toEqual(['a', 'b']);
  });
  it('objeto vira array "chave: valor" (o modelo às vezes devolve dict)', () => {
    expect(normalizarLista({ Nota: '4', Entrega: '5.0' })).toEqual(['Nota: 4', 'Entrega: 5.0']);
  });
  it('string única vira lista de um item', () => {
    expect(normalizarLista('só um ponto')).toEqual(['só um ponto']);
  });
  it('vazio/nulo vira lista vazia', () => {
    expect(normalizarLista(null)).toEqual([]);
    expect(normalizarLista(undefined)).toEqual([]);
    expect(normalizarLista('')).toEqual([]);
  });
});

describe('normalizarResumo/Roteiro', () => {
  it('coage todos os campos de lista do resumo', () => {
    const r = normalizarResumo({ resumo: 'x', fatos: { a: 1 }, tendencia: 't', recomendacoes: ['r'], validacaoHumana: 'v', evidenciasUsadas: [] }) as Record<string, unknown>;
    expect(r.fatos).toEqual(['a: 1']);
    expect(r.recomendacoes).toEqual(['r']);
    expect(r.validacaoHumana).toEqual(['v']);
    expect(r.resumo).toBe('x'); // campo de texto intocado
  });
  it('coage os campos de lista do roteiro', () => {
    const r = normalizarRoteiro({ resumoConversa: 'c', reconhecer: { p: 'ok' }, desenvolver: [], perguntas: 'q?', acordosSugeridos: [] }) as Record<string, unknown>;
    expect(r.reconhecer).toEqual(['p: ok']);
    expect(r.perguntas).toEqual(['q?']);
  });
});
