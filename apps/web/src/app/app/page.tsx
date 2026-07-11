"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";

interface Eu {
  nome: string;
  permissoes: string[];
}
interface Empresa {
  codEmp: string;
  nomeFantasia: string;
  razaoSocial: string;
  codEmpMatriz: string | null;
  situacao: string;
}

const celula: React.CSSProperties = { padding: "10px 14px" };

export default function PaginaEmpresas() {
  const rotear = useRouter();
  const [eu, setEu] = useState<Eu | null>(null);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);

  useEffect(() => {
    (async () => {
      const rEu = await api<Eu>("/auth/eu");
      if (rEu.status !== 200) {
        rotear.replace("/login");
        return;
      }
      setEu(rEu.json);
      const rEmp = await api<Empresa[]>("/empresas");
      if (rEmp.status === 200 && rEmp.json) setEmpresas(rEmp.json);
    })();
  }, [rotear]);

  if (!eu) return null;

  return (
    <main style={{ padding: 32 }}>
      <header style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 20, fontWeight: 600, margin: 0 }}>Empresas e filiais</h1>
        <p style={{ color: "var(--text-muted)", fontSize: 14, marginTop: 4 }}>
          Olá, {eu.nome} — {empresas.length} empresa(s) no seu grupo.
        </p>
      </header>
      <div style={{ background: "var(--surface-default)", border: "1px solid var(--border-default)", borderRadius: 10, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
          <thead>
            <tr style={{ background: "var(--surface-page)", textAlign: "left" }}>
              <th style={{ ...celula, fontWeight: 600 }}>Código</th>
              <th style={{ ...celula, fontWeight: 600 }}>Nome fantasia</th>
              <th style={{ ...celula, fontWeight: 600 }}>Razão social</th>
              <th style={{ ...celula, fontWeight: 600 }}>Tipo</th>
            </tr>
          </thead>
          <tbody>
            {empresas.map((e) => (
              <tr key={e.codEmp} style={{ borderTop: "1px solid var(--border-default)" }}>
                <td style={{ ...celula, fontFamily: "var(--font-mono)" }}>{e.codEmp}</td>
                <td style={celula}>{e.nomeFantasia}</td>
                <td style={{ ...celula, color: "var(--text-muted)" }}>{e.razaoSocial}</td>
                <td style={celula}>{e.codEmpMatriz ? "Filial" : "Matriz"}</td>
              </tr>
            ))}
            {empresas.length === 0 && (
              <tr>
                <td colSpan={4} style={{ padding: 24, color: "var(--text-muted)", textAlign: "center" }}>
                  Nenhuma empresa visível para o seu perfil.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
