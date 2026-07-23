# Painel 360 do Colaborador — DISCOVERY

> Fase 1 (Descoberta). Diagnóstico do que já existe no repositório **antes** de qualquer alteração.
> Fonte oficial de negócio permanece o vault Obsidian; este documento é o levantamento de engenharia.

Data: 2026-07-23 · Autor: engenharia (Lead) · Status: para aprovação

---

## 1. Stack encontrada

| Camada | Tecnologia | Local |
|---|---|---|
| API | NestJS (monólito modular) | `apps/api` |
| Web | Next.js App Router (React, TS) | `apps/web` |
| IA (gateway) | Python / FastAPI | `apps/ai-service` (`POST /v1/ia/gerar`) |
| Workers | fila / drenagem assíncrona | `apps/workers` |
| Banco | PostgreSQL + Prisma | `packages/database` |

Padrões arquiteturais já consolidados (ADRs):
- **ADR-0002 — Multi-tenant por RLS.** Todo acesso passa por `PrismaService.executarNoTenant(codTen, cb)`, que injeta `app.codten` na sessão; políticas RLS filtram por `CODTEN`. `prisma.admin` fura a RLS só para fluxos públicos (tokens) e drenagem de e-mail.
- **ADR-0003 — AI Gateway.** A API nunca fala com um provedor de LLM direto. Monta prompt + esquema Zod e chama `POST /v1/ia/gerar` com um `purpose` versionado; o gateway roteia provedor (`local`/`nuvem`). Saída sempre JSON validado. A IA **explica, não decide**.
- **ADR-0004 — Nomenclatura.** Modelos em português, `T<família><entidade>` via `@map/@@map`, PKs `BIGINT`. Famílias: `TSX`/`TSI` (core/segurança), `TFP` (funcionário/cadastro), `TGP` (gestão de pessoas / desempenho), `TRE` (recrutamento), `TAU` (auditoria).
- **`selx_app` não tem DELETE.** Toda exclusão é lógica (`ativo`/`status`). Nenhuma tabela nova nasce com DELETE no código.

Frontend: **sem biblioteca de componentes** — tudo hand-rolled. Kit em `apps/web/src/componentes/formulario.tsx` (`Gaveta`, `Campo`, `Entrada`, `Selecao`, `BotaoPrimario`, `Erro`, `Abas`). Helper de rede em `apps/web/src/lib/api.ts`. Tema por variáveis CSS (`--brand-*`, `--text-*`, `--surface-*`, `--border-*`), claro/escuro. **Não há biblioteca de gráficos** — barras são `<div>` (ex. `BarraProgresso`).

Autorização: **JWT com `permissoes[]` no token**; `AutenticacaoGuard` + decorator `@Permissoes('chave')`. Papéis são `Papel` por tenant ligados a `PapelPermissao` (não há enum fixo de cargos como `MANAGER`/`EMPLOYEE`). Chaves atuais de desempenho: `gestaopessoas.avaliacoes.ler` / `.criar`.

---

## 2. O que já existe no domínio de desempenho (reutilizar, não recriar)

Construído nesta fase 2 do módulo (RN-GP-020..023):

| Conceito | Modelo (tabela) | Observações |
|---|---|---|
| Ciclo de avaliação | `CicloAvaliacao` (`TGPCICLO`) | período, status RASCUNHO→ABERTO→ENCERRADO |
| Competência do ciclo | `CompetenciaCiclo` (`TGPCOMP`) | nome, **peso**, ordem |
| Avaliação do funcionário | `AvaliacaoDesempenho` (`TGPAVAL`) | **1 avaliador** (`codUsuAvaliador`), 1 por (ciclo, funcionário) |
| Nota por competência | `NotaCompetencia` (`TGPNOTA`) | nota 1..5, 1 por (avaliação, competência) |
| PDI | `PlanoDesenvolvimento` (`TGPPDI`) | nasce na admissão; `progressoDoPlano` puro |
| Ação de desenvolvimento | `AcaoDesenvolvimento` (`TGPACAO`) | tipos TREINAMENTO/LEITURA/PROJETO/MENTORIA/… |
| Feedback contínuo | `Feedback` (`TGPFEED`) | imutável, com ciência; opcional `codPdi` |
| Aderência ao desenvolvimento | *(derivado, sem tabela)* | `calcularAderencia` puro; realimenta PDI |

Regras puras já testadas (unitário + mutação): `notaFinal`, `podeConcluir`, `progressoDoPlano`, `calcularAderencia`. **Preservar.**

Telas atuais: `/app/gestao-pessoas/desempenho` (abas Visão geral + ciclos), `/app/gestao-pessoas/aderencia`, e a aba **Desenvolvimento** no drawer do funcionário (Plano / Feedbacks / Avaliações / Aderência). Endpoint agregador já existente: `GET /gestao-pessoas/desempenho/visao-geral`.

## 3. Perfil comportamental (existe, mas ligado ao recrutamento)

| Modelo | Papel |
|---|---|
| `FatorComportamental`, `ModeloAvaliacaoComportamental` | catálogo/metodologia |
| `PerfilComportamentalVaga/Fator`, `PerfilComportamentalPadrao/Fator` | perfil **esperado da vaga** |
| `SessaoComportamental` (`TGPSES`) | sessão de resposta — ligada a `ConviteAvaliacao` (**convite de recrutamento**) |
| `ResultadoComportamental` (`TGPRESULT`) + `…Fator` (`TGPRESULTFAT`) | resultado por fator: bruto, normalizado, média, desvio, faixa, **indicador de consistência**, versão do algoritmo |
| `AderenciaComportamentalVaga` | aderência à vaga (RN-GP-009 — nunca "probabilidade de sucesso") |

**Lacuna estrutural:** o resultado comportamental hoje pende de uma **sessão de convite de candidato**, não do funcionário. Para o Painel 360 mostrar o perfil comportamental de um colaborador, é preciso uma ponte funcionário → resultado (via a candidatura que o admitiu, ou uma sessão iniciada já como funcionário). Ver ASSUMPTIONS.

## 4. Cadastro do colaborador e auditoria (existem)

- `Funcionario` (`TFPFUN`): `nomeFun`, `dtAdm`, `codDep`→`Departamento.descrDep`, `codCar`→`Cargo.nomeCar`, `situacao`, `ativo`, e **`usuario` opcional** (permite autosserviço do colaborador).
- `FuncionarioHistorico` (`TFPFUNHIS`): `tipoMud`, `valorAnt`, `valorNovo`, `dtMud` — base para a timeline (hoje é change-log, precisará de eventos mais ricos).
- `LogAuditoria` (`TAULOG`): `nomeTab`, `codReg`, `operacao`, `dadosAnt`, `dadosNovos`, `motivo`, `origem`, `dhAlt`, `codUsuAlt`. **Infra de auditoria já existe** — reaproveitar, não recriar `PerformanceAuditLog`.
- Padrão de insight de IA já existe: `IAAnaliseCandidatura` (`TREIAANALISE`) guarda `conteudoJson` + `hashEntrada` (invalida quando o insumo muda) + `provedor` + `modeloUsado` + `versaoPrompt` + `duracaoMs` + `status`. **Molde exato** para `EmployeeAIInsight` no lado do desempenho.

---

## 5. Lacunas (o que a especificação pede e não existe no modelo)

| Pedido (§) | Situação | Encaminhamento |
|---|---|---|
| **Multi-avaliador 360** (auto/gestor/pares/liderados/comitê/cliente) — §9 | `TGPAVAL` tem **1 avaliador**. Não há autoavaliação nem pares | Nova entidade `ParticipanteAvaliacao` + notas por participante. **Mudança central.** |
| **Metas / OKR** — §12 | Ausente | Novas `Meta`/`ProgressoMeta` (`TGPMETA`/`TGPMETAPROG`) |
| **LMS / treinamentos** como entidade — §15 | Só `AcaoDesenvolvimento.tipo=TREINAMENTO` | `Treinamento` + `MatriculaTreinamento` + `RecomendacaoTreinamento` (ou integração futura) |
| **Competências esperadas do cargo** (role-fit) — §11 | `Cargo` só tem `nomeCar` | `CompetenciaCargo` (esperado por cargo) — configurável |
| **Potencial / 9-box / sucessão** — §17 | Ausente | `AvaliacaoPotencial`, `PerfilSucessao` (com revisão humana) |
| **Risco / alertas** como entidade — §18 | Aderência é derivada (bom começo) | `IndicadorRisco`/`Alerta` por regras transparentes + revisão |
| **Carreira / trilha** — §22 | Ausente | `PerfilCarreira` |
| **Reunião / ata de feedback** — §20 | Ausente | `ReuniaoDesempenho` + `NotaReuniao` |
| **Próximos passos como tarefa** — §19 | Ausente | `ProximaAcao` |
| **Insight de IA de desempenho** — §7 | Só existe para candidato | `EmployeeAIInsight` (molde `TREIAANALISE`) |
| **Snapshots** de resumo — §25 | Ausente | `ResumoSnapshot` (preserva histórico do 360 por ciclo) |
| **Perfil comportamental do funcionário** — §16 | Ligado a convite de recrutamento | Ponte funcionário→resultado |
| **Papéis** MANAGER/EMPLOYEE/AUDITOR/… — §24 | Sistema usa `Papel`+permissões, sem hierarquia gestor→equipe | Escopo "minha equipe" precisa de vínculo **gestor** (hoje inexistente em `Funcionario`) |
| **Biblioteca de gráficos** (donut, linha, radar, heatmap) — §8/10 | Não há lib de charts | Decisão: SVG próprio vs. lib leve. Ver ASSUMPTIONS |
| **Exportação PDF** — §35 | Não há gerador de PDF no projeto | Decisão de abordagem (server vs. print CSS). Ver ASSUMPTIONS |

## 6. Riscos e incompatibilidades registrados

1. **360 multi-rater muda o coração do modelo de avaliação.** Hoje a nota final deriva de `NotaCompetencia` de um único avaliador. Introduzir participantes exige recalcular `notaFinal` como consolidação ponderada por tipo de avaliador — sem quebrar os 4 cálculos puros já validados. Faremos de forma **aditiva** (participantes opcionais; ausência = comportamento atual).
2. **Vínculo gestor→equipe não existe.** O papel MANAGER com escopo "minha equipe" depende de um campo de gestor no `Funcionario` (ou tabela de liderança). Precisa de decisão.
3. **Perfil comportamental preso ao recrutamento.** Sem a ponte, a aba Perfil comportamental fica vazia para quem não veio por processo seletivo.
4. **Volume do agregador.** O 360 junta ~10 domínios. Sem carregamento progressivo, a página fica pesada — a arquitetura precisa de endpoints por domínio + agregador enxuto do topo.
5. **LGPD / minimização.** O painel expõe dados sensíveis de pessoas; exige escopo por papel, sem atributos sensíveis, com auditoria de **visualização** (hoje só auditamos escrita).
6. **PDF e gráficos** introduzem dependências novas — precisam de decisão antes da fase respectiva.

## 7. Mapa "pedido → o que já temos" (não duplicar)

`PerformanceCycle`=`CicloAvaliacao` · `PerformanceEvaluation`=`AvaliacaoDesempenho` · `PerformanceCompetency`=`CompetenciaCiclo` · `PerformanceCompetencyResult`=`NotaCompetencia` · `DevelopmentPlan`=`PlanoDesenvolvimento` · `DevelopmentAction`=`AcaoDesenvolvimento` · `PerformanceFeedback`=`Feedback` · `PerformanceAuditLog`=`LogAuditoria` · `EmployeeAIInsight`≈molde `IAAnaliseCandidatura` · `EmployeeTimelineEvent`≈evolui `FuncionarioHistorico`.

**A criar** (não existem): `ParticipanteAvaliacao`, `Meta`/`ProgressoMeta`, `CompetenciaCargo`, `Treinamento`/`MatriculaTreinamento`/`RecomendacaoTreinamento`, `AvaliacaoPotencial`/`PerfilSucessao`, `IndicadorRisco`/`Alerta`, `PerfilCarreira`, `ReuniaoDesempenho`/`NotaReuniao`, `ProximaAcao`, `EmployeeAIInsight` (desempenho), `ResumoSnapshot`.

> Detalhamento de entidades, APIs, componentes e segurança em **ARCHITECTURE.md**; decisões abertas em **ASSUMPTIONS.md**; sequência em **IMPLEMENTATION_PLAN.md**.
