# Painel 360 do Colaborador — ARCHITECTURE

> Fase 2 (Arquitetura). Domínio, dados, APIs, componentes, IA e segurança do alvo.
> Tudo **aditivo** ao que existe; nenhuma migration antiga é alterada; nenhuma tabela nasce com DELETE.

---

## 1. Rota e navegação

Base do módulo já é `/app/gestao-pessoas`. Adaptando o padrão sugerido (`/app/desempenho/colaboradores/[employeeId]/360`) ao padrão real do projeto (português, `[codFun]`, sem sufixo redundante — a aba padrão é a Visão 360):

```
/app/gestao-pessoas/colaboradores/[codFun]          → Painel 360 (aba padrão: Visão 360)
```

Query params (contexto preservado entre abas, sem remontar o cabeçalho):
`cicloId`, `avaliacaoId`, `departamentoId`, `modoComparacao`, `periodo`.

Abas (§4): **Visão 360** (padrão) · Desempenho · Competências · Metas · Feedbacks · PDI · Treinamentos · Perfil comportamental · Histórico · Auditoria.

O cabeçalho do colaborador (§5) e as abas ficam no `layout.tsx` da rota `[codFun]` (busca o colaborador + ciclo uma vez); cada aba é uma sub-rota ou um estado, carregando seu próprio domínio sob demanda.

## 2. Modelo de dados (ADR-0004, família `TGP`, aditivo)

Campos comuns a toda entidade nova (adaptando §25 às convenções do projeto): `codTen`, `dhInc`/`codUsuInc`, `dhAlt`/`codUsuAlt`, `status`, `ativo` (soft-delete), e quando fizer sentido `origem` e `visibilidade` (classificação de acesso). Sem `deletedAt` cru — usamos `ativo` (padrão do projeto). `version` só onde houver edição concorrente real.

### 2.1 Avaliação 360 configurável por cargo (decisão B3) — evolução aditiva
A empresa configura o 360 **por cargo**. Espelha o idioma "config por X com fallback padrão" já usado no recrutamento (`PerfilComportamentalVaga` + `PerfilComportamentalPadrao`).

- **`ModeloAvaliacao360` (`TGPMOD360`)** — modelo de avaliação por cargo (com um padrão de tenant como fallback). Define o **tipo de avaliação** e a régua.
- **`ModeloAvaliador360` (`TGPMOD360AVAL`)** — por modelo, **quais tipos de avaliador** participam e o **peso** de cada tipo: AUTO|GESTOR|PAR|LIDERADO|COMITE|CLIENTE_INTERNO. (Ex.: cargo de liderança inclui LIDERADO; cargo operacional, só AUTO+GESTOR.)
- **`ParticipanteAvaliacao` (`TGPAVALPART`)** — um por (avaliação, avaliador). Ao enturmar um funcionário no ciclo, o sistema **instancia os participantes** conforme o modelo do cargo dele; a empresa/gestor **atribui as pessoas concretas** (quem são os pares, o líder, etc.). Campos: `codAval`, `tipo`, `codUsuAvaliador?`/`codFunAvaliador?`, `peso`, `status`, `dhConclusao`.
- **`NotaCompetencia` ganha `codAvalPart?`** (nullable) — a nota passa a poder pertencer a um participante. **Ausência = comportamento atual** (avaliação de avaliador único continua funcionando).
- `notaFinal` evolui para **consolidar por tipo/peso** quando há participantes; o cálculo puro atual vira o caso "um participante". Nenhum teste existente quebra.

Fluxo: empresa define modelo por cargo → ciclo enturmar funcionário herda o modelo do cargo → atribui as pessoas → cada participante avalia → nota consolida por peso de tipo.

### 2.2 Metas — §12
- **`Meta` (`TGPMETA`)**: `codFun`, `codCiclo?`, título, descrição, `peso`, `prazo`, `status` (PENDENTE|ANDAMENTO|CONCLUIDA|ATRASADA|CANCELADA), `impactoAvaliacao`, `codCompRelacionada?`, `codPdi?`.
- **`ProgressoMeta` (`TGPMETAPROG`)**: `codMeta`, `progresso`, `evidencia?`, `comentario`, `dhInc`, `codUsuInc` (histórico imutável de atualizações).

### 2.3 Competências esperadas do cargo — §11
- **`CompetenciaCargo` (`TFPCARCOMP`)**: `codCar`, nome/`codCompCatalogo?`, `nivelEsperado` (1..5), `criticidade`, `justificativa`. Faixas de aderência **configuráveis** por tenant.

### 2.4 Treinamentos — §15
- **`Treinamento` (`TGPTREINO`)**, **`MatriculaTreinamento` (`TGPTREINOMAT`)** (status, carga horária, certificação, vencimento), **`RecomendacaoTreinamento` (`TGPTREINOREC`)** (origem: OBRIGATORIO|GESTOR|RH|IA|INTERESSE). IA **nunca matricula** sem autorização.

### 2.5 Potencial e sucessão — §17
- **`AvaliacaoPotencial` (`TGPPOT`)**: eixos (desempenho, evolução, prontidão, mobilidade…), classificação **preliminar**, `nivelConfianca`, `evidenciasJson`, `revisaoHumana` (pendente/feita), avaliador, data.
- **`PerfilSucessao` (`TGPSUC`)**: cargo-alvo, prontidão, competências faltantes — preparado para integração futura.

### 2.6 Risco / alertas — §18
- **`Alerta` (`TGPALERTA`)**: `tipo`, `nivel`, `regraAplicada`, `evidenciasJson`, `acaoRecomendada`, `status` (ABERTO|EM_REVISAO|DESCARTADO|RESOLVIDO), responsável, data. Calculado por **regras transparentes**; IA só complementa a explicação. Sem dado médico/sensível.

### 2.7 Próximos passos, carreira, reunião, IA, snapshot
- **`ProximaAcao` (`TGPPROX`)**: ação, prioridade, prazo, responsável, `origem`, justificativa, `status` — recomendação vira tarefa.
- **`PerfilCarreira` (`TGPCARR`)**: cargo atual, trilha, próximo cargo possível, interesse declarado, prontidão.
- **`ReuniaoDesempenho` (`TGPREUN`)** + **`NotaReuniao` (`TGPREUNNOTA`)**: roteiro, ata, acordos.
- **`EmployeeAIInsight` → `IADesempenhoInsight` (`TGPIAINS`)**: molde de `TREIAANALISE` — `conteudoJson`, `hashEntrada`, `provedor`, `modeloUsado`, `versaoPrompt`, `duracaoMs`, `status`, `tipo` (RESUMO_EXEC|ROTEIRO_FEEDBACK|SUGESTAO_DESENV|EXPLICA_TENDENCIA|RESUMO_FEEDBACKS).
- **`ResumoSnapshot` (`TGPSNAP`)**: fotografia do 360 por (funcionário, ciclo) para preservar o histórico exibido.

### 2.8 Timeline e ponte comportamental
- Timeline unificada (§21): **compõe em leitura** `FuncionarioHistorico` + avaliações + feedbacks + metas + PDI + treinamentos + reuniões. Se ficar caro, materializar depois em `EventoTimeline`; começa como composição.
- Ponte comportamental: `Funcionario.codResultComportamental?` (nullable) apontando para `ResultadoComportamental`, populado quando o vínculo candidatura→admissão existe. Ver ASSUMPTIONS.

## 3. APIs (por domínio + agregador enxuto)

Não haverá um endpoint gigante. Cada domínio expõe o seu (todos sob RLS, `@Permissoes`, validação Zod, paginação onde couber):

```
GET  /gestao-pessoas/colaboradores/:codFun/360           → agregador do TOPO (cabeçalho, resumo, nota, alertas, próximos passos) — chamadas paralelas
GET  /gestao-pessoas/colaboradores/:codFun/desempenho    → nota, distribuição, evolução, comparação de ciclos
GET  /gestao-pessoas/colaboradores/:codFun/competencias  → competências + comparação entre avaliadores + role-fit
GET  /gestao-pessoas/colaboradores/:codFun/metas
GET  /gestao-pessoas/colaboradores/:codFun/feedbacks     → (reusa Feedback; filtros)
GET  /gestao-pessoas/colaboradores/:codFun/pdi           → (reusa PDI)
GET  /gestao-pessoas/colaboradores/:codFun/treinamentos
GET  /gestao-pessoas/colaboradores/:codFun/comportamental
GET  /gestao-pessoas/colaboradores/:codFun/potencial
GET  /gestao-pessoas/colaboradores/:codFun/riscos        → motor de regras
GET  /gestao-pessoas/colaboradores/:codFun/proximos-passos
GET  /gestao-pessoas/colaboradores/:codFun/timeline
POST /gestao-pessoas/colaboradores/:codFun/ia/resumo     → resumo executivo (gateway)
POST /gestao-pessoas/colaboradores/:codFun/ia/roteiro    → perguntas p/ feedback
POST /gestao-pessoas/colaboradores/:codFun/proximos-passos  → cria tarefa
GET  /gestao-pessoas/colaboradores/:codFun/exportar      → PDF (controle de acesso, seções selecionáveis)
GET  /gestao-pessoas/gestor/equipe                        → dashboard do gestor (§23), escopo "minha equipe"
```

O agregador `/360` retorna só o necessário para a primeira dobra e dispara as consultas em paralelo; o resto carrega sob demanda por aba (§37).

## 4. Arquitetura de componentes (web)

Separação: **visuais** (sem domínio) · **de domínio** (chamam API) · **hooks** · **formatadores**. Nada de componente único gigante. Mapa (nomes do projeto, PT quando fizer sentido):

- Layout/casca: `Colaborador360Header`, `Colaborador360Abas`, `AvisoRestricaoAcesso`, `SeloFrescor` (data da última atualização), `IndicadorConfianca`.
- Visão 360: `ResumoExecutivo`, `ResumoIA` (+ `GavetaEvidencias`, botões Ver evidências / Gerar novamente), `CartaoNota`, `TendenciaDesempenho`, `ListaAlertas`, `PainelProximosPassos`.
- Competências: `VisaoCompetencias` (barras + heatmap; radar **opcional**, nunca única), `GavetaDetalheCompetencia`, `ComparacaoAvaliadores`, `AderenciaAoCargo`.
- Metas/Feedback/PDI/Treino: `ResumoMetas`+`CartaoMeta`, `TimelineFeedback`, `QuadroPDI`+`CartaoAcao` (reusa componentes atuais), `ResumoTreinamentos`.
- Perfil/Potencial/Carreira: `ResumoComportamental` (+ aviso metodológico), `ResumoPotencial` (matriz configurável), `Carreira`.
- Preparação/Histórico: `PreparacaoFeedback`, `TimelineColaborador`.

Reaproveita `Gaveta`, `Abas`, `Campo`, `BotaoPrimario`, `Erro`, `BarraProgresso` e os componentes de PDI/feedback/avaliação já prontos.

## 5. IA (ADR-0003)

Segue o contrato já em produção: a API monta prompt + esquema Zod e chama `POST /v1/ia/gerar` com `purpose` versionado, `provedor_preferido` (`local`/`nuvem`) e `esquema_saida`. A abstração `PerformanceAIProvider` da spec (§31) vive **no gateway Python** (`OllamaPerformanceProvider`, `MockPerformanceProvider`, e futuros OpenAI/Anthropic/Azure) — a API não fala com provedor direto.

Toda saída: JSON validado por Zod, versionada, **auditada**, com **evidências**, rejeitada se inventar campo, limitada aos dados enviados. Persistência em `IADesempenhoInsight` com `hashEntrada` (cache que envelhece quando o insumo muda). Prompt de sistema conforme §32 (explica, não decide; separa fato / interpretação / recomendação / validação humana). Proibições da §7/§34 codificadas no prompt e no esquema (sem nota, sem promoção/demissão, sem atributo sensível, sem causalidade sem evidência).

## 6. Segurança, papéis e LGPD

- **Isolamento por tenant:** toda nova tabela entra no bloco RLS `DO $$…$$` da migration (padrão do projeto).
- **Papéis:** mapear os papéis da §24 para o modelo real (`Papel`+permissões). Novas chaves propostas: `gestaopessoas.desempenho.ler_equipe` (gestor), `gestaopessoas.desempenho.ler_todos` (RH), `gestaopessoas.desempenho.confidencial` (notas/risco restritos), `gestaopessoas.auditoria.ler`. **EMPLOYEE** = colaborador com `usuario` vinculado, vê só o próprio 360 filtrado (sem comparação nominal, sem risco restrito).
- **Escopo "minha equipe":** exige vínculo de gestão em `Funcionario` (decisão em ASSUMPTIONS).
- **Auditoria de leitura:** ampliar o uso de `LogAuditoria` para registrar visualização/exportação/compartilhamento/geração de IA, além de escrita.
- **Minimização (§34):** o painel nunca exibe nem infere dado sensível (saúde, família, religião, orientação, política, raça). O esquema de saída da IA não tem esses campos.

## 7. Performance (§37)

Carrega primeiro: cabeçalho, resumo, nota, alertas, próximos passos (via agregador). Detalhes por aba sob demanda (lazy). Consultas paralelas no agregador; paginação/virtualização nas listas longas (feedbacks, timeline); memoização onde pesar; cache do insight de IA por hash.

## 8. Estrutura de pastas proposta

```
apps/api/src/gestao-pessoas/
  colaborador-360/            # controllers por domínio + agregador
  regras/                     # motores puros: risco, role-fit, consolidação 360, potencial
  ia-desempenho/              # montagem de prompt + esquemas Zod + chamada ao gateway
apps/web/src/app/app/gestao-pessoas/colaboradores/[codFun]/
  layout.tsx  page.tsx  (sub-abas)
apps/web/src/componentes/colaborador-360/   # componentes visuais e de domínio
apps/ai-service/app/                        # novos purposes de desempenho no gateway
packages/database/prisma/                   # migrations incrementais + RLS
docs/modules/performance-360/               # estes documentos
```

## 9. Identidade visual (ADL / print de referência)

O print recebido é o norte: cabeçalho com cartão do colaborador (foto/iniciais, cargo, departamento, admissão, status, avaliador, período, progresso), abas horizontais, e grade de cartões (Resumo com donut + distribuição, destaques, pontos de atenção, evolução em linha, comparativo, informações). Paleta off-white/bege/marrom/dourado discreto, alta legibilidade, baixa carga visual, valores numéricos junto às cores (nunca só cor). A Visão 360 prioriza, nesta ordem: **resumo → evolução → destaques → pontos de atenção → próximos passos → contexto**. Gráficos: decisão de abordagem em ASSUMPTIONS (SVG próprio vs. lib leve); radar nunca é a única visualização.
