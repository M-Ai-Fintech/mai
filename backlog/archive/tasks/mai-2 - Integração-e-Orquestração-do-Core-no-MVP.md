---
id: MAI-2
title: Integração e Orquestração do Core no MVP
status: To Do
assignee:
  - Luís Silva
created_date: '2026-07-08 02:25'
updated_date: '2026-07-31 02:02'
labels:
  - core
  - integration
  - revalidation
milestone: m-13
dependencies: []
priority: high
ordinal: 2500
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Épico centralizador focado em estruturar o ponto de entrada da aplicação, unificando a inicialização de todos os serviços essenciais (Banco de Dados, Pub/Sub local, Agentes de IA). Esta tarefa orquestra as dependências para que o servidor/CLI suba tendo todas as conexões preparadas ou provendo fallbacks graciosos caso alguma dependência (como o DB) esteja inativa. Inclui a documentação arquitetural da core API (REST e MCP).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Uma suíte de smoke tests deve estar configurada e ser executada com
      src/agent/index.ts devem carregar e utilizar as chaves de API
      GOOGLE_GENERATIVE_AI_API_KEY ou GEMINI_API_KEY do ambiente para conexão
      com o Google AI Studio.
- [ ] #2 Os endpoints das APIs e fluxos de dados locais devem estar conectados
      sucesso via deno task test, testando o barramento local LocalPubSubBus e
      as ferramentas integradas sem depender de APIs externas para validações
      básicas.
- [ ] #3 Rotas da CLI interativa e comandos de linha de comando devem permitir a
      ao banco de dados Postgres, com mecanismos robustos de fallback que
      previnam quebras caso a conexão com a base de dados falhe.
      execução ponta a ponta de KYB, inferência ONNX, otimização MILP, algoritmo
      genético de Term Sheet e geração de PDFs/LaTeX.

- [ ] #4 O arquivo principal (main.ts ou boot) instancia corretamente o DatabaseMemoryService, LocalPubSubBus, e o provedor de IA
- [ ] #5 Lógica de fallback implementada: se o DB falhar, o core não trava
- [ ] #6 Logs estruturados no console para indicar status de cada componente
- [ ] #7 Documentação clara da arquitetura Core (REST e integração MCP) criada nos diretórios correspondentes
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Criar rotina de inicialização global (bootstrap) que carrega as dependências em ordem lógica.
2. Injetar a instância do `DatabaseMemoryService` nas classes que precisarão de acesso a dados futuramente.
3. Tratamento de exceções globais durante a inicialização (try/catch na rotina de boot).
4. Criar documentação técnica em `/backlog/docs/` e `/context/` cobrindo a implementação da Core (REST e MCP).
<!-- SECTION:PLAN:END -->

## Comments

<!-- COMMENTS:BEGIN -->
author: Antigravity (Gemini)
created: 2026-07-09 16:37
---
[CRITICAL REVIEW - MAI-2]
1. Fake dependency injection: Although the task specifies a dependency-injection architecture, `src/core/boot.ts` implements static properties. Operational agent and mock classes instantiate `new DatabaseMemoryService()` locally instead of reusing the bootstrapper connection, creating competing connection pools and bypassing bootstrap verification.
2. Silent error propagation: Critical DB or Pub/Sub initialization failures are swallowed by a simple try/catch. The CLI continues starting normally, causing later cascading failures that are difficult to trace.
---

author: Antigravity
created: 2026-07-09 17:21
---
[REMEDIATION] Replaced fake dependency injection with `DatabaseMemoryService` and `LocalPubSubBus` Singletons in bootstrap and operational tools, removing orphaned competing connections. Improved database and Pub/Sub failure handling and logging.
---

author: @codex
created: 2026-07-22 05:28
---
## Rebaseline audit — 2026-07-22\n\nCurrent status: Core orchestration is not reliable: the canonical suite has four failures, Gemini cannot execute through the current Mastra/AI SDK combination, and production dependencies still resolve to mock/default implementations. Revalidate the complete bootstrap and dependency graph.\n\nReason for reopening: the previous Done state does not satisfy the agreed definitive gate. Existing completion checkmarks are cleared pending fresh evidence. Before returning to Done, every applicable acceptance criterion and Definition of Done item must be verified, relevant tests must exist and pass, and mock/prototype boundaries must be explicit.
---
<!-- COMMENTS:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 A inicialização e conexão com o Google AI Studio e modelos Gemini estão
      ponta (E2E) estão passando localmente sem erros.
- [ ] #2 O mecanismo de resiliência e fallback do PostgreSQL está verificado e
      validadas, tratando erros de chave de API ausente de forma amigável.
- [ ] #3 A documentação da API e as instruções dos agentes foram atualizadas nos
      coberto por testes no DatabaseMemoryService.
- [ ] #4 Nenhum arquivo de backlog foi modificado manualmente sem o uso da CLI
      arquivos correspondentes se houver mudança de contrato.
      backlog.md.

- [ ] #5 Executar deno task start exibe logs confirmando a subida dos pilares
- [ ] #6 Arquitetura base para Injeção de Dependências devidamente documentada
- [ ] #7 Arquivos markdown em /backlog/docs/ e /context/ cobrindo as definições da Core adicionados
<!-- DOD:END -->
