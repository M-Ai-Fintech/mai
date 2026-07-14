---
id: MAI-21
title: Templates PDF fiduciários dinâmicos via pdf-lib
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

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Template gerado com sucesso sem corromper metadados do PDF original.
<!-- DOD:END -->
