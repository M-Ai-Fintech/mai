---
id: MAI-26
title: Integrar cliente HTTP para comunicação GUI-Core
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
ordinal: 21000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Implementar a camada de cliente HTTP (SDK/API Client) na interface gráfica (Dashboard Web em Next.js/HonoX) para realizar a comunicação segura, robusta e reativa com o servidor backend da Core API (Deno). O cliente HTTP deve encapsular todas as chamadas para os motores computacionais (KYB, Prediction ONNX, MILP Optimization, Term Sheet Genetic Optimizer, Document Generator e Chat/RAG) expostos pelo Core backend, garantindo tipagem estrita com TypeScript, tratamento unificado de erros, gerenciamento de estado reativo na UI e suporte a streaming/polling para processos assíncronos de longa duração.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Configurar baseURL dinâmica do cliente HTTP com variáveis de ambiente do frontend (ex: NEXT_PUBLIC_CORE_API_URL).
- [ ] #2 Implementar tipagem estrita (TypeScript/Zod) para entradas/saídas de todos os endpoints dos motores computacionais (KYB, Predict, Portfolio, TermSheet, Document e Chat).
- [ ] #3 Implementar interceptores de erro com lógica de retry exponencial e timeout limite de 10s, reportando erros amigáveis ao usuário.
- [ ] #4 Estabelecer conexões resilientes para chat em tempo real via streaming (Server-Sent Events) ou polling para respostas longas de agentes.
- [ ] #5 Configurar cabeçalhos CORS no servidor Deno backend para aceitar requisições de origem da GUI local de desenvolvimento.
- [ ] #6 CORS no Deno, API Client no frontend, Error Interceptors com retry de 10s
- [ ] #7 Browser API calls use relative /api URLs and the Next.js server-only rewrite is the single transport boundary
- [ ] #8 An end-to-end test proves Browser -> Next.js proxy -> Deno Core for chat and at least one non-chat operation
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Habilitar CORS no Deno Core backend e mapear variáveis de ambiente.
2. Criar o cliente HTTP base no frontend (gui/lib/api-client.ts) configurando timeouts e interceptores.
3. Mapear contratos de tipos (Zod) e implementar métodos para as APIs dos 6 motores M&A.
4. [MVP_4 Orchestrator Note] Realizar como Fase 3 (Síncrona) DEPOIS de MAI-25.
<!-- SECTION:PLAN:END -->

## Comments

<!-- COMMENTS:BEGIN -->
author: Technical Audit
created: 2026-07-10 06:04
---
[CRITICAL REVIEW] Incomplete integration: The HTTP client in `gui/lib/api-client.ts` exists, but the GUI chat and engine screens do not use it and remain purely visual, static elements with no real communication with the Core API.
---

author: @codex
created: 2026-07-22 05:28
---
## Rebaseline audit — 2026-07-22\n\nCurrent status: The browser client constructs absolute http://localhost:8000 URLs, bypassing the documented Next.js proxy and server-only MAI_API_BASE_URL. Reopen to use relative /api routes and prove Browser -> Next -> Core transport.\n\nReason for reopening: the previous Done state does not satisfy the agreed definitive gate. Existing completion checkmarks are cleared pending fresh evidence. Before returning to Done, every applicable acceptance criterion and Definition of Done item must be verified, relevant tests must exist and pass, and mock/prototype boundaries must be explicit.
---

author: @codex
created: 2026-07-22 05:31
---
## Gemini incident ownership\n\nNo separate bug task was created. This task owns the frontend transport root cause: absolute browser URLs bypass the Next.js rewrite and server-only MAI_API_BASE_URL. MAI-4 owns the independent Mastra/AI SDK provider incompatibility. Both must pass end-to-end verification before MAI-52 can complete.
---

author: Codex
created: 2026-07-28 02:59
---
Archived as superseded on 2026-07-27 after the owner-approved MAI-85 rebaseline. Replacement work is tracked by the MAI-85.1 through MAI-85.15 dependency chain; this task's Stitch-first, legacy-GUI, or prototype-contract assumptions must not be implemented.
---
<!-- COMMENTS:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Cliente HTTP implementado em modulo centralizado do frontend (ex: src/gui/lib/api-client.ts) e coberto por testes unitários.
- [ ] #2 Rotas do Deno backend com suporte a CORS validadas e testadas localmente.
- [ ] #3 Higienização de logs de erros do cliente frontend implementada para mascarar paths internos e credenciais.
- [ ] #4 Deno lint e npm run lint (ou equivalentes de linter) executados sem warnings ou erros.
- [ ] #5 Documentação de configuração de variáveis de ambiente do cliente adicionada ao README.md ou .env.example.
- [ ] #6 api-client.ts criado, Deno Core backend permitindo origem localhost
<!-- DOD:END -->
