---
id: MAI-54
title: Setup e Configuração do Storybook com Suporte a Next.js e Tailwind
status: Done
assignee:
  - '@Luís Silva'
created_date: '2026-07-14 05:32'
updated_date: '2026-07-28 03:00'
labels:
  - GUI
  - storybook
  - infrastructure
  - documentation
  - revalidated
milestone: m-12
dependencies: []
references:
  - gui/DESIGN.md
  - gui/package.json
priority: high
ordinal: 55000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Instalar e configurar o Storybook 9+ no diretório gui/ com suporte a Next.js 16 (App Router), React 19, TypeScript e Tailwind CSS v4 (integração dos tokens de MAI-58). O Storybook atuará como o ambiente de desenvolvimento isolado para visualização dos componentes do Design System (MAI-55 - 'O QUÊ') sob as diretrizes do Design Guidelines (MAI-56 - 'COMO E QUANDO').
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Storybook 9+ instalado e rodando via npm run storybook sem erros no diretório gui/
- [x] #2 Configuração compatível com Next.js 16 App Router, React 19 e Tailwind CSS v4
- [x] #3 Addon @storybook/addon-docs configurado com suporte a MDX para documentação inline
- [x] #4 Design tokens de MAI-58 carregados corretamente no ambiente do Storybook (cores e tipografia visíveis)
- [x] #5 Pelo menos um componente de exemplo (Button) criado com story e MDX funcional para validar o setup
- [x] #6 Script npm run storybook adicionado ao package.json do gui/
- [x] #7 Estrutura de pastas definida e documentada: gui/components/{Name}/{Name}.tsx + .stories.tsx + .mdx
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Instalar Storybook 9 via npx storybook@latest init no gui/. 2. Configurar .storybook/main.ts para Next.js + Tailwind. 3. Importar design tokens no .storybook/preview.ts. 4. Instalar e configurar addon-docs para MDX. 5. Criar gui/components/Button/Button.tsx + Button.stories.tsx + Button.mdx como exemplo. 6. Adicionar script no package.json. 7. Testar build do Storybook (npm run build-storybook).
<!-- SECTION:PLAN:END -->

## Comments

<!-- COMMENTS:BEGIN -->
author: @codex
created: 2026-07-22 05:30
---
## Done revalidation — 2026-07-22\n\nDone is preserved. Storybook 10 is configured successfully; 24 MDX documentation files validate, 89/89 Storybook interaction tests pass, and the static Storybook build completes. This verifies Storybook infrastructure, not the completeness of every higher-level GUI capability.
---

author: Codex
created: 2026-07-28 02:58
---
Retained as completed Storybook infrastructure evidence. Under the 2026-07-27 MAI-85 rebaseline, this task is not design authority; any reuse is subject to the approved Figma system and MAI-85.9 conformance requirements.
---
<!-- COMMENTS:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 npm run storybook inicia sem erros e renderiza o componente Button de exemplo
- [x] #2 MDX documentation renderiza corretamente com props table, código de exemplo e texto descritivo
- [x] #3 Hot-reload funcional — mudanças no componente refletem instantaneamente no Storybook
- [x] #4 .storybook/ configurado e commitado no repositório
- [x] #5 README do gui/ atualizado com instruções de como rodar o Storybook
<!-- DOD:END -->
