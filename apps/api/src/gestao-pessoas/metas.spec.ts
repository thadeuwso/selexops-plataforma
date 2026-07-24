import { metaEmRisco, resumoMetas, statusDaMeta } from './metas';

const hoje = new Date('2026-07-24T00:00:00Z');
const dias = (n: number) => new Date(hoje.getTime() + n * 86_400_000);

describe('statusDaMeta', () => {
  it('cancelada vence tudo', () => {
    expect(statusDaMeta({ progresso: 100, prazo: null, cancelada: true }, hoje)).toBe('CANCELADA');
  });
  it('progresso 100 é CONCLUIDA', () => {
    expect(statusDaMeta({ progresso: 100, prazo: dias(-5), cancelada: false }, hoje)).toBe('CONCLUIDA');
  });
  it('prazo vencido e incompleta é ATRASADA', () => {
    expect(statusDaMeta({ progresso: 40, prazo: dias(-1), cancelada: false }, hoje)).toBe('ATRASADA');
  });
  it('progresso > 0 dentro do prazo é ANDAMENTO', () => {
    expect(statusDaMeta({ progresso: 30, prazo: dias(10), cancelada: false }, hoje)).toBe('ANDAMENTO');
  });
  it('zero sem atraso é PENDENTE', () => {
    expect(statusDaMeta({ progresso: 0, prazo: dias(10), cancelada: false }, hoje)).toBe('PENDENTE');
  });
});

describe('metaEmRisco', () => {
  it('prazo em 3 dias e progresso 20 → em risco', () => {
    expect(metaEmRisco({ progresso: 20, prazo: dias(3), cancelada: false }, hoje)).toBe(true);
  });
  it('prazo em 3 dias mas progresso 80 → não é risco', () => {
    expect(metaEmRisco({ progresso: 80, prazo: dias(3), cancelada: false }, hoje)).toBe(false);
  });
  it('prazo longe → não é risco', () => {
    expect(metaEmRisco({ progresso: 10, prazo: dias(30), cancelada: false }, hoje)).toBe(false);
  });
  it('já vencida não é "risco" (é atraso)', () => {
    expect(metaEmRisco({ progresso: 10, prazo: dias(-1), cancelada: false }, hoje)).toBe(false);
  });
  it('sem prazo não é risco', () => {
    expect(metaEmRisco({ progresso: 10, prazo: null, cancelada: false }, hoje)).toBe(false);
  });
});

describe('resumoMetas', () => {
  it('conta por status e pondera o progresso pelo peso, ignorando canceladas', () => {
    const r = resumoMetas(
      [
        { progresso: 100, prazo: dias(5), cancelada: false, peso: 1 }, // CONCLUIDA
        { progresso: 40, prazo: dias(3), cancelada: false, peso: 3 }, // ANDAMENTO + risco
        { progresso: 10, prazo: dias(-2), cancelada: false, peso: 1 }, // ATRASADA
        { progresso: 0, prazo: null, cancelada: true, peso: 5 }, // CANCELADA (fora do progresso)
      ],
      hoje,
    );
    expect(r.total).toBe(4);
    expect(r.concluidas).toBe(1);
    expect(r.andamento).toBe(1);
    expect(r.atrasadas).toBe(1);
    expect(r.canceladas).toBe(1);
    expect(r.emRisco).toBe(1);
    // ponderado das vivas: (100*1 + 40*3 + 10*1) / (1+3+1) = 230/5 = 46
    expect(r.progressoPonderado).toBe(46);
  });
  it('lista vazia não divide por zero', () => {
    expect(resumoMetas([], hoje).progressoPonderado).toBe(0);
  });
});
