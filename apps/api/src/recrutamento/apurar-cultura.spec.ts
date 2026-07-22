import { apurarPerfilCultural, dimensoesRespondidas } from './apurar-cultura';

const r = (dimensao: string, valor: number, reversa = 'N') => ({ dimensao, valor, reversa });

describe('apurarPerfilCultural', () => {
  it('usa o valor direto quando a afirmação não é reversa', () => {
    expect(apurarPerfilCultural([r('autonomy', 4)])).toEqual({ autonomy: 4 });
  });

  it('inverte a afirmação reversa (6 menos o valor)', () => {
    // Concordar totalmente (5) com "prefiro que definam o que fazer" é
    // autonomia 1, não 5.
    expect(apurarPerfilCultural([r('autonomy', 5, 'S')])).toEqual({ autonomy: 1 });
    expect(apurarPerfilCultural([r('autonomy', 1, 'S')])).toEqual({ autonomy: 5 });
  });

  it('a reversa no centro da escala não desloca nada', () => {
    expect(apurarPerfilCultural([r('pace', 3, 'S')])).toEqual({ pace: 3 });
  });

  it('faz a média entre direta e reversa da mesma dimensão', () => {
    // direta 5 e reversa 1 (=5) → média 5: candidato coerente nos dois lados.
    expect(apurarPerfilCultural([r('autonomy', 5), r('autonomy', 1, 'S')])).toEqual({ autonomy: 5 });
  });

  it('candidato que concorda com a direta E com a reversa cai no meio', () => {
    // 5 e (6-5)=1 → média 3. É o sinal de quem respondeu sem ler.
    expect(apurarPerfilCultural([r('pace', 5), r('pace', 5, 'S')])).toEqual({ pace: 3 });
  });

  it('arredonda para inteiro, porque o perfil ideal da vaga é inteiro', () => {
    // (4 + 5) / 2 = 4,5 → 5
    expect(apurarPerfilCultural([r('structure', 4), r('structure', 5)])).toEqual({ structure: 5 });
    // (4 + 3) / 2 = 3,5 → 4
    expect(apurarPerfilCultural([r('structure', 4), r('structure', 3)])).toEqual({ structure: 4 });
  });

  it('apura cada dimensão de forma independente', () => {
    expect(
      apurarPerfilCultural([r('autonomy', 5), r('pace', 2), r('collaboration', 4, 'S')]),
    ).toEqual({ autonomy: 5, pace: 2, collaboration: 2 });
  });

  it('dimensão sem resposta fica FORA do perfil, não vira neutro', () => {
    const perfil = apurarPerfilCultural([r('autonomy', 4)]);
    expect(perfil).toEqual({ autonomy: 4 });
    expect('pace' in perfil).toBe(false);
  });

  it('sem respostas, o perfil é vazio', () => {
    expect(apurarPerfilCultural([])).toEqual({});
  });

  it('ignora valor não numérico em vez de contaminar a média', () => {
    expect(apurarPerfilCultural([r('autonomy', 4), r('autonomy', NaN)])).toEqual({ autonomy: 4 });
  });

  it('mantém o resultado dentro de 1..5 mesmo com valor fora da escala', () => {
    expect(apurarPerfilCultural([r('pace', 9)])).toEqual({ pace: 5 });
    expect(apurarPerfilCultural([r('pace', -3)])).toEqual({ pace: 1 });
  });
});

describe('dimensoesRespondidas', () => {
  it('conta dimensões distintas, não respostas', () => {
    expect(dimensoesRespondidas([r('autonomy', 4), r('autonomy', 2, 'S'), r('pace', 3)])).toBe(2);
  });

  it('sem respostas, zero', () => {
    expect(dimensoesRespondidas([])).toBe(0);
  });
});
