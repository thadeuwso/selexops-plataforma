"use client";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { BotaoPrimario, Campo, Erro, Gaveta, Selecao } from "@/componentes/formulario";

interface Potencial {
  temPotencial: boolean;
  codPot?: string;
  desempenhoEixo?: number;
  potencialEixo?: number;
  quadrante?: { chave: string; rotulo: string; celula: number };
  nivelConfianca?: string;
  evidencias?: string | null;
  revisaoHumana?: boolean;
  cargoAlvo?: string | null;
  prontidao?: string | null;
  avaliador?: string | null;
}

const EIXO = [
  { v: 1, r: "Baixo" },
  { v: 2, r: "Médio" },
  { v: 3, r: "Alto" },
];
const PRONTIDAO: Record<string, string> = { PRONTO: "Pronto", UM_A_DOIS_ANOS: "1–2 anos", EM_DESENVOLVIMENTO: "Em desenvolvimento" };

/** Mini matriz 9-box; destaca a célula (1..9, 1 = canto inferior-esquerdo). */
function Matriz9box({ celula }: { celula: number | null }) {
  // Linhas de cima (potencial alto) para baixo; colunas: desempenho baixo→alto.
  const linhas = [
    [7, 8, 9],
    [4, 5, 6],
    [1, 2, 3],
  ];
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 3, width: 96 }}>
      {linhas.flat().map((c) => (
        <div
          key={c}
          style={{
            aspectRatio: "1", borderRadius: 4,
            background: c === celula ? "var(--brand-700)" : "var(--border-default)",
            opacity: c === celula ? 1 : 0.5,
          }}
        />
      ))}
    </div>
  );
}

export function Potencial360({ codFun }: { codFun: string }) {
  const [p, setP] = useState<Potencial | null>(null);
  const [editar, setEditar] = useState(false);

  const carregar = useCallback(async () => {
    const r = await api<Potencial>(`/gestao-pessoas/colaboradores/${codFun}/potencial`);
    if (r.status === 200 && r.json) setP(r.json);
  }, [codFun]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  async function revisar() {
    if (!p?.codPot) return;
    await api(`/gestao-pessoas/potencial/${p.codPot}/revisar`, { metodo: "PATCH" });
    await carregar();
  }

  return (
    <div style={{ border: "1px solid var(--border-default)", borderRadius: 10, padding: 16, background: "var(--surface-default)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Potencial (9-box)</div>
        <button onClick={() => setEditar(true)} style={botao}>{p?.temPotencial ? "Reavaliar" : "Avaliar"}</button>
      </div>

      {!p ? (
        <p style={{ fontSize: 13, color: "var(--text-muted)", margin: 0 }}>Carregando…</p>
      ) : !p.temPotencial ? (
        <p style={{ fontSize: 13, color: "var(--text-muted)", margin: 0 }}>Ainda não avaliado. Classificação preliminar, sempre com revisão humana.</p>
      ) : (
        <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
          <Matriz9box celula={p.quadrante?.celula ?? null} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 16, fontWeight: 700 }}>{p.quadrante?.rotulo}</div>
            <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
              Confiança {p.nivelConfianca?.toLowerCase()}
              {p.cargoAlvo ? ` · alvo: ${p.cargoAlvo}` : ""}
              {p.prontidao ? ` (${PRONTIDAO[p.prontidao] ?? p.prontidao})` : ""}
            </div>
            <div style={{ marginTop: 6 }}>
              {p.revisaoHumana ? (
                <span style={{ fontSize: 11, color: "var(--feedback-success, #15803d)" }}>✓ Revisado por {p.avaliador ?? "um humano"}</span>
              ) : (
                <button onClick={revisar} style={{ ...botao, borderColor: "var(--amber-700, #714E08)", color: "var(--amber-700, #714E08)" }}>
                  Rascunho · marcar revisão humana
                </button>
              )}
            </div>
          </div>
        </div>
      )}
      {p?.evidencias && <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 8, fontStyle: "italic" }}>{p.evidencias}</div>}

      {editar && <EditorPotencial codFun={codFun} atual={p} fechar={() => setEditar(false)} aoSalvar={() => { setEditar(false); void carregar(); }} />}
    </div>
  );
}

function EditorPotencial({ codFun, atual, fechar, aoSalvar }: { codFun: string; atual: Potencial | null; fechar: () => void; aoSalvar: () => void }) {
  const [desempenho, setDesempenho] = useState(atual?.desempenhoEixo ?? 2);
  const [potencial, setPotencial] = useState(atual?.potencialEixo ?? 2);
  const [nivelConfianca, setNivel] = useState(atual?.nivelConfianca ?? "MEDIO");
  const [evidencias, setEvidencias] = useState("");
  const [cargoAlvo, setCargoAlvo] = useState("");
  const [prontidao, setProntidao] = useState("");
  const [erro, setErro] = useState<string | null>(null);

  async function salvar() {
    setErro(null);
    const r = await api(`/gestao-pessoas/colaboradores/${codFun}/potencial`, {
      metodo: "POST",
      corpo: { desempenhoEixo: desempenho, potencialEixo: potencial, nivelConfianca, evidencias: evidencias || undefined, cargoAlvo: cargoAlvo || undefined, prontidao: prontidao || undefined },
    });
    if (r.status !== 201) return setErro("Não foi possível salvar.");
    aoSalvar();
  }

  return (
    <Gaveta titulo="Avaliar potencial" aberta fechar={fechar} largura={460}>
      <div style={{ display: "grid", gap: 12 }}>
        <p style={{ fontSize: 12, color: "var(--text-muted)", margin: 0 }}>
          Classificação preliminar de apoio — nasce como rascunho e exige revisão humana. Não decide promoção.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Campo rotulo="Desempenho">
            <Selecao value={desempenho} onChange={(e) => setDesempenho(Number(e.target.value))}>
              {EIXO.map((x) => <option key={x.v} value={x.v}>{x.r}</option>)}
            </Selecao>
          </Campo>
          <Campo rotulo="Potencial">
            <Selecao value={potencial} onChange={(e) => setPotencial(Number(e.target.value))}>
              {EIXO.map((x) => <option key={x.v} value={x.v}>{x.r}</option>)}
            </Selecao>
          </Campo>
        </div>
        <Campo rotulo="Nível de confiança">
          <Selecao value={nivelConfianca} onChange={(e) => setNivel(e.target.value)}>
            <option value="BAIXO">Baixo</option>
            <option value="MEDIO">Médio</option>
            <option value="ALTO">Alto</option>
          </Selecao>
        </Campo>
        <Campo rotulo="Evidências (opcional)">
          <textarea value={evidencias} onChange={(e) => setEvidencias(e.target.value)} rows={3} placeholder="Em que se baseia essa leitura?" style={{ width: "100%", padding: 10, borderRadius: 8, fontFamily: "inherit", fontSize: 13, border: "1px solid var(--border-default)", background: "var(--surface-default)", color: "var(--text-body)", resize: "vertical" }} />
        </Campo>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Campo rotulo="Cargo-alvo (sucessão)">
            <input value={cargoAlvo} onChange={(e) => setCargoAlvo(e.target.value)} placeholder="opcional" style={inp} />
          </Campo>
          <Campo rotulo="Prontidão">
            <Selecao value={prontidao} onChange={(e) => setProntidao(e.target.value)}>
              <option value="">—</option>
              <option value="PRONTO">Pronto</option>
              <option value="UM_A_DOIS_ANOS">1–2 anos</option>
              <option value="EM_DESENVOLVIMENTO">Em desenvolvimento</option>
            </Selecao>
          </Campo>
        </div>
        <Erro mensagem={erro} />
        <BotaoPrimario onClick={salvar}>Salvar avaliação</BotaoPrimario>
      </div>
    </Gaveta>
  );
}

const botao: React.CSSProperties = {
  padding: "4px 12px", borderRadius: 6, border: "1px solid var(--border-default)",
  background: "var(--surface-default)", color: "var(--text-body)", fontSize: 12, cursor: "pointer", fontFamily: "inherit",
};
const inp: React.CSSProperties = {
  padding: "8px 10px", borderRadius: 8, border: "1px solid var(--border-default)",
  background: "var(--surface-default)", color: "var(--text-body)", fontFamily: "inherit", fontSize: 13, width: "100%",
};
