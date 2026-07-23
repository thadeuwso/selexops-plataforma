"use client";
import { useState } from "react";
import { PdiFuncionario } from "@/componentes/pdi-funcionario";
import { FeedbackFuncionario } from "@/componentes/feedback-funcionario";

/**
 * Sub-navegação da aba Desenvolvimento: plano (PDI) e feedbacks são coisas
 * distintas do mesmo tema, e cada uma já é densa o bastante para não caberem
 * empilhadas na mesma rolagem.
 */
export function DesenvolvimentoTabs({ codFun }: { codFun: string }) {
  const [sub, setSub] = useState<"pdi" | "feedback">("pdi");

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div style={{ display: "flex", gap: 4, borderBottom: "1px solid var(--border-default)" }}>
        {[
          { id: "pdi" as const, rotulo: "Plano" },
          { id: "feedback" as const, rotulo: "Feedbacks" },
        ].map((s) => (
          <button
            key={s.id}
            onClick={() => setSub(s.id)}
            style={{
              padding: "8px 14px",
              border: "none",
              borderBottom: sub === s.id ? "2px solid var(--brand-700)" : "2px solid transparent",
              background: "none",
              fontFamily: "inherit",
              fontSize: 13,
              fontWeight: sub === s.id ? 600 : 400,
              color: sub === s.id ? "var(--text-body)" : "var(--text-muted)",
              cursor: "pointer",
            }}
          >
            {s.rotulo}
          </button>
        ))}
      </div>

      {sub === "pdi" ? <PdiFuncionario codFun={codFun} /> : <FeedbackFuncionario codFun={codFun} />}
    </div>
  );
}
