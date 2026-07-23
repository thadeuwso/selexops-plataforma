"use client";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { BotaoPrimario, Campo, Entrada, Erro, Gaveta, Selecao } from "@/componentes/formulario";
import { AvaliacaoDesempenhoGaveta } from "@/componentes/avaliacao-desempenho-gaveta";

interface CicloResumo {
  codCiclo: string;
  nome: string;
  descricao: string | null;
  dtInicio: string;
  dtFim: string;
  status: string;
  qtdCompetencias: number;
  qtdAvaliacoes: number;
  qtdConcluidas: number;
}
interface Competencia {
  codComp: string;
  nome: string;
  descricao: string | null;
  peso: number;
}
interface AvaliacaoLinha {
  codAval: string;
  codFun: string;
  funcionario: { nomeFun: string; numCad: string } | null;
  avaliador: { nomeUsu: string } | null;
  status: string;
  notaFinal: number | null;
  competenciasComNota: number;
  totalCompetencias: number;
}
interface CicloDetalhe {
  codCiclo: string;
  nome: string;
  descricao: string | null;
  dtInicio: string;
  dtFim: string;
  status: string;
  competencias: Competencia[];
  avaliacoes: AvaliacaoLinha[];
}
interface Funcionario {
  codFun: string;
  numCad: string;
  nomeFun: string;
}

const STATUS_CICLO: Record<string, { texto: string; cor: string }> = {
  RASCUNHO: { texto: "Rascunho", cor: "var(--text-muted)" },
  ABERTO: { texto: "Aberto", cor: "var(--feedback-success, #15803d)" },
  ENCERRADO: { texto: "Encerrado", cor: "var(--amber-700, #714E08)" },
};
const STATUS_AVAL: Record<string, string> = {
  PENDENTE: "Pendente",
  EM_ANDAMENTO: "Em andamento",
  CONCLUIDA: "Concluída",
};

const data = (iso: string) => new Date(iso).toLocaleDateString("pt-BR");

export function CiclosDesempenho() {
  const [ciclos, setCiclos] = useState<CicloResumo[] | null>(null);
  const [aberto, setAberto] = useState<CicloDetalhe | null>(null);

  const carregar = useCallback(async () => {
    const r = await api<CicloResumo[]>("/gestao-pessoas/ciclos");
    if (r.status === 200 && r.json) setCiclos(r.json);
  }, []);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const abrirCiclo = useCallback(async (codCiclo: string) => {
    const r = await api<CicloDetalhe>(`/gestao-pessoas/ciclos/${codCiclo}`);
    if (r.status === 200 && r.json) setAberto(r.json);
  }, []);

  if (aberto) {
    return (
      <CicloDetalheView
        ciclo={aberto}
        recarregar={() => abrirCiclo(aberto.codCiclo)}
        voltar={() => {
          setAberto(null);
          void carregar();
        }}
      />
    );
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", gap: 16, marginBottom: 8 }}>
        <p style={{ color: "var(--text-muted)", fontSize: 14, margin: 0, lineHeight: 1.6, maxWidth: 640 }}>
          Ciclos periódicos com competências e nota — o momento estruturado, ao lado do feedback contínuo do
          dia a dia. A nota final de cada pessoa é a média ponderada das competências, nunca um número solto.
        </p>
        <NovoCiclo aoCriar={carregar} />
      </div>

      {ciclos === null ? (
        <p style={{ fontSize: 13, color: "var(--text-muted)" }}>Carregando…</p>
      ) : ciclos.length === 0 ? (
        <p style={{ fontSize: 14, color: "var(--text-muted)", marginTop: 24 }}>
          Nenhum ciclo ainda. Crie o primeiro para começar a avaliar.
        </p>
      ) : (
        <div style={{ display: "grid", gap: 10, marginTop: 20 }}>
          {ciclos.map((c) => {
            const st = STATUS_CICLO[c.status];
            return (
              <button
                key={c.codCiclo}
                onClick={() => abrirCiclo(c.codCiclo)}
                style={{ textAlign: "left", border: "1px solid var(--border-default)", borderRadius: 10, padding: 16, background: "var(--surface-default)", cursor: "pointer", fontFamily: "inherit" }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginBottom: 6 }}>
                  <span style={{ fontSize: 15, fontWeight: 600 }}>{c.nome}</span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: st?.cor }}>{st?.texto ?? c.status}</span>
                </div>
                <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                  {data(c.dtInicio)} — {data(c.dtFim)} · {c.qtdCompetencias} competência(s) ·{" "}
                  {c.qtdConcluidas}/{c.qtdAvaliacoes} avaliação(ões) concluída(s)
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function NovoCiclo({ aoCriar }: { aoCriar: () => void }) {
  const [aberto, setAberto] = useState(false);
  const [form, setForm] = useState({ nome: "", descricao: "", dtInicio: "", dtFim: "" });
  const [erro, setErro] = useState<string | null>(null);

  async function criar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    if (!form.nome.trim() || !form.dtInicio || !form.dtFim) {
      setErro("Preencha nome e período.");
      return;
    }
    const r = await api("/gestao-pessoas/ciclos", {
      metodo: "POST",
      corpo: { nome: form.nome, descricao: form.descricao || undefined, dtInicio: form.dtInicio, dtFim: form.dtFim },
    });
    if (r.status !== 201) {
      setErro("Não foi possível criar o ciclo.");
      return;
    }
    setAberto(false);
    setForm({ nome: "", descricao: "", dtInicio: "", dtFim: "" });
    aoCriar();
  }

  return (
    <>
      <BotaoPrimario onClick={() => setAberto(true)} style={{ flexShrink: 0 }}>Novo ciclo</BotaoPrimario>
      <Gaveta titulo="Novo ciclo de avaliação" aberta={aberto} fechar={() => setAberto(false)}>
        <form onSubmit={criar} style={{ display: "grid", gap: 12 }}>
          <Campo rotulo="Nome">
            <Entrada placeholder="ex.: Avaliação Semestral 2026/2" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
          </Campo>
          <Campo rotulo="Descrição (opcional)">
            <Entrada value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} />
          </Campo>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Campo rotulo="Início">
              <Entrada type="date" value={form.dtInicio} onChange={(e) => setForm({ ...form, dtInicio: e.target.value })} />
            </Campo>
            <Campo rotulo="Fim">
              <Entrada type="date" value={form.dtFim} onChange={(e) => setForm({ ...form, dtFim: e.target.value })} />
            </Campo>
          </div>
          <Erro mensagem={erro} />
          <BotaoPrimario type="submit">Criar ciclo</BotaoPrimario>
        </form>
      </Gaveta>
    </>
  );
}

function CicloDetalheView({
  ciclo,
  recarregar,
  voltar,
}: {
  ciclo: CicloDetalhe;
  recarregar: () => void;
  voltar: () => void;
}) {
  const [compAberto, setCompAberto] = useState(false);
  const [funcAberto, setFuncAberto] = useState(false);
  const [avalAberta, setAvalAberta] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const st = STATUS_CICLO[ciclo.status];
  const encerrado = ciclo.status === "ENCERRADO";

  async function mudarStatus(status: string) {
    setErro(null);
    const r = await api(`/gestao-pessoas/ciclos/${ciclo.codCiclo}`, { metodo: "PATCH", corpo: { status } });
    if (r.status !== 200) {
      setErro(status === "ABERTO" ? "Defina ao menos uma competência antes de abrir." : "Não foi possível mudar o status.");
      return;
    }
    recarregar();
  }

  return (
    <div>
      <button onClick={voltar} style={{ background: "none", border: "none", padding: 0, color: "var(--text-link)", cursor: "pointer", fontFamily: "inherit", fontSize: 13, marginBottom: 16 }}>
        ← Todos os ciclos
      </button>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", gap: 16, marginBottom: 4 }}>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 600, margin: "0 0 4px" }}>{ciclo.nome}</h2>
          <div style={{ fontSize: 13, color: "var(--text-muted)" }}>
            {data(ciclo.dtInicio)} — {data(ciclo.dtFim)} ·{" "}
            <span style={{ color: st?.cor, fontWeight: 600 }}>{st?.texto ?? ciclo.status}</span>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
          {ciclo.status === "RASCUNHO" && <BotaoPrimario onClick={() => mudarStatus("ABERTO")}>Abrir ciclo</BotaoPrimario>}
          {ciclo.status === "ABERTO" && (
            <button onClick={() => mudarStatus("ENCERRADO")} style={botaoSecundario}>Encerrar ciclo</button>
          )}
        </div>
      </div>
      <Erro mensagem={erro} />

      {/* Competências */}
      <section style={{ marginTop: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <h3 style={{ fontSize: 15, fontWeight: 600, margin: 0 }}>Competências</h3>
          {!encerrado && <button onClick={() => setCompAberto(true)} style={botaoSecundario}>Adicionar competência</button>}
        </div>
        {ciclo.competencias.length === 0 ? (
          <p style={{ fontSize: 13, color: "var(--text-muted)", margin: 0 }}>
            Nenhuma competência ainda. Defina o que será avaliado antes de abrir o ciclo.
          </p>
        ) : (
          <div style={{ display: "grid", gap: 6 }}>
            {ciclo.competencias.map((c) => (
              <div key={c.codComp} style={{ display: "flex", justifyContent: "space-between", gap: 10, border: "1px solid var(--border-default)", borderRadius: 8, padding: "10px 12px" }}>
                <div>
                  <span style={{ fontSize: 13, fontWeight: 500 }}>{c.nome}</span>
                  {c.descricao && <span style={{ fontSize: 12, color: "var(--text-muted)" }}> — {c.descricao}</span>}
                </div>
                <span style={{ fontSize: 12, color: "var(--text-muted)", flexShrink: 0 }}>peso {c.peso}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Avaliações */}
      <section style={{ marginTop: 28 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <h3 style={{ fontSize: 15, fontWeight: 600, margin: 0 }}>Avaliados</h3>
          {!encerrado && <button onClick={() => setFuncAberto(true)} style={botaoSecundario}>Adicionar funcionário</button>}
        </div>
        {ciclo.avaliacoes.length === 0 ? (
          <p style={{ fontSize: 13, color: "var(--text-muted)", margin: 0 }}>
            Ninguém no ciclo ainda. Adicione os funcionários a avaliar.
          </p>
        ) : (
          <div style={{ display: "grid", gap: 6 }}>
            {ciclo.avaliacoes.map((a) => (
              <button
                key={a.codAval}
                onClick={() => setAvalAberta(a.codAval)}
                style={{ textAlign: "left", display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", border: "1px solid var(--border-default)", borderRadius: 8, padding: "12px 14px", background: "var(--surface-default)", cursor: "pointer", fontFamily: "inherit" }}
              >
                <div>
                  <div style={{ fontSize: 14, fontWeight: 500 }}>{a.funcionario?.nomeFun}</div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                    {STATUS_AVAL[a.status] ?? a.status} · {a.competenciasComNota}/{a.totalCompetencias} competência(s)
                    {a.avaliador ? ` · avaliador: ${a.avaliador.nomeUsu}` : ""}
                  </div>
                </div>
                <span style={{ fontSize: 20, fontWeight: 600, flexShrink: 0 }}>
                  {a.notaFinal !== null ? a.notaFinal.toFixed(1) : "—"}
                </span>
              </button>
            ))}
          </div>
        )}
      </section>

      <AdicionarCompetencia
        codCiclo={ciclo.codCiclo}
        aberto={compAberto}
        fechar={() => setCompAberto(false)}
        aoAdicionar={recarregar}
      />
      <AdicionarFuncionario
        codCiclo={ciclo.codCiclo}
        jaNoCiclo={ciclo.avaliacoes.map((a) => a.codFun)}
        aberto={funcAberto}
        fechar={() => setFuncAberto(false)}
        aoAdicionar={recarregar}
      />
      <AvaliacaoDesempenhoGaveta
        codAval={avalAberta}
        aberta={avalAberta !== null}
        fechar={() => setAvalAberta(null)}
        aoMudar={recarregar}
      />
    </div>
  );
}

function AdicionarCompetencia({
  codCiclo,
  aberto,
  fechar,
  aoAdicionar,
}: {
  codCiclo: string;
  aberto: boolean;
  fechar: () => void;
  aoAdicionar: () => void;
}) {
  const [form, setForm] = useState({ nome: "", descricao: "", peso: "1" });
  const [erro, setErro] = useState<string | null>(null);

  async function adicionar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    if (!form.nome.trim()) {
      setErro("Dê um nome à competência.");
      return;
    }
    const r = await api(`/gestao-pessoas/ciclos/${codCiclo}/competencias`, {
      metodo: "POST",
      corpo: { nome: form.nome, descricao: form.descricao || undefined, peso: Number(form.peso) },
    });
    if (r.status !== 201) {
      setErro("Não foi possível adicionar.");
      return;
    }
    setForm({ nome: "", descricao: "", peso: "1" });
    fechar();
    aoAdicionar();
  }

  return (
    <Gaveta titulo="Nova competência" aberta={aberto} fechar={fechar}>
      <form onSubmit={adicionar} style={{ display: "grid", gap: 12 }}>
        <Campo rotulo="Nome">
          <Entrada placeholder="ex.: Colaboração" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
        </Campo>
        <Campo rotulo="Descrição (opcional)">
          <Entrada value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} />
        </Campo>
        <Campo rotulo="Peso na nota final">
          <Selecao value={form.peso} onChange={(e) => setForm({ ...form, peso: e.target.value })}>
            {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}</option>)}
          </Selecao>
        </Campo>
        <Erro mensagem={erro} />
        <BotaoPrimario type="submit">Adicionar</BotaoPrimario>
      </form>
    </Gaveta>
  );
}

function AdicionarFuncionario({
  codCiclo,
  jaNoCiclo,
  aberto,
  fechar,
  aoAdicionar,
}: {
  codCiclo: string;
  jaNoCiclo: string[];
  aberto: boolean;
  fechar: () => void;
  aoAdicionar: () => void;
}) {
  const [funcs, setFuncs] = useState<Funcionario[] | null>(null);
  const [sel, setSel] = useState("");
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (aberto && funcs === null) {
      void api<Funcionario[]>("/funcionarios").then((r) => {
        if (r.status === 200 && r.json) setFuncs(r.json);
      });
    }
  }, [aberto, funcs]);

  const disponiveis = (funcs ?? []).filter((f) => !jaNoCiclo.includes(f.codFun));

  async function adicionar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    if (!sel) {
      setErro("Escolha um funcionário.");
      return;
    }
    const r = await api(`/gestao-pessoas/ciclos/${codCiclo}/avaliacoes`, {
      metodo: "POST",
      corpo: { codFun: sel },
    });
    if (r.status !== 201) {
      setErro("Não foi possível adicionar.");
      return;
    }
    setSel("");
    fechar();
    aoAdicionar();
  }

  return (
    <Gaveta titulo="Adicionar funcionário ao ciclo" aberta={aberto} fechar={fechar}>
      <form onSubmit={adicionar} style={{ display: "grid", gap: 12 }}>
        <Campo rotulo="Funcionário">
          <Selecao value={sel} onChange={(e) => setSel(e.target.value)}>
            <option value="">Selecione…</option>
            {disponiveis.map((f) => (
              <option key={f.codFun} value={f.codFun}>{f.nomeFun} ({f.numCad})</option>
            ))}
          </Selecao>
        </Campo>
        {funcs !== null && disponiveis.length === 0 && (
          <p style={{ fontSize: 12, color: "var(--text-muted)", margin: 0 }}>Todos os funcionários já estão neste ciclo.</p>
        )}
        <Erro mensagem={erro} />
        <BotaoPrimario type="submit">Adicionar</BotaoPrimario>
      </form>
    </Gaveta>
  );
}

const botaoSecundario: React.CSSProperties = {
  padding: "8px 14px",
  borderRadius: 8,
  border: "1px solid var(--border-default)",
  background: "var(--surface-default)",
  color: "var(--text-body)",
  fontSize: 13,
  cursor: "pointer",
  fontFamily: "inherit",
};
