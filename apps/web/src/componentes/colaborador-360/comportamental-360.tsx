"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";

interface Fator {
  sigla: string;
  nome: string;
  percentual: number;
  faixa: string;
}
interface Perfil {
  temPerfil: boolean;
  versaoMetodologia?: string;
  indicadorConsistencia?: string;
  dhCalc?: string;
  fatores?: Fator[];
}

const data = (iso: string) => new Date(iso).toLocaleDateString("pt-BR");

/**
 * Perfil comportamental do colaborador (performance-360, Fase 8).
 *
 * Vem do módulo comportamental (recrutamento) pela candidatura que o admitiu.
 * Só leitura, com aviso metodológico — não vira nota nem decide promoção.
 */
export function Comportamental360({ codFun }: { codFun: string }) {
  const [p, setP] = useState<Perfil | null>(null);

  useEffect(() => {
    void api<Perfil>(`/gestao-pessoas/colaboradores/${codFun}/comportamental`).then((r) => {
      if (r.status === 200 && r.json) setP(r.json);
    });
  }, [codFun]);

  if (!p) return <p style={{ fontSize: 13, color: "var(--text-muted)" }}>Carregando…</p>;

  if (!p.temPerfil) {
    return (
      <div style={{ border: "1px dashed var(--border-default)", borderRadius: 10, padding: 24, color: "var(--text-muted)", fontSize: 13, lineHeight: 1.6 }}>
        Sem perfil comportamental. Ele vem da avaliação comportamental — hoje, do processo seletivo que admitiu a
        pessoa. Iniciar uma avaliação diretamente para o colaborador entra numa próxima leva.
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8, fontSize: 12, color: "var(--text-muted)" }}>
        <span>Metodologia: {p.versaoMetodologia}</span>
        <span>Consistência: {p.indicadorConsistencia} · {p.dhCalc ? data(p.dhCalc) : ""}</span>
      </div>

      <div style={{ border: "1px solid var(--border-default)", borderRadius: 10, padding: 16, display: "grid", gap: 12 }}>
        {(p.fatores ?? []).map((f) => (
          <div key={f.sigla}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
              <span style={{ fontWeight: 500 }}>{f.nome}</span>
              <span style={{ color: "var(--text-muted)" }}>{f.percentual.toFixed(0)}% · {f.faixa}</span>
            </div>
            <div style={{ height: 8, background: "var(--border-default)", borderRadius: 999, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${Math.max(0, Math.min(100, f.percentual))}%`, background: "var(--brand-700)", borderRadius: 999 }} />
            </div>
          </div>
        ))}
      </div>

      <div style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.6, background: "var(--surface-muted, rgba(0,0,0,.03))", border: "1px solid var(--border-default)", borderRadius: 8, padding: 12 }}>
        <strong>Aviso metodológico.</strong> O perfil descreve preferências e estilo — não é diagnóstico, não afirma
        causalidade e não deve ser usado para definir nota, aprovar, reprovar, promover ou desligar. Deve ser lido
        junto do contexto e do desempenho observado.
      </div>
    </div>
  );
}
