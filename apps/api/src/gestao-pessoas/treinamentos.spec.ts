import { calcularVencimento, resumoTreinamentos, statusMatricula } from './treinamentos';

const hoje = new Date('2026-07-24T00:00:00Z');
const dias = (n: number) => new Date(hoje.getTime() + n * 86_400_000);

describe('statusMatricula', () => {
  it('concluído com validade vencida vira VENCIDO', () => {
    expect(statusMatricula({ status: 'CONCLUIDO', dtVencimento: dias(-1) }, hoje)).toBe('VENCIDO');
  });
  it('concluído com validade futura continua CONCLUIDO', () => {
    expect(statusMatricula({ status: 'CONCLUIDO', dtVencimento: dias(30) }, hoje)).toBe('CONCLUIDO');
  });
  it('concluído sem validade continua CONCLUIDO', () => {
    expect(statusMatricula({ status: 'CONCLUIDO', dtVencimento: null }, hoje)).toBe('CONCLUIDO');
  });
  it('demais status passam direto', () => {
    expect(statusMatricula({ status: 'RECOMENDADO', dtVencimento: null }, hoje)).toBe('RECOMENDADO');
  });
});

describe('resumoTreinamentos', () => {
  it('conta por status derivado e soma carga dos concluídos/vencidos', () => {
    const r = resumoTreinamentos(
      [
        { status: 'CONCLUIDO', dtVencimento: dias(30), cargaHoraria: 8 },
        { status: 'CONCLUIDO', dtVencimento: dias(-2), cargaHoraria: 4 }, // vencido, mas foi feito
        { status: 'EM_ANDAMENTO', dtVencimento: null, cargaHoraria: 20 },
        { status: 'RECOMENDADO', dtVencimento: null, cargaHoraria: 10 },
      ],
      hoje,
    );
    expect(r.total).toBe(4);
    expect(r.concluidos).toBe(1);
    expect(r.vencidos).toBe(1);
    expect(r.emAndamento).toBe(1);
    expect(r.recomendados).toBe(1);
    expect(r.cargaHorariaConcluida).toBe(12); // 8 + 4
  });
});

describe('calcularVencimento', () => {
  it('soma os meses de validade à conclusão', () => {
    const v = calcularVencimento(new Date('2026-01-15T00:00:00Z'), 12);
    expect(v?.toISOString().slice(0, 10)).toBe('2027-01-15');
  });
  it('sem validade não vence', () => {
    expect(calcularVencimento(new Date(), null)).toBeNull();
    expect(calcularVencimento(null, 12)).toBeNull();
  });
});
