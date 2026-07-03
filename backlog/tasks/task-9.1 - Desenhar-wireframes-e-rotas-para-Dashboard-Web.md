---
id: TASK-9.1
title: Desenhar wireframes e rotas para Dashboard Web
status: To Do
assignee:
  - Luís Silva
created_date: '2026-07-08 02:25'
updated_date: '2026-07-08 02:32'
labels:
  - interface
  - gui
  - poc
milestone: m-7
dependencies: []
parent_task_id: TASK-6
priority: medium
ordinal: 19000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Definir a arquitetura de páginas, navegação e protótipo visual (wireframes) para a interface gráfica Web (GUI) do M&A Middleware, mapeando as rotas de front-end (Next.js/HonoX) e de API (Hono Backend). A interface deve cobrir o monitoramento do pipeline de transações (lifecycle), a execução de motores preditivos e de otimização, e o chat conversacional RAG com o Broker Orchestrator.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Projetar a estrutura de navegação e wireframes textuais/Mermaid das 5 telas principais (Dashboard, Detalhes do Deal, Motores Computacionais, Chat RAG, Configurações).
- [ ] #2 Mapear as rotas de front-end dinâmicas com parâmetros de deal (ex: /deals/[id]/dd).
- [ ] #3 Definir as rotas de API HTTP necessárias para suportar a reatividade da interface (operações de lifecycle, RAG e execução de motores).
- [ ] #4 Alinhar o fluxo de dados da interface com o esquema de banco de dados schema.sql (transaction, phase_history, user_preferences, etc.).
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Levantar requisitos funcionais a partir da CLI interativa (CNPJ check, ONNX predição, MILP otimização, genética de term sheets, LaTeX/PDF) e do schema.sql.
2. Definir o sitemap e a hierarquia de páginas (rotas front-end).
3. Elaborar os wireframes em formato textual estruturado e diagramas Mermaid.
4. Mapear os contratos de API REST (endpoints, payloads, e status de retorno).
5. Compilar as especificações em backlog/docs/gui-wireframes-routes.md.
<!-- SECTION:PLAN:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Documento contendo wireframes e rotas salvo em backlog/docs/gui-wireframes-routes.md.
- [ ] #2 Validação de conformidade das rotas de API com o ciclo de vida de transações MADealLifecycle.
- [ ] #3 Especificação de payloads JSON e validações Zod documentadas para todos os endpoints mapeados.
- [ ] #4 Documento revisado e aprovado para servir de guia na implementação do boilerplate (TASK-9.2).
<!-- DOD:END -->
