---
id: MAI-5
title: Implementação e Desmocking Inicial de APIs locais
status: To Do
assignee:
  - Luís Silva
created_date: '2026-07-08 02:25'
updated_date: '2026-07-31 17:45'
labels:
  - core
  - api
  - mvp
  - revalidation
milestone: m-10
dependencies: []
parent_task_id: MAI-2
priority: medium
ordinal: 5000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Refatoração inicial de mocks. Como não temos um VDR real configurado, o foco é estruturar a base (`VDRService` e `ClientSiloedRAG`) para consumir e enviar dados de um ambiente local bem delineado e documentado. O sistema lerá dados de testes do file system e o KYB consultará a estrutura simulada do Postgres, mantendo os contratos reais mas com dados "dummy".
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 ClientSiloedRAG.initializeSilo deve escanear a pasta física do VDR para extrair, chunkar e gerar embeddings dos arquivos de texto (.txt, .md), caindo de volta nos dados mockados originais apenas se o diretório estiver ausente ou vazio.
- [ ] #2 VDRIntegration.queryKYBRegistry deve realizar buscas na tabela 'business' do Postgres via DatabaseMemoryService/raw query, simulando o comportamento real e retornando dados cadastrais reais quando disponíveis.
- [ ] #3 O comando de CLI 'checkRegistry' em 'src/cli/commands.ts' deve ser refatorado para utilizar o 'verifyRegistryTool' central da camada agêntica em vez de declarar lógica de mock duplicada inline.
- [ ] #4 A suite de testes (deno task test) deve continuar passando com sucesso, garantindo compatibilidade retroativa e cobertura do desmocking.
- [ ] #5 VDRService.getDocumentsForDeal utiliza dados/arquivos no diretório de teste designado (file system local)
- [ ] #6 ClientSiloedRAG varre o diretório mockado e lê arquivos dinamicamente
- [ ] #7 Mock de KYB busca dados na tabela local do DatabaseMemoryService
- [ ] #8 Arquitetura e escopo desses Mocks documentados claramente em /backlog/docs para desenvolvedores
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Atualizar classe `VDRService` para interagir com o file system local (`./vdr_rooms/{dealId}`).
2. Estruturar a lógica de mock da VDR no Postgres e documentar como a aplicação consome os dados falsos.
3. Atualizar a integração de KYB para simular a query SQL na tabela `business`.
4. Documentar a arquitetura de Mocks localmente.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Superseded ownership:

- MAI-108 owns Organization Registry and KYB state.
- MAI-112 owns Document and VDR persistence boundaries.
- MAI-113 owns evidence, chunks, provenance, and retrieval semantics.
- MAI-127 owns real provider adapters and environment-specific certification.
- MAI-151 owns deterministic local preflight and explicit fixture adapters.
- MAI-150 owns retirement of banker-facing CLI workflows.
- MAI-129 owns legacy database, compatibility, fixture, and prototype retirement after cutover.

Requirements carried forward:

- deterministic local fixtures;
- adding a local fixture document without changing application logic;
- parsing and chunking tests;
- explicit absent-directory behavior;
- explicit unavailable-database behavior;
- contract-compatible test data;
- clear fixture documentation;
- no static or fabricated success response.

Requirements changed or rejected:

- local filesystem access is not a real VDR integration;
- querying a legacy local `business` table is not real KYB integration;
- fixture data must not be presented as desmocked production data;
- no silent fallback from a configured real provider to hardcoded documents;
- no banker-facing CLI command is an authoritative workflow;
- mock or fixture results cannot satisfy provider certification.

Preservation boundary:

Archival does not authorize deletion of:

- fixture documents;
- VDR test directories;
- seed data;
- reusable parsers;
- reusable chunking logic;
- deterministic test adapters;
- migration evidence;
- tests still required by active tasks.

Physical cleanup occurs only when the owning implementation and migration tasks prove that no active consumer remains.
<!-- SECTION:NOTES:END -->

## Comments

<!-- COMMENTS:BEGIN -->
author: Antigravity (Gemini)
created: 2026-07-09 16:37
---
[CRITICAL REVIEW - MAI-5]
1. Hardcoded CLI simulations disguised as agents: The `checkRegistry` (KYB), `analyzeRisk` (Financial Risk), and `optimizeTermSheet` (Negotiation) outputs contain static qualitative passages in rigid CLI `console.log` calls. These hardcoded strings mask dynamic AI-agent or RAG processing.
2. Rigid target pipeline: The portfolio optimizer consumes an inline `pipelineTargets` array in `src/cli/commands.ts`. The system does not dynamically read deals and companies from the real PostgreSQL `business` table, preventing tests with new targets.
---

author: Antigravity
created: 2026-07-09 17:22
---
[REMEDIATION] Removed hardcoded CLI simulations. `checkRegistry` now retrieves corporate culture dynamically from `company_culture_memory`; `analyzeRisk` initializes `ClientSiloedRAG` and retrieves Change of Control clauses from the local VDR; and `optimizePortfolio` loads targets through real SQL queries against `business`, with a robust fallback.
---

author: @codex
created: 2026-07-22 05:28
---
## Rebaseline audit — 2026-07-22\n\nCurrent status: The task explicitly allowed structured mocks, but the claimed desmocking remains materially incomplete: KYB and VDR payloads are hardcoded and RAG silently falls back to in-memory fixtures. Rebaseline this work under the Papermark MVP integration.\n\nReason for reopening: the previous Done state does not satisfy the agreed definitive gate. Existing completion checkmarks are cleared pending fresh evidence. Before returning to Done, every applicable acceptance criterion and Definition of Done item must be verified, relevant tests must exist and pass, and mock/prototype boundaries must be explicit.
---
<!-- COMMENTS:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Tratamento de exceções e fallbacks testados para cenários de diretório VDR inexistente ou Postgres offline.
- [ ] #2 Execução bem-sucedida do comando 'deno task test' sem regressões.
- [ ] #3 Os contratos de envio/recebimento de dados estão respeitados, mesmo consumindo mocks estruturados
- [ ] #4 Aplicação consegue ler um novo arquivo apenas adicionando-o na pasta local e rodando o comando
- [ ] #5 Documentação adicionada ao repositório explicando os dados mockados
<!-- DOD:END -->
