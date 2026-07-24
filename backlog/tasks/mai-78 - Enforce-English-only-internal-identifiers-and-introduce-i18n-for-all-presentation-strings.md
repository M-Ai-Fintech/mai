---
id: MAI-78
title: >-
  Enforce English-only internal identifiers and introduce i18n for all
  presentation strings
status: In Progress
assignee:
  - '@codex'
created_date: '2026-07-20 17:20'
updated_date: '2026-07-24 18:49'
labels:
  - revalidation
milestone: m-14
dependencies:
  - MAI-84
references:
  - 'https://github.com/M-Ai-Fintech/MVP/pull/6'
documentation:
  - >-
    backlog/docs/decisions/adr-0001-english-internal-identifiers-i18n/doc-14 -
    ADR-0001-English-Internal-Identifiers-and-i18n.md
priority: high
ordinal: 70000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The codebase mixes Portuguese string literals in domain logic (e.g., VDR compliance checks against 'Financeiro', 'Societário', 'Trabalhista', 'Tributário'). Domain modeling and ADR 0001 establish the rule: all internal identifiers, enums, schema values, and database entries must be English-only. Portuguese and any other language must be handled exclusively through an i18n (internationalization) layer in the presentation/UI tier. See: docs/adr/0001-english-internal-identifiers-with-i18n.md
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 VDR compliance audit checks use English domain identifiers (e.g., 'financial', 'corporate', 'labor', 'tax') — no Portuguese string literals remain in agent logic
- [x] #2 An i18n dictionary or translation map exists (at minimum for PT-BR) covering all user-visible domain labels
- [x] #3 A linting rule or code review guideline is documented to prevent future Portuguese string literals in backend logic
- [x] #4 All agent output schemas that previously produced Portuguese strings (for human display) route through the i18n layer before surfacing to the UI/CLI
- [x] #5 No Portuguese string literals exist in any TypeScript enum, schema, or conditional check in src/
- [x] #6 All maintained source, tests, configuration, active Backlog records, and canonical documentation are English except approved locale catalogs
- [x] #7 A real i18n catalog exists with at least en and pt-BR locales, deterministic fallback behavior, and user-selectable presentation locale
- [x] #8 CLI, GUI, generated documents, and user-facing agent messages resolve translated text through the i18n boundary
- [x] #9 An automated check rejects non-English presentation literals outside approved locale resources
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Add typed en and pt-BR catalogs with deterministic English fallback and explicit locale selection for CLI and GUI.
2. Convert internal identifiers, schema descriptions, conditionals, and VDR categories to English without translating runtime-local domain knowledge assets.
3. Route existing localized CLI output, generated term-sheet text, targeted GUI surfaces, and human-facing agent results through the i18n boundary.
4. Add regression tests for catalogs, interpolation, locale selection, VDR taxonomy, generated documents, and the repository language checker.
5. Add a focused checker for maintained TypeScript presentation literals, excluding locale resources and governed runtime knowledge.
6. Run focused tests, relevant GUI checks, deno task verify, git diff --check, and Graphify; keep In Progress until human review.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Intake 2026-07-24: cleaned the 431-file formatting worktree, renamed the rejected implementation to reference/MAI-78-antigravity-i18n, and created chore/MAI-78-i18n from master. Graphify outputs are expected dirty generated artifacts and excluded from commits. MAI-84 remains stale as In Progress, but its PR #5 is merged into master and the canonical ADR/documentation dependency is present, so the delivered dependency is treated as satisfied.

Implementation 2026-07-24: treated the Antigravity branch as reference only. Rejected its 431-file worktree formatting churn, excluded runtime knowledge Markdown and generated Graphify artifacts, and later rejected its 40-file core/test rewrite after whitespace-insensitive review. Implemented typed en/pt-BR catalogs, deterministic English fallback, explicit CLI/GUI locale selection, localized CLI/GUI/document/agent presentation boundaries, English internal identifiers/source text, and a regression language checker. Verification: deno task verify passed all eight stages with network/localhost access; focused i18n and checker tests passed 8/8; focused integration suite passed 41 tests plus 8 steps; git diff --check passed.
<!-- SECTION:NOTES:END -->

## Comments

<!-- COMMENTS:BEGIN -->
created: 2026-07-20 19:28
---
## 🚀 Resumo da Implementação

Remoção de nomenclaturas mistas/português do código interno. As propriedades do schema de resposta (KYB) foram renomeadas de `razaoSocial` para `legalName`, `situacaoCadastral` para `registrationStatus`, etc. Mantendo as labels de exibição do CLI traduzidas (i18n).

### 📁 Arquivos Alterados

- `src/agent/vdr_mock.ts` — Chaves de mock adaptadas.
- `gui/lib/api-client.ts` — Contratos KYC adaptados.
- `src/cli/commands.ts` — CLI labels traduzidas dinamicamente do objeto em inglês.

### 🔧 Serviços Afetados

- **mai/core**, **mai/gui**, **mai/cli**

## ✅ 1. Critérios de Aceite

- [ ] A execução do comando `kyb` no CLI continua exibindo os dados formatados em português ao usuário.
- [ ] Todos os contratos TS usam as propriedades equivalentes em inglês.

## ⚠️ 2. Possíveis Impactos

- Quebras em chamadas antigas que aguardavam a key em PT-BR e não foram atualizadas.

## 🧪 3. Recomendações para QA

### O que validar

- Executar `deno run -A src/cli/index.ts kyb 12345678000199` e garantir que os dados "Razão Social", etc. estão preenchidos e não `undefined` ou `N/A`.
---

author: @codex
created: 2026-07-22 05:29
---
## Rebaseline audit — 2026-07-22\n\nCurrent status: No i18n layer exists; Portuguese strings remain in CLI, engines, documents, and repository content. Reopen and enforce English-only maintained content with non-English presentation text isolated to locale catalogs.\n\nReason for reopening: the previous Done state does not satisfy the agreed definitive gate. Existing completion checkmarks are cleared pending fresh evidence. Before returning to Done, every applicable acceptance criterion and Definition of Done item must be verified, relevant tests must exist and pass, and mock/prototype boundaries must be explicit.
---

author: @codex
created: 2026-07-24 18:49
---
Implementation is published for human review in PR #6: https://github.com/M-Ai-Fintech/MVP/pull/6. Full repository verification passed before publication; task remains In Progress pending review.
---
<!-- COMMENTS:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 Every applicable acceptance criterion is checked with current evidence
- [x] #2 All focused tests and the repository-wide verification gate pass
- [x] #3 No mock, fallback, or prototype behavior is represented as a real integrated capability
<!-- DOD:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Rebuilt MAI-78 from master using the rejected Antigravity branch only as a reference. Added typed English and PT-BR i18n boundaries across CLI, GUI, generated documents, and agent-facing presentation; converted maintained internal/source text to English; and added automated regression enforcement. Full repository verification passes. Kept In Progress pending human PR review.
<!-- SECTION:FINAL_SUMMARY:END -->
