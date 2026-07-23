"use client";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Gaveta } from "@/componentes/formulario";

const ROTULO_TIPO: Record<string, string> = {
  AUTO: "Autoaval.",
  GESTOR: "Gestor",
  PAR: "Pares",
  LIDERADO: "Liderados",
  COMITE: "Comitê",
  CLIENTE_INTERNO: "Cliente",
};
const COR_ALERTA: Record<string, string> = {
  "Percepções alinhadas": "var(--feedback-success, #15803d)",
  "Diferença moderada": "var(--amber-700, #714E08)",
  "Percepções divergentes": "var(--feedback-danger, #b91c1c)",
};
const COR_SITUACAO: Record<string, string> = {
  ABAIXO: "var(--feedback-danger, #b91c1c)",
  PARCIAL: "var(--amber-700, #714E08)",
  ADERENTE: "var(--feedback-success, #15803d)",
  ACIMA: "var(--text-link)",
  SEM_DADO: "var(--text-muted)",
};

// Escala sequencial (uma cor, clara→escura) para o heatmap — número sempre visível.
function corNota(nota: number | null): { bg: string; fg: string } {
  if (nota == null) return { bg: "transparent", fg: "var(--text-muted)" };
  const pct = 18 + ((Math.max(1, Math.min(5, nota)) - 1) / 4) * 74; // 18%..92%
  return {
    bg: `color-mix(in srgb, var(--brand-700) ${pct}%, var(--surface-default))`,
    fg: pct >= 55 ? "#fff" : "var(--text-body)",
  };
}

interface Comp {
  codComp: string;
  nome: string;
  descricao: string | null;
  peso: number;
  notaConsolidada: number | null;
  porTipo: { tipo: string; nota: number }[];
  dispersao: number | null;
  alerta: string | null;
}
interface Dados {
  ciclo: string | null;
  modo: "SIMPLES" | "360";
  tipos: string[];
  competencias: Comp[];
}
interface RoleFit {
  cargo: string | null;
  competencias: {
    nome: string;
    criticidade: string;
    esperado: number;
    atual: number | null;
    distancia: number | null;
    situacao: string;
    situacaoRotulo: string;
  }[];
}

export function Competencias360({ codFun }: { codFun: string }) {
  const [d, setD] = useState<Dados | null>(null);
  const [rf, setRf] = useState<RoleFit | null>(null);
  const [detalhe, setDetalhe] = useState<string | null>(null);

  useEffect(() => {
    void api<Dados>(`/gestao-pessoas/colaboradores/${codFun}/competencias`).then((r) => r.status === 200 && r.json && setD(r.json));
    void api<RoleFit>(`/gestao-pessoas/colaboradores/${codFun}/aderencia-cargo`).then((r) => r.status === 200 && r.json && setRf(r.json));
  }, [codFun]);

  if (!d) return <p style={{ fontSize: 13, color: "var(--text-muted)" }}>Carregando…</p>;

  const tiposDistintos = Array.from(new Set(d.tipos));
  const is360 = d.modo === "360";

  return (
    <div style={{ display: "grid", gap: 24 }}>
      {/* Comparação / heatmap */}
      <section>
        <h3 style={{ fontSize: 15, fontWeight: 600, margin: "0 0 4px" }}>Competências avaliadas</h3>
        <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "0 0 10px" }}>
          {is360
            ? `Avaliação 360 · ${d.ciclo}. Cada avaliador pondera pelo peso do seu tipo; toque numa competência para o detalhe.`
            : "Toque numa competência para ver o detalhe."}
        </p>

        {d.competencias.length === 0 ? (
          <p style={{ fontSize: 13, color: "var(--text-muted)" }}>Nenhuma competência avaliada ainda.</p>
        ) : (
          <div style={{ border: "1px solid var(--border-default)", borderRadius: 10, overflow: "hidden" }}>
            <div style={{ display: "grid", gridTemplateColumns: `1.6fr ${is360 ? tiposDistintos.map(() => "0.7fr").join(" ") + " 0.8fr 1.1fr" : "0.8fr"}`, gap: 8, padding: "10px 14px", background: "var(--surface-muted, rgba(0,0,0,.03))", fontSize: 11, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: ".03em" }}>
              <span>Competência</span>
              {is360 && tiposDistintos.map((t) => <span key={t} style={{ textAlign: "center" }}>{ROTULO_TIPO[t] ?? t}</span>)}
              <span style={{ textAlign: "center" }}>{is360 ? "Consolidada" : "Nota"}</span>
              {is360 && <span style={{ textAlign: "right" }}>Percepção</span>}
            </div>

            {d.competencias.map((c) => {
              const porTipo = Object.fromEntries(c.porTipo.map((x) => [x.tipo, x.nota]));
              return (
                <button
                  key={c.codComp}
                  onClick={() => setDetalhe(c.codComp)}
                  style={{ width: "100%", textAlign: "left", display: "grid", gridTemplateColumns: `1.6fr ${is360 ? tiposDistintos.map(() => "0.7fr").join(" ") + " 0.8fr 1.1fr" : "0.8fr"}`, gap: 8, padding: "10px 14px", borderTop: "1px solid var(--border-default)", fontSize: 13, alignItems: "center", background: "none", cursor: "pointer", fontFamily: "inherit", color: "var(--text-body)" }}
                >
                  <div>
                    <div style={{ fontWeight: 500 }}>{c.nome}</div>
                    <div style={{ fontSize: 11, color: "var(--text-muted)" }}>peso {c.peso}</div>
                  </div>
                  {is360 &&
                    tiposDistintos.map((t) => {
                      const nota = porTipo[t] ?? null;
                      const cor = corNota(nota);
                      return (
                        <span key={t} style={{ justifySelf: "center", minWidth: 30, textAlign: "center", padding: "4px 0", borderRadius: 6, background: cor.bg, color: cor.fg, fontWeight: 600 }}>
                          {nota != null ? nota.toFixed(1) : "—"}
                        </span>
                      );
                    })}
                  <span style={{ textAlign: "center", fontWeight: 700 }}>{c.notaConsolidada != null ? c.notaConsolidada.toFixed(1) : "—"}</span>
                  {is360 && (
                    <span style={{ textAlign: "right", fontSize: 11, fontWeight: 600, color: c.alerta ? COR_ALERTA[c.alerta] ?? "var(--text-muted)" : "var(--text-muted)" }}>
                      {c.alerta ?? "—"}{c.dispersao != null && c.dispersao > 0 ? ` (Δ${c.dispersao.toFixed(1)})` : ""}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </section>

      {/* Aderência ao cargo (role-fit) */}
      {rf && rf.competencias.length > 0 && (
        <section>
          <h3 style={{ fontSize: 15, fontWeight: 600, margin: "0 0 4px" }}>Aderência ao cargo</h3>
          <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "0 0 10px" }}>
            {rf.cargo ? `Competências esperadas do cargo ${rf.cargo}` : "Competências esperadas"} × a nota atual. Estar
            acima do esperado é neutro.
          </p>
          <div style={{ border: "1px solid var(--border-default)", borderRadius: 10, overflow: "hidden" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1.8fr 0.8fr 0.8fr 1.4fr", gap: 8, padding: "10px 14px", background: "var(--surface-muted, rgba(0,0,0,.03))", fontSize: 11, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: ".03em" }}>
              <span>Competência</span>
              <span style={{ textAlign: "center" }}>Esperado</span>
              <span style={{ textAlign: "center" }}>Atual</span>
              <span style={{ textAlign: "right" }}>Situação</span>
            </div>
            {rf.competencias.map((c, i) => (
              <div key={i} style={{ display: "grid", gridTemplateColumns: "1.8fr 0.8fr 0.8fr 1.4fr", gap: 8, padding: "11px 14px", borderTop: "1px solid var(--border-default)", fontSize: 13, alignItems: "center" }}>
                <div>
                  <span style={{ fontWeight: 500 }}>{c.nome}</span>
                  {c.criticidade === "ALTA" && <span style={{ fontSize: 10, color: "var(--feedback-danger, #b91c1c)", marginLeft: 6, fontWeight: 600 }}>CRÍTICA</span>}
                </div>
                <span style={{ textAlign: "center", color: "var(--text-muted)" }}>{c.esperado.toFixed(1)}</span>
                <span style={{ textAlign: "center", fontWeight: 600 }}>{c.atual != null ? c.atual.toFixed(1) : "—"}</span>
                <span style={{ textAlign: "right", fontSize: 12, fontWeight: 600, color: COR_SITUACAO[c.situacao] ?? "var(--text-muted)" }}>
                  {c.situacaoRotulo}{c.distancia != null && c.distancia !== 0 ? ` (${c.distancia > 0 ? "+" : ""}${c.distancia.toFixed(1)})` : ""}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {detalhe && <DetalheCompetencia codFun={codFun} codComp={detalhe} fechar={() => setDetalhe(null)} />}
    </div>
  );
}

interface Detalhe {
  nome: string;
  descricao: string | null;
  peso: number;
  notaConsolidada: number | null;
  porAvaliador: { tipo: string; nota: number; comentario: string | null }[];
  esperado: { nivel: number; situacaoRotulo: string } | null;
  acoesRelacionadas: { descricao: string; tipo: string; status: string }[];
}

function DetalheCompetencia({ codFun, codComp, fechar }: { codFun: string; codComp: string; fechar: () => void }) {
  const [d, setD] = useState<Detalhe | null>(null);

  const carregar = useCallback(async () => {
    const r = await api<Detalhe>(`/gestao-pessoas/colaboradores/${codFun}/competencias/${codComp}`);
    if (r.status === 200 && r.json) setD(r.json);
  }, [codFun, codComp]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  return (
    <Gaveta titulo={d?.nome ?? "Competência"} aberta fechar={fechar} largura={480}>
      {!d ? (
        <p style={{ fontSize: 13, color: "var(--text-muted)" }}>Carregando…</p>
      ) : (
        <div style={{ display: "grid", gap: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <span style={{ fontSize: 12, color: "var(--text-muted)" }}>peso {d.peso}</span>
            <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Nota: <strong style={{ fontSize: 22, color: "var(--text-body)" }}>{d.notaConsolidada != null ? d.notaConsolidada.toFixed(1) : "—"}</strong></span>
          </div>
          {d.descricao && <p style={{ fontSize: 13, color: "var(--text-muted)", margin: 0, lineHeight: 1.5 }}>{d.descricao}</p>}

          {d.esperado && (
            <div style={{ fontSize: 13, border: "1px solid var(--border-default)", borderRadius: 8, padding: "10px 12px" }}>
              Esperado do cargo: <strong>{d.esperado.nivel.toFixed(1)}</strong> — {d.esperado.situacaoRotulo}
            </div>
          )}

          {d.porAvaliador.length > 0 && (
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", marginBottom: 6 }}>Por avaliador</div>
              <div style={{ display: "grid", gap: 6 }}>
                {d.porAvaliador.map((a, i) => (
                  <div key={i} style={{ border: "1px solid var(--border-default)", borderRadius: 8, padding: "8px 10px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                      <span>{ROTULO_TIPO[a.tipo] ?? a.tipo}</span>
                      <strong>{a.nota.toFixed(1)}</strong>
                    </div>
                    {a.comentario && <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2, fontStyle: "italic" }}>{a.comentario}</div>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {d.acoesRelacionadas.length > 0 && (
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", marginBottom: 6 }}>Ações de desenvolvimento relacionadas</div>
              <ul style={{ margin: 0, paddingLeft: 18, display: "grid", gap: 4 }}>
                {d.acoesRelacionadas.map((a, i) => (
                  <li key={i} style={{ fontSize: 13 }}>{a.descricao} <span style={{ color: "var(--text-muted)", fontSize: 11 }}>({a.status.toLowerCase()})</span></li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </Gaveta>
  );
}
