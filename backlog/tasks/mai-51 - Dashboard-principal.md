---
id: MAI-51
title: Dashboard Principal com Multi-View e Filtros Contextuais
status: To Do
assignee:
  - Luís Silva
created_date: '2026-07-14 05:26'
updated_date: '2026-07-14 15:35'
labels:
  - GUI
  - dashboard
  - stitch
  - core-screen
milestone: m-6
dependencies:
  - MAI-53
  - MAI-49
references:
  - gui/DESIGN.md
  - gui/app/page.tsx
  - src/api/server.ts
  - gui/lib/api-client.ts
priority: high
ordinal: 52000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Implementar o dashboard principal da aplicação — a primeira tela que o usuário vê após login. O dashboard é o hub central de gestão de deals M&A, construído obrigatoriamente a partir da biblioteca de componentes reutilizáveis da MAI-53 (Cards, Tables, Navigation, TopBar, Dropdown, Badges, etc.). Oferece 3 views intercambiáveis (Board/Kanban, Table, Timeline) para visualizar o pipeline de transações. Inclui filtros contextuais por fase, cliente e responsável, widget de chatbot resumido para interações rápidas, inbox de notificações, suporte a POV switching (Instituição, Banker, Cliente) e visualização de cowork (times e papéis).

Toda a tela deve ser prototipada no Stitch MCP seguindo rigorosamente o fluxo Stitch-first (prototipar no Stitch MCP -> obter aprovação do PO -> codificar em React utilizando os componentes da MAI-53).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Layout e views do dashboard prototipados no Stitch MCP e aprovados pelo PO antes da codificação (fluxo Stitch-First: prototipar no Stitch MCP -> aprovação PO -> código)
- [ ] #2 Implementação construída inteiramente utilizando a biblioteca de componentes reutilizáveis da MAI-53
- [ ] #3 View Board/Kanban: deals exibidos como cards arrastáveis organizados por fase (Sourcing, DD, Negotiation, Closing, etc.)
- [ ] #4 View Table: listagem tabular de deals com colunas sortáveis (título, cliente, valuation, fase, responsável, última atualização)
- [ ] #5 View Timeline: visualização temporal do pipeline com marcos e deadlines por deal
- [ ] #6 Filtros contextuais funcionais: por fase (labels), por cliente (business), por responsável (assignee)
- [ ] #7 Widget de chatbot integrado: resumo de último contexto do BrokerOrchestratorAgent, com link para tela de chat completa
- [ ] #8 Inbox de notificações: lista de eventos recentes (mudanças de fase, novos documentos, mensagens de agentes)
- [ ] #9 POV switching: alternância entre visão Instituição (todos os deals), Banker (meus deals), Cliente (deal específico)
- [ ] #10 Cowork panel: visualização de times e papéis atribuídos a cada deal
- [ ] #11 Todas as views consomem dados reais da API backend Deno via ApiClient (GET /api/deals)
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Prototipar cada view no Stitch MCP (Board -> Table -> Timeline). 2. Prototipar filtros e widgets laterais no Stitch MCP. 3. Gerar variantes e apresentar ao PO para aprovação. 4. Implementar View Board com drag-and-drop reutilizando componentes da MAI-53. 5. Implementar View Table com sorting/paginação reutilizando componentes da MAI-53. 6. Implementar View Timeline. 7. Integrar filtros compartilhados. 8. Conectar com API backend. 9. Criar stories no Storybook.
<!-- SECTION:PLAN:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Protótipo completo das 3 views aprovado pelo PO no Stitch MCP
- [ ] #2 As 3 views renderizam corretamente utilizando os componentes base da MAI-53 com dados mockados E com dados da API
- [ ] #3 Transição entre views é suave (sem reload de página)
- [ ] #4 Filtros persistem entre mudanças de view
- [ ] #5 Responsivo nos 4 breakpoints do DESIGN.md
- [ ] #6 Componentes específicos do dashboard documentados com stories no Storybook
<!-- DOD:END -->
