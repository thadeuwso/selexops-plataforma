"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";

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
  "Um avaliador só": "var(--text-muted)",
  "Sem avaliações ainda": "var(--text-muted)",
};

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

/**
 * Competências com comparação entre avaliadores (performance-360, Fase 5).
 * No modo 360, uma coluna por tipo de avaliador + a consolidada e um alerta
 * neutro. No modo simples, só a nota da competência.
 */
export function Competencias360({ codFun }: { codFun: string }) {
  const [d, setD] = useState<Dados | null>(null);

  useEffect(() => {
    void api<Dados>(`/gestao-pessoas/colaboradores/${codFun}/competencias`).then((r) => {
      if (r.status === 200 && r.json) setD(r.json);
    });
  }, [codFun]);

  if (!d) return <p style={{ fontSize: 13, color: "var(--text-muted)" }}>Carregando…</p>;
  if (d.competencias.length === 0)
    return <p style={{ fontSize: 13, color: "var(--text-muted)" }}>Nenhuma competência avaliada ainda.</p>;

  const tiposDistintos = Array.from(new Set(d.tipos));

  return (
    <div style={{ display: "grid", gap: 12 }}>
      {d.modo === "360" && (
        <p style={{ fontSize: 12, color: "var(--text-muted)", margin: 0 }}>
          Avaliação 360 · {d.ciclo}. A consolidada pondera cada avaliador pelo peso do seu tipo.
        </p>
      )}

      <div style={{ border: "1px solid var(--border-default)", borderRadius: 10, overflow: "hidden" }}>
        {/* Cabeçalho */}
        <div style={{ display: "grid", gridTemplateColumns: `1.6fr ${d.modo === "360" ? tiposDistintos.map(() => "0.7fr").join(" ") + " 0.8fr 1.1fr" : "0.8fr"}`, gap: 8, padding: "10px 14px", background: "var(--surface-muted, rgba(0,0,0,.03))", fontSize: 11, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: ".03em" }}>
          <span>Competência</span>
          {d.modo === "360" && tiposDistintos.map((t) => <span key={t} style={{ textAlign: "center" }}>{ROTULO_TIPO[t] ?? t}</span>)}
          <span style={{ textAlign: "center" }}>{d.modo === "360" ? "Consolidada" : "Nota"}</span>
          {d.modo === "360" && <span style={{ textAlign: "right" }}>Percepção</span>}
        </div>

        {d.competencias.map((c) => {
          const porTipo = Object.fromEntries(c.porTipo.map((x) => [x.tipo, x.nota]));
          return (
            <div key={c.codComp} style={{ display: "grid", gridTemplateColumns: `1.6fr ${d.modo === "360" ? tiposDistintos.map(() => "0.7fr").join(" ") + " 0.8fr 1.1fr" : "0.8fr"}`, gap: 8, padding: "12px 14px", borderTop: "1px solid var(--border-default)", fontSize: 13, alignItems: "center" }}>
              <div>
                <div style={{ fontWeight: 500 }}>{c.nome}</div>
                <div style={{ fontSize: 11, color: "var(--text-muted)" }}>peso {c.peso}</div>
              </div>
              {d.modo === "360" &&
                tiposDistintos.map((t) => (
                  <span key={t} style={{ textAlign: "center", color: porTipo[t] != null ? "var(--text-body)" : "var(--text-muted)" }}>
                    {porTipo[t] != null ? porTipo[t].toFixed(1) : "—"}
                  </span>
                ))}
              <span style={{ textAlign: "center", fontWeight: 700 }}>
                {c.notaConsolidada != null ? c.notaConsolidada.toFixed(1) : "—"}
              </span>
              {d.modo === "360" && (
                <span style={{ textAlign: "right", fontSize: 11, fontWeight: 600, color: c.alerta ? COR_ALERTA[c.alerta] ?? "var(--text-muted)" : "var(--text-muted)" }}>
                  {c.alerta ?? "—"}
                  {c.dispersao != null && c.dispersao > 0 ? ` (Δ${c.dispersao.toFixed(1)})` : ""}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
