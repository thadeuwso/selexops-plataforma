"use client";
import { useCallback, useEffect, useState } from "react";
import { BASE } from "@/lib/api";
import { BotaoPrimario, Campo, Entrada, Erro } from "@/componentes/formulario";

interface PerfilPortal {
  nomeCand: string;
  email: string;
  fone: string | null;
  cidade: string | null;
  linkedin: string | null;
  cargoAtual: string | null;
  curriculoEnviadoEm: string | null;
  culturaRespondida: boolean;
}

interface PerguntaCultural {
  codCulPer: string;
  texto: string;
  respondida: number | null;
}

const ESCALA = [
  { valor: 1, rotulo: "Discordo totalmente" },
  { valor: 2, rotulo: "Discordo em parte" },
  { valor: 3, rotulo: "Nem concordo nem discordo" },
  { valor: 4, rotulo: "Concordo em parte" },
  { valor: 5, rotulo: "Concordo totalmente" },
];

const cartao: React.CSSProperties = {
  background: "var(--surface-default)",
  border: "1px solid var(--border-default)",
  borderRadius: 12,
  padding: 20,
};

/**
 * Seções de escrita do portal do candidato.
 *
 * Sem login: o token da URL é a credencial, e o servidor resolve o candidato a
 * partir dele — nenhuma chamada daqui manda identificador de candidato.
 */
export function PortalCandidatoSecoes({ token }: { token: string }) {
  const [perfil, setPerfil] = useState<PerfilPortal | null>(null);
  const [form, setForm] = useState({ fone: "", cidade: "", linkedin: "", cargoAtual: "" });
  const [salvando, setSalvando] = useState(false);
  const [salvo, setSalvo] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    const res = await fetch(`${BASE}/portal/candidato/${token}/perfil`);
    if (!res.ok) return;
    const p = (await res.json()) as PerfilPortal;
    setPerfil(p);
    setForm({
      fone: p.fone ?? "",
      cidade: p.cidade ?? "",
      linkedin: p.linkedin ?? "",
      cargoAtual: p.cargoAtual ?? "",
    });
  }, [token]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  async function salvarPerfil(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setSalvo(false);
    setSalvando(true);
    const res = await fetch(`${BASE}/portal/candidato/${token}/perfil`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(form),
    });
    setSalvando(false);
    if (!res.ok) {
      setErro("Não foi possível salvar seus dados agora.");
      return;
    }
    setSalvo(true);
    await carregar();
  }

  if (!perfil) return null;

  return (
    <>
      <section style={{ ...cartao, marginTop: 16 }}>
        <h2 style={{ fontSize: 15, fontWeight: 600, margin: "0 0 4px" }}>Seus dados</h2>
        <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "0 0 14px" }}>
          Nome e e-mail identificam seu cadastro e só a empresa pode alterá-los. O resto é com você.
        </p>
        <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 14 }}>
          {perfil.nomeCand} · {perfil.email}
        </div>
        <form onSubmit={salvarPerfil} style={{ display: "grid", gap: 12 }}>
          <Campo rotulo="Telefone">
            <Entrada value={form.fone} onChange={(e) => setForm({ ...form, fone: e.target.value })} />
          </Campo>
          <Campo rotulo="Cidade">
            <Entrada value={form.cidade} onChange={(e) => setForm({ ...form, cidade: e.target.value })} />
          </Campo>
          <Campo rotulo="Cargo atual">
            <Entrada value={form.cargoAtual} onChange={(e) => setForm({ ...form, cargoAtual: e.target.value })} />
          </Campo>
          <Campo rotulo="LinkedIn">
            <Entrada value={form.linkedin} onChange={(e) => setForm({ ...form, linkedin: e.target.value })} />
          </Campo>
          <Erro mensagem={erro} />
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <BotaoPrimario type="submit" disabled={salvando}>
              {salvando ? "Salvando…" : "Salvar meus dados"}
            </BotaoPrimario>
            {salvo && <span style={{ fontSize: 13, color: "var(--feedback-success, #15803d)" }}>Salvo.</span>}
          </div>
        </form>
      </section>

      <EnvioCurriculo token={token} enviadoEm={perfil.curriculoEnviadoEm} aoEnviar={carregar} />
      <QuestionarioCultural token={token} respondido={perfil.culturaRespondida} aoConcluir={carregar} />
    </>
  );
}

function EnvioCurriculo({
  token,
  enviadoEm,
  aoEnviar,
}: {
  token: string;
  enviadoEm: string | null;
  aoEnviar: () => Promise<void>;
}) {
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [reset, setReset] = useState(0);

  async function enviar(arquivo: File) {
    setErro(null);
    setEnviando(true);
    const dados = new FormData();
    dados.set("arquivo", arquivo);
    const res = await fetch(`${BASE}/portal/candidato/${token}/curriculo`, { method: "POST", body: dados });
    setEnviando(false);
    setReset((n) => n + 1);
    if (!res.ok) {
      setErro("Não foi possível enviar. Use PDF, DOCX ou TXT de até 8MB.");
      return;
    }
    await aoEnviar();
  }

  return (
    <section style={{ ...cartao, marginTop: 16 }}>
      <h2 style={{ fontSize: 15, fontWeight: 600, margin: "0 0 4px" }}>Seu currículo</h2>
      <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "0 0 14px" }}>
        {enviadoEm
          ? `Recebemos seu currículo em ${new Date(enviadoEm).toLocaleDateString("pt-BR")}. Pode enviar uma versão atualizada quando quiser.`
          : "Anexe seu currículo em PDF, DOCX ou TXT (até 8MB)."}
      </p>
      <input
        key={reset}
        type="file"
        accept=".pdf,.docx,.txt"
        disabled={enviando}
        onChange={(e) => {
          const arquivo = e.target.files?.[0];
          if (arquivo) void enviar(arquivo);
        }}
        style={{ font: "inherit", fontSize: 14 }}
      />
      {enviando && <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "8px 0 0" }}>Enviando…</p>}
      <Erro mensagem={erro} />
    </section>
  );
}

function QuestionarioCultural({
  token,
  respondido,
  aoConcluir,
}: {
  token: string;
  respondido: boolean;
  aoConcluir: () => Promise<void>;
}) {
  const [perguntas, setPerguntas] = useState<PerguntaCultural[] | null>(null);
  const [respostas, setRespostas] = useState<Record<string, number>>({});
  const [enviando, setEnviando] = useState(false);
  const [concluido, setConcluido] = useState(respondido);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    void fetch(`${BASE}/portal/candidato/${token}/cultura`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { perguntas: PerguntaCultural[] } | null) => {
        if (!d) return;
        setPerguntas(d.perguntas);
        setRespostas(
          Object.fromEntries(
            d.perguntas.filter((p) => p.respondida != null).map((p) => [p.codCulPer, p.respondida as number]),
          ),
        );
      });
  }, [token]);

  if (!perguntas) return null;

  const faltam = perguntas.filter((p) => respostas[p.codCulPer] == null).length;

  async function enviar() {
    setErro(null);
    setEnviando(true);
    const res = await fetch(`${BASE}/portal/candidato/${token}/cultura`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        respostas: Object.entries(respostas).map(([codCulPer, valor]) => ({ codCulPer, valor })),
      }),
    });
    setEnviando(false);
    if (!res.ok) {
      setErro("Não foi possível enviar suas respostas agora.");
      return;
    }
    const dados = (await res.json()) as { completo: boolean };
    setConcluido(dados.completo);
    await aoConcluir();
  }

  return (
    <section style={{ ...cartao, marginTop: 16 }}>
      <h2 style={{ fontSize: 15, fontWeight: 600, margin: "0 0 4px" }}>Como você gosta de trabalhar</h2>
      <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "0 0 4px", lineHeight: 1.55 }}>
        {perguntas.length} afirmações rápidas. Não há resposta certa ou errada — serve para comparar
        seu jeito de trabalhar com o da vaga, e isso corre nos dois sentidos.
      </p>
      {concluido && (
        <p style={{ fontSize: 13, color: "var(--feedback-success, #15803d)", margin: "0 0 12px" }}>
          Respondido. Você pode revisar e enviar de novo se mudar de ideia.
        </p>
      )}

      <div style={{ display: "grid", gap: 16, marginTop: 14 }}>
        {perguntas.map((p) => (
          <div key={p.codCulPer}>
            <div style={{ fontSize: 14, marginBottom: 8 }}>{p.texto}</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {ESCALA.map((o) => {
                const marcada = respostas[p.codCulPer] === o.valor;
                return (
                  <button
                    key={o.valor}
                    onClick={() => setRespostas({ ...respostas, [p.codCulPer]: o.valor })}
                    style={{
                      padding: "6px 12px",
                      borderRadius: 999,
                      border: marcada ? "2px solid var(--brand-700)" : "1px solid var(--border-default)",
                      background: marcada ? "var(--brand-50, #F2E9E2)" : "var(--surface-default)",
                      fontFamily: "inherit",
                      fontSize: 12,
                      cursor: "pointer",
                    }}
                  >
                    {o.rotulo}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <Erro mensagem={erro} />
      <div style={{ marginTop: 18, display: "flex", gap: 12, alignItems: "center" }}>
        <BotaoPrimario onClick={enviar} disabled={enviando || faltam > 0}>
          {enviando ? "Enviando…" : "Enviar respostas"}
        </BotaoPrimario>
        {faltam > 0 && (
          <span style={{ fontSize: 13, color: "var(--text-muted)" }}>
            Faltam {faltam} de {perguntas.length}.
          </span>
        )}
      </div>
    </section>
  );
}
