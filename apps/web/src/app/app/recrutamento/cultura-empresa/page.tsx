"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { BotaoPrimario, Erro, Selecao } from "@/componentes/formulario";

const DIMENSOES = [
  { chave: "autonomy", rotulo: "Autonomia", baixo: "Direção próxima, passos definidos", alto: "Decide o próprio caminho" },
  { chave: "pace", rotulo: "Ritmo", baixo: "Estável e previsível", alto: "Prioridades mudam com frequência" },
  { chave: "collaboration", rotulo: "Colaboração", baixo: "Trabalho independente", alto: "Resolve junto, o tempo todo" },
  { chave: "structure", rotulo: "Estrutura", baixo: "Pouco processo", alto: "Processo e regras claras" },
  { chave: "dataDriven", rotulo: "Orientação a dados", baixo: "Decide pela experiência", alto: "Decide por número" },
  { chave: "directCommunication", rotulo: "Comunicação direta", baixo: "Diplomática, cuidadosa", alto: "Direta, mesmo que incomode" },
] as const;

type Perfil = Record<string, number>;

export default function PaginaCulturaEmpresa() {
  const [perfil, setPerfil] = useState<Perfil>({});
  const [definida, setDefinida] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [salvo, setSalvo] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    void api<{ perfil: Perfil | null; definida: boolean }>("/configuracoes/cultura").then((r) => {
      if (r.status === 200 && r.json) {
        setPerfil(r.json.perfil ?? {});
        setDefinida(r.json.definida);
      }
      setCarregando(false);
    });
  }, []);

  async function salvar() {
    setErro(null);
    setSalvo(false);
    setSalvando(true);
    const r = await api("/configuracoes/cultura", { metodo: "PUT", corpo: { perfil } });
    setSalvando(false);
    if (r.status !== 200) {
      setErro("Não foi possível salvar. Informe ao menos uma dimensão.");
      return;
    }
    setDefinida(true);
    setSalvo(true);
  }

  return (
    <main style={{ padding: 32, maxWidth: 820 }}>
      <h1 style={{ fontSize: 20, fontWeight: 600, margin: "0 0 6px" }}>Cultura da empresa</h1>
      <p style={{ color: "var(--text-muted)", fontSize: 14, margin: "0 0 8px", lineHeight: 1.6 }}>
        O jeito de trabalhar que a empresa espera, em seis dimensões. Serve de padrão para toda vaga
        que não definir a própria — uma vaga de campo e uma de escritório não pedem a mesma coisa, e
        por isso a vaga continua podendo divergir.
      </p>
      <p style={{ color: "var(--text-muted)", fontSize: 13, margin: "0 0 24px", lineHeight: 1.6 }}>
        O candidato responde um questionário no portal dele e a plataforma apura o perfil dele nas
        mesmas seis dimensões. A distância entre os dois é o fit cultural.
      </p>

      {carregando ? (
        <p style={{ fontSize: 14, color: "var(--text-muted)" }}>Carregando…</p>
      ) : (
        <>
          {!definida && (
            <p style={{ fontSize: 13, color: "var(--amber-700, #714E08)", margin: "0 0 16px" }}>
              Ainda não definida. Enquanto isso, só as vagas com cultura própria calculam fit cultural.
            </p>
          )}
          <div style={{ display: "grid", gap: 14 }}>
            {DIMENSOES.map((d) => (
              <div
                key={d.chave}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 120px",
                  gap: 12,
                  alignItems: "center",
                  border: "1px solid var(--border-default)",
                  borderRadius: 10,
                  padding: "12px 14px",
                }}
              >
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{d.rotulo}</div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
                    1 = {d.baixo} · 5 = {d.alto}
                  </div>
                </div>
                <Selecao
                  value={String(perfil[d.chave] ?? "")}
                  onChange={(e) => {
                    const v = e.target.value;
                    const novo = { ...perfil };
                    if (v) novo[d.chave] = Number(v);
                    else delete novo[d.chave];
                    setPerfil(novo);
                  }}
                >
                  <option value="">Não define</option>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </Selecao>
              </div>
            ))}
          </div>

          <Erro mensagem={erro} />
          <div style={{ marginTop: 18, display: "flex", gap: 12, alignItems: "center" }}>
            <BotaoPrimario onClick={salvar} disabled={salvando}>
              {salvando ? "Salvando…" : "Salvar cultura"}
            </BotaoPrimario>
            {salvo && (
              <span style={{ fontSize: 13, color: "var(--feedback-success, #15803d)" }}>
                Salvo. Vale para as próximas candidaturas.
              </span>
            )}
          </div>

          <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 20, lineHeight: 1.6 }}>
            Candidaturas já registradas <strong style={{ fontWeight: 600 }}>não</strong> são recalculadas.
            O match de cada uma é fotografado no momento em que ela entra — mudar a cultura agora não
            pode reescrever a nota de quem já foi avaliado por outro critério.
          </p>
        </>
      )}
    </main>
  );
}
