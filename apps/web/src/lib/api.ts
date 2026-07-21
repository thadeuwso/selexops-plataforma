export const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

/**
 * Sessão: o access token vive 15 minutos; o refresh renova o par.
 *
 * A rotação no backend é **destrutiva** — o refresh usado é revogado na hora
 * (`auth.service.ts`, `atualizar()`). Duas renovações concorrentes com o mesmo
 * token derrubariam a sessão do usuário: a primeira revoga, a segunda recebe
 * "sessão revogada". Por isso a renovação é *single-flight*: várias telas
 * batendo 401 ao mesmo tempo compartilham uma única chamada.
 */
let renovacaoEmAndamento: Promise<boolean> | null = null;

function lerToken(chave: "accessToken" | "refreshToken"): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(chave);
}

function encerrarSessao() {
  if (typeof window === "undefined") return;
  localStorage.removeItem("accessToken");
  localStorage.removeItem("refreshToken");
  // `replace` (e não `href`) para o botão "voltar" não cair numa tela quebrada.
  if (!window.location.pathname.startsWith("/login")) window.location.replace("/login");
}

async function executarRenovacao(): Promise<boolean> {
  const refreshToken = lerToken("refreshToken");
  if (!refreshToken) return false;
  try {
    const res = await fetch(`${BASE}/auth/atualizar`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });
    if (!res.ok) return false;
    const json = (await res.json()) as { accessToken?: string; refreshToken?: string };
    if (!json.accessToken || !json.refreshToken) return false;
    localStorage.setItem("accessToken", json.accessToken);
    localStorage.setItem("refreshToken", json.refreshToken); // rotacionado: o antigo já morreu
    return true;
  } catch {
    return false; // rede fora: não desloga, só falha a chamada
  }
}

function renovarSessao(): Promise<boolean> {
  if (!renovacaoEmAndamento) {
    renovacaoEmAndamento = executarRenovacao().finally(() => {
      renovacaoEmAndamento = null;
    });
  }
  return renovacaoEmAndamento;
}

/** Rotas que nunca devem disparar renovação (evita laço e falso logout). */
function ehRotaDeAutenticacao(rota: string): boolean {
  return rota.startsWith("/auth/");
}

/**
 * `fetch` com Bearer token, renovação automática em 401 e uma única retentativa.
 * Use direto quando precisar do `Response` cru (upload/download de arquivo);
 * para JSON, prefira `api()`.
 */
export async function fetchAutenticado(rota: string, init: RequestInit = {}): Promise<Response> {
  const enviar = () => {
    const token = lerToken("accessToken");
    return fetch(`${BASE}${rota}`, {
      ...init,
      headers: { ...init.headers, ...(token ? { authorization: `Bearer ${token}` } : {}) },
    });
  };

  const res = await enviar();
  if (res.status !== 401 || ehRotaDeAutenticacao(rota)) return res;

  const renovou = await renovarSessao();
  if (!renovou) {
    encerrarSessao();
    return res;
  }
  return enviar();
}

export async function api<T = unknown>(
  rota: string,
  opcoes: { metodo?: string; corpo?: unknown; token?: string | null } = {},
): Promise<{ status: number; json: T | null }> {
  // `token: null` explícito = chamada pública (login, portal do candidato):
  // não manda credencial nem tenta renovar sessão.
  const ehPublica = opcoes.token === null;

  const init: RequestInit = {
    method: opcoes.metodo ?? "GET",
    headers: { "content-type": "application/json" },
    body: opcoes.corpo ? JSON.stringify(opcoes.corpo) : undefined,
  };

  const res = ehPublica
    ? await fetch(`${BASE}${rota}`, init)
    : opcoes.token
      ? await fetch(`${BASE}${rota}`, {
          ...init,
          headers: { ...init.headers, authorization: `Bearer ${opcoes.token}` },
        })
      : await fetchAutenticado(rota, init);

  let json: T | null = null;
  try {
    json = (await res.json()) as T;
  } catch {
    // Resposta sem corpo JSON (204, HTML de erro de proxy) não é falha aqui —
    // quem chama decide o que fazer olhando o status.
  }
  return { status: res.status, json };
}
