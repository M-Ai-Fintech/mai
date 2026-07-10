---
id: MAI-24
title: Desenhar wireframes e rotas para Dashboard Web
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
priority: medium
ordinal: 19000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Definir a arquitetura de páginas, navegação e protótipo visual (wireframes) para a interface gráfica Web (GUI) do M&A Middleware, mapeando as rotas de front-end (Next.js/HonoX) e de API (Hono Backend). A interface deve cobrir o monitoramento do pipeline de transações (lifecycle), a execução de motores preditivos e de otimização, e o chat conversacional RAG com o Broker Orchestrator.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Projetar a estrutura de navegação e wireframes textuais/Mermaid das 5 telas principais (Dashboard, Detalhes do Deal, Motores Computacionais, Chat RAG, Configurações).
- [x] #2 Mapear as rotas de front-end dinâmicas com parâmetros de deal (ex: /deals/[id]/dd).
- [x] #3 Definir as rotas de API HTTP necessárias para suportar a reatividade da interface (operações de lifecycle, RAG e execução de motores).
- [x] #4 Alinhar o fluxo de dados da interface com o esquema de banco de dados schema.sql (transaction, phase_history, user_preferences, etc.).
- [x] #5 Documentar sitemap, mock de API payloads e wireframes via Mermaid
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Ler requisitos funcionais a partir da CLI interativa (CNPJ check, ONNX predição, MILP otimização, genética de term sheets, LaTeX/PDF) e do schema.sql.
2. Definir o sitemap e a hierarquia de páginas (rotas front-end).
3. Elaborar os wireframes em formato textual estruturado e diagramas Mermaid.
4. Mapear os contratos de API REST (endpoints, payloads, e status de retorno).
5. Compilar as especificações em backlog/docs/gui-wireframes-routes.md.
6. [MVP_4 Orchestrator Note] Realizar como Fase 1 (Síncrona) antes de MAI-25.
<!-- SECTION:PLAN:END -->

## Comments

<!-- COMMENTS:BEGIN -->
author: Auditoria Técnica
created: 2026-07-10 06:04
---
[REVISÃO CRÍTICA] 1. Conformidade Geral: A tarefa foi devidamente executada, mapeando rotas e payloads JSON Zod e salvando as especificações em backlog/docs/gui-wireframes-routes.md. Nenhuma inconsistência encontrada.
---
<!-- COMMENTS:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 Documento contendo wireframes e rotas salvo em backlog/docs/gui-wireframes-routes.md.
- [x] #2 Validação de conformidade das rotas de API com o ciclo de vida de transações MADealLifecycle.
- [x] #3 Especificação de payloads JSON e validações Zod documentadas para todos os endpoints mapeados.
- [x] #4 Documento revisado e aprovado para servir de guia na implementação do boilerplate (MAI-25).
- [x] #5 Arquivo backlog/docs/gui-wireframes-routes.md criado e populado adequadamente
<!-- DOD:END -->
