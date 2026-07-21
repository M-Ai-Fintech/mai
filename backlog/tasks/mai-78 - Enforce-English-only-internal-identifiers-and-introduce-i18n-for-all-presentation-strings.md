---
id: MAI-78
title: >-
  Enforce English-only internal identifiers and introduce i18n for all
  presentation strings
status: Done
assignee: []
created_date: '2026-07-20 17:20'
updated_date: '2026-07-20 19:28'
labels: []
milestone: m-7
dependencies: []
documentation:
  - docs/adr/0001-english-internal-identifiers-with-i18n.md
priority: high
ordinal: 70000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The codebase mixes Portuguese string literals in domain logic (e.g., VDR compliance checks against 'Financeiro', 'Societário', 'Trabalhista', 'Tributário'). Domain modeling and ADR 0001 establish the rule: all internal identifiers, enums, schema values, and database entries must be English-only. Portuguese and any other language must be handled exclusively through an i18n (internationalization) layer in the presentation/UI tier. See: docs/adr/0001-english-internal-identifiers-with-i18n.md
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 VDR compliance audit checks use English domain identifiers (e.g., 'financial', 'corporate', 'labor', 'tax') — no Portuguese string literals remain in agent logic
- [ ] #2 An i18n dictionary or translation map exists (at minimum for PT-BR) covering all user-visible domain labels
- [ ] #3 A linting rule or code review guideline is documented to prevent future Portuguese string literals in backend logic
- [ ] #4 All agent output schemas that previously produced Portuguese strings (for human display) route through the i18n layer before surfacing to the UI/CLI
- [ ] #5 No Portuguese string literals exist in any TypeScript enum, schema, or conditional check in src/
<!-- AC:END -->

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
<!-- COMMENTS:END -->
