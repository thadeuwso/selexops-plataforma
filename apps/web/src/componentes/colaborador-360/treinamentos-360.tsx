"use client";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { BotaoPrimario, Campo, Erro, Gaveta, Selecao } from "@/componentes/formulario";

interface Matricula {
  codMat: string;
  codTreino: string;
  nome: string;
  tipo: string;
  competencia: string | null;
  cargaHoraria: number | null;
  obrigatorio: boolean;
  origem: string;
  progresso: number;
  dtConclusao: string | null;
  dtVencimento: string | null;
  status: string;
}
interface Sugestao {
  codTreino: string;
  nome: string;
  competencia: string | null;
  origem: string;
}
interface Resumo {
  total: number;
  concluidos: number;
  emAndamento: number;
  pendentes: number;
  recomendados: number;
  vencidos: number;
  cargaHorariaConcluida: number;
}
interface Catalogo {
  codTreino: string;
  nome: string;
  tipo: string;
}

const STATUS: Record<string, { texto: string; cor: string }> = {
  RECOMENDADO: { texto: "Recomendado", cor: "var(--text-link)" },
  PENDENTE: { texto: "Pendente", cor: "var(--text-muted)" },
  EM_ANDAMENTO: { texto: "Em andamento", cor: "var(--amber-700, #714E08)" },
  CONCLUIDO: { texto: "Concluído", cor: "var(--feedback-success, #15803d)" },
  VENCIDO: { texto: "Vencido", cor: "var(--feedback-danger, #b91c1c)" },
  CANCELADO: { texto: "Cancelado", cor: "var(--text-muted)" },
};
const TIPO: Record<string, string> = { CURSO: "Curso", PALESTRA: "Palestra", CERTIFICACAO: "Certificação", LEITURA: "Leitura", MENTORIA: "Mentoria", WORKSHOP: "Workshop", OUTRO: "Outro" };
const ORIGEM: Record<string, string> = { OBRIGATORIO: "obrigatório", GESTOR: "gestor", RH: "RH", IA: "IA", INTERESSE: "interesse" };
const data = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("pt-BR", { timeZone: "UTC" }) : "—");

export function Treinamentos360({ codFun }: { codFun: string }) {
  const [itens, setItens] = useState<Matricula[] | null>(null);
  const [resumo, setResumo] = useState<Resumo | null>(null);
  const [sugestoes, setSugestoes] = useState<Sugestao[]>([]);
  const [catalogo, setCatalogo] = useState<Catalogo[]>([]);
  const [matricular, setMatricular] = useState(false);

  const carregar = useCallback(async () => {
    const r = await api<{ itens: Matricula[]; resumo: Resumo; sugestoes: Sugestao[] }>(`/gestao-pessoas/colaboradores/${codFun}/treinamentos`);
    if (r.status === 200 && r.json) {
      setItens(r.json.itens);
      setResumo(r.json.resumo);
      setSugestoes(r.json.sugestoes);
    }
  }, [codFun]);

  useEffect(() => {
    void carregar();
    void api<Catalogo[]>("/gestao-pessoas/treinamentos").then((r) => r.json && setCatalogo(r.json));
  }, [carregar]);

  async function inscrever(codTreino: string, origem: string) {
    await api(`/gestao-pessoas/colaboradores/${codFun}/treinamentos`, { metodo: "POST", corpo: { codTreino, origem } });
    await carregar();
  }
  async function mudar(codMat: string, corpo: Record<string, unknown>) {
    await api(`/gestao-pessoas/matriculas/${codMat}`, { metodo: "PATCH", corpo });
    await carregar();
  }

  if (!itens || !resumo) return <p style={{ fontSize: 13, color: "var(--text-muted)" }}>Carregando…</p>;

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
        <p style={{ fontSize: 13, color: "var(--text-muted)", margin: 0 }}>
          Trilhas de capacitação. A IA e o gestor recomendam — matricular é sempre uma decisão humana.
        </p>
        <BotaoPrimario onClick={() => setMatricular(true)} style={{ flexShrink: 0 }}>Matricular</BotaoPrimario>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))", gap: 8 }}>
        <Ind rotulo="Concluídos" valor={String(resumo.concluidos)} cor="var(--feedback-success, #15803d)" />
        <Ind rotulo="Em andamento" valor={String(resumo.emAndamento)} />
        <Ind rotulo="Pendentes" valor={String(resumo.pendentes)} />
        <Ind rotulo="Vencidos" valor={String(resumo.vencidos)} cor={resumo.vencidos ? "var(--feedback-danger, #b91c1c)" : undefined} />
        <Ind rotulo="Carga (h)" valor={String(resumo.cargaHorariaConcluida)} />
      </div>

      {/* Sugestões (obrigatórios não feitos) */}
      {sugestoes.length > 0 && (
        <div style={{ display: "grid", gap: 6 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)" }}>Obrigatórios pendentes</div>
          {sugestoes.map((s) => (
            <div key={s.codTreino} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, border: "1px dashed var(--border-default)", borderRadius: 8, padding: "10px 12px" }}>
              <span style={{ fontSize: 13 }}>{s.nome}{s.competencia ? <span style={{ color: "var(--text-muted)" }}> · {s.competencia}</span> : null}</span>
              <button onClick={() => inscrever(s.codTreino, "OBRIGATORIO")} style={botao}>+ Matricular</button>
            </div>
          ))}
        </div>
      )}

      {/* Matrículas */}
      {itens.length === 0 ? (
        <p style={{ fontSize: 13, color: "var(--text-muted)", margin: 0 }}>Nenhum treinamento ainda.</p>
      ) : (
        <div style={{ display: "grid", gap: 8 }}>
          {itens.map((m) => {
            const st = STATUS[m.status];
            return (
              <div key={m.codMat} style={{ border: "1px solid var(--border-default)", borderLeft: `3px solid ${st?.cor}`, borderRadius: 8, padding: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, marginBottom: 4 }}>
                  <span style={{ fontSize: 14, fontWeight: 600 }}>{m.nome}{m.obrigatorio ? <span style={{ fontSize: 10, color: "var(--feedback-danger, #b91c1c)", marginLeft: 6, fontWeight: 600 }}>OBRIGATÓRIO</span> : null}</span>
                  <span style={{ fontSize: 11, fontWeight: 600, color: st?.cor, flexShrink: 0 }}>{st?.texto}</span>
                </div>
                <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 6 }}>
                  {TIPO[m.tipo] ?? m.tipo}{m.cargaHoraria ? ` · ${m.cargaHoraria}h` : ""}{m.competencia ? ` · ${m.competencia}` : ""} · via {ORIGEM[m.origem] ?? m.origem}
                  {m.dtVencimento ? ` · vence ${data(m.dtVencimento)}` : ""}
                </div>
                {m.status === "EM_ANDAMENTO" && (
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                    <span style={{ fontSize: 12, width: 36 }}>{m.progresso}%</span>
                    <input type="range" min={0} max={100} step={10} defaultValue={m.progresso} onMouseUp={(e) => mudar(m.codMat, { progresso: Number((e.target as HTMLInputElement).value) })} style={{ flex: 1 }} />
                  </div>
                )}
                {m.status !== "CANCELADO" && m.status !== "CONCLUIDO" && m.status !== "VENCIDO" && (
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {(m.status === "RECOMENDADO" || m.status === "PENDENTE") && <button onClick={() => mudar(m.codMat, { status: "EM_ANDAMENTO" })} style={botao}>Iniciar</button>}
                    <button onClick={() => mudar(m.codMat, { status: "CONCLUIDO" })} style={botao}>Concluir</button>
                    <button onClick={() => mudar(m.codMat, { status: "CANCELADO" })} style={botao}>Cancelar</button>
                  </div>
                )}
                {(m.status === "CONCLUIDO" || m.status === "VENCIDO") && (
                  <button onClick={() => mudar(m.codMat, { status: "EM_ANDAMENTO" })} style={botao}>Refazer</button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {matricular && <MatricularGaveta catalogo={catalogo} fechar={() => setMatricular(false)} aoMatricular={(cod, org) => { void inscrever(cod, org); setMatricular(false); }} />}
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

function MatricularGaveta({ catalogo, fechar, aoMatricular }: { catalogo: Catalogo[]; fechar: () => void; aoMatricular: (codTreino: string, origem: string) => void }) {
  const [codTreino, setCodTreino] = useState("");
  const [origem, setOrigem] = useState("GESTOR");
  const [erro, setErro] = useState<string | null>(null);

  return (
    <Gaveta titulo="Matricular em treinamento" aberta fechar={fechar}>
      <div style={{ display: "grid", gap: 12 }}>
        <Campo rotulo="Treinamento">
          <Selecao value={codTreino} onChange={(e) => setCodTreino(e.target.value)}>
            <option value="">Selecione…</option>
            {catalogo.map((t) => <option key={t.codTreino} value={t.codTreino}>{t.nome} ({TIPO[t.tipo] ?? t.tipo})</option>)}
          </Selecao>
        </Campo>
        <Campo rotulo="Origem">
          <Selecao value={origem} onChange={(e) => setOrigem(e.target.value)}>
            {Object.entries(ORIGEM).map(([v, r]) => <option key={v} value={v}>{r}</option>)}
          </Selecao>
        </Campo>
        {catalogo.length === 0 && <p style={{ fontSize: 12, color: "var(--text-muted)", margin: 0 }}>Nenhum treinamento no catálogo. Crie em &ldquo;Catálogo de treinamentos&rdquo;.</p>}
        <Erro mensagem={erro} />
        <BotaoPrimario onClick={() => (codTreino ? aoMatricular(codTreino, origem) : setErro("Escolha um treinamento."))}>Matricular</BotaoPrimario>
      </div>
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
