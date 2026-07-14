---
id: MAI-49
title: Definir Fluxo de Navegação e Arquitetura de Rotas da Aplicação
status: To Do
assignee:
  - Luís Silva
created_date: '2026-07-14 05:17'
updated_date: '2026-07-14 15:34'
labels:
  - GUI
  - ux
  - architecture
  - stitch
milestone: m-6
dependencies:
  - MAI-55
references:
  - gui/README.md
  - gui/app/layout.tsx
  - gui/components/Sidebar.tsx
  - context/nextjs_gui_and_api.md
priority: high
ordinal: 50000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Mapear o fluxo ideal de navegação do usuário (Banker/Advisor) na aplicação M&Ai, desde o login até o closing de um deal. O resultado é um diagrama de fluxo (user flow) e a definição formal da hierarquia de rotas do Next.js App Router. Inclui a prototipação do layout base (shell da aplicação: sidebar fixa + topbar contextual + área de conteúdo) no Stitch MCP para aprovação do PO antes de qualquer implementação (fluxo Stitch-First: prototipar no Stitch MCP -> aprovar com PO -> codificar). Este fluxo é a espinha dorsal de todas as telas subsequentes.

O fluxo deve cobrir as seguintes jornadas:
- **Jornada Principal**: Login -> Dashboard (visão geral) -> Selecionar Deal -> Deal Detail (KYB + phases) -> Chat Agêntico -> Engines (Risk/Optimization) -> Closing (preview + PDF)
- **Jornadas Secundárias**: Gestão de Clientes (CRUD), Configurações, Inbox de notificações, Cowork (times e papéis)
- **POV Switching**: A aplicação deve suportar 3 pontos de vista (Instituição, Banker/Usuário, Cliente) com navegação adaptada
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Diagrama de user flow criado documentando a jornada principal completa (login -> closing) com todas as ramificações
- [ ] #2 Hierarquia de rotas do Next.js App Router definida e documentada (ex: /dashboard, /deals/[id], /deals/[id]/chat, /deals/[id]/engines, /settings, /clients, /inbox)
- [ ] #3 Layout base (shell) prototipado no Stitch MCP seguindo o fluxo Stitch-first (prototipar -> aprovar com PO -> codificar): sidebar fixa com navegação principal, topbar contextual com breadcrumbs e ações, área de conteúdo dinâmica
- [ ] #4 Suporte a POV switching (Instituição, Banker, Cliente) documentado no fluxo com indicação de quais rotas e componentes mudam por perspectiva
- [ ] #5 Protótipo do layout base aprovado no Stitch MCP pelo PO antes do início da codificação dos componentes
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Estudar as rotas existentes em gui/app/ e o fluxo da CLI (src/cli/) para mapeamento 1:1. 2. Desenhar user flow diagram cobrindo jornada principal e secundárias. 3. Definir hierarquia de rotas do App Router. 4. Prototipar o layout shell no Stitch MCP (sidebar + topbar + content). 5. Gerar variantes no Stitch MCP se necessário. 6. Apresentar ao PO para aprovação. 7. Implementar o layout shell e as rotas placeholder.
<!-- SECTION:PLAN:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 User flow diagram salvo em gui/docs/user-flow.md (ou como imagem em gui/docs/)
- [ ] #2 Estrutura de rotas implementada no Next.js App Router com páginas placeholder
- [ ] #3 Layout base (shell) implementado como componente após prototipação e aprovação prévia no Stitch MCP pelo PO
- [ ] #4 Documento de fluxo e protótipo no Stitch MCP revisados e aprovados pelo PO
<!-- DOD:END -->
