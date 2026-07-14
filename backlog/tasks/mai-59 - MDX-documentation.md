---
id: MAI-59
title: Template e Padrão de Documentação MDX para Componentes
status: To Do
assignee:
  - '@Luís Silva'
created_date: '2026-07-14 05:34'
updated_date: '2026-07-14 15:34'
labels:
  - GUI
  - documentation
  - storybook
  - mdx
milestone: m-6
dependencies:
  - MAI-54
references:
  - gui/DESIGN.md
  - gui/DESIGN_GUIDELINES.md
priority: high
ordinal: 60000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Definir e implementar o template padrão de documentação MDX para componentes no Storybook. Cada documento MDX servirá como ponto de convergência, referenciando explicitamente as especificações formais do Design System (MAI-55 - 'O QUÊ'), as regras prescritivas de aplicação do Design Guidelines (MAI-56 - 'COMO E QUANDO'), a tabela de Props (auto-gerada via ArgsTable) e requisitos de Acessibilidade (WCAG 2.1 AA).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Template MDX padrão criado em gui/components/_template/ComponentTemplate.mdx com todas as seções obrigatórias
- [ ] #2 Seções obrigatórias definidas: Overview, Props API (auto-generated), Variants, Usage Guidelines, Accessibility, Design System Reference
- [ ] #3 Auto-geração da tabela de props funcionando via @storybook/addon-docs (ArgsTable)
- [ ] #4 Pelo menos 2 componentes existentes documentados seguindo o template (ex: Button e um segundo)
- [ ] #5 Checklist de documentação MDX adicionada como item padrão na DoD de todo componente futuro
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Estudar addon-docs do Storybook 9 para entender auto-geração de props. 2. Criar template MDX em gui/components/_template/. 3. Documentar as seções obrigatórias e opcionais. 4. Aplicar o template no componente Button existente (MAI-54). 5. Criar um segundo componente simples (ex: Badge) e documentá-lo com o template para validação.
<!-- SECTION:PLAN:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Template validado por renderização no Storybook sem erros
- [ ] #2 Guia de contribuição atualizado explicando como usar o template MDX
- [ ] #3 Consistência entre o template MDX e os Design Guidelines (MAI-56)
<!-- DOD:END -->
