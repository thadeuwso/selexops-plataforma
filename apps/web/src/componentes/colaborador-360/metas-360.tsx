"use client";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { BotaoPrimario, Campo, Entrada, Erro, Gaveta, Selecao } from "@/componentes/formulario";

interface Meta {
  codMeta: string;
  titulo: string;
  descricao: string | null;
  peso: number;
  prazo: string | null;
  progresso: number;
  cancelada: boolean;
  impactoAvaliacao: string | null;
  responsavel: string | null;
  status: string;
  emRisco: boolean;
}
interface Resumo {
  total: number;
  concluidas: number;
  andamento: number;
  pendentes: number;
  atrasadas: number;
  canceladas: number;
  emRisco: number;
  progressoPonderado: number;
}

const STATUS: Record<string, { texto: string; cor: string }> = {
  PENDENTE: { texto: "Pendente", cor: "var(--text-muted)" },
  ANDAMENTO: { texto: "Em andamento", cor: "var(--amber-700, #714E08)" },
  CONCLUIDA: { texto: "Concluída", cor: "var(--feedback-success, #15803d)" },
  ATRASADA: { texto: "Atrasada", cor: "var(--feedback-danger, #b91c1c)" },
  CANCELADA: { texto: "Cancelada", cor: "var(--text-muted)" },
};
const data = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("pt-BR", { timeZone: "UTC" }) : "sem prazo");

function Barra({ v }: { v: number }) {
  return (
    <div style={{ height: 6, background: "var(--border-default)", borderRadius: 999, overflow: "hidden" }}>
      <div style={{ height: "100%", width: `${v}%`, background: "var(--brand-700)" }} />
    </div>
  );
}

export function Metas360({ codFun }: { codFun: string }) {
  const [itens, setItens] = useState<Meta[] | null>(null);
  const [resumo, setResumo] = useState<Resumo | null>(null);
  const [nova, setNova] = useState(false);
  const [progMeta, setProgMeta] = useState<Meta | null>(null);

  const carregar = useCallback(async () => {
    const r = await api<{ itens: Meta[]; resumo: Resumo }>(`/gestao-pessoas/metas?codFun=${codFun}`);
    if (r.status === 200 && r.json) {
      setItens(r.json.itens);
      setResumo(r.json.resumo);
    }
  }, [codFun]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  async function acao(codMeta: string, ac: string) {
    await api(`/gestao-pessoas/metas/${codMeta}/acao`, { metodo: "PATCH", corpo: { acao: ac } });
    await carregar();
  }

  if (!itens || !resumo) return <p style={{ fontSize: 13, color: "var(--text-muted)" }}>Carregando…</p>;

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
        <p style={{ fontSize: 13, color: "var(--text-muted)", margin: 0 }}>
          Metas acompanhadas ao lado da avaliação — o status vem do progresso e do prazo.
        </p>
        <BotaoPrimario onClick={() => setNova(true)} style={{ flexShrink: 0 }}>Nova meta</BotaoPrimario>
      </div>

      {/* Resumo */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 8 }}>
        <Ind rotulo="Progresso" valor={`${resumo.progressoPonderado}%`} />
        <Ind rotulo="Concluídas" valor={`${resumo.concluidas}/${resumo.total}`} cor="var(--feedback-success, #15803d)" />
        <Ind rotulo="Em andamento" valor={String(resumo.andamento)} />
        <Ind rotulo="Atrasadas" valor={String(resumo.atrasadas)} cor={resumo.atrasadas ? "var(--feedback-danger, #b91c1c)" : undefined} />
        <Ind rotulo="Em risco" valor={String(resumo.emRisco)} cor={resumo.emRisco ? "var(--amber-700, #714E08)" : undefined} />
      </div>

      {/* Lista */}
      {itens.length === 0 ? (
        <p style={{ fontSize: 13, color: "var(--text-muted)", margin: 0 }}>Nenhuma meta ainda.</p>
      ) : (
        <div style={{ display: "grid", gap: 8 }}>
          {itens.map((m) => {
            const st = STATUS[m.status];
            return (
              <div key={m.codMeta} style={{ border: "1px solid var(--border-default)", borderLeft: `3px solid ${st?.cor}`, borderRadius: 8, padding: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, marginBottom: 6 }}>
                  <span style={{ fontSize: 14, fontWeight: 600 }}>{m.titulo}</span>
                  <span style={{ fontSize: 11, fontWeight: 600, color: st?.cor, flexShrink: 0 }}>
                    {st?.texto}{m.emRisco ? " · em risco" : ""}
                  </span>
                </div>
                {m.descricao && <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 6 }}>{m.descricao}</div>}
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, width: 40 }}>{m.progresso}%</span>
                  <div style={{ flex: 1 }}><Barra v={m.progresso} /></div>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                    peso {m.peso} · prazo {data(m.prazo)}{m.responsavel ? ` · ${m.responsavel}` : ""}
                    {m.impactoAvaliacao ? ` · ${m.impactoAvaliacao}` : ""}
                  </span>
                  {m.status !== "CANCELADA" && (
                    <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                      {m.status !== "CONCLUIDA" ? (
                        <>
                          <button onClick={() => setProgMeta(m)} style={botao}>Atualizar</button>
                          <button onClick={() => acao(m.codMeta, "CONCLUIR")} style={botao}>Concluir</button>
                          <button onClick={() => acao(m.codMeta, "CANCELAR")} style={botao}>Cancelar</button>
                        </>
                      ) : (
                        <button onClick={() => acao(m.codMeta, "REABRIR")} style={botao}>Reabrir</button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {nova && <NovaMeta codFun={codFun} fechar={() => setNova(false)} aoSalvar={carregar} />}
      {progMeta && <RegistrarProgresso meta={progMeta} fechar={() => setProgMeta(null)} aoSalvar={carregar} />}
    </div>
  );
}

function Ind({ rotulo, valor, cor }: { rotulo: string; valor: string; cor?: string }) {
  return (
    <div style={{ border: "1px solid var(--border-default)", borderRadius: 8, padding: "8px 10px" }}>
      <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{rotulo}</div>
      <div style={{ fontSize: 18, fontWeight: 700, color: cor ?? "var(--text-body)" }}>{valor}</div>
    </div>
  );
}

function NovaMeta({ codFun, fechar, aoSalvar }: { codFun: string; fechar: () => void; aoSalvar: () => void }) {
  const [form, setForm] = useState({ titulo: "", descricao: "", peso: "1", prazo: "", impactoAvaliacao: "" });
  const [erro, setErro] = useState<string | null>(null);

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    if (!form.titulo.trim()) return setErro("Dê um título à meta.");
    const r = await api("/gestao-pessoas/metas", {
      metodo: "POST",
      corpo: { codFun, titulo: form.titulo, descricao: form.descricao || undefined, peso: Number(form.peso), prazo: form.prazo || undefined, impactoAvaliacao: form.impactoAvaliacao || undefined },
    });
    if (r.status !== 201) return setErro("Não foi possível criar a meta.");
    fechar();
    aoSalvar();
  }

  return (
    <Gaveta titulo="Nova meta" aberta fechar={fechar}>
      <form onSubmit={salvar} style={{ display: "grid", gap: 12 }}>
        <Campo rotulo="Título"><Entrada value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} placeholder="ex.: Reduzir retrabalho em 20%" /></Campo>
        <Campo rotulo="Descrição (opcional)"><Entrada value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} /></Campo>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Campo rotulo="Peso">
            <Selecao value={form.peso} onChange={(e) => setForm({ ...form, peso: e.target.value })}>
              {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}</option>)}
            </Selecao>
          </Campo>
          <Campo rotulo="Prazo (opcional)"><Entrada type="date" value={form.prazo} onChange={(e) => setForm({ ...form, prazo: e.target.value })} /></Campo>
        </div>
        <Campo rotulo="Impacto na avaliação (opcional)"><Entrada value={form.impactoAvaliacao} onChange={(e) => setForm({ ...form, impactoAvaliacao: e.target.value })} placeholder="ex.: peso alto no ciclo" /></Campo>
        <Erro mensagem={erro} />
        <BotaoPrimario type="submit">Criar meta</BotaoPrimario>
      </form>
    </Gaveta>
  );
}

function RegistrarProgresso({ meta, fechar, aoSalvar }: { meta: Meta; fechar: () => void; aoSalvar: () => void }) {
  const [progresso, setProgresso] = useState(meta.progresso);
  const [comentario, setComentario] = useState("");
  const [evidencia, setEvidencia] = useState("");

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    await api(`/gestao-pessoas/metas/${meta.codMeta}/progresso`, {
      metodo: "POST",
      corpo: { progresso, comentario: comentario || undefined, evidencia: evidencia || undefined },
    });
    fechar();
    aoSalvar();
  }

  return (
    <Gaveta titulo={`Progresso — ${meta.titulo}`} aberta fechar={fechar}>
      <form onSubmit={salvar} style={{ display: "grid", gap: 12 }}>
        <Campo rotulo={`Progresso: ${progresso}%`}>
          <input type="range" min={0} max={100} step={5} value={progresso} onChange={(e) => setProgresso(Number(e.target.value))} style={{ width: "100%" }} />
        </Campo>
        <Campo rotulo="Comentário (opcional)"><Entrada value={comentario} onChange={(e) => setComentario(e.target.value)} /></Campo>
        <Campo rotulo="Evidência (opcional)"><Entrada value={evidencia} onChange={(e) => setEvidencia(e.target.value)} placeholder="link ou referência" /></Campo>
        <BotaoPrimario type="submit">Registrar progresso</BotaoPrimario>
      </form>
    </Gaveta>
  );
}

const botao: React.CSSProperties = {
  padding: "4px 10px",
  borderRadius: 6,
  border: "1px solid var(--border-default)",
  background: "var(--surface-default)",
  color: "var(--text-body)",
  fontSize: 12,
  cursor: "pointer",
  fontFamily: "inherit",
};
