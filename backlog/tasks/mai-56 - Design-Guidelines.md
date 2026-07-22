---
id: MAI-56
title: Documentação de Design Guidelines e Padrões de Uso
status: To Do
assignee:
  - '@Luís Silva'
created_date: '2026-07-14 05:33'
updated_date: '2026-07-22 05:29'
labels:
  - GUI
  - design-system
  - documentation
  - foundation
  - revalidation
milestone: m-12
dependencies:
  - MAI-84
references:
  - gui/DESIGN.md
priority: high
ordinal: 57000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Criar a documentação prática de Design Guidelines (gui/DESIGN_GUIDELINES.md) atuando exclusivamente como o 'COMO E QUANDO' — o conjunto de regras prescritivas de aplicação e comportamento. Enquanto o Design System (MAI-55) define a especificação visual ('O QUÊ'), estas diretrizes estabelecem como compor telas, organizar layouts e aplicar os componentes de forma consistente. Deve cobrir: padrões de composição e grid, acessibilidade universal (WCAG 2.1 AA), comportamento responsivo nos 4 breakpoints, hierarquia visual de informação, Do's & Don'ts práticos, e boas práticas de montagem de telas tanto por desenvolvedores humanos quanto por engines de UI generativa (como prompts no Stitch MCP).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Arquivo gui/DESIGN_GUIDELINES.md criado com seções para: Princípios de Layout, Acessibilidade, Responsividade, Hierarquia Visual, Do's & Don'ts, e Convenções de Código
- [ ] #2 Seção de Acessibilidade cobre: contraste mínimo (WCAG 2.1 AA), tamanhos de touch target (≥44px), foco visível, labels em formulários e alt text
- [ ] #3 Seção de Responsividade documenta o comportamento de cada componente principal nos 4 breakpoints (mobile, tablet, desktop, wide)
- [ ] #4 Do's & Don'ts incluem pelo menos 10 regras extraídas do DESIGN.md seção 7
- [ ] #5 Convenções de nomenclatura para arquivos, componentes e props documentadas
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Revisar gui/DESIGN.md e extrair princípios práticos para estruturar o gui/DESIGN_GUIDELINES.md focando no 'COMO E QUANDO'. 2. Compilar especificações de acessibilidade (WCAG 2.1 AA), tamanhos de alvos de toque (>=44px), contraste e leitor de tela. 3. Formular regras de layout responsivo e adaptação para mobile, tablet, desktop e wide. 4. Redigir lista exaustiva de Do's & Don'ts com exemplos claros de certo/errado. 5. Definir boas práticas de montagem de telas para devs e para engenharia de prompt em UI generativa. 6. Validar alinhamento com o PO.
<!-- SECTION:PLAN:END -->

## Comments

<!-- COMMENTS:BEGIN -->
author: @codex
created: 2026-07-22 05:29
---
## Rebaseline audit — 2026-07-22\n\nCurrent status: The guideline document exists but belongs to a divergent, non-canonical documentation set and no longer reliably describes runtime tokens/components. Reopen under the documentation consolidation initiative.\n\nReason for reopening: the previous Done state does not satisfy the agreed definitive gate. Existing completion checkmarks are cleared pending fresh evidence. Before returning to Done, every applicable acceptance criterion and Definition of Done item must be verified, relevant tests must exist and pass, and mock/prototype boundaries must be explicit.
---
<!-- COMMENTS:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Documento revisado pelo PO para clareza e completude
- [ ] #2 Linkado como referência no README do gui/
- [ ] #3 Consistente com os tokens definidos em MAI-58
- [ ] #4 Sem contradições com gui/DESIGN.md
<!-- DOD:END -->
