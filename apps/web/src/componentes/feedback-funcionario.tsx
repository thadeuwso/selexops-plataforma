"use client";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { BotaoPrimario, Campo, Erro, Gaveta, Selecao } from "@/componentes/formulario";

interface Feedback {
  codFeed: string;
  tipo: string;
  contexto: string;
  mensagem: string;
  cienteFun: string | null;
  dhCiente: string | null;
  dhInc: string;
  autor: { nomeUsu: string } | null;
  plano: { codPdi: string; titulo: string } | null;
}

const TIPOS: { valor: string; rotulo: string; cor: string }[] = [
  { valor: "POSITIVO", rotulo: "Positivo", cor: "var(--feedback-success, #15803d)" },
  { valor: "CONSTRUTIVO", rotulo: "Construtivo", cor: "var(--amber-700, #714E08)" },
  { valor: "NEUTRO", rotulo: "Neutro", cor: "var(--text-muted)" },
];
const CONTEXTOS: Record<string, string> = {
  RECONHECIMENTO: "Reconhecimento",
  MELHORIA: "Melhoria",
  ACOMPANHAMENTO: "Acompanhamento",
  OUTRO: "Outro",
};

const dataHora = (iso: string) =>
  new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(iso));

/**
 * Feedbacks do funcionário (RN-GP-021).
 *
 * Uma linha do tempo, do mais recente ao mais antigo. Não há botão de editar
 * nem apagar de propósito — feedback é registro do que a pessoa recebeu; para
 * corrigir, dá-se outro.
 */
export function FeedbackFuncionario({ codFun }: { codFun: string }) {
  const [feedbacks, setFeedbacks] = useState<Feedback[] | null>(null);
  const [aberto, setAberto] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [form, setForm] = useState({ mensagem: "", tipo: "POSITIVO", contexto: "RECONHECIMENTO" });

  const carregar = useCallback(async () => {
    const r = await api<Feedback[]>(`/gestao-pessoas/feedbacks?codFun=${codFun}`);
    if (r.status === 200 && r.json) setFeedbacks(r.json);
  }, [codFun]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  async function registrar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    if (!form.mensagem.trim()) {
      setErro("Escreva o feedback.");
      return;
    }
    const r = await api("/gestao-pessoas/feedbacks", {
      metodo: "POST",
      corpo: { codFun, mensagem: form.mensagem, tipo: form.tipo, contexto: form.contexto },
    });
    if (r.status !== 201) {
      setErro("Não foi possível registrar o feedback.");
      return;
    }
    setAberto(false);
    setForm({ mensagem: "", tipo: "POSITIVO", contexto: "RECONHECIMENTO" });
    await carregar();
  }

  async function darCiencia(codFeed: string) {
    await api(`/gestao-pessoas/feedbacks/${codFeed}/ciencia`, { metodo: "PATCH" });
    await carregar();
  }

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
        <p style={{ fontSize: 13, color: "var(--text-muted)", margin: 0, lineHeight: 1.5 }}>
          Retornos ao longo do tempo. Um feedback dado não se edita — para corrigir, registre outro.
        </p>
        <BotaoPrimario onClick={() => setAberto(true)} style={{ flexShrink: 0 }}>Dar feedback</BotaoPrimario>
      </div>

      {feedbacks === null ? (
        <p style={{ fontSize: 13, color: "var(--text-muted)" }}>Carregando…</p>
      ) : feedbacks.length === 0 ? (
        <p style={{ fontSize: 13, color: "var(--text-muted)", margin: 0 }}>Nenhum feedback registrado ainda.</p>
      ) : (
        <div style={{ display: "grid", gap: 8 }}>
          {feedbacks.map((f) => {
            const tipo = TIPOS.find((t) => t.valor === f.tipo);
            return (
              <div key={f.codFeed} style={{ border: "1px solid var(--border-default)", borderLeft: `3px solid ${tipo?.cor}`, borderRadius: 8, padding: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, marginBottom: 6, fontSize: 11, color: "var(--text-muted)" }}>
                  <span>
                    <span style={{ color: tipo?.cor, fontWeight: 600 }}>{tipo?.rotulo}</span>
                    {" · "}{CONTEXTOS[f.contexto] ?? f.contexto}
                    {f.plano ? ` · plano: ${f.plano.titulo}` : ""}
                  </span>
                  <span>{f.autor?.nomeUsu} · {dataHora(f.dhInc)}</span>
                </div>
                <div style={{ fontSize: 13, lineHeight: 1.5 }}>{f.mensagem}</div>
                <div style={{ marginTop: 8 }}>
                  {f.cienteFun === "S" ? (
                    <span style={{ fontSize: 11, color: "var(--feedback-success, #15803d)" }}>
                      ✓ Ciente {f.dhCiente ? `em ${dataHora(f.dhCiente)}` : ""}
                    </span>
                  ) : (
                    <button
                      onClick={() => darCiencia(f.codFeed)}
                      style={{ background: "none", border: "1px solid var(--border-default)", borderRadius: 6, padding: "3px 10px", fontSize: 11, cursor: "pointer", fontFamily: "inherit", color: "var(--text-body)" }}
                    >
                      Marcar ciência
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Erro mensagem={erro} />
      <Gaveta titulo="Dar feedback" aberta={aberto} fechar={() => setAberto(false)}>
        <form onSubmit={registrar} style={{ display: "grid", gap: 12 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Campo rotulo="Tom">
              <Selecao value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })}>
                {TIPOS.map((t) => <option key={t.valor} value={t.valor}>{t.rotulo}</option>)}
              </Selecao>
            </Campo>
            <Campo rotulo="Contexto">
              <Selecao value={form.contexto} onChange={(e) => setForm({ ...form, contexto: e.target.value })}>
                {Object.entries(CONTEXTOS).map(([v, r]) => <option key={v} value={v}>{r}</option>)}
              </Selecao>
            </Campo>
          </div>
          <Campo rotulo="Feedback">
            <textarea
              value={form.mensagem}
              onChange={(e) => setForm({ ...form, mensagem: e.target.value })}
              rows={5}
              placeholder="Seja específico: o que a pessoa fez, e o efeito disso."
              style={{ width: "100%", padding: 10, borderRadius: 8, fontFamily: "inherit", fontSize: 13, border: "1px solid var(--border-default)", background: "var(--surface-default)", color: "var(--text-body)", resize: "vertical" }}
            />
          </Campo>
          <Erro mensagem={erro} />
          <BotaoPrimario type="submit">Registrar feedback</BotaoPrimario>
        </form>
      </Gaveta>
    </div>
  );
}
