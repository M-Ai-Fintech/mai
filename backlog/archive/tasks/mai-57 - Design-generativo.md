---
id: MAI-57
title: 'Design Generativo: Síntese de UI em Runtime (Generative UI) para Usuário Final'
status: To Do
assignee:
  - '@Luís Silva'
created_date: '2026-07-14 05:34'
updated_date: '2026-07-28 03:00'
labels:
  - GUI
  - design-generative
  - stitch
  - innovation
  - revalidation
milestone: m-12
dependencies: []
references:
  - gui/DESIGN.md
  - gui/DESIGN_GUIDELINES.md
priority: medium
ordinal: 58000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Implementar a arquitetura de Generative UI (Design Generativo) que permite aos agentes de IA sintetizarem interfaces de usuário dinâmicas em tempo de execução (runtime UI synthesis) através de um esquema JSON estruturado (JSON DSL / Component Schema).

O usuário final (Banker/Advisor) pode solicitar, via prompt de texto ou chat agêntico (MAI-52), a criação de novas visualizações, dashboards analíticos, relatórios de due diligence ou calculadoras financeiras.

**Fluxo Técnico de UI Generativa**:
1. **Agente/LLM**: Recebe a solicitação do usuário e gera um JSON DSL / Component Schema especificando componentes, props, hierarquia e dados.
2. **Motor Frontend (Generative UI Engine)**: Interpreta o JSON DSL em runtime e compõe a interface utilizando exclusivamente os componentes reais da biblioteca codificada no Design System (MAI-53).
3. **Design Guidelines Compliance**: O motor valida e aplica as diretrizes de composição, espaçamento, contraste e acessibilidade definidas nas Design Guidelines (MAI-56).
4. **Interação & Customização**: O usuário pode interagir com os controles da tela gerada, ajustar parâmetros, salvar a visualização em seu perfil e reutilizá-la.
5. **Ancoragem no Dashboard**: As telas ou componentes sintetizados podem ser ancorados diretamente como widgets no Dashboard Dinâmico (MAI-60).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Interface para o usuário solicitar a geração de uma nova view/tela via input de texto
- [ ] #2 Motor de renderização dinâmica capaz de interpretar um JSON/Schema retornado pelos agentes e transformá-lo em uma tela usando os componentes React do sistema
- [ ] #3 As views geradas respeitam estritamente as regras de layout e tokens do Design System
- [ ] #4 Mecanismo para salvar/persistir a tela gerada na conta do usuário para uso contínuo
- [ ] #5 Integração funcional com o Dashboard Dinâmico (MAI-60) para injetar componentes gerados como widgets
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Definir a especificação formal do JSON DSL / Component Schema (mapeando tipos de componentes de MAI-53, props, layout grids, data binding e ações).
2. Desenvolver o Generative UI Engine em React (Factory/Parser) que mapeia a DSL para componentes reais exportados em MAI-53, aplicando os tokens e regras visuais do MAI-56.
3. Integrar o endpoint/ferramenta agêntica no Chat Agêntico (MAI-52) para que os agentes (ex: BrokerOrchestratorAgent ou FinancialRiskAgent) emitam a JSON DSL como payload de resposta agêntica.
4. Criar estado e controles de personalização da UI sintetizada no cliente (visualizar, editar, salvar e nomear view).
5. Desenvolver a camada de persistência para armazenar schemas de UI customizadas associadas à conta do usuário (API + banco de dados).
6. Implementar a ponte de comunicação/exportação com MAI-60 para converter a UI sintetizada em um widget ancorável no Dashboard Dinâmico.
<!-- SECTION:PLAN:END -->

## Comments

<!-- COMMENTS:BEGIN -->
author: @codex
created: 2026-07-22 05:29
---
## Rebaseline audit — 2026-07-22\n\nCurrent status: Generative UI is a hardcoded local preset with setTimeout-based simulation and no agent/API execution. Reopen until the task is explicitly a visual prototype or implements runtime synthesis.\n\nReason for reopening: the previous Done state does not satisfy the agreed definitive gate. Existing completion checkmarks are cleared pending fresh evidence. Before returning to Done, every applicable acceptance criterion and Definition of Done item must be verified, relevant tests must exist and pass, and mock/prototype boundaries must be explicit.
---

author: Codex
created: 2026-07-28 02:59
---
Archived as superseded on 2026-07-27 after the owner-approved MAI-85 rebaseline. Replacement work is tracked by the MAI-85.1 through MAI-85.15 dependency chain; this task's Stitch-first, legacy-GUI, or prototype-contract assumptions must not be implemented.
---
<!-- COMMENTS:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Feature testada com geração de pelo menos 3 tipos de layouts dinâmicos diferentes
- [ ] #2 A tela gerada responde adequadamente aos breakpoints responsivos
- [ ] #3 Persistência em banco de dados ou localStorage validada
- [ ] #4 Código da factory de componentes (Component Generator) documentado
<!-- DOD:END -->
