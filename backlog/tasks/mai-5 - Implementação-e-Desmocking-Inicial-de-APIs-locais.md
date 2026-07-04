---
id: MAI-5
title: Implementação e Desmocking Inicial de APIs locais
status: To Do
assignee:
  - Luís Silva
created_date: '2026-07-08 02:25'
updated_date: '2026-07-09 04:42'
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
Esta tarefa visa a desmarginalização e o desmocking inicial das APIs e integradores locais no MVP monolítico em Deno. Atualmente, os dados cadastrais (KYB), a listagem de arquivos da VDR e o vetorizador do RAG Siloed operam com dados mockados em memória ou duplicados no código. Esta tarefa refatora esses componentes para que leiam e gravem a partir de fontes locais dinâmicas (como diretórios no sistema de arquivos e tabelas no banco de dados Postgres).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 VDRService.getDocumentsForDeal deve listar arquivos dinamicamente do diretório './vdr_rooms/{dealId}' usando APIs de sistema de arquivos do Deno, mantendo fallback de segurança caso o diretório não exista.
- [ ] #2 ClientSiloedRAG.initializeSilo deve escanear a pasta física do VDR para extrair, chunkar e gerar embeddings dos arquivos de texto (.txt, .md), caindo de volta nos dados mockados originais apenas se o diretório estiver ausente ou vazio.
- [ ] #3 VDRIntegration.queryKYBRegistry deve realizar buscas na tabela 'business' do Postgres via DatabaseMemoryService/raw query, simulando o comportamento real e retornando dados cadastrais reais quando disponíveis.
- [ ] #4 O comando de CLI 'checkRegistry' em 'src/cli/commands.ts' deve ser refatorado para utilizar o 'verifyRegistryTool' central da camada agêntica em vez de declarar lógica de mock duplicada inline.
- [ ] #5 A suite de testes (deno task test) deve continuar passando com sucesso, garantindo compatibilidade retroativa e cobertura do desmocking.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
Etapa 1: Refatorar VDRService e ClientSiloedRAG para operarem com Deno.readDir e Deno.readTextFile sobre o diretório './vdr_rooms/{dealId}' com fallbacks estruturados.
Etapa 2: Implementar integração com Postgres na query de CNPJ em VDRIntegration para consultar a tabela 'business'.
Etapa 3: Refatorar o comando 'checkRegistry' no CLI commands para chamar 'verifyRegistryTool'.
Etapa 4: Testar a suite completa e validar localmente.
<!-- SECTION:PLAN:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Refatoração concluída e validada em src/agent/vdr_mock.ts, src/agent/rag_layer.ts e src/cli/commands.ts.
- [ ] #2 Tratamento de exceções e fallbacks testados para cenários de diretório VDR inexistente ou Postgres offline.
- [ ] #3 Execução bem-sucedida do comando 'deno task test' sem regressões.
<!-- DOD:END -->
