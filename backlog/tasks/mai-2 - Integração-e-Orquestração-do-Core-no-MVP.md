---
id: MAI-2
title: Integração e Orquestração do Core no MVP
status: To Do
assignee:
  - Luís Silva
created_date: '2026-07-08 02:25'
updated_date: '2026-07-09 04:42'
labels:
  - core
  - integration
milestone: m-1
dependencies: []
priority: high
ordinal: 2000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->

Épico centralizador responsável pela integração e orquestração de componentes
fundamentais do MVP monolítico em Deno. Ele visa estabelecer a conectividade
unificada com o provedor Google AI Studio (utilizando os modelos Gemini com
chaves de API apropriadas), implementar uma suite local de testes rápidos (smoke
tests) que garanta loops de desenvolvimento eficientes sem latência externa
excessiva, e realizar o desmocking inicial das APIs locais (conectando endpoints
de dados ao banco de dados Postgres e ao barramento de mensageria assíncrona
LocalPubSubBus). Dessa forma, a fundação técnica do middleware é consolidada
para suportar os fluxos operacionais de M&A de ponta a ponta.

<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->

- [ ] #1 Os agentes de IA em src/agent/agents/ e o centralizador
      src/agent/index.ts devem carregar e utilizar as chaves de API
      GOOGLE_GENERATIVE_AI_API_KEY ou GEMINI_API_KEY do ambiente para conexão
      com o Google AI Studio.
- [ ] #2 Uma suíte de smoke tests deve estar configurada e ser executada com
      sucesso via deno task test, testando o barramento local LocalPubSubBus e
      as ferramentas integradas sem depender de APIs externas para validações
      básicas.
- [ ] #3 Os endpoints das APIs e fluxos de dados locais devem estar conectados
      ao banco de dados Postgres, com mecanismos robustos de fallback que
      previnam quebras caso a conexão com a base de dados falhe.
- [ ] #4 Rotas da CLI interativa e comandos de linha de comando devem permitir a
      execução ponta a ponta de KYB, inferência ONNX, otimização MILP, algoritmo
      genético de Term Sheet e geração de PDFs/LaTeX.

<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->

1. Configuração de Variáveis de Ambiente e Integração com IA (MAI-4):
   - Ajustar o ponto de entrada unificado "src/agent/index.ts" e as instâncias
     individuais dos agentes para ler e validar "GOOGLE_GENERATIVE_AI_API_KEY"
     ou "GEMINI_API_KEY".
   - Substituir ou harmonizar o uso de modelos nos agentes para garantir
     conformidade com o ecossistema (Gemini 3.1 Pro / Gemini 3.5 Flash).
2. Conexão com o Banco de Dados e Lógica de Fallback (MAI-5):
   - Unificar e estruturar os acessos a dados no "DatabaseMemoryService" e as
     ferramentas de banco de dados "mcpDatabaseTool".
   - Testar o comportamento das conexões com o PostgreSQL local e garantir que o
     fallback (banco offline) forneça registros consistentes para não travar os
     agentes.
3. Suite de Smoke Tests e Validação de Fluxos (MAI-3):
   - Criar e otimizar arquivos de teste rápidos sob a pasta "tests/" para
     validar o barramento local de mensagens e os fluxos de eventos assíncronos.
   - Executar validações rápidas dos motores preditivo (ONNX), financeiro e de
     otimização (MILP e Term Sheet) em cenários simulados.

<!-- SECTION:PLAN:END -->

## Definition of Done

<!-- DOD:BEGIN -->

- [ ] #1 Todos os testes automatizados unitários, de integração e de ponta a
      ponta (E2E) estão passando localmente sem erros.
- [ ] #2 A inicialização e conexão com o Google AI Studio e modelos Gemini estão
      validadas, tratando erros de chave de API ausente de forma amigável.
- [ ] #3 O mecanismo de resiliência e fallback do PostgreSQL está verificado e
      coberto por testes no DatabaseMemoryService.
- [ ] #4 A documentação da API e as instruções dos agentes foram atualizadas nos
      arquivos correspondentes se houver mudança de contrato.
- [ ] #5 Nenhum arquivo de backlog foi modificado manualmente sem o uso da CLI
      backlog.md.

<!-- DOD:END -->
