---
id: MAI-72
title: >-
  Canonicalize 'Deal' as the central domain entity and rename 'transaction'
  references
status: To Do
assignee: []
created_date: '2026-07-20 17:18'
updated_date: '2026-07-22 05:29'
labels:
  - revalidation
milestone: m-14
dependencies: []
priority: medium
ordinal: 64000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
During the domain modeling session, 'Deal' was established as the canonical term for the core entity (the M&A process between a Buyer and a Target). The DB table is currently named 'transaction' and some agent schemas may still use 'transaction' in variable names or comments. All code references must be aligned to the domain language.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 All TypeScript schemas, types, and variable names use 'Deal' (not 'Transaction', 'Operação', or 'Negócio') to refer to the core entity
- [ ] #2 '_Avoid_' terms (Transaction, Operação, Negócio) do not appear as domain identifiers in any schema or agent logic
- [ ] #3 CONTEXT.md entry for 'Deal' is referenced in a code comment at the definition site of the primary deal type/schema
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Every applicable acceptance criterion is checked with current evidence
- [ ] #2 All focused tests and the repository-wide verification gate pass
- [ ] #3 No mock, fallback, or prototype behavior is represented as a real integrated capability
<!-- DOD:END -->

## Comments

<!-- COMMENTS:BEGIN -->
created: 2026-07-20 19:27
---
## 🚀 Resumo da Implementação

Refatoração da entidade central do domínio de `Transaction` para `Deal`, consolidando as nomenclaturas. O arquivo `ma_flow.ts` (desatualizado) foi removido em favor do fluxo no `mvp_store`, e os testes smoke foram atualizados.

### 📁 Arquivos Alterados

- `tests/smoke.spec.ts` — Ajuste para utilizar a nomenclatura Deal.
- `src/core/ma_flow.ts` — Arquivo removido.

### 🔧 Serviços Afetados

- **mai/core** — Fluxo de ciclo de vida e e2e tests.

## ✅ 1. Critérios de Aceite

- [ ] O fluxo do `MvpStore` completa o ciclo de vida usando `deal` em vez de `transaction`.
- [ ] O teste smoke completa todas as fases sem erros.

## ⚠️ 2. Possíveis Impactos

- Possível impacto em ferramentas antigas de CLI que ainda possam buscar `transaction` (o teste e2e deve cobrir isso).

## 🧪 3. Recomendações para QA

### O que validar

- Valide se o pipeline `deno test` passa integralmente, especificamente os smoke tests em `tests/smoke.spec.ts`.

### Pontos de Atenção / Edge Cases

- ⚠️ Nenhum impacto de UI direto, apenas fluxo interno.

### Proposta de Fluxo de Teste

1. Executar `deno test -A tests/smoke.spec.ts` e verificar se passa com sucesso.
---

author: @codex
created: 2026-07-22 05:29
---
## Rebaseline audit — 2026-07-22\n\nCurrent status: Canonical Deal terminology is not verified repository-wide and TransactionRepository remains present. All criteria are unchecked. Reopen for exhaustive identifier checks and migration evidence.\n\nReason for reopening: the previous Done state does not satisfy the agreed definitive gate. Existing completion checkmarks are cleared pending fresh evidence. Before returning to Done, every applicable acceptance criterion and Definition of Done item must be verified, relevant tests must exist and pass, and mock/prototype boundaries must be explicit.
---
<!-- COMMENTS:END -->
