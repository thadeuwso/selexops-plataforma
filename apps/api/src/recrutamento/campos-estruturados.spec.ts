import {
  atendeNivelMinimo,
  diasAteDisponivel,
  maiorNivelConcluido,
  rotuloDisponibilidade,
} from './campos-estruturados';

const f = (nivel: string, situacao = 'CONCLUIDO') => ({ nivel, situacao });

describe('maiorNivelConcluido', () => {
  it('devolve o maior entre vários', () => {
    expect(maiorNivelConcluido([f('MEDIO'), f('SUPERIOR'), f('TECNICO')])).toBe('SUPERIOR');
  });

  it('ignora formação em andamento — cursando não é concluído', () => {
    expect(maiorNivelConcluido([f('MEDIO'), f('SUPERIOR', 'CURSANDO')])).toBe('MEDIO');
  });

  it('ignora formação trancada', () => {
    expect(maiorNivelConcluido([f('MEDIO'), f('POS', 'TRANCADO')])).toBe('MEDIO');
  });

  it('sem nenhuma concluída, devolve null em vez de um nível qualquer', () => {
    expect(maiorNivelConcluido([f('SUPERIOR', 'CURSANDO')])).toBeNull();
    expect(maiorNivelConcluido([])).toBeNull();
  });

  it('respeita a ordem: doutorado é maior que mestrado, que é maior que pós', () => {
    expect(maiorNivelConcluido([f('POS'), f('DOUTORADO'), f('MESTRADO')])).toBe('DOUTORADO');
    expect(maiorNivelConcluido([f('POS'), f('MESTRADO')])).toBe('MESTRADO');
  });

  it('técnico é acima de médio e abaixo de superior', () => {
    expect(maiorNivelConcluido([f('MEDIO'), f('TECNICO')])).toBe('TECNICO');
    expect(maiorNivelConcluido([f('TECNICO'), f('SUPERIOR')])).toBe('SUPERIOR');
  });
});

describe('atendeNivelMinimo', () => {
  it('atende quando é exatamente o mínimo', () => {
    expect(atendeNivelMinimo([f('SUPERIOR')], 'SUPERIOR')).toBe(true);
  });

  it('atende quando está acima', () => {
    expect(atendeNivelMinimo([f('MESTRADO')], 'SUPERIOR')).toBe(true);
  });

  it('não atende quando está abaixo', () => {
    expect(atendeNivelMinimo([f('MEDIO')], 'SUPERIOR')).toBe(false);
  });

  it('não atende com o nível certo mas ainda cursando', () => {
    expect(atendeNivelMinimo([f('SUPERIOR', 'CURSANDO')], 'SUPERIOR')).toBe(false);
  });

  it('sem formação informada, não atende — ausência não é aprovação', () => {
    expect(atendeNivelMinimo([], 'MEDIO')).toBe(false);
  });
});

describe('diasAteDisponivel', () => {
  const hoje = new Date('2026-07-23T12:00:00Z');

  it('imediata é zero', () => {
    expect(diasAteDisponivel({ dispTipo: 'IMEDIATA', dispAvisoDias: null, dispData: null }, hoje)).toBe(0);
  });

  it('aviso prévio devolve os dias informados', () => {
    expect(diasAteDisponivel({ dispTipo: 'AVISO_PREVIO', dispAvisoDias: 30, dispData: null }, hoje)).toBe(30);
  });

  it('aviso prévio sem prazo informado devolve null, não zero', () => {
    expect(diasAteDisponivel({ dispTipo: 'AVISO_PREVIO', dispAvisoDias: null, dispData: null }, hoje)).toBeNull();
  });

  it('data futura vira a contagem de dias', () => {
    expect(
      diasAteDisponivel({ dispTipo: 'A_PARTIR_DE', dispAvisoDias: null, dispData: new Date('2026-08-02T12:00:00Z') }, hoje),
    ).toBe(10);
  });

  it('data já passada é disponível agora, não dias negativos', () => {
    expect(
      diasAteDisponivel({ dispTipo: 'A_PARTIR_DE', dispAvisoDias: null, dispData: new Date('2026-07-01T12:00:00Z') }, hoje),
    ).toBe(0);
  });

  it('sem disponibilidade informada devolve null — ausência não vira imediata', () => {
    expect(diasAteDisponivel({ dispTipo: null, dispAvisoDias: null, dispData: null }, hoje)).toBeNull();
  });
});

describe('rotuloDisponibilidade', () => {
  it('mostra o prazo do aviso prévio quando informado', () => {
    expect(rotuloDisponibilidade({ dispTipo: 'AVISO_PREVIO', dispAvisoDias: 30, dispData: null })).toBe(
      'Após aviso prévio (30 dias)',
    );
  });

  it('sem prazo, não inventa número', () => {
    expect(rotuloDisponibilidade({ dispTipo: 'AVISO_PREVIO', dispAvisoDias: null, dispData: null })).toBe(
      'Após aviso prévio',
    );
  });

  it('sem disponibilidade informada, devolve null', () => {
    expect(rotuloDisponibilidade({ dispTipo: null, dispAvisoDias: null, dispData: null })).toBeNull();
  });
});
