---
id: MAI-62
title: 100% E2E Play-Tests Coverage no Storybook
status: To Do
assignee:
  - '@antigravity'
created_date: '2026-07-19 02:00'
updated_date: '2026-07-22 05:29'
labels:
  - revalidation
milestone: m-12
dependencies: []
parent_task_id: MAI-48
ordinal: 63000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Completar a cobertura de testes funcionais (play functions) no Storybook para todos os componentes criados (Table, Tabs, Sidebar, etc). O objetivo é alcançar 100% de coverage de interações e ramificações lógicas (branches), garantindo que cada estado de cada componente tenha cobertura automatizada via play-tests.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Todos os arquivos *.stories.tsx devem possuir ao menos um play test para cobrir interações
- [ ] #2 Relatório do Istanbul/NYC em .nyc_output demonstra 100% de cobertura de branches
- [ ] #3 Componentes complexos (Table, Tabs, Sidebar) possuem múltiplos passos validados no await canvas.findByRole
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Part 1 completed: Accordion, Avatar, Badge, Button, Card, CountrySelector, Divider, Dropdown, ErrorBoundary, Footer, FormField all reached 100% statement and branch coverage without istanbul ignores.
<!-- SECTION:NOTES:END -->

## Comments

<!-- COMMENTS:BEGIN -->
author: @codex
created: 2026-07-22 05:29
---
## Rebaseline audit — 2026-07-22\n\nCurrent status: The task claims 100% Storybook E2E play-test coverage but one acceptance criterion remains unchecked and coverage completeness is not demonstrated. Reopen despite the current 89 passing interactions.\n\nReason for reopening: the previous Done state does not satisfy the agreed definitive gate. Existing completion checkmarks are cleared pending fresh evidence. Before returning to Done, every applicable acceptance criterion and Definition of Done item must be verified, relevant tests must exist and pass, and mock/prototype boundaries must be explicit.
---
<!-- COMMENTS:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Relatório de cobertura gerado na branch indica 100% Stmts e 100% Branch
- [ ] #2 Nenhum pragma de 'istanbul ignore next' foi injetado para forçar a cobertura artificialmente
<!-- DOD:END -->
