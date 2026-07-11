"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { api } from "@/lib/api";

const itens = [
  { rota: "/app", rotulo: "Empresas" },
  { rota: "/app/funcionarios", rotulo: "Funcionários" },
  { rota: "/app/usuarios", rotulo: "Usuários" },
];

export default function LayoutApp({ children }: { children: ReactNode }) {
  const rota = usePathname();
  const rotear = useRouter();

  async function sair() {
    await api("/auth/sair", {
      metodo: "POST",
      corpo: { refreshToken: localStorage.getItem("refreshToken") },
    });
    localStorage.clear();
    rotear.replace("/login");
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "grid",
        gridTemplateColumns: "220px 1fr",
        background: "var(--surface-page)",
        fontFamily: "var(--font-sans)",
        color: "var(--text-default)",
      }}
    >
      <aside
        style={{
          background: "var(--brand-900, #3A2717)",
          color: "#fff",
          padding: "20px 16px",
          display: "flex",
          flexDirection: "column",
          gap: 16,
        }}
      >
        <img
          src="/marca/SelX_Kit_Identidade/svg/selx-logo-horizontal-fundo-escuro.svg"
          alt="SelX"
          style={{ height: 34 }}
        />
        <nav style={{ display: "grid", gap: 4, fontSize: 14 }}>
          {itens.map((i) => (
            <Link
              key={i.rota}
              href={i.rota}
              style={{
                padding: "8px 10px",
                borderRadius: 8,
                color: "#fff",
                textDecoration: "none",
                background: rota === i.rota ? "rgba(255,255,255,.14)" : "transparent",
                opacity: rota === i.rota ? 1 : 0.75,
              }}
            >
              {i.rotulo}
            </Link>
          ))}
          <span style={{ padding: "8px 10px", opacity: 0.45, fontSize: 13 }}>Benefícios (em breve)</span>
        </nav>
        <button
          onClick={sair}
          style={{
            marginTop: "auto",
            padding: "8px 10px",
            borderRadius: 8,
            border: "1px solid rgba(255,255,255,.25)",
            background: "transparent",
            color: "#fff",
            font: "inherit",
            cursor: "pointer",
          }}
        >
          Sair
        </button>
      </aside>
      <div>{children}</div>
    </div>
  );
}
