---
id: MAI-22
title: Refinar Document Generator (pdf-lib + Handlebars + LaTeX)
status: To Do
assignee:
  - Luís Silva
created_date: '2026-07-08 02:26'
updated_date: '2026-07-22 05:30'
labels:
  - engine
  - document
  - enterprise
  - superseded
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

## Comments

<!-- COMMENTS:BEGIN -->
author: @codex
created: 2026-07-22 05:29
---
## Rebaseline disposition — 2026-07-22\n\nSuperseded by the consolidated Document Generator rework in MAI-30 under Decision-Grade Engines.\n\nThis task is archived as superseded rather than treated as completed. Any remaining required outcome is tracked by the referenced replacement task or milestone.
---
<!-- COMMENTS:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Endpoint da CLI e Action de Agent disponíveis para geração unificada.
<!-- DOD:END -->
