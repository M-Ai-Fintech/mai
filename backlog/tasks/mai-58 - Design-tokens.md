---
id: MAI-58
title: Extração e Codificação de Design Tokens (CSS + Tailwind)
status: To Do
assignee:
  - '@Luís Silva'
created_date: '2026-07-14 05:34'
updated_date: '2026-07-14 15:34'
labels:
  - GUI
  - design-system
  - tokens
  - foundation
milestone: m-6
dependencies:
  - MAI-55
references:
  - gui/DESIGN.md
  - gui/app/globals.css
priority: high
ordinal: 59000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Extrair as especificações formais do Design System (MAI-55 - 'O QUÊ') e codificá-las em design tokens executáveis consumíveis via Tailwind CSS v4 e CSS Custom Properties. Os tokens cobrem: paleta de cores com roles semânticos (--color-surface-primary, --color-accent-signal), escala tipográfica, grade de espaçamento 8px, radii e sombras. Os tokens funcionam como a ponte programática entre a fonte de verdade visual e o código final.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Arquivo gui/tokens/design-tokens.css criado com CSS custom properties para todas as categorias (cores, tipografia, espaçamento, radius, sombras)
- [ ] #2 Configuração do Tailwind CSS v4 estendida com os tokens customizados (theme extend ou @theme em CSS)
- [ ] #3 Escala de espaçamento baseada em 8px (8/16/24/32/48/64/96/128) disponível como classes utilitárias
- [ ] #4 Tokens de cor incluem roles semânticos (--color-surface-primary, --color-text-primary, --color-accent-signal, etc.)
- [ ] #5 Tokens de tipografia respeitam os 5 níveis da hierarquia do DESIGN.md (H1 64px a Eyebrow 14px)
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Auditar gui/DESIGN.md e extrair todos os valores numéricos/hex. 2. Criar gui/tokens/design-tokens.css com custom properties organizadas por categoria. 3. Estender a configuração do Tailwind v4 para consumir os tokens. 4. Atualizar gui/app/globals.css para importar os tokens. 5. Criar um componente de teste simples para validar que os tokens estão funcionando. 6. Documentar o uso dos tokens.
<!-- SECTION:PLAN:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Zero valores hardcoded de cor, tamanho ou espaçamento nos componentes — todos devem consumir tokens
- [ ] #2 globals.css atualizado para importar os tokens
- [ ] #3 Tailwind config estendida e validada com npm run build sem erros
- [ ] #4 Documentação dos tokens disponível (pode ser inline no próprio arquivo CSS ou em um MDX separado)
<!-- DOD:END -->
