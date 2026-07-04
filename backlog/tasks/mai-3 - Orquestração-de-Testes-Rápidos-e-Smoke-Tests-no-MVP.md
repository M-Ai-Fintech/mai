---
id: MAI-3
title: Orquestração de Testes Rápidos e Smoke Tests no MVP
status: To Do
assignee:
  - Luís Silva
created_date: '2026-07-08 02:25'
updated_date: '2026-07-09 04:42'
labels:
  - testing
  - mvp
milestone: m-1
dependencies: []
parent_task_id: MAI-2
priority: high
ordinal: 3000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->

Implementar uma suíte de testes rápidos (smoke tests) e comandos de
autodiagnóstico no MVP. O objetivo é permitir que os desenvolvedores validem
rapidamente o fluxo de ponta a ponta (Lifecycle de M&A) e a integridade da
infraestrutura local (Postgres, variáveis de ambiente do Gemini, dependências
WASM do solver HiGHS, gerador de PDF) de forma isolada, rápida (< 2 segundos) e
sem realizar chamadas de rede ou processamento de inferência pesado
(back-to-back/LLMs reais).

<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->

- [ ] #1 Tarefa deno: Existência de uma tarefa 'test:smoke' no deno.json que
      execute apenas os testes rápidos com tempo < 2s.
- [ ] #2 Modo Diagnóstico na CLI: A CLI deve aceitar um novo comando ou flag
      '--smoke' ou 'smoke' para verificar infraestrutura local.
- [ ] #3 Mocked Lifecycle: Simulação completa do fluxo do deal (MADealLifecycle)
      com todas as transações de estado validadas.
- [ ] #4 Offline First: Isolamento de rede garantindo execução total offline e
      sem depender de Postgres ativo.

<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->

1. Configurar a tarefa no deno.json adicionando o comando de test:smoke
   filtrando pela tag [Smoke].
2. Criar a Suíte de Smoke Test em tests/smoke.spec.ts cobrindo a simulação do
   fluxo de deal de ponta a ponta.
3. Implementar o comando smoke na CLI (src/cli/interface.ts) para realizar
   diagnósticos rápidos de infraestrutura.
4. Testar localmente e validar se o tempo de execução atende ao critério de <
   2s.

<!-- SECTION:PLAN:END -->

## Definition of Done

<!-- DOD:BEGIN -->

- [ ] #1 O comando deno task test:smoke executa e passa com sucesso em menos de
      2 segundos.
- [ ] #2 A CLI responde ao comando smoke imprimindo um relatório de diagnóstico
      formatado.
- [ ] #3 O fluxo completo do ciclo de vida M&A é coberto pelo smoke test sem
      dependências ativas de banco de dados ou rede.
- [ ] #4 Nenhum erro de tipo ou linter é gerado.
- [ ] #5 Documentação do comando de smoke test e diagnóstico adicionada ao
      README.md.

<!-- DOD:END -->
