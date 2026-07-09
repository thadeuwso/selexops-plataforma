"""SelX 2.0 — workers assíncronos (Celery).

Consumidores previstos: integrações com ERP (lotes idempotentes),
processamento de e-mail (outbox), cálculos em lote, snapshots de ML.
"""

import os

from celery import Celery

app = Celery(
    "selx",
    broker=os.environ.get("REDIS_URL", "redis://localhost:6379/0"),
    backend=os.environ.get("REDIS_URL", "redis://localhost:6379/0"),
)


@app.task
def verificar_saude() -> dict:
    return {"ok": True, "servico": "selx-workers"}
