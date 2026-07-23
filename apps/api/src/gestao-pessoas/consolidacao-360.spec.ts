import { consolidarCompetencia, notaConsolidada360 } from './consolidacao-360';

describe('consolidarCompetencia (360)', () => {
  it('sem notas devolve null', () => {
    expect(consolidarCompetencia([])).toBeNull();
  });
  it('pondera pelo peso do tipo de avaliador', () => {
    // gestor 5 (peso 3), par 3 (peso 1) → (15+3)/4 = 4.5
    expect(consolidarCompetencia([{ nota: 5, pesoTipo: 3 }, { nota: 3, pesoTipo: 1 }])).toBe(4.5);
  });
  it('avaliadores de mesmo peso viram média simples', () => {
    expect(consolidarCompetencia([{ nota: 4, pesoTipo: 1 }, { nota: 2, pesoTipo: 1 }])).toBe(3);
  });
});

describe('notaConsolidada360', () => {
  it('sem nenhuma nota devolve null', () => {
    expect(notaConsolidada360([{ peso: 1, notas: [] }])).toBeNull();
  });

  it('consolida por tipo e depois pondera por competência', () => {
    // Comp A (peso 3): gestor 5(p3), par 3(p1) → 4.5
    // Comp B (peso 1): gestor 2(p3), par 4(p1) → (6+4)/4 = 2.5
    // final: (4.5*3 + 2.5*1)/4 = (13.5+2.5)/4 = 4.0
    const r = notaConsolidada360([
      { peso: 3, notas: [{ nota: 5, pesoTipo: 3 }, { nota: 3, pesoTipo: 1 }] },
      { peso: 1, notas: [{ nota: 2, pesoTipo: 3 }, { nota: 4, pesoTipo: 1 }] },
    ]);
    expect(r).toBe(4);
  });

  it('competência sem nota fica de fora da conta', () => {
    // Só a comp com nota conta: consolida 4 → final 4
    const r = notaConsolidada360([
      { peso: 2, notas: [{ nota: 4, pesoTipo: 1 }] },
      { peso: 5, notas: [] },
    ]);
    expect(r).toBe(4);
  });

  it('um único avaliador equivale à avaliação simples', () => {
    // gestor único: comp A(peso 3)=4, comp B(peso 1)=2 → (12+2)/4 = 3.5
    const r = notaConsolidada360([
      { peso: 3, notas: [{ nota: 4, pesoTipo: 1 }] },
      { peso: 1, notas: [{ nota: 2, pesoTipo: 1 }] },
    ]);
    expect(r).toBe(3.5);
  });
});
