---
id: MAI-32
title: Validação do barramento Pub/Sub local
status: To Do
assignee:
  - Luís Silva
created_date: '2026-07-08 02:26'
updated_date: '2026-07-22 05:29'
labels:
  - core
  - integration
  - poc
  - revalidation
milestone: m-13
dependencies: []
parent_task_id: MAI-19
priority: low
ordinal: 27000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Validate the local Pub/Sub bus ensuring reliable asynchronous event routing between Core API, agents, and engines. The task includes verifying that LocalPubSubBus correctly publishes and delivers messages to multiple listeners, that googleCloudPubSubTool simulates Pub/Sub actions (request_vdr_access, publish_event, trigger_engine) with proper payloads, and that failure isolation and cleanup mechanisms work without memory leaks. This validation prepares the MVP for seamless migration to Google Cloud Pub/Sub in production.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 O singleton LocalPubSubBus deve suportar múltiplos listeners registrados simultaneamente para o mesmo tópico e garantir que todos recebam os dados publicados de forma concorrente.
- [ ] #2 A ferramenta googleCloudPubSubTool deve suportar as ações definidas (request_vdr_access, publish_event, trigger_engine) e disparar de forma assíncrona as respostas correspondentes no formato correto (ex: topic_response).
- [ ] #3 O isolamento de falhas deve ser garantido: se o callback de um listener lançar um erro, isso não deve impedir a execução dos demais callbacks registrados no mesmo tópico.
- [ ] #4 O método de limpeza (clear) do barramento deve permitir remover ouvintes de um tópico específico ou resetar todos os tópicos de forma determinística para evitar vazamentos de memória (memory leaks) e poluição entre testes.
- [ ] #5 Os testes unitários e de integração em tests/pubsub.spec.ts devem validar exaustivamente esses comportamentos e executar com sucesso via Deno sem falhas.
- [ ] #6 LocalPubSubBus supports multiple listeners on the same topic, delivering each published message to all listeners concurrently.
- [ ] #7 googleCloudPubSubTool correctly handles defined actions (request_vdr_access, publish_event, trigger_engine) and emits appropriate asynchronous responses.
- [ ] #8 Failure in one listener callback does not prevent other listeners from receiving the message.
- [ ] #9 The clear method can remove listeners for a specific topic or reset the entire bus deterministically, preventing memory leaks.
- [ ] #10 Comprehensive unit and integration tests in tests/pubsub.spec.ts pass successfully via Deno test runner.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Review current LocalPubSubBus and googleCloudPubSubTool implementations in src/agent/actions.ts.\n2. Refactor LocalPubSubBus to use a Set of callbacks per topic ensuring each listener is invoked asynchronously and errors are caught per listener.\n3. Implement clear(topic?) method to deregister listeners or reset all topics.\n4. Extend googleCloudPubSubTool to expose request_vdr_access, publish_event, trigger_engine actions with proper payload validation.\n5. Add/expand unit tests in tests/pubsub.spec.ts covering multi‑listener delivery, error isolation, and cleanup behavior.\n6. Run deno test suite, ensure all Pub/Sub tests pass and overall coverage meets threshold.\n7. Update README or docs section describing local Pub/Sub bus usage and migration path.\n8. Update task status, attach test results, and close the task in Backlog.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
[POC Orchestrator Note] Grupo A (Paralelo): Focar estritamente em src/agent/actions.ts e tests/pubsub.spec.ts.
<!-- SECTION:NOTES:END -->

## Comments

<!-- COMMENTS:BEGIN -->
author: Auditoria Técnica
created: 2026-07-10 06:04
---
[REVISÃO CRÍTICA] 1. Negligência de Backlog: A tarefa foi marcada como 'Done', mas os critérios AC #2 a #10 e DoD #2 a #11 foram deixados inteiramente desmarcados ([ ]). 2. Dependência de FFI: O teste unitário requer explicitamente a flag --allow-ffi devido ao uso de onnxruntime-node, o que viola o DoD de nenhuma dependência nativa Node.js em ambiente Deno para o motor.
---

author: @codex
created: 2026-07-22 05:29
---
## Rebaseline audit — 2026-07-22\n\nCurrent status: Only one of ten acceptance criteria is checked. The local bus works as an in-process primitive, but the agent tool simulates integration outcomes and does not prove the claimed lifecycle. Reopen with explicit local scope and complete tests.\n\nReason for reopening: the previous Done state does not satisfy the agreed definitive gate. Existing completion checkmarks are cleared pending fresh evidence. Before returning to Done, every applicable acceptance criterion and Definition of Done item must be verified, relevant tests must exist and pass, and mock/prototype boundaries must be explicit.
---
<!-- COMMENTS:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Implementação das funcionalidades principais do LocalPubSubBus e tratamento de erros testados e aprovados.
- [ ] #2 Cobertura de testes unitários para múltiplos ouvintes, tratamento de exceções nos ouvintes e métodos de cleanup (clear).
- [ ] #3 Verificação do fluxo assíncrono simulando a requisição e resposta de acesso ao VDR via ferramenta googleCloudPubSubTool.
- [ ] #4 Suite de testes executando com sucesso com o comando /home/luis/.deno/bin/deno test.
- [ ] #5 Registro da documentação atualizada e fechamento/atualização dos metadados da tarefa no Backlog.md.
- [ ] #6 Implementation of LocalPubSubBus with multi‑listener support and concurrency handling.
- [ ] #7 Error isolation in listener callbacks verified by tests.
- [ ] #8 clear method implementation with deterministic cleanup and no memory leaks.
- [ ] #9 googleCloudPubSubTool actions implemented and validated against expected contract.
- [ ] #10 Full test suite passes (deno test) with coverage >80% for Pub/Sub code.
- [ ] #11 Documentation updated and Backlog task metadata marked as Done.
<!-- DOD:END -->
