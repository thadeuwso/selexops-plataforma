"use client";
import { use, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import type { Colaborador360 } from "@/componentes/colaborador-360/header";

/* ─── Formas dos endpoints já existentes (reaproveitados, sem duplicar consulta) ─── */
interface Desempenho {
  classificacao: { chave: string; rotulo: string } | null;
  notaAtual: number | null;
  notaAnterior: number | null;
  tendencia: number | null;
  totalCriterios: number;
  criteriosAvaliados: number;
  evolucao: { ciclo: string; dtFim: string; nota: number }[];
  distribuicao: { chave: string; rotulo: string; quantidade: number; percentual: number }[];
  destaques: { competencia: string; nota: number }[];
  atencao: { competencia: string; nota: number }[];
}
interface Comp {
  codComp: string;
  nome: string;
  peso: number;
  notaConsolidada: number | null;
  porTipo: { tipo: string; nota: number }[];
  dispersao: number | null;
  alerta: string | null;
}
interface Competencias {
  ciclo: string | null;
  modo: "SIMPLES" | "360";
  tipos: string[];
  competencias: Comp[];
}
interface RoleFit {
  cargo: string | null;
  competencias: { nome: string; criticidade: string; esperado: number; atual: number | null; situacaoRotulo: string }[];
}
interface Meta {
  codMeta: string;
  titulo: string;
  peso: number;
  prazo: string | null;
  progresso: number;
  status: string;
  emRisco: boolean;
}
interface ResumoMetas {
  total: number;
  concluidas: number;
  andamento: number;
  atrasadas: number;
  emRisco: number;
  progressoPonderado: number;
}
interface Matricula {
  codMat: string;
  nome: string;
  obrigatorio: boolean;
  progresso: number;
  dtVencimento: string | null;
  status: string;
}
interface ResumoTreinos {
  total: number;
  concluidos: number;
  emAndamento: number;
  pendentes: number;
  vencidos: number;
}
interface Alerta {
  chave: string;
  nivel: "BAIXO" | "MEDIO" | "ALTO";
  titulo: string;
  regra: string;
  acaoRecomendada: string;
}
interface ResumoIAConteudo {
  resumo: string;
  fatos: string[];
  tendencia: string;
  recomendacoes: string[];
  validacaoHumana: string[];
}
interface InsightIA {
  conteudoJson: ResumoIAConteudo;
  provedor: string | null;
  modeloUsado: string | null;
  dhInc: string;
}

const ROTULO_TIPO: Record<string, string> = {
  AUTO: "Autoaval.", GESTOR: "Gestor", PAR: "Pares", LIDERADO: "Liderados", COMITE: "Comitê", CLIENTE_INTERNO: "Cliente",
};
const STATUS_META: Record<string, string> = {
  PENDENTE: "Pendente", ANDAMENTO: "Em andamento", CONCLUIDA: "Concluída", ATRASADA: "Atrasada", CANCELADA: "Cancelada",
};
const STATUS_TREINO: Record<string, string> = {
  RECOMENDADO: "Recomendado", PENDENTE: "Pendente", EM_ANDAMENTO: "Em andamento", CONCLUIDO: "Concluído", VENCIDO: "Vencido", CANCELADO: "Cancelado",
};
const NIVEL_ALERTA: Record<string, string> = { ALTO: "Alto", MEDIO: "Médio", BAIXO: "Baixo" };
const NIVEL_ADER: Record<string, string> = { ADERENTE: "Aderente", ATENCAO: "Atenção", RISCO: "Em risco" };

const data = (iso: string | null | undefined) => (iso ? new Date(iso).toLocaleDateString("pt-BR", { timeZone: "UTC" }) : "—");
const dataHora = (iso: string) => new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(iso));

/* As seções opcionais do relatório. A identificação vai sempre. */
const SECOES = [
  { id: "desempenho", rotulo: "Desempenho" },
  { id: "competencias", rotulo: "Competências e aderência ao cargo" },
  { id: "metas", rotulo: "Metas" },
  { id: "treinamentos", rotulo: "Treinamentos" },
  { id: "riscos", rotulo: "Riscos e alertas" },
  { id: "ia", rotulo: "Resumo inteligente (IA)" },
] as const;

/**
 * Relatório do Painel 360 (RN-GP-034) — visão para impressão / exportação em PDF
 * pelo próprio navegador (Ctrl+P → salvar como PDF), sem dependência de browser
 * no servidor. Monta as seções a partir dos endpoints que já alimentam as abas.
 * Ao baixar, carimba a exportação na trilha de auditoria. O relatório apresenta
 * evidências para decisão humana — não decide promoção, desligamento nem sucessão.
 */
export default function RelatorioColaborador360({ params }: { params: Promise<{ codFun: string }> }) {
  const { codFun } = use(params);
  const [base, setBase] = useState<Colaborador360 | null>(null);
  const [desemp, setDesemp] = useState<Desempenho | null>(null);
  const [comp, setComp] = useState<Competencias | null>(null);
  const [rf, setRf] = useState<RoleFit | null>(null);
  const [metas, setMetas] = useState<{ itens: Meta[]; resumo: ResumoMetas } | null>(null);
  const [treinos, setTreinos] = useState<{ itens: Matricula[]; resumo: ResumoTreinos } | null>(null);
  const [riscos, setRiscos] = useState<Alerta[] | null>(null);
  const [ia, setIa] = useState<InsightIA | null>(null);
  const [erro, setErro] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [ativas, setAtivas] = useState<Record<string, boolean>>(() => Object.fromEntries(SECOES.map((s) => [s.id, true])));

  useEffect(() => {
    let vivo = true;
    async function carregar() {
      const [b, d, c, r, m, t, ri, insight] = await Promise.all([
        api<Colaborador360>(`/gestao-pessoas/colaboradores/${codFun}/360`),
        api<Desempenho>(`/gestao-pessoas/colaboradores/${codFun}/desempenho`),
        api<Competencias>(`/gestao-pessoas/colaboradores/${codFun}/competencias`),
        api<RoleFit>(`/gestao-pessoas/colaboradores/${codFun}/aderencia-cargo`),
        api<{ itens: Meta[]; resumo: ResumoMetas }>(`/gestao-pessoas/metas?codFun=${codFun}`),
        api<{ itens: Matricula[]; resumo: ResumoTreinos }>(`/gestao-pessoas/colaboradores/${codFun}/treinamentos`),
        api<{ itens: Alerta[] }>(`/gestao-pessoas/colaboradores/${codFun}/riscos`),
        api<InsightIA | null>(`/gestao-pessoas/colaboradores/${codFun}/ia/resumo`),
      ]);
      if (!vivo) return;
      if (b.status !== 200 || !b.json) { setErro(true); setCarregando(false); return; }
      setBase(b.json);
      if (d.status === 200) setDesemp(d.json ?? null);
      if (c.status === 200) setComp(c.json ?? null);
      if (r.status === 200) setRf(r.json ?? null);
      if (m.status === 200) setMetas(m.json ?? null);
      if (t.status === 200) setTreinos(t.json ?? null);
      if (ri.status === 200) setRiscos(ri.json?.itens ?? null);
      if (insight.status === 200) setIa(insight.json ?? null);
      setCarregando(false);
    }
    void carregar();
    return () => { vivo = false; };
  }, [codFun]);

  const emitidoEm = useMemo(() => dataHora(new Date().toISOString()), []);

  async function baixar() {
    const secoes = ["identificacao", ...SECOES.filter((s) => ativas[s.id]).map((s) => s.id)];
    // Carimba a exportação antes de abrir o diálogo de impressão.
    await api(`/gestao-pessoas/colaboradores/${codFun}/exportacao`, { metodo: "POST", corpo: { secoes } });
    window.print();
  }

  if (erro) return <main style={{ padding: 32 }}><p style={{ color: "var(--text-muted)" }}>Colaborador não encontrado.</p></main>;
  if (carregando || !base) return <main style={{ padding: 32 }}><p style={{ color: "var(--text-muted)" }}>Montando relatório…</p></main>;

  const c = base.colaborador;
  const a = base.avaliacao;

  return (
    <div className="rel-root">
      <style>{estilos}</style>

      {/* Barra de controle — não sai na impressão */}
      <div className="no-print rel-toolbar">
        <Link href={`/app/gestao-pessoas/colaboradores/${codFun}`} className="rel-voltar">← Voltar ao painel</Link>
        <div className="rel-secoes">
          {SECOES.map((s) => (
            <label key={s.id} className="rel-chk">
              <input
                type="checkbox"
                checked={ativas[s.id]}
                onChange={(e) => setAtivas((v) => ({ ...v, [s.id]: e.target.checked }))}
              />
              {s.rotulo}
            </label>
          ))}
        </div>
        <button onClick={baixar} className="rel-baixar">Baixar PDF</button>
      </div>

      {/* Folha do relatório */}
      <div className="rel-folha">
        <header className="rel-cab">
          <div>
            <div className="rel-titulo">Relatório de desempenho 360</div>
            <div className="rel-sub">{c.empresa ?? "—"}</div>
          </div>
          <div className="rel-emissao">Emitido em {emitidoEm}</div>
        </header>

        {/* ── Identificação (sempre) ── */}
        <section className="rel-sec">
          <h2 className="rel-h2">Identificação</h2>
          <div className="rel-grid">
            <Campo r="Colaborador" v={c.nome} />
            <Campo r="Matrícula" v={c.numCad ?? "—"} />
            <Campo r="Cargo" v={c.cargo ?? "—"} />
            <Campo r="Departamento" v={c.departamento ?? "—"} />
            <Campo r="Admissão" v={data(c.dtAdm)} />
            <Campo r="Situação" v={c.situacao} />
            <Campo r="Ciclo avaliado" v={a?.ciclo.nome ?? "—"} />
            <Campo r="Nota atual" v={a?.notaAtual != null ? a.notaAtual.toFixed(1) : "—"} />
            <Campo r="Classificação" v={desemp?.classificacao?.rotulo ?? "—"} />
            <Campo r="Aderência ao acompanhamento" v={`${NIVEL_ADER[base.aderencia.nivel] ?? base.aderencia.nivel} (${base.aderencia.score}/100)`} />
            <Campo r="Avaliador" v={a?.avaliador ?? "—"} />
          </div>
        </section>

        {/* ── Desempenho ── */}
        {ativas.desempenho && desemp && (
          <section className="rel-sec">
            <h2 className="rel-h2">Desempenho</h2>
            <div className="rel-grid">
              <Campo r="Nota atual" v={desemp.notaAtual != null ? desemp.notaAtual.toFixed(1) : "—"} />
              <Campo r="Nota anterior" v={desemp.notaAnterior != null ? desemp.notaAnterior.toFixed(1) : "—"} />
              <Campo r="Tendência" v={desemp.tendencia != null ? `${desemp.tendencia > 0 ? "+" : ""}${desemp.tendencia.toFixed(1)}` : "—"} />
              <Campo r="Critérios avaliados" v={`${desemp.criteriosAvaliados}/${desemp.totalCriterios}`} />
            </div>
            {desemp.evolucao.length > 0 && (
              <>
                <h3 className="rel-h3">Evolução</h3>
                <table className="rel-tab">
                  <thead><tr><th>Ciclo</th><th>Encerrado</th><th className="num">Nota</th></tr></thead>
                  <tbody>
                    {desemp.evolucao.map((e, i) => (
                      <tr key={i}><td>{e.ciclo}</td><td>{data(e.dtFim)}</td><td className="num">{e.nota.toFixed(1)}</td></tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}
            <div className="rel-duas">
              {desemp.destaques.length > 0 && (
                <div>
                  <h3 className="rel-h3">Destaques</h3>
                  <ul className="rel-lista">{desemp.destaques.map((x, i) => <li key={i}>{x.competencia} — {x.nota.toFixed(1)}</li>)}</ul>
                </div>
              )}
              {desemp.atencao.length > 0 && (
                <div>
                  <h3 className="rel-h3">Pontos de atenção</h3>
                  <ul className="rel-lista">{desemp.atencao.map((x, i) => <li key={i}>{x.competencia} — {x.nota.toFixed(1)}</li>)}</ul>
                </div>
              )}
            </div>
          </section>
        )}

        {/* ── Competências + aderência ao cargo ── */}
        {ativas.competencias && comp && comp.competencias.length > 0 && (
          <section className="rel-sec">
            <h2 className="rel-h2">Competências {comp.ciclo ? `· ${comp.ciclo}` : ""}</h2>
            <table className="rel-tab">
              <thead>
                <tr>
                  <th>Competência</th>
                  <th className="num">Consolidada</th>
                  {comp.modo === "360" && comp.tipos.map((t) => <th key={t} className="num">{ROTULO_TIPO[t] ?? t}</th>)}
                  {comp.modo === "360" && <th>Percepções</th>}
                </tr>
              </thead>
              <tbody>
                {comp.competencias.map((k) => (
                  <tr key={k.codComp}>
                    <td>{k.nome}</td>
                    <td className="num">{k.notaConsolidada != null ? k.notaConsolidada.toFixed(1) : "—"}</td>
                    {comp.modo === "360" && comp.tipos.map((t) => {
                      const n = k.porTipo.find((p) => p.tipo === t);
                      return <td key={t} className="num">{n ? n.nota.toFixed(1) : "—"}</td>;
                    })}
                    {comp.modo === "360" && <td className="rel-menor">{k.alerta ?? "—"}</td>}
                  </tr>
                ))}
              </tbody>
            </table>

            {rf && rf.competencias.length > 0 && (
              <>
                <h3 className="rel-h3">Aderência ao cargo{rf.cargo ? ` · ${rf.cargo}` : ""}</h3>
                <table className="rel-tab">
                  <thead><tr><th>Competência</th><th>Criticidade</th><th className="num">Esperado</th><th className="num">Atual</th><th>Situação</th></tr></thead>
                  <tbody>
                    {rf.competencias.map((e, i) => (
                      <tr key={i}>
                        <td>{e.nome}</td>
                        <td className="rel-menor">{e.criticidade}</td>
                        <td className="num">{e.esperado.toFixed(1)}</td>
                        <td className="num">{e.atual != null ? e.atual.toFixed(1) : "—"}</td>
                        <td className="rel-menor">{e.situacaoRotulo}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}
          </section>
        )}

        {/* ── Metas ── */}
        {ativas.metas && metas && (
          <section className="rel-sec">
            <h2 className="rel-h2">Metas</h2>
            <p className="rel-resumo">
              {metas.resumo.total} no total · {metas.resumo.concluidas} concluídas · {metas.resumo.andamento} em andamento ·
              {" "}{metas.resumo.atrasadas} atrasadas · {metas.resumo.emRisco} em risco · progresso ponderado {metas.resumo.progressoPonderado}%.
              {" "}As metas são acompanhadas ao lado da nota — não a alteram.
            </p>
            {metas.itens.length > 0 ? (
              <table className="rel-tab">
                <thead><tr><th>Meta</th><th className="num">Peso</th><th>Prazo</th><th className="num">Progresso</th><th>Status</th></tr></thead>
                <tbody>
                  {metas.itens.map((m) => (
                    <tr key={m.codMeta}>
                      <td>{m.titulo}</td>
                      <td className="num">{m.peso}</td>
                      <td>{data(m.prazo)}</td>
                      <td className="num">{m.progresso}%</td>
                      <td className="rel-menor">{STATUS_META[m.status] ?? m.status}{m.emRisco ? " · em risco" : ""}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : <p className="rel-vazio">Sem metas registradas.</p>}
          </section>
        )}

        {/* ── Treinamentos ── */}
        {ativas.treinamentos && treinos && (
          <section className="rel-sec">
            <h2 className="rel-h2">Treinamentos</h2>
            <p className="rel-resumo">
              {treinos.resumo.total} no total · {treinos.resumo.concluidos} concluídos · {treinos.resumo.emAndamento} em andamento ·
              {" "}{treinos.resumo.pendentes} pendentes · {treinos.resumo.vencidos} vencidos.
            </p>
            {treinos.itens.length > 0 ? (
              <table className="rel-tab">
                <thead><tr><th>Treinamento</th><th>Obrigatório</th><th className="num">Progresso</th><th>Vencimento</th><th>Status</th></tr></thead>
                <tbody>
                  {treinos.itens.map((t) => (
                    <tr key={t.codMat}>
                      <td>{t.nome}</td>
                      <td className="rel-menor">{t.obrigatorio ? "Sim" : "—"}</td>
                      <td className="num">{t.progresso}%</td>
                      <td>{data(t.dtVencimento)}</td>
                      <td className="rel-menor">{STATUS_TREINO[t.status] ?? t.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : <p className="rel-vazio">Sem treinamentos registrados.</p>}
          </section>
        )}

        {/* ── Riscos e alertas ── */}
        {ativas.riscos && riscos && (
          <section className="rel-sec">
            <h2 className="rel-h2">Riscos e alertas</h2>
            {riscos.length > 0 ? (
              <div className="rel-alertas">
                {riscos.map((al) => (
                  <div key={al.chave} className="rel-alerta">
                    <div className="rel-alerta-cab"><strong>{al.titulo}</strong><span className="rel-menor"> · {NIVEL_ALERTA[al.nivel] ?? al.nivel}</span></div>
                    <div className="rel-menor">Regra: {al.regra}</div>
                    <div className="rel-menor">Ação recomendada: {al.acaoRecomendada}</div>
                  </div>
                ))}
              </div>
            ) : <p className="rel-vazio">Nenhum alerta ativo — nada a sinalizar.</p>}
          </section>
        )}

        {/* ── Resumo IA ── */}
        {ativas.ia && ia && (
          <section className="rel-sec">
            <h2 className="rel-h2">Resumo inteligente (IA)</h2>
            <p className="rel-resumo">{ia.conteudoJson.resumo}</p>
            {ia.conteudoJson.tendencia && <p className="rel-menor"><strong>Tendência:</strong> {ia.conteudoJson.tendencia}</p>}
            {ia.conteudoJson.fatos?.length > 0 && (
              <><h3 className="rel-h3">Fatos observados</h3><ul className="rel-lista">{ia.conteudoJson.fatos.map((x, i) => <li key={i}>{x}</li>)}</ul></>
            )}
            {ia.conteudoJson.recomendacoes?.length > 0 && (
              <><h3 className="rel-h3">Recomendações</h3><ul className="rel-lista">{ia.conteudoJson.recomendacoes.map((x, i) => <li key={i}>{x}</li>)}</ul></>
            )}
            {ia.conteudoJson.validacaoHumana?.length > 0 && (
              <><h3 className="rel-h3">Requer validação humana</h3><ul className="rel-lista">{ia.conteudoJson.validacaoHumana.map((x, i) => <li key={i}>{x}</li>)}</ul></>
            )}
            <p className="rel-menor rel-ia-fonte">
              Gerado por {ia.provedor ?? "IA"}{ia.modeloUsado ? ` (${ia.modeloUsado})` : ""} em {dataHora(ia.dhInc)}. A IA explica com base nos dados registrados — não inventa nem decide.
            </p>
          </section>
        )}

        <footer className="rel-rodape">
          Este relatório reúne evidências de desempenho, desenvolvimento e gestão para apoiar a <strong>decisão humana</strong>.
          O sistema não decide promoção, desligamento, mérito nem sucessão — essas decisões são sempre das pessoas responsáveis.
          Documento gerado a partir dos dados registrados na plataforma na data de emissão.
        </footer>
      </div>
    </div>
  );
}

function Campo({ r, v }: { r: string; v: string }) {
  return (
    <div className="rel-campo">
      <div className="rel-campo-r">{r}</div>
      <div className="rel-campo-v">{v}</div>
    </div>
  );
}

const estilos = `
.rel-root { background: var(--surface-page); min-height: 100vh; }
.rel-toolbar { position: sticky; top: 0; z-index: 5; display: flex; align-items: center; gap: 16px; flex-wrap: wrap;
  padding: 12px 24px; background: var(--surface-default); border-bottom: 1px solid var(--border-default); }
.rel-voltar { font-size: 13px; color: var(--text-link); text-decoration: none; }
.rel-secoes { display: flex; gap: 14px; flex-wrap: wrap; margin-right: auto; }
.rel-chk { display: flex; align-items: center; gap: 5px; font-size: 12px; color: var(--text-muted); cursor: pointer; }
.rel-baixar { padding: 8px 18px; border-radius: 6px; border: 1px solid var(--brand-700); background: var(--brand-700);
  color: #fff; font-size: 13px; font-weight: 600; cursor: pointer; font-family: inherit; }
.rel-folha { max-width: 820px; margin: 24px auto; background: #fff; color: #1a1a1a; padding: 40px 44px;
  border: 1px solid var(--border-default); border-radius: 8px; box-shadow: 0 1px 4px rgba(0,0,0,.06); }
.rel-cab { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px;
  border-bottom: 2px solid #1a1a1a; padding-bottom: 12px; margin-bottom: 20px; }
.rel-titulo { font-size: 20px; font-weight: 700; }
.rel-sub { font-size: 13px; color: #555; margin-top: 2px; }
.rel-emissao { font-size: 11px; color: #666; white-space: nowrap; }
.rel-sec { margin: 22px 0; page-break-inside: avoid; }
.rel-h2 { font-size: 15px; font-weight: 700; margin: 0 0 10px; padding-bottom: 4px; border-bottom: 1px solid #ddd; }
.rel-h3 { font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: .04em; color: #555; margin: 14px 0 6px; }
.rel-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px 20px; }
.rel-campo-r { font-size: 10px; text-transform: uppercase; letter-spacing: .04em; color: #777; }
.rel-campo-v { font-size: 13px; font-weight: 600; margin-top: 1px; }
.rel-tab { width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 4px; }
.rel-tab th { text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: .03em; color: #777;
  border-bottom: 1px solid #ccc; padding: 5px 8px; }
.rel-tab td { border-bottom: 1px solid #eee; padding: 5px 8px; }
.rel-tab .num { text-align: right; }
.rel-menor { font-size: 11px; color: #555; }
.rel-lista { margin: 4px 0 0; padding-left: 18px; font-size: 12px; line-height: 1.55; }
.rel-duas { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 4px; }
.rel-resumo { font-size: 12px; line-height: 1.55; color: #333; margin: 0 0 8px; }
.rel-vazio { font-size: 12px; color: #777; margin: 4px 0; }
.rel-alertas { display: grid; gap: 8px; }
.rel-alerta { border: 1px solid #e5e5e5; border-left: 3px solid #999; border-radius: 5px; padding: 8px 10px; }
.rel-alerta-cab { font-size: 13px; margin-bottom: 2px; }
.rel-ia-fonte { margin-top: 10px; font-style: italic; }
.rel-rodape { margin-top: 28px; padding-top: 12px; border-top: 1px solid #ddd; font-size: 10.5px; line-height: 1.5; color: #666; }

@media print {
  .no-print { display: none !important; }
  .rel-root { background: #fff; }
  .rel-folha { max-width: none; margin: 0; border: none; border-radius: 0; box-shadow: none; padding: 0; }
  @page { margin: 18mm 16mm; }
}
`;
