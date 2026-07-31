---
id: MAI-41
title: Implementar constraint programming em Optimization (KYC/Valuation)
status: To Do
assignee:
  - Luís Silva
created_date: '2026-07-08 02:26'
updated_date: '2026-07-31 19:58'
labels:
  - engine
  - optimization
  - poc
  - revalidation
milestone: m-11
dependencies: []
parent_task_id: MAI-27
priority: medium
ordinal: 33000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Aprimorar os modelos matemáticos aplicando regras e limites rígidos de compliance de KYC e regras financeiras complexas.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Deals que violam restrições de KYC (ex.: PEP, sanções OFAC/BACEN) são rejeitados automaticamente pelo solver antes de chegarem ao ranking final.
- [ ] #2 A razão de alavancagem máxima (ex.: Dívida/EBITDA > 6×) bloqueia a estrutura de deal correspondente com mensagem de erro estruturada.
- [ ] #3 O índice mínimo de cobertura de EBITDA (ex.: EBITDA/Juros < 1,5×) é verificado e falha com diagnóstico claro.
- [ ] #4 O output do algoritmo genético (`GAResult`) é filtrado pelo solver, retornando apenas estruturas que satisfazem **todas** as restrições ativas.
- [ ] #5 Restrições podem ser ativadas/desativadas por configuração, sem alterar o código-fonte de `constraints.ts`.
- [ ] #6 O solver processa um conjunto de 100 candidatos em menos de 200 ms (benchmark local, Deno).
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. **Modelar interface `Constraint`** – definir tipo genérico com campos `id`, `type`, `evaluate(deal): ConstraintResult` e `enabled`.
2. **Implementar restrições de KYC** – checar flags `kycBlocked`, `sanctionMatch` e `pepExposure` vindas do `SourcingAndKYBAgent`.
3. **Implementar restrições financeiras** – calcular `debtToEBITDA`, `ebitdaCoverage` e `valuationFloor` a partir do payload do GA.
4. **Integrar com o loop do GA** – em `src/engines/optimization/index.ts`, passar candidatos por `filterFeasible(candidates, constraints)` antes do ranking.
5. **Configuração via arquivo** – ler limiares (ex.: `maxLeverage`, `minCoverage`) de `src/engines/optimization/config.ts` ou variável de ambiente.
6. **Testes** – criar `src/engines/optimization/constraints_test.ts` cobrindo casos limítrofes e cenários de violação múltipla.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
[POC Orchestrator Note] Grupo B (Síncrono após A): Basear-se em MAI-40. Focar em constraints.ts e index.ts.

Superseded through separated architecture ownership.

Requirements carried forward:

- leverage calculations;
- interest-coverage calculations;
- valuation-floor calculations;
- eligibility and restriction inputs;
- configurable constraints;
- infeasible-result explanations;
- tests for constraint violations;
- representative performance evidence;
- integration with authoritative matching and negotiation workflows.

Replacement ownership:

- MAI-144 owns pure deterministic financial calculations;
- MAI-145 owns deterministic matching eligibility and restriction handling;
- MAI-146 owns negotiation proposal-feasibility constraints;
- MAI-115 owns evidence-backed Findings and immutable human Decision Records;
- MAI-117 owns conflicts, restrictions, shortlist, and outreach authority;
- MAI-118 owns negotiation lifecycle, mandate comparison, approval, and separately authorized delivery;
- MAI-129 owns final physical retirement.

Architecture changed:

- KYC, sanctions, PEP, and compliance policy do not belong to a generic optimization engine;
- PEP exposure is not automatically an unconditional rejection;
- missing KYC information is not feasible by default;
- missing or invalid financial information is not feasible by default;
- constraints reference exact policy, evidence, calculation, mandate, or decision versions;
- violated constraints are explicit rather than silently filtered;
- protected counterparty information cannot leak through explanations;
- pure optimizers have no workflow or human-decision authority;
- no Pub/Sub, CLI, or direct agent call is an authoritative integration boundary.

Existing constraint code and tests remain migration evidence until replacement coverage and cutover are proven.

Archive does not authorize immediate code deletion.
<!-- SECTION:NOTES:END -->

## Comments

<!-- COMMENTS:BEGIN -->
author: Technical Audit
created: 2026-07-10 06:04
---
[CRITICAL REVIEW] Complete isolation of constraint logic: `optimizeWithConstraints()` in `constraints.ts`, which applies KYC filtering and leverage limits to GA output, is never called by the CLI or production Core API. It is tested only in `constraints_test.ts`; no PEP/OFAC or financial-leverage constraints apply at runtime.
---

author: @codex
created: 2026-07-22 05:29
---
## Rebaseline audit — 2026-07-22\n\nCurrent status: Constraints are exercised by the legacy API, but NegotiationAgent still calls unconstrained optimizeDeal. Reopen until KYC, leverage, and coverage invariants apply to the agentic production path.\n\nReason for reopening: the previous Done state does not satisfy the agreed definitive gate. Existing completion checkmarks are cleared pending fresh evidence. Before returning to Done, every applicable acceptance criterion and Definition of Done item must be verified, relevant tests must exist and pass, and mock/prototype boundaries must be explicit.
---
<!-- COMMENTS:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Arquivo `src/engines/optimization/constraints.ts` implementado com pelo menos 4 tipos de restrição distintos (KYC, alavancagem, cobertura, valuation floor).
- [ ] #2 Testes unitários para **cada tipo de constraint** passando (`deno test`) com cobertura ≥ 85%.
- [ ] #3 Teste de integração validando o pipeline completo: saída do GA → CP solver → lista de deals viáveis ranqueados.
- [ ] #4 Nenhum deal com flag `kycBlocked: true` passa pelo solver em qualquer cenário de teste.
- [ ] #5 Documentação inline (JSDoc) descrevendo parâmetros, unidades e referências regulatórias de cada restrição.
- [ ] #6 PR aprovado e tarefa movida para `Done` no Backlog.md.
<!-- DOD:END -->

## Notes

- Preferir implementação nativa em Deno antes de avaliar bindings para `or-tools` via WASM (complexidade de build vs. ganho marginal no MVP).
- As restrições de KYC devem espelhar as regras já validadas pelo `SourcingAndKYBAgent` para evitar duplicação de lógica; usar evento Pub/Sub ou injeção direta do resultado de KYB.
- Limiares regulatórios (Basileia III, BCB 4.557) devem ser revisados com o time jurídico antes do release de produção.
