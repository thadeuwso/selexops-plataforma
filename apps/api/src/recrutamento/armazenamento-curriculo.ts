/**
 * Armazenamento de currículos em disco (v1 — débito técnico registrado em
 * "09 - Módulos/Recrutamento e Seleção/02 - Onde Pecamos (1.0) e Correções.md" item 8:
 * migrar para storage de objetos quando o volume justificar).
 * Nome de arquivo aleatório + extensão validada (padrão de segurança herdado do 1.0).
 */
import { randomBytes } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const EXTENSAO_POR_TIPO: Record<string, string> = { pdf: '.pdf', docx: '.docx', txt: '.txt' };

export function diretorioUploads(): string {
  return path.resolve(process.env.UPLOAD_DIR?.trim() || path.join(process.cwd(), 'uploads'));
}

export async function salvarCurriculo(
  codTen: bigint,
  tipoArquivo: string,
  buffer: Buffer,
): Promise<string> {
  const pasta = path.join(diretorioUploads(), 'curriculos', codTen.toString());
  await mkdir(pasta, { recursive: true });
  const extensao = EXTENSAO_POR_TIPO[tipoArquivo] ?? '';
  const nomeArquivo = `${Date.now()}-${randomBytes(8).toString('hex')}${extensao}`;
  await writeFile(path.join(pasta, nomeArquivo), buffer);
  return path.join('curriculos', codTen.toString(), nomeArquivo);
}
