---
id: MAI-60
title: 'Dashboard Dinâmico: Customização de Layout e Ancoragem de Widgets Generativos'
status: To Do
assignee: []
created_date: '2026-07-14 05:35'
updated_date: '2026-07-28 03:00'
labels:
  - GUI
  - dashboard
  - dynamic
  - drag-and-drop
  - innovation
  - revalidation
milestone: m-12
dependencies: []
references:
  - gui/DESIGN.md
  - gui/DESIGN_GUIDELINES.md
  - gui/app/page.tsx
priority: low
ordinal: 61000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Permitir que o usuário final (Banker/Advisor) construa um workspace 100% customizável e adaptável às suas necessidades operacionais de M&A.

Além da reorganização via drag-and-drop de widgets padrão (KPIs, pipeline chart, recent deals, inbox agêntico, activity feed), o Dashboard Dinâmico integra-se diretamente ao motor de Generative UI (MAI-57), permitindo que telas, tabelas ou visões sintéticas geradas sob demanda pelos agentes de IA sejam ancoradas e organizadas como novos widgets na grade.

A configuração do layout (disposição, tamanhos, widgets nativos e widgets generativos) é persistida por usuário (localStorage e sincronização via API) para garantir continuidade entre sessões. O layout padrão (default preset) serve como fallback e opção de reset rápido.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Grid layout customizável com drag-and-drop de widgets no dashboard
- [ ] #2 Widgets disponíveis: KPI cards (deals ativos, valor total pipeline, taxa de conversão), gráfico de pipeline, lista de deals recentes, inbox resumido, activity feed da equipe
- [ ] #3 Usuário pode adicionar, remover e redimensionar widgets
- [ ] #4 Configuração de layout persistida por usuário (localStorage) e restaurada ao recarregar
- [ ] #5 Layout padrão (default) disponível como fallback e opção de reset
- [ ] #6 Responsivo: grid colapsa graciosamente para mobile (stack vertical)
- [ ] #7 Protótipo aprovado pelo PO no Stitch
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Avaliar e integrar biblioteca de grid responsivo com suporte a Drag-and-Drop (ex: dnd-kit / react-grid-layout) no ecossistema React 19 + Tailwind v4.
2. Prototipar o Dashboard Dinâmico no Stitch MCP incluindo o painel/drawer de seleção de widgets e a ancoragem de widgets sintetizados via Generative UI (MAI-57).
3. Desenvolver o container de Grid Dinâmico e o modelo de dados de layout (WidgetID, posição x,y, largura/altura, tipo de widget, dslPayload se generativo).
4. Implementar a ponte com MAI-57 para injetar componentes/DSL sintetizados dinamicamente na grade do dashboard.
5. Desenvolver os widgets padronizados do sistema (KPI cards, Pipeline chart, Recent Deals, Activity Feed).
6. Implementar a persistência do estado do layout no perfil do usuário (localStorage / API Backend).
7. Criar mecanismo de Reset Layout e suporte a breakpoints responsivos.
8. Criar documentação e stories no Storybook.
<!-- SECTION:PLAN:END -->

## Comments

<!-- COMMENTS:BEGIN -->
author: @codex
created: 2026-07-22 05:29
---
## Rebaseline audit — 2026-07-22\n\nCurrent status: The dashboard supports basic button-based layout changes but not claimed drag-and-drop or generative-widget anchoring; the localStorage anchor has no consumer. Reopen for a complete integration.\n\nReason for reopening: the previous Done state does not satisfy the agreed definitive gate. Existing completion checkmarks are cleared pending fresh evidence. Before returning to Done, every applicable acceptance criterion and Definition of Done item must be verified, relevant tests must exist and pass, and mock/prototype boundaries must be explicit.
---

author: Codex
created: 2026-07-28 02:59
---
Archived as superseded on 2026-07-27 after the owner-approved MAI-85 rebaseline. Replacement work is tracked by the MAI-85.1 through MAI-85.15 dependency chain; this task's Stitch-first, legacy-GUI, or prototype-contract assumptions must not be implemented.
---
<!-- COMMENTS:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Drag-and-drop funcional sem bugs visuais (sem overlap, snap-to-grid)
- [ ] #2 Persistência de layout funcional com localStorage
- [ ] #3 Reset para layout padrão funcional
- [ ] #4 Responsivo nos 4 breakpoints
- [ ] #5 Stories no Storybook para os componentes de drag-and-drop grid
<!-- DOD:END -->
