/**
 * Substituição de placeholders {{campo}} por dados do funcionário/vaga.
 * Mecanismo mínimo (v1, sem fornecedor de assinatura — decisão do Thadeu,
 * 2026-07-14): assinatura simples (consentimento + hash + IP + timestamp).
 */
import type { Prisma } from '@prisma/client';

export type FuncionarioParaModelo = Prisma.FuncionarioGetPayload<{
  include: { empresa: true; cargo: true; departamento: true };
}>;

export function renderizarModelo(modelo: string, func: FuncionarioParaModelo): string {
  const campos: Record<string, string> = {
    nomeFun: func.nomeFun,
    cgc: func.cgc ?? '',
    numCad: func.numCad.toString(),
    nomeEmpresa: func.empresa.nomeFantasia,
    nomeCargo: func.cargo?.nomeCar ?? '',
    nomeDepartamento: func.departamento?.descrDep ?? '',
    dtAdm: func.dtAdm.toLocaleDateString('pt-BR', { timeZone: 'UTC' }),
    vlrSal: func.vlrSal ? Number(func.vlrSal).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '',
    tipoContrato: func.tipoContrato,
  };
  return modelo.replace(/\{\{\s*(\w+)\s*\}\}/g, (correspondencia, campo: string) =>
    campo in campos ? campos[campo] : correspondencia,
  );
}
