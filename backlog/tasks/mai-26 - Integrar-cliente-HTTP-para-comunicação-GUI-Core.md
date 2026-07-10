---
id: MAI-26
title: Integrar cliente HTTP para comunicação GUI-Core
status: Done
assignee:
  - Luís Silva
created_date: '2026-07-08 02:25'
updated_date: '2026-07-10 06:04'
labels:
  - interface
  - gui
  - poc
milestone: m-4
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
- [x] #1 Configurar baseURL dinâmica do cliente HTTP com variáveis de ambiente do frontend (ex: NEXT_PUBLIC_CORE_API_URL).
- [x] #2 Implementar tipagem estrita (TypeScript/Zod) para entradas/saídas de todos os endpoints dos motores computacionais (KYB, Predict, Portfolio, TermSheet, Document e Chat).
- [x] #3 Implementar interceptores de erro com lógica de retry exponencial e timeout limite de 10s, reportando erros amigáveis ao usuário.
- [x] #4 Estabelecer conexões resilientes para chat em tempo real via streaming (Server-Sent Events) ou polling para respostas longas de agentes.
- [x] #5 Configurar cabeçalhos CORS no servidor Deno backend para aceitar requisições de origem da GUI local de desenvolvimento.
- [x] #6 CORS no Deno, API Client no frontend, Error Interceptors com retry de 10s
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
author: Auditoria Técnica
created: 2026-07-10 06:04
---
[REVISÃO CRÍTICA] 1. Integração Incompleta: O cliente HTTP gui/lib/api-client.ts foi criado, mas as telas de chat e engines da GUI não o utilizam, permanecendo como elementos puramente visuais e estáticos sem comunicação real com a Core API.
---
<!-- COMMENTS:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 Cliente HTTP implementado em modulo centralizado do frontend (ex: src/gui/lib/api-client.ts) e coberto por testes unitários.
- [x] #2 Rotas do Deno backend com suporte a CORS validadas e testadas localmente.
- [x] #3 Higienização de logs de erros do cliente frontend implementada para mascarar paths internos e credenciais.
- [x] #4 Deno lint e npm run lint (ou equivalentes de linter) executados sem warnings ou erros.
- [x] #5 Documentação de configuração de variáveis de ambiente do cliente adicionada ao README.md ou .env.example.
- [x] #6 api-client.ts criado, Deno Core backend permitindo origem localhost
<!-- DOD:END -->
