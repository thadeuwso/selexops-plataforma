"use client";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { BotaoPrimario, Erro, Gaveta } from "@/componentes/formulario";

interface CargoModelo {
  codCar: string;
  nomeCar: string;
  temModelo: boolean;
  tipos: string[];
}

const TIPOS_360: { tipo: string; rotulo: string }[] = [
  { tipo: "AUTO", rotulo: "Autoavaliação" },
  { tipo: "GESTOR", rotulo: "Gestor" },
  { tipo: "PAR", rotulo: "Pares" },
  { tipo: "LIDERADO", rotulo: "Liderados" },
  { tipo: "COMITE", rotulo: "Comitê" },
  { tipo: "CLIENTE_INTERNO", rotulo: "Cliente interno" },
];
const ROTULO = Object.fromEntries(TIPOS_360.map((t) => [t.tipo, t.rotulo]));

export default function PaginaModelos360() {
  const [cargos, setCargos] = useState<CargoModelo[] | null>(null);
  const [edit, setEdit] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    const r = await api<CargoModelo[]>("/gestao-pessoas/modelos-360");
    if (r.status === 200 && r.json) setCargos(r.json);
  }, []);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  return (
    <main style={{ padding: 32, maxWidth: 820 }}>
      <h1 style={{ fontSize: 20, fontWeight: 600, margin: "0 0 6px" }}>Modelos de avaliação 360</h1>
      <p style={{ color: "var(--text-muted)", fontSize: 14, margin: "0 0 20px", lineHeight: 1.6, maxWidth: 640 }}>
        A empresa define, por cargo, quem avalia e com que peso. Um cargo de liderança pode incluir os
        liderados; um cargo operacional, só autoavaliação e gestor. Cargo sem modelo usa avaliação de
        avaliador único.
      </p>

      {cargos === null ? (
        <p style={{ fontSize: 13, color: "var(--text-muted)" }}>Carregando…</p>
      ) : cargos.length === 0 ? (
        <p style={{ fontSize: 14, color: "var(--text-muted)" }}>Nenhum cargo cadastrado ainda.</p>
      ) : (
        <div style={{ display: "grid", gap: 8 }}>
          {cargos.map((c) => (
            <button
              key={c.codCar}
              onClick={() => setEdit(c.codCar)}
              style={{ textAlign: "left", display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", border: "1px solid var(--border-default)", borderRadius: 10, padding: "14px 16px", background: "var(--surface-default)", cursor: "pointer", fontFamily: "inherit" }}
            >
              <span style={{ fontSize: 14, fontWeight: 600 }}>{c.nomeCar}</span>
              <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
                {c.temModelo ? c.tipos.map((t) => ROTULO[t] ?? t).join(" · ") : "Sem modelo — avaliador único"}
              </span>
            </button>
          ))}
        </div>
      )}

      {edit && <EditorModelo codCar={edit} fechar={() => setEdit(null)} aoSalvar={carregar} />}
    </main>
  );
}

interface Avaliador {
  tipo: string;
  peso: number;
  obrigatorio: boolean;
}

interface CompEsperada {
  nome: string;
  nivelEsperado: number;
  criticidade: string;
}

function EditorModelo({ codCar, fechar, aoSalvar }: { codCar: string; fechar: () => void; aoSalvar: () => void }) {
  const [nomeCar, setNomeCar] = useState("");
  const [sel, setSel] = useState<Record<string, Avaliador>>({});
  const [comps, setComps] = useState<CompEsperada[]>([]);
  const [salvoComp, setSalvoComp] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [pronto, setPronto] = useState(false);

  useEffect(() => {
    void api<{ cargo: { nomeCar: string }; modelo: { avaliadores: Avaliador[] } | null }>(
      `/gestao-pessoas/cargos/${codCar}/modelo-360`,
    ).then((r) => {
      if (r.status === 200 && r.json) {
        setNomeCar(r.json.cargo.nomeCar);
        const m: Record<string, Avaliador> = {};
        for (const a of r.json.modelo?.avaliadores ?? []) m[a.tipo] = a;
        setSel(m);
      }
      setPronto(true);
    });
    void api<{ competencias: CompEsperada[] }>(`/gestao-pessoas/cargos/${codCar}/competencias-esperadas`).then((r) => {
      if (r.status === 200 && r.json) setComps(r.json.competencias);
    });
  }, [codCar]);

  async function salvarComps() {
    setErro(null);
    setSalvoComp(false);
    const validas = comps.filter((c) => c.nome.trim());
    const r = await api(`/gestao-pessoas/cargos/${codCar}/competencias-esperadas`, {
      metodo: "PUT",
      corpo: { competencias: validas.map((c) => ({ nome: c.nome, nivelEsperado: c.nivelEsperado, criticidade: c.criticidade })) },
    });
    if (r.status !== 200) {
      setErro("Não foi possível salvar as competências.");
      return;
    }
    setSalvoComp(true);
    aoSalvar();
  }

  function alternar(tipo: string) {
    setSel((s) => {
      const n = { ...s };
      if (n[tipo]) delete n[tipo];
      else n[tipo] = { tipo, peso: 1, obrigatorio: true };
      return n;
    });
  }
  function mudarPeso(tipo: string, peso: number) {
    setSel((s) => ({ ...s, [tipo]: { ...s[tipo], peso } }));
  }

  async function salvar() {
    setErro(null);
    const avaliadores = Object.values(sel);
    if (avaliadores.length === 0) {
      setErro("Escolha ao menos um tipo de avaliador.");
      return;
    }
    const r = await api(`/gestao-pessoas/cargos/${codCar}/modelo-360`, {
      metodo: "PUT",
      corpo: { avaliadores: avaliadores.map((a) => ({ tipo: a.tipo, peso: a.peso, obrigatorio: a.obrigatorio })) },
    });
    if (r.status !== 200) {
      setErro("Não foi possível salvar.");
      return;
    }
    fechar();
    aoSalvar();
  }

  return (
    <Gaveta titulo={`Modelo 360 — ${nomeCar}`} aberta fechar={fechar} largura={480}>
      {!pronto ? (
        <p style={{ fontSize: 13, color: "var(--text-muted)" }}>Carregando…</p>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          <p style={{ fontSize: 12, color: "var(--text-muted)", margin: 0 }}>
            Marque os tipos de avaliador e ajuste o peso de cada um na nota consolidada.
          </p>
          {TIPOS_360.map((t) => {
            const ativo = !!sel[t.tipo];
            return (
              <div key={t.tipo} style={{ display: "flex", alignItems: "center", gap: 12, border: "1px solid var(--border-default)", borderRadius: 8, padding: "10px 12px" }}>
                <label style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, cursor: "pointer", fontSize: 14 }}>
                  <input type="checkbox" checked={ativo} onChange={() => alternar(t.tipo)} />
                  {t.rotulo}
                </label>
                {ativo && (
                  <label style={{ fontSize: 12, color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 6 }}>
                    peso
                    <select
                      value={sel[t.tipo].peso}
                      onChange={(e) => mudarPeso(t.tipo, Number(e.target.value))}
                      style={{ padding: "4px 8px", borderRadius: 6, border: "1px solid var(--border-default)", background: "var(--surface-default)", color: "var(--text-body)", fontFamily: "inherit" }}
                    >
                      {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}</option>)}
                    </select>
                  </label>
                )}
              </div>
            );
          })}
          <Erro mensagem={erro} />
          <BotaoPrimario onClick={salvar}>Salvar modelo</BotaoPrimario>

          <div style={{ borderTop: "1px solid var(--border-default)", paddingTop: 16, marginTop: 4 }}>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>Competências esperadas do cargo</div>
            <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "0 0 10px" }}>
              O nível esperado de cada competência. A aderência ao cargo compara com a nota atual pelo nome.
            </p>
            <div style={{ display: "grid", gap: 8 }}>
              {comps.map((c, i) => (
                <div key={i} style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  <input
                    value={c.nome}
                    onChange={(e) => setComps(comps.map((x, j) => (j === i ? { ...x, nome: e.target.value } : x)))}
                    placeholder="Competência"
                    style={{ flex: 1, padding: "6px 8px", borderRadius: 6, border: "1px solid var(--border-default)", background: "var(--surface-default)", color: "var(--text-body)", fontFamily: "inherit", fontSize: 13 }}
                  />
                  <select
                    value={c.nivelEsperado}
                    onChange={(e) => setComps(comps.map((x, j) => (j === i ? { ...x, nivelEsperado: Number(e.target.value) } : x)))}
                    title="Nível esperado"
                    style={selectMini}
                  >
                    {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}</option>)}
                  </select>
                  <select
                    value={c.criticidade}
                    onChange={(e) => setComps(comps.map((x, j) => (j === i ? { ...x, criticidade: e.target.value } : x)))}
                    title="Criticidade"
                    style={selectMini}
                  >
                    <option value="BAIXA">Baixa</option>
                    <option value="MEDIA">Média</option>
                    <option value="ALTA">Alta</option>
                  </select>
                  <button onClick={() => setComps(comps.filter((_, j) => j !== i))} title="Remover" style={{ ...selectMini, cursor: "pointer" }}>✕</button>
                </div>
              ))}
            </div>
            <button
              onClick={() => setComps([...comps, { nome: "", nivelEsperado: 4, criticidade: "MEDIA" }])}
              style={{ marginTop: 8, background: "none", border: "none", color: "var(--text-link)", cursor: "pointer", fontFamily: "inherit", fontSize: 13, padding: 0 }}
            >
              + Adicionar competência
            </button>
            <div style={{ marginTop: 12 }}>
              <BotaoPrimario onClick={salvarComps}>Salvar competências</BotaoPrimario>
              {salvoComp && <span style={{ fontSize: 12, color: "var(--feedback-success, #15803d)", marginLeft: 10 }}>Salvo.</span>}
            </div>
          </div>
        </div>
      )}
    </Gaveta>
  );
}

const selectMini: React.CSSProperties = {
  padding: "6px 8px",
  borderRadius: 6,
  border: "1px solid var(--border-default)",
  background: "var(--surface-default)",
  color: "var(--text-body)",
  fontFamily: "inherit",
  fontSize: 13,
};
