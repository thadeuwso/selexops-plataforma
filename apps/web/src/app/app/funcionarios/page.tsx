"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";

interface Funcionario {
  codFun: string;
  numCad: string;
  nomeFun: string;
  situacao: string;
  dtAdm: string;
  empresa: { nomeFantasia: string };
  cargo: { nomeCar: string } | null;
  departamento: { descrDep: string } | null;
}

const celula: React.CSSProperties = { padding: "10px 14px" };

export default function PaginaFuncionarios() {
  const [lista, setLista] = useState<Funcionario[]>([]);
  const [carregado, setCarregado] = useState(false);

  useEffect(() => {
    (async () => {
      const r = await api<Funcionario[]>("/funcionarios");
      if (r.status === 200 && r.json) setLista(r.json);
      setCarregado(true);
    })();
  }, []);

  return (
    <main style={{ padding: 32 }}>
      <header style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 20, fontWeight: 600, margin: 0 }}>Funcionários</h1>
        <p style={{ color: "var(--text-muted)", fontSize: 14, marginTop: 4 }}>
          {lista.length} funcionário(s) ativo(s) no grupo.
        </p>
      </header>
      <div style={{ background: "var(--surface-default)", border: "1px solid var(--border-default)", borderRadius: 10, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
          <thead>
            <tr style={{ background: "var(--surface-page)", textAlign: "left" }}>
              <th style={{ ...celula, fontWeight: 600 }}>Matrícula</th>
              <th style={{ ...celula, fontWeight: 600 }}>Nome</th>
              <th style={{ ...celula, fontWeight: 600 }}>Empresa</th>
              <th style={{ ...celula, fontWeight: 600 }}>Cargo</th>
              <th style={{ ...celula, fontWeight: 600 }}>Departamento</th>
              <th style={{ ...celula, fontWeight: 600 }}>Admissão</th>
              <th style={{ ...celula, fontWeight: 600 }}>Situação</th>
            </tr>
          </thead>
          <tbody>
            {lista.map((f) => (
              <tr key={f.codFun} style={{ borderTop: "1px solid var(--border-default)" }}>
                <td style={{ ...celula, fontFamily: "var(--font-mono)" }}>{f.numCad}</td>
                <td style={celula}>{f.nomeFun}</td>
                <td style={{ ...celula, color: "var(--text-muted)" }}>{f.empresa?.nomeFantasia}</td>
                <td style={celula}>{f.cargo?.nomeCar ?? "—"}</td>
                <td style={celula}>{f.departamento?.descrDep ?? "—"}</td>
                <td style={{ ...celula, fontFamily: "var(--font-mono)" }}>
                  {new Date(f.dtAdm).toLocaleDateString("pt-BR", { timeZone: "UTC" })}
                </td>
                <td style={celula}>
                  <span
                    style={{
                      padding: "2px 10px",
                      borderRadius: 999,
                      fontSize: 12,
                      background: f.situacao === "ATIVO" ? "var(--green-100, #D6E9DF)" : "var(--neutral-100)",
                      color: f.situacao === "ATIVO" ? "var(--green-700, #1D533B)" : "var(--text-muted)",
                    }}
                  >
                    {f.situacao}
                  </span>
                </td>
              </tr>
            ))}
            {carregado && lista.length === 0 && (
              <tr>
                <td colSpan={7} style={{ padding: 24, color: "var(--text-muted)", textAlign: "center" }}>
                  Nenhum funcionário cadastrado ainda — a admissão via tela chega na próxima iteração; por ora, use POST /funcionarios.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
