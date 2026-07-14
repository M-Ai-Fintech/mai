---
id: MAI-22
title: Refinar Document Generator (pdf-lib + Handlebars + LaTeX)
status: Done
assignee:
  - Luís Silva
created_date: '2026-07-08 02:26'
updated_date: '2026-07-10 13:44'
labels:
  - engine
  - document
  - enterprise
milestone: m-3
dependencies: []
parent_task_id: MAI-30
priority: low
ordinal: 37000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Consolidar a injeção em Handlebars e compilação híbrida (LaTeX/PDF) para as minutas de SPA/QPA.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Orquestrar o fluxo unificado: Dados -> Handlebars -> LaTeX -> PDF final com marca d'água (pdf-lib).
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
Consolidar lógicas no indexador src/engines/document/index.ts.
<!-- SECTION:PLAN:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Endpoint da CLI e Action de Agent disponíveis para geração unificada.
<!-- DOD:END -->
