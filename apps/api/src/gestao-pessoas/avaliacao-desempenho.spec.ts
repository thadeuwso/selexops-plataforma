import { notaFinal, podeConcluir } from './avaliacao-desempenho';

describe('notaFinal (RN-GP-022)', () => {
  it('sem nenhuma nota devolve null, não zero', () => {
    expect(notaFinal([])).toBeNull();
  });

  it('média simples quando todos os pesos são iguais', () => {
    expect(notaFinal([{ nota: 4, peso: 1 }, { nota: 2, peso: 1 }])).toBe(3);
  });

  it('pondera pelo peso da competência', () => {
    // (5*3 + 1*1) / (3+1) = 16/4 = 4
    expect(notaFinal([{ nota: 5, peso: 3 }, { nota: 1, peso: 1 }])).toBe(4);
  });

  it('arredonda para uma casa decimal', () => {
    // (5+4+4)/3 = 4.333… -> 4.3
    expect(notaFinal([{ nota: 5, peso: 1 }, { nota: 4, peso: 1 }, { nota: 4, peso: 1 }])).toBe(4.3);
  });

  it('ignora competência sem nota (nota não-finita)', () => {
    expect(notaFinal([{ nota: 4, peso: 1 }, { nota: NaN, peso: 1 }])).toBe(4);
  });

  it('peso total zero cai na média simples em vez de dividir por zero', () => {
    expect(notaFinal([{ nota: 3, peso: 0 }, { nota: 5, peso: 0 }])).toBe(4);
  });

  it('uma única competência devolve a própria nota', () => {
    expect(notaFinal([{ nota: 3, peso: 2 }])).toBe(3);
  });
});

describe('podeConcluir (RN-GP-022)', () => {
  it('não conclui ciclo sem competências', () => {
    expect(podeConcluir(0, 0)).toBe(false);
  });

  it('não conclui com competência em branco', () => {
    expect(podeConcluir(3, 2)).toBe(false);
  });

  it('conclui quando todas têm nota', () => {
    expect(podeConcluir(3, 3)).toBe(true);
  });
});
