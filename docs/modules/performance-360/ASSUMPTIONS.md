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

## B. Decisões abertas — **preciso da sua orientação**

### B1. Vínculo gestor → equipe (bloqueia o papel MANAGER e o dashboard do gestor, §23/24)
Hoje `Funcionario` não tem "gestor". O escopo "vejo só a minha equipe" precisa disso. Opções:
- (a) Campo `codGestor` em `Funcionario` (gestor direto) — simples, cobre a maioria.
- (b) Derivar do departamento (gestor = responsável do `Departamento`).
- (c) Tabela de liderança dedicada (matricial, múltiplos gestores).

### B2. Perfil comportamental do colaborador (§16)
O resultado comportamental hoje pende de convite de recrutamento. Para mostrar no 360:
- (a) Ponte automática: se o funcionário veio de uma candidatura, ligo ao resultado existente.
- (b) Novo fluxo: permitir iniciar uma avaliação comportamental já como funcionário (sessão employee-side).
- (c) Ambos.

### B3. Amplitude do 360 nesta primeira leva (§9)
360 completo (auto + gestor + pares + liderados + comitê + cliente) é grande. Proposta: começar com **autoavaliação + gestor** (o que o print já sugere: "Autoavaliação + Gestor") e deixar pares/liderados/comitê como fase seguinte, com o modelo já preparado. Confirma?

### B4. Gráficos (donut, linha, radar, heatmap — §8/10/28)
Sem lib de charts no projeto. Opções:
- (a) SVG próprio, leve, sem dependência (mantém o hand-rolled do projeto; mais trabalho por gráfico).
- (b) Lib leve (ex. Recharts) — mais rápido, adiciona dependência e peso de bundle.

### B5. Exportação PDF (§35)
Sem gerador no projeto. Opções:
- (a) Print CSS (janela de impressão do navegador) — zero dependência, controle visual menor.
- (b) Geração server-side (ex. Playwright/headless já presente nos testes, ou lib PDF) — fiel ao layout, mais infra.

### B6. Metas: impacto na nota (§12)
Metas podem **influenciar** a nota final ou ser apenas acompanhadas ao lado. Proposta: acompanhadas ao lado nesta leva (não mexem em `notaFinal`), com campo `impactoAvaliacao` informativo; ligar ao cálculo só quando você quiser. Confirma?

### B7. Potencial / 9-box (§17)
Confirmo que é **classificação preliminar com revisão humana obrigatória**, sem automação de sucessão nesta leva (só preparar o modelo). Ok?

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
