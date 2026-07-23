"use client";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { BotaoPrimario, Erro, Gaveta } from "@/componentes/formulario";
import { Avaliacao360Scoring } from "@/componentes/colaborador-360/avaliacao-360-scoring";

interface CompetenciaNota {
  codComp: string;
  nome: string;
  descricao: string | null;
  peso: number;
  nota: number | null;
  comentario: string | null;
}
interface AvaliacaoDetalhe {
  codAval: string;
  funcionario: { nomeFun: string; numCad: string } | null;
  status: string;
  comentarioGeral: string | null;
  ciclo: { codCiclo: string; nome: string; status: string };
  competencias: CompetenciaNota[];
  notaFinal: number | null;
  podeConcluir: boolean;
}

const ESCALA = [1, 2, 3, 4, 5];

/**
 * Preenchimento de uma avaliação de desempenho (RN-GP-022).
 *
 * O avaliador dá nota 1..5 por competência e um comentário; a nota final é
 * calculada no servidor (ponderada), então aqui só se mostra — nunca se digita
 * um "resultado" que poderia divergir das notas. Concluir exige todas avaliadas.
 * Só edita enquanto o ciclo está ABERTO e a avaliação não foi concluída.
 */
export function AvaliacaoDesempenhoGaveta({
  codAval,
  aberta,
  fechar,
  aoMudar,
}: {
  codAval: string | null;
  aberta: boolean;
  fechar: () => void;
  aoMudar?: () => void;
}) {
  const [aval, setAval] = useState<AvaliacaoDetalhe | null>(null);
  const [ehTrezentos, setEhTrezentos] = useState<boolean | null>(null);
  const [comentarioGeral, setComentarioGeral] = useState("");
  const [erro, setErro] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    if (!codAval) return;
    // Descobre se é 360 (tem participantes) — se for, o preenchimento é por avaliador.
    const rp = await api<{ participantes: unknown[] }>(`/gestao-pessoas/avaliacoes/${codAval}/participantes`);
    const tem360 = rp.status === 200 && (rp.json?.participantes.length ?? 0) > 0;
    setEhTrezentos(tem360);
    const r = await api<AvaliacaoDetalhe>(`/gestao-pessoas/avaliacoes/${codAval}`);
    if (r.status === 200 && r.json) {
      setAval(r.json);
      setComentarioGeral(r.json.comentarioGeral ?? "");
    }
  }, [codAval]);

  useEffect(() => {
    if (aberta) void carregar();
    else {
      setAval(null);
      setEhTrezentos(null);
    }
  }, [aberta, carregar]);

  const editavel = aval?.status !== "CONCLUIDA" && aval?.ciclo.status === "ABERTO";

  async function darNota(codComp: string, nota: number, comentario: string | null) {
    if (!codAval) return;
    setErro(null);
    const r = await api(`/gestao-pessoas/avaliacoes/${codAval}/notas`, {
      metodo: "PATCH",
      corpo: { codComp, nota, comentario: comentario || undefined },
    });
    if (r.status !== 200) {
      setErro("Não foi possível salvar a nota.");
      return;
    }
    await carregar();
    aoMudar?.();
  }

  async function salvarComentarioGeral() {
    if (!codAval) return;
    await api(`/gestao-pessoas/avaliacoes/${codAval}`, {
      metodo: "PATCH",
      corpo: { comentarioGeral: comentarioGeral || undefined },
    });
    aoMudar?.();
  }

  async function concluir() {
    if (!codAval) return;
    setErro(null);
    await salvarComentarioGeral();
    const r = await api(`/gestao-pessoas/avaliacoes/${codAval}`, {
      metodo: "PATCH",
      corpo: { concluir: true, comentarioGeral: comentarioGeral || undefined },
    });
    if (r.status !== 200) {
      setErro("Avalie todas as competências antes de concluir.");
      return;
    }
    await carregar();
    aoMudar?.();
  }

  return (
    <Gaveta titulo={aval?.funcionario?.nomeFun ?? "Avaliação"} aberta={aberta} fechar={fechar} largura={560}>
      {!aval || ehTrezentos === null ? (
        <p style={{ fontSize: 13, color: "var(--text-muted)" }}>Carregando…</p>
      ) : ehTrezentos && codAval ? (
        <div style={{ display: "grid", gap: 8 }}>
          <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{aval.ciclo.nome}</span>
          <Avaliacao360Scoring codAval={codAval} aoMudar={aoMudar} />
        </div>
      ) : (
        <div style={{ display: "grid", gap: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12 }}>
            <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{aval.ciclo.nome}</span>
            <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
              Nota final:{" "}
              <strong style={{ fontSize: 22, color: "var(--text-body)" }}>
                {aval.notaFinal !== null ? aval.notaFinal.toFixed(1) : "—"}
              </strong>
            </span>
          </div>

          {aval.status === "CONCLUIDA" && (
            <div style={{ fontSize: 12, color: "var(--feedback-success, #15803d)" }}>✓ Avaliação concluída — somente leitura.</div>
          )}
          {aval.status !== "CONCLUIDA" && aval.ciclo.status !== "ABERTO" && (
            <div style={{ fontSize: 12, color: "var(--text-muted)" }}>O ciclo precisa estar aberto para avaliar.</div>
          )}

          <div style={{ display: "grid", gap: 10 }}>
            {aval.competencias.map((c) => (
              <CompetenciaLinha key={c.codComp} comp={c} editavel={!!editavel} onNota={darNota} />
            ))}
          </div>

          <div style={{ display: "grid", gap: 6 }}>
            <label style={{ fontSize: 12, color: "var(--text-muted)" }}>Comentário geral</label>
            <textarea
              value={comentarioGeral}
              onChange={(e) => setComentarioGeral(e.target.value)}
              onBlur={() => editavel && salvarComentarioGeral()}
              disabled={!editavel}
              rows={3}
              placeholder="Síntese do período: o que se destacou, o que desenvolver."
              style={{ width: "100%", padding: 10, borderRadius: 8, fontFamily: "inherit", fontSize: 13, border: "1px solid var(--border-default)", background: "var(--surface-default)", color: "var(--text-body)", resize: "vertical" }}
            />
          </div>

          <Erro mensagem={erro} />

          {editavel && (
            <BotaoPrimario onClick={concluir} disabled={!aval.podeConcluir} style={{ justifySelf: "start", opacity: aval.podeConcluir ? 1 : 0.5 }}>
              Concluir avaliação
            </BotaoPrimario>
          )}
        </div>
      )}
    </Gaveta>
  );
}

function CompetenciaLinha({
  comp,
  editavel,
  onNota,
}: {
  comp: CompetenciaNota;
  editavel: boolean;
  onNota: (codComp: string, nota: number, comentario: string | null) => void;
}) {
  const [coment, setComent] = useState(comp.comentario ?? "");

  return (
    <div style={{ border: "1px solid var(--border-default)", borderRadius: 8, padding: 12, display: "grid", gap: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600 }}>{comp.nome}</div>
          {comp.descricao && <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{comp.descricao}</div>}
        </div>
        <span style={{ fontSize: 11, color: "var(--text-muted)", flexShrink: 0 }}>peso {comp.peso}</span>
      </div>
      <div style={{ display: "flex", gap: 6 }}>
        {ESCALA.map((n) => {
          const sel = comp.nota === n;
          return (
            <button
              key={n}
              disabled={!editavel}
              onClick={() => onNota(comp.codComp, n, coment)}
              style={{
                width: 38,
                height: 34,
                borderRadius: 8,
                border: sel ? "2px solid var(--brand-700)" : "1px solid var(--border-default)",
                background: sel ? "var(--brand-700)" : "var(--surface-default)",
                color: sel ? "#fff" : "var(--text-body)",
                fontWeight: 600,
                fontSize: 14,
                cursor: editavel ? "pointer" : "default",
                fontFamily: "inherit",
              }}
            >
              {n}
            </button>
          );
        })}
      </div>
      {editavel && (
        <input
          value={coment}
          onChange={(e) => setComent(e.target.value)}
          onBlur={() => comp.nota !== null && coment !== (comp.comentario ?? "") && onNota(comp.codComp, comp.nota, coment)}
          placeholder="Comentário (opcional)"
          style={{ width: "100%", padding: "6px 8px", borderRadius: 6, fontFamily: "inherit", fontSize: 12, border: "1px solid var(--border-default)", background: "var(--surface-default)", color: "var(--text-body)" }}
        />
      )}
      {!editavel && comp.comentario && (
        <div style={{ fontSize: 12, color: "var(--text-muted)", fontStyle: "italic" }}>{comp.comentario}</div>
      )}
    </div>
  );
}
