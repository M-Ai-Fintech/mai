---
id: MAI-25
title: Criar boilerplate de GUI pareada com a CLI (Next.js/HonoX)
status: To Do
assignee:
  - Luís Silva
created_date: '2026-07-08 02:25'
updated_date: '2026-07-28 02:59'
labels:
  - interface
  - gui
  - poc
  - revalidation
milestone: m-12
dependencies: []
parent_task_id: MAI-17
priority: low
ordinal: 20000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Estabelecer o boilerplate inicial da interface gráfica (Web Dashboard) pareada 1:1 com as funcionalidades expostas pela CLI do M&A Low-Touch Middleware. O boilerplate deve fornecer a estrutura base para rodar o frontend utilizando Next.js ou HonoX (otimizando a integração nativa com o Deno runtime), adotando um design premium escuro (paleta escura com acentos cyan/teal) e CSS modular/Tailwind. Deve cobrir as interfaces de KYB, análise de risco preditiva, otimização de portfólio (MILP), otimização de Term Sheet (genético), compilação de documentos e chat com o Broker Agent (incluindo painel de aprendizado contínuo).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Setup do Boilerplate: Estrutura executável configurada com TypeScript, Tailwind CSS e roteamento funcional (Next.js ou HonoX no Deno).
- [ ] #2 Fidelidade de Interface com a CLI: Telas e fluxos de navegação desenhados para as 6 funções da CLI (KYB, Risco/ONNX, MILP, Otimização Contratual, PDF/LaTeX, Chat Broker).
- [ ] #3 Mock APIs / Server Handlers: Endpoints prontos no boilerplate para retornar dados simulados idênticos aos retornos de console da CLI.
- [ ] #4 Responsividade e Estilo Premium: Design escuro consistente com a estética do middleware, utilizando CSS modular para isolamento.
- [ ] #5 Compatibilidade de Tipagem: Importação direta ou mapeamento claro dos tipos compartilhados da Core (ex: CompanyFinancialProfile, TargetRawInput) para o frontend.
- [ ] #6 Next.js + Tailwind configurado, rotas básicas para as 6 funções CLI
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Setup e Estrutura: Criar diretório gui/ no workspace e inicializar projeto Next.js.
2. Configuração de Estilos: Integrar Tailwind CSS e variáveis globais para a paleta Dark/Teal premium.
3. Desenvolver Layout & Sidebar: Criar o layout mestre responsivo com a navegação lateral para os 6 submódulos da CLI.
4. Scaffolding de Telas: Criar views vazias baseadas no sitemap de MAI-24.
5. Mock de Endpoints: Configurar rotas de API para simular o comportamento dos motores computacionais.
6. [MVP_4 Orchestrator Note] Realizar como Fase 2 (Síncrona) DEPOIS de MAI-24.
<!-- SECTION:PLAN:END -->

## Comments

<!-- COMMENTS:BEGIN -->
author: Technical Audit
created: 2026-07-10 06:04
---
[CRITICAL REVIEW] False compliance: AC #5, “Type Compatibility,” was marked complete, but the GUI README documents that direct TypeScript type sharing with Core (Deno) was not implemented; only mocks based on the agreed structure were used.
---

author: @codex
created: 2026-07-22 05:28
---
## Rebaseline audit — 2026-07-22\n\nCurrent status: The Next.js boilerplate builds, but the claimed paired GUI/CLI contract and shared Core types are not established. Reopen or explicitly narrow the scope to a shell-only prototype with corresponding tests.\n\nReason for reopening: the previous Done state does not satisfy the agreed definitive gate. Existing completion checkmarks are cleared pending fresh evidence. Before returning to Done, every applicable acceptance criterion and Definition of Done item must be verified, relevant tests must exist and pass, and mock/prototype boundaries must be explicit.
---

author: Codex
created: 2026-07-28 02:59
---
Archived as superseded on 2026-07-27 after the owner-approved MAI-85 rebaseline. Replacement work is tracked by the MAI-85.1 through MAI-85.15 dependency chain; this task's Stitch-first, legacy-GUI, or prototype-contract assumptions must not be implemented.
---
<!-- COMMENTS:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Boilerplate de frontend inicializa e compila sem erros com 'deno task' ou comando correspondente.
- [ ] #2 Rotas e navegação lateral funcionam perfeitamente no navegador.
- [ ] #3 Formulários e chat simulam interações e exibem logs de console fictícios equivalentes à CLI.
- [ ] #4 Documentação (README) no subdiretório da GUI explicando instalação, inicialização e compartilhamento de tipos.
- [ ] #5 Boilerplate compila sem erros com npm run dev no diretório gui
<!-- DOD:END -->
