"use client";
import type { Colaborador360 } from "@/componentes/colaborador-360/header";

const NIVEL: Record<string, { texto: string; cor: string }> = {
  ADERENTE: { texto: "Aderente", cor: "var(--feedback-success, #15803d)" },
  ATENCAO: { texto: "Atenção", cor: "var(--amber-700, #714E08)" },
  RISCO: { texto: "Em risco", cor: "var(--feedback-danger, #b91c1c)" },
};

/**
 * Visão 360 (performance-360, Fase 3) — resumo executivo a partir do agregador.
 *
 * Prioridade de leitura: resumo → nota/tendência → aderência → contexto (PDI,
 * feedbacks). Blocos mais ricos (evolução, competências, IA) chegam nas próximas
 * fases; aqui já se responde "como está e o que puxa atenção".
 */
export function Visao360({ dados }: { dados: Colaborador360 }) {
  const a = dados.avaliacao;
  const nivel = NIVEL[dados.aderencia.nivel];

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
        <Cartao titulo="Nota geral">
          <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
            <span style={{ fontSize: 34, fontWeight: 700 }}>{a?.notaAtual != null ? a.notaAtual.toFixed(1) : "—"}</span>
            <span style={{ fontSize: 13, color: "var(--text-muted)" }}>de 5,0</span>
          </div>
          {a?.tendencia != null && a.tendencia !== 0 ? (
            <div style={{ fontSize: 12, color: a.tendencia > 0 ? "var(--feedback-success, #15803d)" : "var(--feedback-danger, #b91c1c)", marginTop: 2 }}>
              {a.tendencia > 0 ? "▲" : "▼"} {Math.abs(a.tendencia).toFixed(1)} vs. ciclo anterior
            </div>
          ) : (
            <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
              {a?.notaAnterior != null ? "Sem variação" : "Sem ciclo anterior concluído"}
            </div>
          )}
        </Cartao>

        <Cartao titulo="Avaliação">
          <div style={{ fontSize: 15, fontWeight: 600 }}>
            {a ? `${a.competenciasComNota}/${a.totalCompetencias}` : "—"}
            <span style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 400 }}> critérios avaliados</span>
          </div>
          <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>
            {a?.avaliador ? `Avaliador: ${a.avaliador}` : "Sem avaliador definido"}
          </div>
        </Cartao>

        <Cartao titulo="Aderência ao desenvolvimento">
          <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
            <span style={{ fontSize: 30, fontWeight: 700 }}>{dados.aderencia.score}</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: nivel.cor }}>{nivel.texto}</span>
          </div>
        </Cartao>

        <Cartao titulo="Desenvolvimento">
          <div style={{ fontSize: 13, lineHeight: 1.7 }}>
            <div>{dados.resumo.planosAtivos} plano(s) ativo(s)</div>
            <div>{dados.resumo.acoesPendentes} ação(ões) pendente(s)</div>
            <div>
              {dados.resumo.feedbacks} feedback(s)
              {dados.resumo.feedbacksSemCiencia > 0 && (
                <span style={{ color: "var(--amber-700, #714E08)" }}> · {dados.resumo.feedbacksSemCiencia} sem ciência</span>
              )}
            </div>
          </div>
        </Cartao>
      </div>

      <div
        style={{
          border: "1px dashed var(--border-default)",
          borderRadius: 10,
          padding: 20,
          color: "var(--text-muted)",
          fontSize: 13,
          lineHeight: 1.6,
        }}
      >
        Evolução histórica, comparação entre avaliadores, competências detalhadas, metas, resumo por IA e próximos
        passos entram nas próximas fases do Painel 360. Esta é a estrutura base (Fase 3): identidade, nota,
        aderência e contexto de desenvolvimento — já a partir dos dados reais do colaborador.
      </div>
    </div>
  );
}

function Cartao({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div style={{ border: "1px solid var(--border-default)", borderRadius: 10, padding: 16, background: "var(--surface-default)" }}>
      <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 8 }}>{titulo}</div>
      {children}
    </div>
  );
}
