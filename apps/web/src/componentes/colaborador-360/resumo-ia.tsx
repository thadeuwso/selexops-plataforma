"use client";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Gaveta } from "@/componentes/formulario";

interface Resumo {
  resumo: string;
  fatos: string[];
  tendencia: string;
  recomendacoes: string[];
  validacaoHumana: string[];
  evidenciasUsadas: string[];
}
interface Roteiro {
  resumoConversa: string;
  reconhecer: string[];
  desenvolver: string[];
  perguntas: string[];
  acordosSugeridos: string[];
}
interface Insight<T> {
  conteudoJson: T;
  provedor: string | null;
  modeloUsado: string | null;
  versaoPrompt: string | null;
  dhInc: string;
  desatualizado?: boolean;
}

const botao: React.CSSProperties = {
  padding: "5px 12px", borderRadius: 6, border: "1px solid var(--border-default)",
  background: "var(--surface-default)", color: "var(--text-body)", fontSize: 12, cursor: "pointer", fontFamily: "inherit",
};
function Lista({ titulo, itens, cor }: { titulo: string; itens: string[]; cor?: string }) {
  if (!itens?.length) return null;
  return (
    <div>
      <div style={{ fontSize: 12, fontWeight: 600, color: cor ?? "var(--text-muted)", marginBottom: 4 }}>{titulo}</div>
      <ul style={{ margin: 0, paddingLeft: 18, display: "grid", gap: 3 }}>
        {itens.map((x, i) => <li key={i} style={{ fontSize: 13, lineHeight: 1.5 }}>{x}</li>)}
      </ul>
    </div>
  );
}

/**
 * Resumo inteligente por IA (RN-GP-032). A IA explica, não decide: separa fatos,
 * tendência, recomendações e o que exige validação humana; mostra as evidências
 * e o provedor/modelo. Degrada com clareza quando os motores estão desligados.
 */
export function ResumoIA({ codFun }: { codFun: string }) {
  const [ins, setIns] = useState<Insight<Resumo> | null>(null);
  const [gerando, setGerando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [verEvid, setVerEvid] = useState(false);
  const [roteiro, setRoteiro] = useState<Insight<Roteiro> | null>(null);
  const [gerandoRot, setGerandoRot] = useState(false);
  const [verRoteiro, setVerRoteiro] = useState(false);

  const carregar = useCallback(async () => {
    const r = await api<Insight<Resumo> | null>(`/gestao-pessoas/colaboradores/${codFun}/ia/resumo`);
    if (r.status === 200) setIns(r.json ?? null);
  }, [codFun]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  async function gerar() {
    setGerando(true);
    setErro(null);
    const r = await api<Insight<Resumo>>(`/gestao-pessoas/colaboradores/${codFun}/ia/resumo`, { metodo: "POST" });
    setGerando(false);
    if (r.status !== 201 && r.status !== 200) {
      setErro("Os motores de IA estão indisponíveis no momento — tente mais tarde ou siga pelo fluxo manual.");
      return;
    }
    if (r.json) setIns(r.json);
  }

  async function gerarRoteiro() {
    setGerandoRot(true);
    setErro(null);
    const r = await api<Insight<Roteiro>>(`/gestao-pessoas/colaboradores/${codFun}/ia/roteiro`, { metodo: "POST" });
    setGerandoRot(false);
    if (r.status !== 201 && r.status !== 200) {
      setErro("Não foi possível gerar o roteiro — IA indisponível.");
      return;
    }
    if (r.json) {
      setRoteiro(r.json);
      setVerRoteiro(true);
    }
  }

  const c = ins?.conteudoJson;

  return (
    <div style={{ border: "1px solid var(--border-default)", borderRadius: 10, padding: 16, background: "var(--surface-default)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 10 }}>
        <div style={{ fontSize: 15, fontWeight: 600 }}>Resumo inteligente</div>
        <div style={{ display: "flex", gap: 6 }}>
          <button onClick={gerarRoteiro} disabled={gerandoRot} style={botao}>{gerandoRot ? "Gerando…" : "Preparar feedback"}</button>
          <button onClick={gerar} disabled={gerando} style={{ ...botao, background: "var(--brand-700)", color: "#fff", borderColor: "var(--brand-700)" }}>
            {gerando ? "Gerando…" : ins ? "Gerar novamente" : "Gerar resumo"}
          </button>
        </div>
      </div>

      {erro && <p style={{ fontSize: 13, color: "var(--feedback-danger, #b91c1c)", margin: "0 0 8px" }}>{erro}</p>}

      {!ins ? (
        <p style={{ fontSize: 13, color: "var(--text-muted)", margin: 0 }}>
          Ainda sem resumo. A IA lê os dados já registrados e explica — não inventa nem decide.
        </p>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {ins.desatualizado && (
            <div style={{ fontSize: 11, color: "var(--amber-700, #714E08)" }}>Os dados mudaram desde este resumo — gere novamente para atualizar.</div>
          )}
          <p style={{ fontSize: 14, lineHeight: 1.6, margin: 0 }}>{c?.resumo}</p>
          {c?.tendencia && <div style={{ fontSize: 13, color: "var(--text-muted)" }}><strong>Tendência:</strong> {c.tendencia}</div>}
          <Lista titulo="Fatos observados" itens={c?.fatos ?? []} />
          <Lista titulo="Recomendações" itens={c?.recomendacoes ?? []} />
          <Lista titulo="Precisa de validação humana" itens={c?.validacaoHumana ?? []} cor="var(--amber-700, #714E08)" />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 11, color: "var(--text-muted)", borderTop: "1px solid var(--border-default)", paddingTop: 8 }}>
            <button onClick={() => setVerEvid(true)} style={{ background: "none", border: "none", color: "var(--text-link)", cursor: "pointer", fontFamily: "inherit", fontSize: 12, padding: 0 }}>Ver evidências</button>
            <span>{ins.provedor}{ins.modeloUsado ? ` · ${ins.modeloUsado}` : ""} · {new Date(ins.dhInc).toLocaleDateString("pt-BR")}</span>
          </div>
        </div>
      )}

      <Gaveta titulo="Evidências usadas" aberta={verEvid} fechar={() => setVerEvid(false)}>
        <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "0 0 10px" }}>
          O resumo se apoia nos dados abaixo. A IA foi instruída a não usar nada além do que foi fornecido.
        </p>
        <ul style={{ margin: 0, paddingLeft: 18, display: "grid", gap: 4 }}>
          {(c?.evidenciasUsadas ?? []).map((e, i) => <li key={i} style={{ fontSize: 13 }}>{e}</li>)}
        </ul>
        <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 14 }}>
          Provedor {ins?.provedor} · modelo {ins?.modeloUsado} · prompt {ins?.versaoPrompt}
        </div>
      </Gaveta>

      <Gaveta titulo="Preparação para feedback" aberta={verRoteiro} fechar={() => setVerRoteiro(false)} largura={520}>
        {roteiro && (
          <div style={{ display: "grid", gap: 12 }}>
            <p style={{ fontSize: 14, lineHeight: 1.6, margin: 0 }}>{roteiro.conteudoJson.resumoConversa}</p>
            <Lista titulo="Reconhecer" itens={roteiro.conteudoJson.reconhecer} cor="var(--feedback-success, #15803d)" />
            <Lista titulo="Desenvolver" itens={roteiro.conteudoJson.desenvolver} cor="var(--amber-700, #714E08)" />
            <Lista titulo="Perguntas para a conversa" itens={roteiro.conteudoJson.perguntas} />
            <Lista titulo="Acordos sugeridos" itens={roteiro.conteudoJson.acordosSugeridos} />
            <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Apoio à conversa — o gestor conduz e decide.</div>
          </div>
        )}
      </Gaveta>
    </div>
  );
}
