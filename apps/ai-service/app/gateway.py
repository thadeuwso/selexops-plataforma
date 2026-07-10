"""AI Gateway v1 (ADR-0003) — ponto único de acesso a LLMs.

Pipeline: purpose registrado -> créditos (hook) -> redação de PII ->
roteamento por adapter -> chamada -> telemetria. IA apoia, não decide.
"""

import hashlib
import os
import re
import time
import uuid

import httpx

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

router = APIRouter(prefix="/v1/ia")

# Catálogo de purposes registrados (v1: em código; futuro: configuração por tenant)
PURPOSES_REGISTRADOS = {
    "plataforma.diagnostico@v1",
}

_PADROES_PII = [
    (re.compile(r"\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b"), "[CPF]"),
    (re.compile(r"\b\d{2}\.?\d{3}\.?\d{3}/?\d{4}-?\d{2}\b"), "[CNPJ]"),
    (re.compile(r"\b[\w.+-]+@[\w-]+\.[\w.]+\b"), "[EMAIL]"),
    (re.compile(r"\b(?:\+?55\s?)?(?:\(?\d{2}\)?\s?)?9?\d{4}[-\s]?\d{4}\b"), "[FONE]"),
]


def redigir_pii(texto: str) -> str:
    """Mascara dados pessoais antes de qualquer envio a provedor externo (LGPD)."""
    for padrao, mascara in _PADROES_PII:
        texto = padrao.sub(mascara, texto)
    return texto


class Mensagem(BaseModel):
    papel: str = Field(pattern="^(system|user|assistant)$")
    conteudo: str


class RequisicaoGerar(BaseModel):
    purpose: str
    cod_ten: int
    correlation_id: str | None = None
    mensagens: list[Mensagem] = Field(min_length=1)
    orcamento_tokens: int = Field(default=2048, gt=0, le=32768)
    sensibilidade: str = Field(default="normal", pattern="^(normal|sensivel)$")


@router.post("/gerar")
def gerar(req: RequisicaoGerar) -> dict:
    inicio = time.monotonic()
    correlation_id = req.correlation_id or str(uuid.uuid4())

    # 1. Purpose precisa estar registrado
    if req.purpose not in PURPOSES_REGISTRADOS:
        raise HTTPException(422, {"codigo": "PURPOSE_NAO_REGISTRADO", "purpose": req.purpose})

    # 2. Créditos/entitlements — hook (integra com billing futuramente)

    # 3. Redação de PII antes de qualquer provedor
    mensagens = [
        {"papel": m.papel, "conteudo": redigir_pii(m.conteudo)} for m in req.mensagens
    ]
    hash_entrada = hashlib.sha256(
        "\n".join(m["conteudo"] for m in mensagens).encode()
    ).hexdigest()

    # 4. Roteamento por política (ADR-0003): dado SENSÍVEL nunca sai da máquina —
    # vai para o modelo local (Ollama), independentemente do provedor padrão.
    provedor = (os.environ.get("AI_PROVIDER") or "").strip().lower()
    if req.sensibilidade == "sensivel":
        provedor = "ollama"
    if not provedor or provedor == "disabled":
        raise HTTPException(
            503,
            {
                "codigo": "IA_DESABILITADA",
                "mensagem": "Nenhum provedor configurado (AI_PROVIDER); degrade para fluxo manual",
                "correlation_id": correlation_id,
            },
        )

    # 5a. Adapter Ollama (modelos locais — Qwen/Llama/Mistral; dados sensíveis)
    if provedor == "ollama":
        base = (os.environ.get("OLLAMA_BASE_URL") or "http://localhost:11434").rstrip("/")
        modelo_local = (os.environ.get("OLLAMA_MODEL") or "qwen2.5-coder:7b").strip()
        try:
            resp = httpx.post(
                f"{base}/api/chat",
                json={
                    "model": modelo_local,
                    "stream": False,
                    "options": {"num_predict": req.orcamento_tokens},
                    "messages": [
                        {"role": m["papel"], "content": m["conteudo"]} for m in mensagens
                    ],
                },
                timeout=180,
            )
        except httpx.HTTPError as erro:
            raise HTTPException(
                503,
                {"codigo": "PROVEDOR_INDISPONIVEL", "mensagem": f"Ollama inacessível: {erro}", "correlation_id": correlation_id},
            ) from erro
        if resp.status_code != 200:
            raise HTTPException(502, {"codigo": "PROVEDOR_ERRO", "detalhe": resp.text[:300], "correlation_id": correlation_id})
        dados = resp.json()
        conteudo = dados["message"]["content"]
        return {
            "conteudo": conteudo,
            "provedor": "ollama",
            "modelo": modelo_local,
            "uso": {"prompt_tokens": dados.get("prompt_eval_count"), "completion_tokens": dados.get("eval_count")},
            "latencia_ms": int((time.monotonic() - inicio) * 1000),
            "hash_entrada": hash_entrada,
            "hash_saida": hashlib.sha256(conteudo.encode()).hexdigest(),
            "correlation_id": correlation_id,
        }

    if provedor != "openai":
        raise HTTPException(
            503,
            {"codigo": "PROVEDOR_INDISPONIVEL", "mensagem": f"Adapter '{provedor}' não implementado", "correlation_id": correlation_id},
        )

    # 5. Adapter OpenAI com retry/backoff (429/5xx)
    chave = (os.environ.get("OPENAI_API_KEY") or "").strip()
    modelo = (os.environ.get("OPENAI_MODEL") or "gpt-4o-mini").strip()
    if not chave:
        raise HTTPException(503, {"codigo": "IA_DESABILITADA", "mensagem": "OPENAI_API_KEY ausente", "correlation_id": correlation_id})

    corpo = {
        "model": modelo,
        "max_tokens": req.orcamento_tokens,
        "messages": [
            {"role": "system" if m["papel"] == "system" else m["papel"], "content": m["conteudo"]}
            for m in mensagens
        ],
    }
    ultimo_erro: str | None = None
    for tentativa in range(3):
        if tentativa:
            time.sleep(0.3 * tentativa)
        try:
            resp = httpx.post(
                "https://api.openai.com/v1/chat/completions",
                headers={"Authorization": f"Bearer {chave}"},
                json=corpo,
                timeout=60,
            )
        except httpx.HTTPError as erro:
            ultimo_erro = str(erro)
            continue
        if resp.status_code == 429 or resp.status_code >= 500:
            ultimo_erro = f"HTTP {resp.status_code}"
            continue
        if resp.status_code != 200:
            raise HTTPException(502, {"codigo": "PROVEDOR_ERRO", "detalhe": resp.text[:300], "correlation_id": correlation_id})
        dados = resp.json()
        conteudo = dados["choices"][0]["message"]["content"]
        # 6. Telemetria
        return {
            "conteudo": conteudo,
            "provedor": "openai",
            "modelo": modelo,
            "uso": dados.get("usage", {}),
            "latencia_ms": int((time.monotonic() - inicio) * 1000),
            "hash_entrada": hash_entrada,
            "hash_saida": hashlib.sha256(conteudo.encode()).hexdigest(),
            "correlation_id": correlation_id,
        }

    raise HTTPException(502, {"codigo": "PROVEDOR_ERRO", "detalhe": ultimo_erro, "correlation_id": correlation_id})
