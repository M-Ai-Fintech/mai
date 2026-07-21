---
id: MAI-74
title: Split dual termsheetSchema into NegotiationProposal and BindingTermSheet
status: Done
assignee: []
created_date: '2026-07-20 17:19'
updated_date: '2026-07-20 19:28'
labels: []
milestone: m-7
dependencies: []
priority: high
ordinal: 66000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Two different agents export a schema named 'termsheetSchema' with incompatible shapes: negotiation/schemas/term-sheet.ts (mathematical proposal with utilities and Nash data) and legal-closing/schemas/term-sheet.ts (legal document with governing law, exclusivity, etc.). Domain modeling resolved this by defining two distinct concepts: Negotiation Proposal (in-progress offer) and Binding Term Sheet (finalized pre-contract document).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 negotiation/schemas/term-sheet.ts exports 'negotiationProposalSchema' (renamed from termsheetSchema)
- [ ] #2 legal-closing/schemas/term-sheet.ts exports 'bindingTermSheetSchema' (renamed from termsheetSchema)
- [ ] #3 The 'proposal' sub-object nesting in legal-closing is evaluated and either kept or flattened for consistency — decision documented in code comment
- [ ] #4 All agent code importing either schema uses the new names without ambiguity
- [ ] #5 No import-time name collisions exist between the two schemas
<!-- AC:END -->

## Comments

<!-- COMMENTS:BEGIN -->
created: 2026-07-20 19:28
---
## 🚀 Resumo da Implementação

Separação da ambiguidade do schema dual `termsheetSchema`. Foram criados dois schemas isolados: um para a negociação (`NegotiationProposal`) e outro formal vinculativo (`BindingTermSheet`), compartilhando estruturas comuns de `src/shared/schemas/term-sheet.ts`.

### 📁 Arquivos Alterados

- `src/shared/schemas/term-sheet.ts` — Schema base unificado criado.
- `src/agent/agents/negotiation/schemas/term-sheet.ts` — Adaptado para a mesa de negociação.
- `src/agent/agents/legal-closing/schemas/term-sheet.ts` — Criado para o documento vinculativo final (Legal Closing).

### 🔧 Serviços Afetados

- **mai/agents** — Agentes NegotiationAgent e LegalClosingAgent.

## ✅ 1. Critérios de Aceite

- [ ] Legal Closing Agent utiliza um schema diferente daquele da Mesa de Negociação.

## ⚠️ 2. Possíveis Impactos

- Fluxo E2E (Sourcing -> Negociação -> Legal Closing) precisa garantir que a conversão entre o Proposal e o Binding Term Sheet ocorra de maneira fluída.

## 🧪 3. Recomendações para QA

### O que validar

- Validar o pipeline de geração de PDFs fiduciários e negociação no CLI.
---
<!-- COMMENTS:END -->
