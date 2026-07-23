# Painel 360 do Colaborador — ASSUMPTIONS & DECISÕES ABERTAS

> Suposições que assumo por padrão e decisões que precisam da sua confirmação antes das fases pesadas.
> Onde há um padrão seguro, sigo por ele e registro; onde a escolha muda a arquitetura, **pergunto**.

---

## A. Suposições que já assumo (seguras, alinhadas ao projeto)

1. **Documentos de engenharia in-repo, negócio no vault.** Estes 4 arquivos vivem em `docs/modules/performance-360/`; o vault Obsidian continua a fonte oficial de negócio. Ao entregar cada fase, registro a RN no vault como sempre.
2. **Tudo aditivo.** Nenhuma migration antiga é tocada; nenhuma tabela nasce com DELETE; soft-delete via `ativo`. Cada tabela nova entra no bloco RLS por tenant.
3. **Multi-rater é aditivo.** `NotaCompetencia.codAvalPart` é nullable; avaliações de avaliador único continuam idênticas. Os cálculos puros validados (`notaFinal`, `podeConcluir`, `progressoDoPlano`, `calcularAderencia`) não são reescritos — são estendidos com casos novos e novos testes.
4. **IA só pelo gateway (ADR-0003).** Nada de provedor direto na API. Purposes novos versionados; saída Zod; cache por hash; auditada. A IA explica, não decide.
5. **A chave OpenAI exposta NÃO é rotacionada agora** — decisão sua, item de checklist de pré-produção. Os purposes de desempenho rodam em `local` (Ollama) por padrão; `nuvem` só quando o tenant optar.
6. **Reuso máximo:** Feedback/PDI/Avaliação/Aderência já prontos entram no 360 como estão; não recrio esses domínios.

## B. Decisões — **resolvidas com o Thadeu (2026-07-23)**

### B1. Vínculo gestor → equipe — ✅ **pelo departamento**
Gestor = responsável do departamento do funcionário. **Impacto técnico:** `Departamento` (`TFPDEP`) hoje **não tem responsável** — será preciso adicionar `codFunGestor?`/`codUsuResp?` ao departamento (mudança aditiva, na Fase 11 de papéis/escopo). O escopo "minha equipe" do gestor resolve por: funcionários cujo departamento (ou sub-árvore) tem o usuário como responsável.

### B2. Perfil comportamental do colaborador — proposta mantida (sem objeção): **ambos**
(a) ponte automática quando o funcionário veio de candidatura + (b) permitir iniciar uma sessão comportamental já como funcionário. Implementado na Fase 8.

### B3. Amplitude do 360 — ✅ **360 configurável por cargo**
Não é um conjunto fixo de avaliadores. **A empresa define, por cargo:** (1) o **tipo de avaliação** que se aplica, (2) **quais tipos de avaliador** participam (AUTO/GESTOR/PAR/LIDERADO/COMITE/CLIENTE) e seus pesos, e (3) **as pessoas** que farão a avaliação de cada colaborador. Espelha o padrão já existente no recrutamento (`PerfilComportamentalVaga` por vaga com `PerfilComportamentalPadrao` de fallback). Ver ARCHITECTURE §2.1.

### B4. Gráficos — ✅ **SVG próprio, sem dependência**
Mantém o padrão hand-rolled; zero peso novo de bundle. Componentes de gráfico próprios (donut, linha, barras, heatmap; radar opcional e nunca único).

### B5. Exportação PDF — ✅ **geração server-side**
Fiel ao layout. Playwright/headless já está no projeto (testes) — reutilizar para render → PDF, com controle de acesso e seções selecionáveis.

### B6. Metas: impacto na nota — proposta mantida (sem objeção)
Nesta leva as metas são acompanhadas ao lado (não alteram `notaFinal`); campo `impactoAvaliacao` informativo; ligação ao cálculo só quando solicitado.

### B7. Potencial / 9-box — proposta mantida (sem objeção)
Classificação **preliminar com revisão humana obrigatória**; sucessão só preparada no modelo, sem automação.

## C. Não-objetivos desta iniciativa (explícitos)

- O sistema **não decide** promoção, demissão, aumento, sucessão, contratação ou mudança de cargo — só apresenta evidências e recomendações (§2).
- Sem diagnóstico psicológico, sem inferência de atributo sensível, sem análise de sentimento como verdade absoluta, sem ranking público de pessoas, sem gamificação inadequada.
- Não removemos nenhuma funcionalidade atual do módulo de desempenho.

## D. Riscos aceitos e mitigação

| Risco | Mitigação |
|---|---|
| Página pesada (10 domínios) | Agregador enxuto + lazy por aba (§37) |
| Auditoria de leitura aumenta volume de log | Registrar só eventos relevantes (visualização de 360, exportação, IA), não cada componente |
| 360 multi-rater confundir o cálculo | Aditivo; testes puros novos; caso "1 avaliador" idêntico |
| LGPD | Escopo por papel, zero atributo sensível, auditoria, minimização |
| Escopo total é grande | Entregar em fases pequenas e verificáveis (ver IMPLEMENTATION_PLAN) |
