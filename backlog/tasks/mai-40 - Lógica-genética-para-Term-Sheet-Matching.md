---
id: MAI-40
title: Lógica genética para Term Sheet Matching
status: To Do
assignee:
  - Luís Silva
created_date: '2026-07-08 02:26'
updated_date: '2026-07-22 05:29'
labels:
  - engine
  - optimization
  - poc
  - revalidation
milestone: m-11
dependencies: []
parent_task_id: MAI-27
priority: medium
ordinal: 32000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Validar a convergência do algoritmo genético sob faixas flexíveis de valuation.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 O algoritmo genético converge em menos de 10 gerações para os casos de teste padrão (perfis pré-definidos de comprador/vendedor)
- [ ] #2 A função de fitness penaliza corretamente estruturas que excedem os limites de valuation informados no perfil de entrada
- [ ] #3 O motor retorna no mínimo 3 alternativas de term sheet ranqueadas por score de fitness, cobrindo ao menos 2 modalidades distintas (ex.: Cash + Equity, Earn-out, Escrow)
- [ ] #4 Alternativas geradas não repetem a mesma combinação de modalidade/percentual entre si (diversidade genética garantida)
- [ ] #5 O tempo de execução para uma população de 100 indivíduos e 10 gerações é inferior a 500 ms em hardware de referência
- [ ] #6 A integração com o NegotiationAgent recebe o array de alternativas e exibe cada opção corretamente via CLI sem erros de validação Zod
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Modelar o cromossomo como um vetor de genes representando proporções de modalidade (cash %, equity %, earn-out %, escrow %) e o valuation alvo dentro da faixa permitida.
2. Implementar `initialPopulation(size, profile)` para gerar população inicial com valores aleatórios dentro das faixas do perfil de entrada.
3. Implementar `evaluate(individual, profile)` — função de fitness que pontua: aderência ao valuation-range, preferências declaradas (pesos por modalidade) e penalidade por fadiga (deal fatigue score).
4. Implementar operadores genéticos: `select` (seleção por torneio), `crossover` (ponto único), `mutate` (perturbação gaussiana com taxa configurável).
5. Montar o loop principal `evolve(population, generations)` e expor a função pública `optimizeDeal(profile): TermSheetAlternative[]`.
6. Escrever testes unitários para cada função isolada; adicionar benchmark de convergência ao script de CI.
7. Integrar com `NegotiationAgent`: passar o array de alternativas e validar schema Zod antes de exibir na CLI.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Referências úteis: NSGA-II para otimização multi-objetivo caso seja necessário lidar com mais de uma função de fitness; biblioteca `simple-statistics` disponível no ecossistema Deno para geração de números aleatórios com distribuição gaussiana. Manter parâmetros (tamanho da população, taxa de mutação, número de gerações) configuráveis via variável de ambiente ou objeto de configuração injetável para facilitar ajuste fino sem recompilação.

[POC Orchestrator Note] Grupo A (Paralelo): Focar apenas na genética base em src/engines/optimization/genetic.ts.
<!-- SECTION:NOTES:END -->

## Comments

<!-- COMMENTS:BEGIN -->
author: Auditoria Técnica
created: 2026-07-10 06:04
---
[REVISÃO CRÍTICA] 1. Duplicação Crítica de Lógica: Há dois algoritmos genéticos separados e incompatíveis no código: src/engines/optimization/genetic.ts (que atua sobre valuation, cash, equity, earn-out, escrow) e term_sheet_optimizer.ts (que opera sobre cashPercentage, buyerEquityShare, earnOutTargetYears, nonCompeteMonths). 2. Motor Inutilizado em Produção: O algoritmo desenvolvido sob a tarefa MAI-40 (genetic.ts) só é chamado no test runner e na tool Mastra, enquanto a CLI e a API Server continuam utilizando o term_sheet_optimizer.ts antigo. A lógica de convergência otimizada não está de fato integrada no fluxo real do middleware.
---

author: @codex
created: 2026-07-22 05:29
---
## Rebaseline audit — 2026-07-22\n\nCurrent status: The genetic implementation has a failing tournament-selection test that the canonical suite excludes. Reopen until selection semantics are deterministic or correctly specified and every colocated test is part of the gate.\n\nReason for reopening: the previous Done state does not satisfy the agreed definitive gate. Existing completion checkmarks are cleared pending fresh evidence. Before returning to Done, every applicable acceptance criterion and Definition of Done item must be verified, relevant tests must exist and pass, and mock/prototype boundaries must be explicit.
---
<!-- COMMENTS:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Implementação completa em src/engines/optimization/genetic.ts com tipagem TypeScript estrita (sem any)
- [ ] #2 Cobertura de testes unitários ≥ 80 % sobre as funções principais: initialPopulation, crossover, mutate, evaluate, select
- [ ] #3 Benchmark de convergência documentado: arquivo de resultados gerado automaticamente pelo test runner (ex.: bench/ga-convergence.json)
- [ ] #4 Integração smoke-tested: o NegotiationAgent consome o output do GA e loga as 3+ alternativas sem erros no fluxo E2E básico
- [ ] #5 PR revisado e aprovado com pelo menos um comentário de code-review abordando a estratégia de seleção escolhida (torneio, roleta etc.)
<!-- DOD:END -->
