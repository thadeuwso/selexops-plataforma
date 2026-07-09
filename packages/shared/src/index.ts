/**
 * @selx/shared — tipos, DTOs e contratos compartilhados entre apps.
 *
 * Regra: contratos entre módulos e com o AI Gateway (ADR-0003) nascem aqui,
 * documentados no vault (05 - Backend/APIs e 05 - Backend/Eventos) antes de usados.
 */

/** Identificador numérico padrão do projeto (ADR-0004). */
export type Codigo = bigint;

/** Resposta padrão de health check dos serviços. */
export interface RespostaSaude {
  ok: boolean;
  servico: string;
  dataHora: string;
}
