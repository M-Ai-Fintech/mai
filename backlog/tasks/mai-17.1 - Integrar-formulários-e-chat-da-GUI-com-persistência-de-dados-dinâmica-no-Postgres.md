---
id: MAI-17.1
title: >-
  Integrar formulários e chat da GUI com persistência de dados dinâmica no
  Postgres
status: To Do
assignee: []
created_date: '2026-07-10 05:31'
labels: []
milestone: m-5
dependencies: []
parent_task_id: MAI-17
priority: medium
ordinal: 48000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Estabelecer a conexão real e dinâmica entre a interface Next.js e o banco de dados PostgreSQL local por meio do Deno Core API. Esta tarefa envolve mapear e integrar os formulários de entrada dos 6 módulos (KYB, Risco/ONNX, MILP, Algoritmo Genético, PDF Compilação e Chat RAG) para que persistam transações e dados no banco de dados e mostrem históricos de fase reais provenientes das tabelas 'transaction', 'phase_history' e 'user_preferences'.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Inputs de formulários do front-end são salvos no banco Postgres de forma persistente.
- [ ] #2 Histórico de fases e valuations anteriores de cada deal são carregados dinamicamente na UI.
- [ ] #3 O Chat RAG exibe histórico real recuperado da tabela de memórias/conversas.
- [ ] #4 Respostas dos solvers (ONNX, MILP, Genético) são registradas no banco vinculadas ao ID do deal.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Mapear os hooks do Next.js para as rotas da Core API desenvolvidas na MAI-26.
2. Atualizar as rotas do backend Deno para ler/escrever no Postgres as alterações vindas da UI.
3. Integrar formulários de KYC, Predição e Otimização para gravarem no banco.
4. Configurar a listagem de deals do Dashboard para ler diretamente do banco.
5. Validar o fluxo completo de ponta a ponta e documentar no README.
<!-- SECTION:PLAN:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Endpoints de API Deno atualizados com lógica de escrita/leitura no Postgres e validados.
- [ ] #2 Telas do Next.js integradas consumindo dados reais das APIs sem erros de renderização.
- [ ] #3 Teste de integração manual comprovando a persistência no banco pós-ação na UI.
- [ ] #4 Arquivos markdown criados/alterados correspondentes a esta task commitados.
<!-- DOD:END -->
