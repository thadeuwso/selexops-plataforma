"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";

interface Usuario {
  codUsu: string;
  nomeUsu: string;
  email: string;
  situacao: string;
  dhUltAcesso: string | null;
  papeis: { codEmp: string | null; papel: { nomePap: string } }[];
}

const celula: React.CSSProperties = { padding: "10px 14px" };

export default function PaginaUsuarios() {
  const [lista, setLista] = useState<Usuario[]>([]);
  const [semPermissao, setSemPermissao] = useState(false);

  useEffect(() => {
    (async () => {
      const r = await api<Usuario[]>("/usuarios");
      if (r.status === 403) setSemPermissao(true);
      else if (r.status === 200 && r.json) setLista(r.json);
    })();
  }, []);

  if (semPermissao)
    return (
      <main style={{ padding: 32, color: "var(--text-muted)" }}>
        Você não tem a permissão <code>core.usuarios.ler</code> — fale com o administrador do grupo.
      </main>
    );

  return (
    <main style={{ padding: 32 }}>
      <header style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 20, fontWeight: 600, margin: 0 }}>Usuários e papéis</h1>
        <p style={{ color: "var(--text-muted)", fontSize: 14, marginTop: 4 }}>
          {lista.length} usuário(s) com acesso ao grupo.
        </p>
      </header>
      <div style={{ background: "var(--surface-default)", border: "1px solid var(--border-default)", borderRadius: 10, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
          <thead>
            <tr style={{ background: "var(--surface-page)", textAlign: "left" }}>
              <th style={{ ...celula, fontWeight: 600 }}>Nome</th>
              <th style={{ ...celula, fontWeight: 600 }}>E-mail</th>
              <th style={{ ...celula, fontWeight: 600 }}>Papéis</th>
              <th style={{ ...celula, fontWeight: 600 }}>Último acesso</th>
              <th style={{ ...celula, fontWeight: 600 }}>Situação</th>
            </tr>
          </thead>
          <tbody>
            {lista.map((u) => (
              <tr key={u.codUsu} style={{ borderTop: "1px solid var(--border-default)" }}>
                <td style={celula}>{u.nomeUsu}</td>
                <td style={{ ...celula, color: "var(--text-muted)" }}>{u.email}</td>
                <td style={celula}>
                  {u.papeis.map((p, i) => (
                    <span
                      key={i}
                      style={{
                        padding: "2px 10px",
                        borderRadius: 999,
                        fontSize: 12,
                        marginRight: 6,
                        background: "var(--brand-100, #EFE5D4)",
                        color: "var(--brand-800, #48301F)",
                      }}
                    >
                      {p.papel.nomePap}
                      {p.codEmp ? " (escopo)" : ""}
                    </span>
                  ))}
                </td>
                <td style={{ ...celula, fontFamily: "var(--font-mono)", color: "var(--text-muted)" }}>
                  {u.dhUltAcesso ? new Date(u.dhUltAcesso).toLocaleString("pt-BR") : "nunca"}
                </td>
                <td style={celula}>{u.situacao}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
