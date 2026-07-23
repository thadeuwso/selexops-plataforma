"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { NIVEL } from "@/componentes/aderencia-funcionario";

const rota360 = (codFun: string) => `/app/gestao-pessoas/colaboradores/${codFun}`;

interface NovaContratacao {
  codFun: string;
  nomeFun: string;
  dtAdm: string;
  cargo: string | null;
  departamento: string | null;
}
interface ConcluidaItem {
  codFun: string;
  nomeFun: string;
  ciclo: string;
  notaFinal: number | null;
}
interface VisaoGeral {
  novasContratacoes: NovaContratacao[];
  avaliacao: {
    total: number;
    concluidas: number;
    emAndamento: number;
    pendentes: number;
    concluidasLista: ConcluidaItem[];
  };
  porDepartamento: {
    codDep: string | null;
    departamento: string;
    headcount: number;
    avaliados: number;
    notaMedia: number | null;
  }[];
}
interface LinhaAderencia {
  codFun: string;
  nomeFun: string;
  score: number;
  nivel: "ADERENTE" | "ATENCAO" | "RISCO";
}

const data = (iso: string) => new Date(iso).toLocaleDateString("pt-BR");

export function DesempenhoVisaoGeral() {
  const [vg, setVg] = useState<VisaoGeral | null>(null);
  const [ader, setAder] = useState<LinhaAderencia[] | null>(null);

  useEffect(() => {
    void api<VisaoGeral>("/gestao-pessoas/desempenho/visao-geral").then((r) => {
      if (r.status === 200 && r.json) setVg(r.json);
    });
    void api<LinhaAderencia[]>("/gestao-pessoas/aderencia").then((r) => {
      if (r.status === 200 && r.json) setAder(r.json);
    });
  }, []);

  if (!vg) return <p style={{ fontSize: 13, color: "var(--text-muted)" }}>Carregando…</p>;

  const conta = (n: string) => (ader ?? []).filter((l) => l.nivel === n).length;

  return (
    <div style={{ display: "grid", gap: 28 }}>
      {/* Andamento das avaliações do ciclo aberto */}
      <section>
        <h3 style={{ fontSize: 15, fontWeight: 600, margin: "0 0 4px" }}>Avaliações em andamento</h3>
        <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "0 0 12px" }}>Dos ciclos abertos agora.</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
          <Indicador rotulo="Total" valor={vg.avaliacao.total} />
          <Indicador rotulo="Concluídas" valor={vg.avaliacao.concluidas} cor="var(--feedback-success, #15803d)" />
          <Indicador rotulo="Em andamento" valor={vg.avaliacao.emAndamento} cor="var(--amber-700, #714E08)" />
          <Indicador rotulo="Pendentes" valor={vg.avaliacao.pendentes} cor="var(--text-muted)" />
        </div>
        {vg.avaliacao.concluidasLista.length > 0 && (
          <div style={{ marginTop: 12 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", marginBottom: 6 }}>Quem já completou</div>
            <div style={{ display: "grid", gap: 6 }}>
              {vg.avaliacao.concluidasLista.map((c) => (
                <Link key={c.codFun} href={rota360(c.codFun)} style={{ display: "flex", justifyContent: "space-between", gap: 10, border: "1px solid var(--border-default)", borderRadius: 8, padding: "10px 12px", textDecoration: "none", color: "var(--text-body)" }}>
                  <div>
                    <span style={{ fontSize: 13, fontWeight: 500 }}>{c.nomeFun}</span>
                    <span style={{ fontSize: 12, color: "var(--text-muted)" }}> — {c.ciclo}</span>
                  </div>
                  <span style={{ fontSize: 15, fontWeight: 600, flexShrink: 0 }}>{c.notaFinal !== null ? c.notaFinal.toFixed(1) : "—"}</span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Novas contratações */}
      <section>
        <h3 style={{ fontSize: 15, fontWeight: 600, margin: "0 0 4px" }}>Novas contratações</h3>
        <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "0 0 12px" }}>
          Admitidos nos últimos 30 dias — cada um deveria já entrar com um plano de desenvolvimento.
        </p>
        {vg.novasContratacoes.length === 0 ? (
          <p style={{ fontSize: 13, color: "var(--text-muted)", margin: 0 }}>Nenhuma contratação recente.</p>
        ) : (
          <div style={{ display: "grid", gap: 6 }}>
            {vg.novasContratacoes.map((f) => (
              <Link key={f.codFun} href={rota360(f.codFun)} style={{ display: "flex", justifyContent: "space-between", gap: 10, border: "1px solid var(--border-default)", borderRadius: 8, padding: "10px 12px", textDecoration: "none", color: "var(--text-body)" }}>
                <div>
                  <span style={{ fontSize: 13, fontWeight: 500 }}>{f.nomeFun}</span>
                  <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
                    {f.cargo ? ` · ${f.cargo}` : ""}{f.departamento ? ` · ${f.departamento}` : ""}
                  </span>
                </div>
                <span style={{ fontSize: 12, color: "var(--text-muted)", flexShrink: 0 }}>admitido em {data(f.dtAdm)}</span>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Aderência — resumo (o painel completo tem menu próprio) */}
      <section>
        <h3 style={{ fontSize: 15, fontWeight: 600, margin: "0 0 4px" }}>Aderência ao desenvolvimento</h3>
        <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "0 0 12px" }}>
          Quem está engajando e quem precisa de atenção. Detalhe no Painel de aderência.
        </p>
        <div style={{ display: "flex", gap: 10 }}>
          {(["RISCO", "ATENCAO", "ADERENTE"] as const).map((n) => (
            <div key={n} style={{ border: "1px solid var(--border-default)", borderLeft: `4px solid ${NIVEL[n].cor}`, borderRadius: 10, padding: "10px 16px", display: "flex", alignItems: "baseline", gap: 8 }}>
              <span style={{ fontSize: 22, fontWeight: 700, color: NIVEL[n].cor }}>{ader === null ? "…" : conta(n)}</span>
              <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{NIVEL[n].texto}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Indicadores por departamento */}
      <section>
        <h3 style={{ fontSize: 15, fontWeight: 600, margin: "0 0 12px" }}>Por departamento</h3>
        <div style={{ border: "1px solid var(--border-default)", borderRadius: 10, overflow: "hidden" }}>
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: 8, padding: "10px 14px", background: "var(--surface-muted, rgba(0,0,0,.03))", fontSize: 11, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: ".03em" }}>
            <span>Departamento</span>
            <span style={{ textAlign: "right" }}>Pessoas</span>
            <span style={{ textAlign: "right" }}>Avaliadas</span>
            <span style={{ textAlign: "right" }}>Nota média</span>
          </div>
          {vg.porDepartamento.map((d) => (
            <div key={d.codDep ?? "sem"} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: 8, padding: "10px 14px", borderTop: "1px solid var(--border-default)", fontSize: 13, alignItems: "center" }}>
              <span>{d.departamento}</span>
              <span style={{ textAlign: "right" }}>{d.headcount}</span>
              <span style={{ textAlign: "right", color: "var(--text-muted)" }}>{d.avaliados}</span>
              <span style={{ textAlign: "right", fontWeight: 600 }}>{d.notaMedia !== null ? d.notaMedia.toFixed(1) : "—"}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function Indicador({ rotulo, valor, cor }: { rotulo: string; valor: number; cor?: string }) {
  return (
    <div style={{ border: "1px solid var(--border-default)", borderRadius: 10, padding: "12px 16px" }}>
      <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{rotulo}</div>
      <div style={{ fontSize: 24, fontWeight: 700, marginTop: 2, color: cor ?? "var(--text-body)" }}>{valor}</div>
    </div>
  );
}
