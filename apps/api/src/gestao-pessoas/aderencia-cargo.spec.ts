import { situacaoAderenciaCargo } from './aderencia-cargo';

describe('situacaoAderenciaCargo (performance-360)', () => {
  it('sem nota atual → SEM_DADO (não "abaixo")', () => {
    expect(situacaoAderenciaCargo(null, 4).situacao).toBe('SEM_DADO');
  });
  it('exatamente no esperado é ADERENTE', () => {
    const r = situacaoAderenciaCargo(4, 4);
    expect(r.situacao).toBe('ADERENTE');
    expect(r.distancia).toBe(0);
  });
  it('meio ponto acima já é ACIMA (neutro)', () => {
    expect(situacaoAderenciaCargo(4.5, 4).situacao).toBe('ACIMA');
  });
  it('até meio ponto abaixo ainda é ADERENTE', () => {
    expect(situacaoAderenciaCargo(3.7, 4).situacao).toBe('ADERENTE');
  });
  it('entre -0,5 e -1,5 é PARCIAL', () => {
    expect(situacaoAderenciaCargo(3, 4).situacao).toBe('PARCIAL'); // -1.0
  });
  it('mais de 1,5 abaixo é ABAIXO', () => {
    expect(situacaoAderenciaCargo(2, 4).situacao).toBe('ABAIXO'); // -2.0
  });
  it('distância é arredondada a uma casa', () => {
    expect(situacaoAderenciaCargo(4.5, 4).distancia).toBe(0.5);
  });
});
