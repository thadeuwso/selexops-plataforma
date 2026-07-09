# @selx/ai-service

Serviço de IA (FastAPI) — **casa do AI Gateway** (ADR-0003 no vault).

## Rodando localmente

```bash
# com uv (https://docs.astral.sh/uv/)
uv sync
uv run uvicorn app.main:app --reload --port 8000
```

Health check: `GET http://localhost:8000/health`

## O que entra aqui (e o que não entra)

- ✅ Adapters de provedores (OpenAI, Ollama, ...), roteamento por política, redação de PII, validação de saída, telemetria e custo por tenant, prompts versionados.
- ❌ Regra de negócio de módulos (vive na `apps/api`). O gateway serve a plataforma inteira e não conhece domínio.
