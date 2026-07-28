---
id: MAI-53
title: Biblioteca de Componentes Reutilizáveis (Design System Mastercard)
status: To Do
assignee: []
created_date: '2026-07-14 05:32'
updated_date: '2026-07-28 02:59'
labels:
  - GUI
  - components
  - design-system
  - stitch
  - storybook
  - revalidation
milestone: m-12
dependencies:
  - MAI-85
references:
  - gui/DESIGN.md
  - gui/DESIGN_GUIDELINES.md
priority: high
ordinal: 54000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Construir a biblioteca completa de componentes reutilizáveis da aplicação, seguindo fielmente o Design System Mastercard documentado em gui/DESIGN.md. Esta biblioteca serve como o repositório central de blocos de construção (building blocks) desacoplados e fortemente tipados que alimentam tanto as telas estáticas da aplicação (MAI-51 Dashboard, MAI-50 CRUDs, MAI-52 Chat/Engines) quanto a futura UI generativa (MAI-57 Design Generativo), garantindo coerência visual e de UX em todo o sistema. Toda a criação de componentes obedece ao fluxo Stitch-First: prototipar no Stitch MCP -> gerar variantes -> obter aprovação do PO -> implementar em React/TypeScript -> criar story + MDX no Storybook.

Componentes a implementar (em ordem de prioridade):

**Atômicos**: Button (Ink Pill, Outlined Pill, Consent Orange, Satellite CTA, Icon Circle), Badge/Tag (pill chip), Avatar (circular portrait), Icon, Divider, Spinner/Loading
**Formulários**: Input (search pill, text, select), Textarea, Checkbox, Radio, CountrySelector (footer pill), FormField (label + input + error)
**Compostos**: Card (Service Portrait, Pill Carousel, Ghost Watermark), NavigationPill (floating desktop + mobile hamburger), Sidebar (collapsible), TopBar (breadcrumbs + actions), Footer (4-column ink), Modal/Dialog, Table (sortable + paginated), Dropdown, Tabs, Accordion
**Feedback**: Toast/Notification, EmptyState, ErrorBoundary, Skeleton/Placeholder
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Todos os componentes atômicos implementados com tipagem TypeScript forte (props interface exportada)
- [ ] #2 Todos os componentes de formulário implementados com suporte a validação e estados (error, disabled, loading)
- [ ] #3 Componentes compostos (Card, Navigation, Sidebar, TopBar, Footer, Modal, Table) implementados e responsivos nos 4 breakpoints
- [ ] #4 Arquitetura dos componentes projetada para servir como blocos de construção tanto para telas estáticas (MAI-51, MAI-50, MAI-52) quanto para renderização dinâmica no motor de UI Generativa (MAI-57)
- [ ] #5 Todos os componentes prototipados no Stitch MCP e aprovados pelo PO antes da codificação (fluxo Stitch-First: prototipar no Stitch MCP -> aprovação PO -> código)
- [ ] #6 Cada componente possui: arquivo .tsx isolado, .stories.tsx funcional, .mdx documentado seguindo o template de MAI-59
- [ ] #7 Todos os componentes consomem exclusivamente design tokens (zero valores hardcoded)
- [ ] #8 Componentes de feedback (Toast, EmptyState, Skeleton) implementados para UX profissional
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Para cada grupo de componentes (atômicos -> forms -> compostos -> feedback): a) Prototipar no Stitch MCP usando o DS carregado. b) Gerar variantes no Stitch MCP (generate_variants). c) Apresentar ao PO para aprovação. d) Implementar em gui/components/{Name}/ com suporte a telas estáticas e UI Generativa (MAI-57). e) Criar story + MDX. 2. Validar no Storybook. 3. Testar responsividade nos 4 breakpoints.
<!-- SECTION:PLAN:END -->

## Comments

<!-- COMMENTS:BEGIN -->
author: @codex
created: 2026-07-22 05:29
---
## Rebaseline audit — 2026-07-22\n\nCurrent status: Storybook is healthy, but the library-level DoD is not satisfied: hardcoded visual values remain and accessibility quality is not proven without warnings. Reopen to align the reusable component contract with evidence.\n\nReason for reopening: the previous Done state does not satisfy the agreed definitive gate. Existing completion checkmarks are cleared pending fresh evidence. Before returning to Done, every applicable acceptance criterion and Definition of Done item must be verified, relevant tests must exist and pass, and mock/prototype boundaries must be explicit.
---

author: Codex
created: 2026-07-28 02:59
---
Archived as superseded on 2026-07-27 after the owner-approved MAI-85 rebaseline. Replacement work is tracked by the MAI-85.1 through MAI-85.15 dependency chain; this task's Stitch-first, legacy-GUI, or prototype-contract assumptions must not be implemented.
---
<!-- COMMENTS:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 npm run storybook renderiza todos os componentes sem erros
- [ ] #2 npm run build compila sem erros com todos os componentes
- [ ] #3 Protótipos de todos os componentes validados e aprovados no Stitch MCP pelo PO
- [ ] #4 Componentes validados como desacoplados e compatíveis com a infraestrutura de UI Generativa (MAI-57)
- [ ] #5 Cada componente tem ao menos 2 variantes demonstradas no Storybook
- [ ] #6 Zero warnings de acessibilidade (WCAG 2.1 AA) nos componentes interativos
- [ ] #7 Code review completado com foco em reutilização e consistência com Design System
<!-- DOD:END -->
