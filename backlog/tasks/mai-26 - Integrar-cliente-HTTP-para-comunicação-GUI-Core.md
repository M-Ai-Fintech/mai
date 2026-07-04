---
id: MAI-26
title: Integrar cliente HTTP para comunicação GUI-Core
status: To Do
assignee:
  - Luís Silva
created_date: '2026-07-08 02:25'
updated_date: '2026-07-09 04:41'
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
- [ ] #1 Configurar baseURL dinâmica do cliente HTTP com variáveis de ambiente do frontend (ex: NEXT_PUBLIC_CORE_API_URL).
- [ ] #2 Implementar tipagem estrita (TypeScript/Zod) para entradas/saídas de todos os endpoints dos motores computacionais (KYB, Predict, Portfolio, TermSheet, Document e Chat).
- [ ] #3 Implementar interceptores de erro com lógica de retry exponencial e timeout limite de 10s, reportando erros amigáveis ao usuário.
- [ ] #4 Estabelecer conexões resilientes para chat em tempo real via streaming (Server-Sent Events) ou polling para respostas longas de agentes.
- [ ] #5 Configurar cabeçalhos CORS no servidor Deno backend para aceitar requisições de origem da GUI local de desenvolvimento.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
Etapa 1: Habilitar CORS no Deno Core backend e mapear variáveis de ambiente.
Etapa 2: Criar o cliente HTTP base no frontend configurando timeouts, interceptores de erros e tratamento de requisições.
Etapa 3: Mapear contratos de tipos (TypeScript/Zod) e implementar métodos para as APIs dos 6 motores M&A.
Etapa 4: Desenvolver Hooks reativos (ex: React Query/SWR ou hooks customizados) para controle de loading, erro e resposta na UI.
Etapa 5: Escrever testes unitários e de integração simulando cenários online/offline da API usando MSW ou fetch-mock.
<!-- SECTION:PLAN:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Cliente HTTP implementado em modulo centralizado do frontend (ex: src/gui/lib/api-client.ts) e coberto por testes unitários.
- [ ] #2 Rotas do Deno backend com suporte a CORS validadas e testadas localmente.
- [ ] #3 Higienização de logs de erros do cliente frontend implementada para mascarar paths internos e credenciais.
- [ ] #4 Deno lint e npm run lint (ou equivalentes de linter) executados sem warnings ou erros.
- [ ] #5 Documentação de configuração de variáveis de ambiente do cliente adicionada ao README.md ou .env.example.
<!-- DOD:END -->
