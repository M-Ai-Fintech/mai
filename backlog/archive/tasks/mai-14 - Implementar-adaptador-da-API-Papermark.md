---
id: MAI-14
title: Implementar adaptador da API Papermark
status: To Do
assignee:
  - Luís Silva
created_date: '2026-07-08 02:25'
updated_date: '2026-07-31 20:11'
labels:
  - core
  - vdr
  - poc
  - revalidation
milestone: m-10
dependencies:
  - MAI-80
parent_task_id: MAI-13
priority: medium
ordinal: 15000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Criar um adaptador de integração direta com a API REST do Papermark para listar, buscar e baixar em lote documentos hospedados em Data Rooms virtuais. O adaptador deve ser integrado ao pipeline de due diligence do middleware, permitindo que os agentes busquem documentos reais em vez de usar dados simulados. Ele deve suportar autenticação via Token Bearer do Papermark (PAPERMARK_API_KEY) e hosts personalizados (PAPERMARK_API_URL).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Criar a classe PapermarkAdapter em src/core/vdr/papermark.ts para encapsular as chamadas HTTP para os endpoints da API Papermark.
- [ ] #2 Configurar autenticação usando a variável de ambiente PAPERMARK_API_KEY com suporte a fallback de URL customizada via PAPERMARK_API_URL.
- [ ] #3 Implementar o método downloadBatch(dealId: string, dataRoomId: string) para baixar arquivos do Data Room do Papermark para ./vdr_rooms/[dealId]/ organizando-os de acordo com o template de diretórios.
- [ ] #4 Criar testes unitários em tests/core/papermark.spec.ts com mock completo das requisições REST da API do Papermark.
- [ ] #5 The adapter passes authenticated lifecycle tests against the pinned local Papermark instance without mocked fetch responses
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Definir a interface comum para provedores de VDR (ex: VDRProviderAdapter em src/core/vdr/types.ts).
2. Implementar a classe PapermarkAdapter em src/core/vdr/papermark.ts.
3. Mapear a resposta do Papermark e realizar o download dos arquivos com streams do Deno escrevendo em ./vdr_rooms/[dealId]/.
4. Criar a suíte de testes unitários mockando o fetch em tests/core/papermark.spec.ts.
5. Documentar variáveis de ambiente necessárias e integrá-lo com as demais actions da core.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Superseded by MAI-112 and MAI-127, with physical retirement owned by MAI-129.

Requirements carried forward:

- authenticated Papermark access;
- custom environment URL support;
- document listing;
- metadata retrieval;
- upload and download;
- pagination where supported;
- normalized provider errors;
- safe credential handling;
- typed provider contracts;
- contract tests;
- authenticated live-environment certification.

Architecture changed:

- the provider adapter implements `DocumentSourceProvider`;
- Document and Document Version ownership belongs to MAI-112;
- provider implementation and certification belong to MAI-127;
- binaries are referenced through approved object storage rather than `./vdr_rooms`;
- connector credentials belong to tenant-scoped Connector Accounts;
- missing provider fields cannot be fabricated;
- mocked HTTP tests cannot satisfy live provider certification;
- Supergood-specific configuration is not the universal VDR contract;
- MAI-129 owns obsolete compatibility retirement.

Existing adapter code and tests remain migration evidence until replacement coverage and cutover are proven.

Archive does not authorize immediate code deletion.
<!-- SECTION:NOTES:END -->

## Comments

<!-- COMMENTS:BEGIN -->
author: @codex
created: 2026-07-22 05:28
---
## Rebaseline audit — 2026-07-22\n\nCurrent status: The Papermark adapter is fetch-mocked and its test currently fails because configuration resolves the placeholder key instead of the test key. Reopen and validate it against the live local Papermark instance tracked by MAI-80.\n\nReason for reopening: the previous Done state does not satisfy the agreed definitive gate. Existing completion checkmarks are cleared pending fresh evidence. Before returning to Done, every applicable acceptance criterion and Definition of Done item must be verified, relevant tests must exist and pass, and mock/prototype boundaries must be explicit.
---
<!-- COMMENTS:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Todos os testes unitários em tests/core/papermark.spec.ts passando via deno test.
- [ ] #2 Código em TypeScript compilando sob strict mode e sem avisos no deno lint.
- [ ] #3 Ausência de credenciais e chaves expostas no código-fonte.
- [ ] #4 Variáveis de ambiente (PAPERMARK_API_KEY, PAPERMARK_API_URL) documentadas no README.md ou .env.example.
<!-- DOD:END -->
