---
id: MAI-21
title: Templates PDF fiduciários dinâmicos via pdf-lib
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
ordinal: 36000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Criar sistema de injeção dinâmica de assinaturas e formatação de marca d'água corporativa usando a biblioteca pdf-lib.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Preencher variáveis dinâmicas em formulários PDF existentes (marca d'água, assinaturas).
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
Criar src/engines/document/pdf_templates.ts utilizando pdf-lib para carregar PDFs base e injetar drawText.
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
- [ ] #1 Template gerado com sucesso sem corromper metadados do PDF original.
<!-- DOD:END -->
