---
id: MAI-60
title: 'Dashboard Dinâmico: Customização de Layout e Ancoragem de Widgets Generativos'
status: Done
assignee: []
created_date: '2026-07-14 05:35'
updated_date: '2026-07-14 16:17'
labels:
  - GUI
  - dashboard
  - dynamic
  - drag-and-drop
  - innovation
milestone: m-6
dependencies:
  - MAI-51
  - MAI-57
  - MAI-53
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
- [x] #1 Grid layout customizável com drag-and-drop de widgets no dashboard
- [x] #2 Widgets disponíveis: KPI cards (deals ativos, valor total pipeline, taxa de conversão), gráfico de pipeline, lista de deals recentes, inbox resumido, activity feed da equipe
- [x] #3 Usuário pode adicionar, remover e redimensionar widgets
- [x] #4 Configuração de layout persistida por usuário (localStorage) e restaurada ao recarregar
- [x] #5 Layout padrão (default) disponível como fallback e opção de reset
- [x] #6 Responsivo: grid colapsa graciosamente para mobile (stack vertical)
- [x] #7 Protótipo aprovado pelo PO no Stitch
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

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 Drag-and-drop funcional sem bugs visuais (sem overlap, snap-to-grid)
- [x] #2 Persistência de layout funcional com localStorage
- [x] #3 Reset para layout padrão funcional
- [x] #4 Responsivo nos 4 breakpoints
- [x] #5 Stories no Storybook para os componentes de drag-and-drop grid
<!-- DOD:END -->
