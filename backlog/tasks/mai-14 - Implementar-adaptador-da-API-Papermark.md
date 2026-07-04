---
id: MAI-14
title: Implementar adaptador da API Papermark
status: To Do
assignee:
  - Luís Silva
created_date: '2026-07-08 02:25'
updated_date: '2026-07-09 04:41'
labels:
  - core
  - vdr
  - poc
milestone: m-2
dependencies: []
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
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Definir a interface comum para provedores de VDR (ex: VDRProviderAdapter em src/core/vdr/types.ts).
2. Implementar a classe PapermarkAdapter em src/core/vdr/papermark.ts.
3. Mapear a resposta do Papermark e realizar o download dos arquivos com streams do Deno escrevendo em ./vdr_rooms/[dealId]/.
4. Criar a suíte de testes unitários mockando o fetch em tests/core/papermark.spec.ts.
5. Documentar variáveis de ambiente necessárias e integrá-lo com as demais actions da core.
<!-- SECTION:PLAN:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Todos os testes unitários em tests/core/papermark.spec.ts passando via deno test.
- [ ] #2 Código em TypeScript compilando sob strict mode e sem avisos no deno lint.
- [ ] #3 Ausência de credenciais e chaves expostas no código-fonte.
- [ ] #4 Variáveis de ambiente (PAPERMARK_API_KEY, PAPERMARK_API_URL) documentadas no README.md ou .env.example.
<!-- DOD:END -->
