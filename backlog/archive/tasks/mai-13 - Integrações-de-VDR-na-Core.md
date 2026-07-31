---
id: MAI-13
title: Integrações de VDR na Core
status: To Do
assignee:
  - Luís Silva
created_date: '2026-07-08 02:25'
updated_date: '2026-07-31 20:13'
labels:
  - core
  - vdr
  - revalidation
milestone: m-10
dependencies:
  - MAI-80
priority: medium
ordinal: 14000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Desenvolver a integração da Core API com provedores de Virtual Data Room (VDR) para automatizar e segurar a ingestão de documentos confidenciais durante a auditoria (Due Diligence). O escopo do épico inclui:
1. Implementar uma interface padrão/provedor comum (VDRProvider) para desacoplar as regras agênticas das especificidades de cada plataforma de VDR (Provider Pattern).
2. Desenvolver um conector nativo em TypeScript para o Papermark via sua API REST oficial (gerenciando autenticação com tokens pm_live_*).
3. Desenvolver adaptadores para plataformas corporativas legadas (iDeals e Intralinks) utilizando o proxy de APIs reversas da Supergood.ai.
4. Integrar o VDRProvider na camada de RAG client-siloed (RAG de silos segregados por transação/cliente) no arquivo src/agent/rag_layer.ts para substituir os arquivos mockados por arquivos reais baixados e vetorizados dinamicamente.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Definir a interface genérica VDRProvider e tipos estruturados (VDRWorkspace, VDRFolder, VDRDocument) em src/core/vdr/types.ts de forma extensível.
- [ ] #2 Implementar o PapermarkVDRProvider suportando paginação, listagem de documentos/diretórios e download em lote utilizando autenticação via token pm_live_*.
- [ ] #3 Implementar o SupergoodVDRProvider que mapeia e roteia as requisições para os conectores do iDeals e Intralinks através do proxy HTTP da Supergood.ai.
- [ ] #4 Integrar os novos provedores com a classe ClientSiloedRAG em src/agent/rag_layer.ts, garantindo que documentos reais do VDR sejam processados, chunkados e vetorizados na inicialização do silo.
- [ ] #5 Implementar testes unitários e de integração abrangentes com mocks de requisições HTTP (ex: com Deno mock ou nock) para os três provedores.
- [ ] #6 Papermark is the sole enabled MVP VDR and all other providers are disabled unless explicitly configured
- [ ] #7 Provider failures and fallback state cannot be represented as successful real VDR operations
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
### Fase 1: Arquitetura da Interface de Abstração
- Criar a pasta `src/core/vdr` e os arquivos de tipos `types.ts`.
- Definir o contrato do `VDRProvider` com assinaturas para login/conexão, listagem de estrutura de diretórios e download de binários.

### Fase 2: Conector Nativo Papermark (MAI-14)
- Implementar `PapermarkVDRProvider` em `src/core/vdr/providers/papermark.ts`.
- Criar rotas de integração HTTP usando `fetch` para o endpoint `https://api.papermark.com/v1`.
- Integrar com o mecanismo de tratamento de erros e paginação de documentos.

### Fase 3: Conectores Legados via Supergood (MAI-15 & MAI-16)
- Implementar o cliente genérico do Supergood em `src/core/vdr/providers/supergood.ts`.
- Configurar os mapeamentos de endpoints HTTP específicos para iDeals e Intralinks baseando-se no comportamento do proxy Supergood.ai.

### Fase 4: Integração com Camada RAG & Agent Actions
- Atualizar a função `initializeSilo` em `src/agent/rag_layer.ts` para carregar dados a partir de um `VDRProvider` instanciado com base no dealId/configuração da transação.
- Expor uma ferramenta `vdrSyncTool` em `src/agent/actions.ts` para permitir o acionamento via agente ou evento Pub/Sub.

### Fase 5: Validação e Testes
- Criar testes mockados simulando respostas da API da Papermark e do proxy do Supergood.
- Validar se o silo do RAG indexa corretamente os textos extraídos.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Superseded through separated Documents, Evidence, Agent ToolGateway, Integration Certification, and Migration ownership.

Requirements carried forward:

- provider-neutral source abstraction;
- Papermark integration;
- authenticated source synchronization;
- pagination;
- document listing and download;
- immutable document provenance;
- provider failure handling;
- evidence indexing;
- authorized agent access;
- fixture and live integration tests.

Replacement ownership:

- MAI-112 owns Documents, Document Sources, Document Versions, synchronization and processing;
- MAI-113 owns evidence, citations, chunks, provenance and vector isolation;
- MAI-121 owns governed agent capabilities;
- MAI-127 owns provider implementation and environment certification;
- MAI-129 owns physical retirement.

Architecture changed:

- Papermark is the only current MVP VDR candidate;
- iDeals and Intralinks remain deferred and uncertified;
- Supergood is not the universal project VDR boundary;
- providers implement `DocumentSourceProvider`;
- VDRs are source systems, not authoritative product truth;
- providers do not directly initialize RAG;
- direct agent actions and Pub/Sub shortcuts are not authoritative integration boundaries;
- fixtures and mocks cannot satisfy live certification.

Existing code and tests remain migration evidence until replacement coverage and cutover are proven.

Archive does not authorize immediate code deletion.
<!-- SECTION:NOTES:END -->

## Comments

<!-- COMMENTS:BEGIN -->
author: Technical Audit
created: 2026-07-09 19:22
---
[CRITICAL REVIEW] AC #4 is broken: In `rag_layer.ts` (`ClientSiloedRAG`), silo initialization for external providers (iDeals/Intralinks) only mocks content with a placeholder string instead of downloading physical files and performing chunking/vectorization. Real documents are not indexed in PostgreSQL.
---

author: @Antigravity
created: 2026-07-09 20:32
---
Critical review resolved: Implemented real binary downloads with text conversion in `rag_layer.ts`.
---

author: @codex
created: 2026-07-22 05:28
---
## Rebaseline audit — 2026-07-22\n\nCurrent status: The Core has provider interfaces and mocks, not a carefully implemented real VDR integration. Reopen with Papermark as the sole MVP VDR and make mock/fallback state explicit and non-successful.\n\nReason for reopening: the previous Done state does not satisfy the agreed definitive gate. Existing completion checkmarks are cleared pending fresh evidence. Before returning to Done, every applicable acceptance criterion and Definition of Done item must be verified, relevant tests must exist and pass, and mock/prototype boundaries must be explicit.
---
<!-- COMMENTS:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Interface abstrata de VDR projetada e implementada com suporte a múltiplos provedores em TypeScript (Deno/Mastra).
- [ ] #2 Suporte completo e verificado para autenticação e download de arquivos em Papermark, iDeals e Intralinks.
- [ ] #3 Integração validada com a camada RAG local do agente (sem expor documentos confidenciais fora dos silos locais).
- [ ] #4 Variáveis de ambiente (como PAPERMARK_API_KEY e SUPERGOOD_API_KEY) documentadas no .env.example e validadas.
- [ ] #5 Cobertura de testes para fluxo feliz de download e tratamento de erros (rate limit, expiração de token).
<!-- DOD:END -->
