---
id: MAI-5
title: Implementação e Desmocking Inicial de APIs locais
status: Done
assignee:
  - Luís Silva
created_date: '2026-07-08 02:25'
updated_date: '2026-07-09 15:00'
labels:
  - core
  - api
  - mvp
milestone: m-1
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
- [x] #1 ClientSiloedRAG.initializeSilo deve escanear a pasta física do VDR para extrair, chunkar e gerar embeddings dos arquivos de texto (.txt, .md), caindo de volta nos dados mockados originais apenas se o diretório estiver ausente ou vazio.
- [x] #2 VDRIntegration.queryKYBRegistry deve realizar buscas na tabela 'business' do Postgres via DatabaseMemoryService/raw query, simulando o comportamento real e retornando dados cadastrais reais quando disponíveis.
- [x] #3 O comando de CLI 'checkRegistry' em 'src/cli/commands.ts' deve ser refatorado para utilizar o 'verifyRegistryTool' central da camada agêntica em vez de declarar lógica de mock duplicada inline.
- [x] #4 A suite de testes (deno task test) deve continuar passando com sucesso, garantindo compatibilidade retroativa e cobertura do desmocking.
- [x] #5 VDRService.getDocumentsForDeal utiliza dados/arquivos no diretório de teste designado (file system local)
- [x] #6 ClientSiloedRAG varre o diretório mockado e lê arquivos dinamicamente
- [x] #7 Mock de KYB busca dados na tabela local do DatabaseMemoryService
- [x] #8 Arquitetura e escopo desses Mocks documentados claramente em /backlog/docs para desenvolvedores
<!-- AC:END -->



## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Atualizar classe `VDRService` para interagir com o file system local (`./vdr_rooms/{dealId}`).
2. Estruturar a lógica de mock da VDR no Postgres e documentar como a aplicação consome os dados falsos.
3. Atualizar a integração de KYB para simular a query SQL na tabela `business`.
4. Documentar a arquitetura de Mocks localmente.
<!-- SECTION:PLAN:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 Tratamento de exceções e fallbacks testados para cenários de diretório VDR inexistente ou Postgres offline.
- [x] #2 Execução bem-sucedida do comando 'deno task test' sem regressões.
- [x] #3 Os contratos de envio/recebimento de dados estão respeitados, mesmo consumindo mocks estruturados
- [x] #4 Aplicação consegue ler um novo arquivo apenas adicionando-o na pasta local e rodando o comando
- [x] #5 Documentação adicionada ao repositório explicando os dados mockados
<!-- DOD:END -->
