# SelX 2.0 — selx-plataforma

Monorepo de código da **Plataforma Inteligente de Gestão de Pessoas (HCM) com IA nativa**.

> 🧠 **A documentação NÃO vive aqui.** A única fonte oficial de conhecimento é o vault Obsidian
> (repositório `SelX-2.0`). Antes de qualquer contribuição, leia o **FOUNDATION.md** do vault —
> ele é o contrato do projeto — e os ADRs em `03 - ADR`.

## Estrutura

| Caminho | O quê | Stack |
|---|---|---|
| `apps/web` | Aplicação web | Next.js + TypeScript |
| `apps/api` | API principal (monólito modular) | NestJS + TypeScript |
| `apps/ai-service` | Serviço de IA — casa do **AI Gateway** (ADR-0003) | FastAPI + Python |
| `apps/workers` | Processamento assíncrono | Celery + Python |
| `packages/database` | Schema Prisma + migrations (PostgreSQL, RLS — ADR-0002/0004) | Prisma |
| `packages/shared` | Tipos, DTOs e contratos compartilhados | TypeScript |
| `packages/ui` | Implementação do **AION Design Language** (fase futura) | — |
| `packages/config` | Configurações compartilhadas (tsconfig base etc.) | — |

## Começando

```bash
pnpm install          # dependências JS/TS
pnpm infra:up         # PostgreSQL + Redis + Mailpit via Docker
pnpm dev              # web + api em modo dev
```

Apps Python (`ai-service`, `workers`) rodam via Docker Compose ou localmente com `uv` (ver README de cada app).

## Regras que o CI vai cobrar

1. Migrations **somente** via Prisma, precedidas de modelagem no vault (`04 - Banco`).
2. Toda tabela de cliente com `CODTEN` + política RLS na mesma migration (ADR-0002).
3. Nomenclatura de banco em **português, padrão ERP** (ADR-0004): `TBEBEN`, `CODBEN`, `DTINI`, `VLRCALC`.
4. Nenhuma chamada direta a provedor de IA fora do AI Gateway (ADR-0003).
5. Credenciais nunca no código — use `.env` local (copie de `.env.example`).
