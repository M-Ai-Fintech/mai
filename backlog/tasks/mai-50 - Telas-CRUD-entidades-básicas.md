---
id: MAI-50
title: 'Telas de CRUD: Gestão de Clientes, Deals e Time'
status: Done
assignee:
  - Luís Silva
created_date: '2026-07-14 05:21'
updated_date: '2026-07-14 16:11'
labels:
  - GUI
  - crud
  - forms
  - data-management
milestone: m-6
dependencies:
  - MAI-53
  - MAI-49
references:
  - gui/DESIGN.md
priority: medium
ordinal: 51000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Implementar as telas de formulário e tabelas de gestão (CRUD - Create, Read, Update, Delete) para as entidades core do sistema: Clientes (Compradores/Vendedores), Deals (Oportunidades de M&A) e Time (Membros e Papéis). Todas as telas devem ser construídas reutilizando obrigatoriamente os componentes da biblioteca MAI-53 (Table, Modal, Input, FormField, Button, Toasts, Skeletons) e seguir o fluxo Stitch-First (prototipar no Stitch MCP -> aprovar com PO -> codificar). Estas telas permitem a entrada manual e edição de dados que não foram ingeridos automaticamente via VDR ou integração.

Cada formulário deve incluir validação client-side rica (Zod/React Hook Form) e lidar adequadamente com estados de loading e erro ao comunicar com a API. As listagens devem suportar paginação e busca.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Telas de CRUD prototipadas no Stitch MCP e aprovadas pelo PO antes de qualquer codificação (fluxo Stitch-First: prototipar no Stitch MCP -> aprovação PO -> código)
- [x] #2 Telas construídas inteiramente a partir dos componentes reutilizáveis da MAI-53 (Table, FormField, Input, Button, Modal, Skeleton)
- [x] #3 Tela de Gestão de Clientes: listagem (tabela paginada), formulário de criação/edição (dados cadastrais, tipo buyer/seller, setor)
- [x] #4 Tela de Gestão de Deals: listagem, formulário de criação/edição (título, valuation range, fase atual, cliente associado)
- [x] #5 Tela de Gestão de Time: listagem de membros, formulário para adicionar/editar permissões (RBAC) e papéis nos deals
- [x] #6 Validação client-side implementada para todos os formulários (campos obrigatórios, formatos de email/moeda)
- [x] #7 Feedback visual de sucesso/erro (toasts da MAI-53) em todas as operações de mutação
- [x] #8 Skeleton loaders da MAI-53 implementados para as listagens durante o fetch inicial
<!-- AC:END -->



## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Prototipar layouts de CRUD no Stitch MCP (Listagem Table view, Formulário Modal/Page view). 2. Apresentar ao PO para aprovação. 3. Configurar Zod schemas para validação. 4. Implementar telas de Cliente (List + Form) com componentes da MAI-53. 5. Implementar telas de Deal (List + Form) com componentes da MAI-53. 6. Implementar telas de Time (List + Form) com componentes da MAI-53. 7. Integrar chamadas API via ApiClient.
<!-- SECTION:PLAN:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 Protótipos das telas de CRUD aprovados no Stitch MCP pelo PO
- [x] #2 Operações de CRUD testadas e compostas utilizando componentes da biblioteca MAI-53 integrando com endpoints da API
- [x] #3 Componentes de form complexos documentados no Storybook
- [x] #4 Telas responsivas (tabelas com scroll horizontal em mobile, forms colapsam para 1 coluna)
<!-- DOD:END -->
