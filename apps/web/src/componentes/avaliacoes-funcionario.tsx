"use client";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { AvaliacaoDesempenhoGaveta } from "@/componentes/avaliacao-desempenho-gaveta";

interface AvaliacaoResumo {
  codAval: string;
  ciclo: { nome: string; dtInicio: string; dtFim: string; status: string };
  avaliador: { nomeUsu: string } | null;
  status: string;
  dhConclusao: string | null;
  notaFinal: number | null;
}

const STATUS_AVAL: Record<string, string> = {
  PENDENTE: "Pendente",
  EM_ANDAMENTO: "Em andamento",
  CONCLUIDA: "Concluída",
};
const data = (iso: string) => new Date(iso).toLocaleDateString("pt-BR");

/**
 * Histórico de avaliações de desempenho do funcionário (RN-GP-022).
 *
 * Visão do lado da pessoa: em que ciclos foi avaliada e com que nota. A gestão
 * do ciclo mora na tela de Avaliação de desempenho; aqui só se lê (e abre a
 * avaliação, que respeita o estado do ciclo — editável só se aberto).
 */
export function AvaliacoesFuncionario({ codFun }: { codFun: string }) {
  const [avals, setAvals] = useState<AvaliacaoResumo[] | null>(null);
  const [aberta, setAberta] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    const r = await api<AvaliacaoResumo[]>(`/gestao-pessoas/avaliacoes?codFun=${codFun}`);
    if (r.status === 200 && r.json) setAvals(r.json);
  }, [codFun]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <p style={{ fontSize: 13, color: "var(--text-muted)", margin: 0, lineHeight: 1.5 }}>
        Ciclos de avaliação de desempenho em que este funcionário foi avaliado.
      </p>

      {avals === null ? (
        <p style={{ fontSize: 13, color: "var(--text-muted)" }}>Carregando…</p>
      ) : avals.length === 0 ? (
        <p style={{ fontSize: 13, color: "var(--text-muted)", margin: 0 }}>
          Ainda não participou de nenhum ciclo de avaliação.
        </p>
      ) : (
        <div style={{ display: "grid", gap: 8 }}>
          {avals.map((a) => (
            <button
              key={a.codAval}
              onClick={() => setAberta(a.codAval)}
              style={{ textAlign: "left", display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", border: "1px solid var(--border-default)", borderRadius: 8, padding: "12px 14px", background: "var(--surface-default)", cursor: "pointer", fontFamily: "inherit" }}
            >
              <div>
                <div style={{ fontSize: 14, fontWeight: 500 }}>{a.ciclo.nome}</div>
                <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                  {data(a.ciclo.dtInicio)} — {data(a.ciclo.dtFim)} · {STATUS_AVAL[a.status] ?? a.status}
                  {a.avaliador ? ` · ${a.avaliador.nomeUsu}` : ""}
                </div>
              </div>
              <span style={{ fontSize: 20, fontWeight: 600, flexShrink: 0 }}>
                {a.notaFinal !== null ? a.notaFinal.toFixed(1) : "—"}
              </span>
            </button>
          ))}
        </div>
      )}

      <AvaliacaoDesempenhoGaveta
        codAval={aberta}
        aberta={aberta !== null}
        fechar={() => setAberta(null)}
        aoMudar={carregar}
      />
    </div>
  );
}
