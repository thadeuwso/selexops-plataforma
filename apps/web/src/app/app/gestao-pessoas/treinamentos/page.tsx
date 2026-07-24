"use client";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { BotaoPrimario, Campo, Entrada, Erro, Gaveta, Selecao } from "@/componentes/formulario";

interface Treino {
  codTreino: string;
  nome: string;
  descricao: string | null;
  tipo: string;
  competencia: string | null;
  cargaHoraria: number | null;
  obrigatorio: boolean;
  validadeMeses: number | null;
}
const TIPOS = [
  { v: "CURSO", r: "Curso" }, { v: "PALESTRA", r: "Palestra" }, { v: "CERTIFICACAO", r: "Certificação" },
  { v: "LEITURA", r: "Leitura" }, { v: "MENTORIA", r: "Mentoria" }, { v: "WORKSHOP", r: "Workshop" }, { v: "OUTRO", r: "Outro" },
];
const rotuloTipo = Object.fromEntries(TIPOS.map((t) => [t.v, t.r]));

export default function PaginaTreinamentos() {
  const [itens, setItens] = useState<Treino[] | null>(null);
  const [edit, setEdit] = useState<Treino | "novo" | null>(null);

  const carregar = useCallback(async () => {
    const r = await api<Treino[]>("/gestao-pessoas/treinamentos");
    if (r.status === 200 && r.json) setItens(r.json);
  }, []);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  return (
    <main style={{ padding: 32, maxWidth: 860 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", gap: 16, marginBottom: 8 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 600, margin: "0 0 6px" }}>Catálogo de treinamentos</h1>
          <p style={{ color: "var(--text-muted)", fontSize: 14, margin: 0, lineHeight: 1.6, maxWidth: 620 }}>
            A oferta de capacitação da empresa. A competência liga o treinamento ao desenvolvimento; obrigatórios
            entram como pendência de quem ainda não fez.
          </p>
        </div>
        <BotaoPrimario onClick={() => setEdit("novo")} style={{ flexShrink: 0 }}>Novo treinamento</BotaoPrimario>
      </div>

      {itens === null ? (
        <p style={{ fontSize: 13, color: "var(--text-muted)" }}>Carregando…</p>
      ) : itens.length === 0 ? (
        <p style={{ fontSize: 14, color: "var(--text-muted)", marginTop: 20 }}>Nenhum treinamento no catálogo ainda.</p>
      ) : (
        <div style={{ display: "grid", gap: 8, marginTop: 16 }}>
          {itens.map((t) => (
            <button key={t.codTreino} onClick={() => setEdit(t)} style={{ textAlign: "left", border: "1px solid var(--border-default)", borderRadius: 10, padding: "14px 16px", background: "var(--surface-default)", cursor: "pointer", fontFamily: "inherit" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                <span style={{ fontSize: 15, fontWeight: 600 }}>{t.nome}{t.obrigatorio ? <span style={{ fontSize: 10, color: "var(--feedback-danger, #b91c1c)", marginLeft: 8, fontWeight: 600 }}>OBRIGATÓRIO</span> : null}</span>
                <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{rotuloTipo[t.tipo] ?? t.tipo}</span>
              </div>
              <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>
                {t.competencia ? `${t.competencia} · ` : ""}{t.cargaHoraria ? `${t.cargaHoraria}h` : "carga não informada"}{t.validadeMeses ? ` · validade ${t.validadeMeses} meses` : ""}
              </div>
            </button>
          ))}
        </div>
      )}

      {edit && <EditorTreino treino={edit === "novo" ? null : edit} fechar={() => setEdit(null)} aoSalvar={carregar} />}
    </main>
  );
}

function EditorTreino({ treino, fechar, aoSalvar }: { treino: Treino | null; fechar: () => void; aoSalvar: () => void }) {
  const [form, setForm] = useState({
    nome: treino?.nome ?? "", descricao: treino?.descricao ?? "", tipo: treino?.tipo ?? "CURSO",
    competencia: treino?.competencia ?? "", cargaHoraria: treino?.cargaHoraria != null ? String(treino.cargaHoraria) : "",
    obrigatorio: treino?.obrigatorio ?? false, validadeMeses: treino?.validadeMeses != null ? String(treino.validadeMeses) : "",
  });
  const [erro, setErro] = useState<string | null>(null);

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    if (!form.nome.trim()) return setErro("Dê um nome ao treinamento.");
    const corpo = {
      nome: form.nome, descricao: form.descricao || undefined, tipo: form.tipo,
      competencia: form.competencia || undefined, cargaHoraria: form.cargaHoraria ? Number(form.cargaHoraria) : undefined,
      obrigatorio: form.obrigatorio, validadeMeses: form.validadeMeses ? Number(form.validadeMeses) : undefined,
    };
    const r = treino
      ? await api(`/gestao-pessoas/treinamentos/${treino.codTreino}`, { metodo: "PATCH", corpo })
      : await api("/gestao-pessoas/treinamentos", { metodo: "POST", corpo });
    if (r.status !== 200 && r.status !== 201) return setErro("Não foi possível salvar.");
    fechar();
    aoSalvar();
  }

  async function remover() {
    if (!treino) return;
    await api(`/gestao-pessoas/treinamentos/${treino.codTreino}/remover`, { metodo: "PATCH" });
    fechar();
    aoSalvar();
  }

  return (
    <Gaveta titulo={treino ? "Editar treinamento" : "Novo treinamento"} aberta fechar={fechar}>
      <form onSubmit={salvar} style={{ display: "grid", gap: 12 }}>
        <Campo rotulo="Nome"><Entrada value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} placeholder="ex.: Comunicação assertiva" /></Campo>
        <Campo rotulo="Descrição (opcional)"><Entrada value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} /></Campo>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Campo rotulo="Tipo">
            <Selecao value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })}>
              {TIPOS.map((t) => <option key={t.v} value={t.v}>{t.r}</option>)}
            </Selecao>
          </Campo>
          <Campo rotulo="Competência (opcional)"><Entrada value={form.competencia} onChange={(e) => setForm({ ...form, competencia: e.target.value })} placeholder="ex.: Comunicação" /></Campo>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Campo rotulo="Carga horária (h)"><Entrada type="number" min={0} value={form.cargaHoraria} onChange={(e) => setForm({ ...form, cargaHoraria: e.target.value })} /></Campo>
          <Campo rotulo="Validade (meses, certificação)"><Entrada type="number" min={1} value={form.validadeMeses} onChange={(e) => setForm({ ...form, validadeMeses: e.target.value })} /></Campo>
        </div>
        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, cursor: "pointer" }}>
          <input type="checkbox" checked={form.obrigatorio} onChange={(e) => setForm({ ...form, obrigatorio: e.target.checked })} />
          Obrigatório para todos
        </label>
        <Erro mensagem={erro} />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
          <BotaoPrimario type="submit">{treino ? "Salvar" : "Criar treinamento"}</BotaoPrimario>
          {treino && <button type="button" onClick={remover} style={{ background: "none", border: "none", color: "var(--feedback-danger, #b91c1c)", cursor: "pointer", fontFamily: "inherit", fontSize: 13 }}>Remover</button>}
        </div>
      </form>
    </Gaveta>
  );
}
