"use client";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";

const ROTULO_TIPO: Record<string, string> = {
  AUTO: "Autoavaliação",
  GESTOR: "Gestor",
  PAR: "Pares",
  LIDERADO: "Liderados",
  COMITE: "Comitê",
  CLIENTE_INTERNO: "Cliente interno",
};
const STATUS: Record<string, { texto: string; cor: string }> = {
  PENDENTE: { texto: "Pendente", cor: "var(--text-muted)" },
  EM_ANDAMENTO: { texto: "Em andamento", cor: "var(--amber-700, #714E08)" },
  CONCLUIDA: { texto: "Concluída", cor: "var(--feedback-success, #15803d)" },
};
const ESCALA = [1, 2, 3, 4, 5];

interface Competencia {
  codComp: string;
  nome: string;
  peso: number;
}
interface NotaPart {
  codComp: string;
  nota: number;
  comentario: string | null;
}
interface Participante {
  codAvalPart: string;
  tipo: string;
  peso: number;
  status: string;
  avaliador: string | null;
  codUsuAvaliador: string | null;
  notas: NotaPart[];
}
interface Dados {
  cicloStatus: string;
  modo: string;
  notaFinal: number | null;
  competencias: Competencia[];
  participantes: Participante[];
}
interface Usuario {
  codUsu: string;
  nomeUsu: string;
}

/**
 * Preenchimento da avaliação 360 (performance-360, Fase 5).
 * Um bloco por participante: atribui a pessoa, lança nota 1..5 por competência e
 * conclui. A nota final consolidada é derivada no servidor — aqui só se mostra.
 */
export function Avaliacao360Scoring({ codAval, aoMudar }: { codAval: string; aoMudar?: () => void }) {
  const [d, setD] = useState<Dados | null>(null);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [aberto, setAberto] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    const r = await api<Dados>(`/gestao-pessoas/avaliacoes/${codAval}/participantes`);
    if (r.status === 200 && r.json) setD(r.json);
  }, [codAval]);

  useEffect(() => {
    void carregar();
    void api<Usuario[]>("/usuarios").then((r) => {
      if (r.status === 200 && r.json) setUsuarios(r.json);
    });
  }, [carregar]);

  if (!d) return <p style={{ fontSize: 13, color: "var(--text-muted)" }}>Carregando…</p>;
  const editavel = d.cicloStatus === "ABERTO";

  async function atribuir(codAvalPart: string, codUsuAvaliador: string) {
    if (!codUsuAvaliador) return;
    await api(`/gestao-pessoas/participantes/${codAvalPart}`, { metodo: "PATCH", corpo: { codUsuAvaliador } });
    await carregar();
    aoMudar?.();
  }
  async function darNota(codAvalPart: string, codComp: string, nota: number) {
    await api(`/gestao-pessoas/participantes/${codAvalPart}/notas`, { metodo: "PATCH", corpo: { codComp, nota } });
    await carregar();
    aoMudar?.();
  }
  async function concluir(codAvalPart: string) {
    await api(`/gestao-pessoas/participantes/${codAvalPart}/concluir`, { metodo: "PATCH" });
    await carregar();
    aoMudar?.();
  }

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Avaliação 360</span>
        <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
          Nota consolidada:{" "}
          <strong style={{ fontSize: 22, color: "var(--text-body)" }}>{d.notaFinal != null ? d.notaFinal.toFixed(1) : "—"}</strong>
        </span>
      </div>

      {d.participantes.map((p) => {
        const st = STATUS[p.status];
        const notaPorComp = Object.fromEntries(p.notas.map((n) => [n.codComp, n.nota]));
        const expandido = aberto === p.codAvalPart;
        return (
          <div key={p.codAvalPart} style={{ border: "1px solid var(--border-default)", borderRadius: 10, padding: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
              <div>
                <span style={{ fontSize: 14, fontWeight: 600 }}>{ROTULO_TIPO[p.tipo] ?? p.tipo}</span>
                <span style={{ fontSize: 11, color: "var(--text-muted)" }}> · peso {p.peso} · </span>
                <span style={{ fontSize: 11, fontWeight: 600, color: st?.cor }}>{st?.texto ?? p.status}</span>
              </div>
              <button
                onClick={() => setAberto(expandido ? null : p.codAvalPart)}
                style={botaoSec}
              >
                {expandido ? "Fechar" : p.status === "CONCLUIDA" ? "Ver" : "Avaliar"}
              </button>
            </div>

            <div style={{ marginTop: 8 }}>
              <label style={{ fontSize: 11, color: "var(--text-muted)" }}>
                Avaliador:{" "}
                {editavel && p.status !== "CONCLUIDA" ? (
                  <select
                    value={p.codUsuAvaliador ?? ""}
                    onChange={(e) => atribuir(p.codAvalPart, e.target.value)}
                    style={{ padding: "3px 6px", borderRadius: 6, border: "1px solid var(--border-default)", background: "var(--surface-default)", color: "var(--text-body)", fontFamily: "inherit", fontSize: 12 }}
                  >
                    <option value="">— atribuir —</option>
                    {usuarios.map((u) => <option key={u.codUsu} value={u.codUsu}>{u.nomeUsu}</option>)}
                  </select>
                ) : (
                  <strong>{p.avaliador ?? "não atribuído"}</strong>
                )}
              </label>
            </div>

            {expandido && (
              <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
                {d.competencias.map((c) => (
                  <div key={c.codComp} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: 13 }}>{c.nome}</span>
                    <div style={{ display: "flex", gap: 4 }}>
                      {ESCALA.map((n) => {
                        const sel = notaPorComp[c.codComp] === n;
                        const podeEditar = editavel && p.status !== "CONCLUIDA";
                        return (
                          <button
                            key={n}
                            disabled={!podeEditar}
                            onClick={() => darNota(p.codAvalPart, c.codComp, n)}
                            style={{
                              width: 32, height: 30, borderRadius: 7,
                              border: sel ? "2px solid var(--brand-700)" : "1px solid var(--border-default)",
                              background: sel ? "var(--brand-700)" : "var(--surface-default)",
                              color: sel ? "#fff" : "var(--text-body)",
                              fontWeight: 600, fontSize: 13, cursor: podeEditar ? "pointer" : "default", fontFamily: "inherit",
                            }}
                          >
                            {n}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
                {editavel && p.status !== "CONCLUIDA" && (
                  <button
                    onClick={() => concluir(p.codAvalPart)}
                    disabled={p.notas.length < d.competencias.length}
                    style={{ ...botaoSec, justifySelf: "start", opacity: p.notas.length < d.competencias.length ? 0.5 : 1 }}
                  >
                    Concluir este avaliador
                  </button>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

const botaoSec: React.CSSProperties = {
  padding: "4px 12px",
  borderRadius: 6,
  border: "1px solid var(--border-default)",
  background: "var(--surface-default)",
  color: "var(--text-body)",
  fontSize: 12,
  cursor: "pointer",
  fontFamily: "inherit",
};
