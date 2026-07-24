"use client";
import Link from "next/link";

export interface Colaborador360 {
  colaborador: {
    codFun: string;
    nome: string;
    numCad: string | null;
    cargo: string | null;
    departamento: string | null;
    empresa: string | null;
    dtAdm: string;
    situacao: string;
  };
  avaliacao: {
    codAval: string;
    status: string;
    avaliador: string | null;
    notaAtual: number | null;
    notaAnterior: number | null;
    tendencia: number | null;
    competenciasComNota: number;
    totalCompetencias: number;
    ciclo: { codCiclo: string; nome: string; dtInicio: string; dtFim: string; status: string };
  } | null;
  resumo: { planosAtivos: number; acoesPendentes: number; feedbacks: number; feedbacksSemCiencia: number; metasTotal: number; metasConcluidas: number; metasEmRisco: number; metasProgresso: number; treinosPendentes: number; treinosVencidos: number; treinosConcluidos: number };
  aderencia: { score: number; nivel: "ADERENTE" | "ATENCAO" | "RISCO" };
}

const STATUS_AVAL: Record<string, string> = {
  PENDENTE: "Pendente",
  EM_ANDAMENTO: "Em andamento",
  CONCLUIDA: "Concluída",
};

function iniciais(nome: string) {
  const p = nome.trim().split(/\s+/);
  return ((p[0]?.[0] ?? "") + (p.length > 1 ? p[p.length - 1][0] : "")).toUpperCase();
}

function tempoDeCasa(dtAdm: string) {
  const meses = Math.max(0, Math.round((Date.now() - new Date(dtAdm).getTime()) / (30.44 * 864e5)));
  const anos = Math.floor(meses / 12);
  const rem = meses % 12;
  if (anos === 0) return `${rem} ${rem === 1 ? "mês" : "meses"}`;
  if (rem === 0) return `${anos} ${anos === 1 ? "ano" : "anos"}`;
  return `${anos}a ${rem}m`;
}

/**
 * Cabeçalho compacto e fixo do Painel 360 (performance-360, Fase 3).
 * Identidade + métricas-chave num bloco baixo que gruda no topo ao rolar.
 */
export function Colaborador360Header({ dados }: { dados: Colaborador360 }) {
  const c = dados.colaborador;
  const a = dados.avaliacao;

  return (
    <div
      style={{
        position: "sticky",
        top: 0,
        zIndex: 10,
        background: "var(--surface-default)",
        borderBottom: "1px solid var(--border-default)",
        padding: "16px 32px",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
        <Link
          href="/app/gestao-pessoas/desempenho"
          style={{ fontSize: 12, color: "var(--text-link)", textDecoration: "none" }}
        >
          ← Avaliação de desempenho
        </Link>
        <Link
          href={`/app/gestao-pessoas/colaboradores/${c.codFun}/relatorio`}
          style={{
            fontSize: 12,
            padding: "5px 12px",
            borderRadius: 6,
            border: "1px solid var(--border-default)",
            color: "var(--text-body)",
            textDecoration: "none",
            background: "var(--surface-default)",
          }}
        >
          Exportar relatório
        </Link>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 20, marginTop: 10, flexWrap: "wrap" }}>
        {/* Identidade */}
        <div style={{ display: "flex", alignItems: "center", gap: 14, minWidth: 260 }}>
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: "50%",
              background: "var(--brand-700)",
              color: "#fff",
              display: "grid",
              placeItems: "center",
              fontSize: 18,
              fontWeight: 600,
              flexShrink: 0,
            }}
          >
            {iniciais(c.nome)}
          </div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 600, lineHeight: 1.2 }}>{c.nome}</div>
            <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
              {[c.cargo, c.departamento, c.empresa].filter(Boolean).join(" · ") || "—"}
            </div>
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
              Admissão {new Date(c.dtAdm).toLocaleDateString("pt-BR")} · {tempoDeCasa(c.dtAdm)} de casa · {c.situacao}
            </div>
          </div>
        </div>

        {/* Métricas */}
        <div style={{ display: "flex", gap: 24, marginLeft: "auto", flexWrap: "wrap" }}>
          <Metrica rotulo="Ciclo">
            <span style={{ fontSize: 13, fontWeight: 600 }}>{a?.ciclo.nome ?? "—"}</span>
            {a && <span style={{ fontSize: 11, color: "var(--text-muted)" }}> · {STATUS_AVAL[a.status] ?? a.status}</span>}
          </Metrica>
          <Metrica rotulo="Progresso">
            <span style={{ fontSize: 15, fontWeight: 600 }}>
              {a ? `${a.competenciasComNota}/${a.totalCompetencias}` : "—"}
            </span>
            <span style={{ fontSize: 11, color: "var(--text-muted)" }}> critérios</span>
          </Metrica>
          <Metrica rotulo="Nota">
            <span style={{ fontSize: 22, fontWeight: 700 }}>{a?.notaAtual != null ? a.notaAtual.toFixed(1) : "—"}</span>
            {a?.tendencia != null && a.tendencia !== 0 && (
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  marginLeft: 6,
                  color: a.tendencia > 0 ? "var(--feedback-success, #15803d)" : "var(--feedback-danger, #b91c1c)",
                }}
              >
                {a.tendencia > 0 ? "▲" : "▼"} {Math.abs(a.tendencia).toFixed(1)}
              </span>
            )}
          </Metrica>
        </div>
      </div>
    </div>
  );
}

function Metrica({ rotulo, children }: { rotulo: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: ".04em" }}>
        {rotulo}
      </div>
      <div style={{ marginTop: 2 }}>{children}</div>
    </div>
  );
}
