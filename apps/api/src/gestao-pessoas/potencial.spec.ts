import { quadrante9box } from './potencial';

describe('quadrante9box (performance-360)', () => {
  it('alto desempenho + alto potencial → Estrela', () => {
    expect(quadrante9box(3, 3).chave).toBe('ESTRELA');
  });
  it('baixo desempenho + baixo potencial → Questionável', () => {
    expect(quadrante9box(1, 1).chave).toBe('QUESTIONAVEL');
  });
  it('médio × médio → Mantenedor', () => {
    expect(quadrante9box(2, 2).chave).toBe('MANTENEDOR');
  });
  it('baixo desempenho + alto potencial → Potencial inexplorado', () => {
    expect(quadrante9box(1, 3).chave).toBe('POTENCIAL_INEXPLORADO');
  });
  it('alto desempenho + baixo potencial → Especialista', () => {
    expect(quadrante9box(3, 1).chave).toBe('ESPECIALISTA');
  });
  it('valores fora da faixa são fixados (0 vira 1, 5 vira 3)', () => {
    expect(quadrante9box(0, 5).chave).toBe('POTENCIAL_INEXPLORADO');
  });
  it('cada quadrante tem uma célula única de 1 a 9', () => {
    const celulas = new Set<number>();
    for (let d = 1; d <= 3; d++) for (let p = 1; p <= 3; p++) celulas.add(quadrante9box(d, p).celula);
    expect(celulas.size).toBe(9);
  });
});
