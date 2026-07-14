---
id: MAI-19
title: Integração e Orquestração End-to-End (Garantia Back-to-Back)
status: Done
assignee:
  - Luís Silva
created_date: '2026-07-08 02:25'
updated_date: '2026-07-10 13:44'
labels:
  - core
  - integration
milestone: m-3
dependencies: []
priority: medium
ordinal: 25000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Épico focado na garantia de que o fluxo do middleware execute de ponta a ponta sem falhas.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

- [ ] O middleware deve processar um fluxo completo de transação (sourcing → due‑diligence → negociação → closing) sem perda de estado.
- [ ] Cada agente deve registrar logs estruturados de início/fim de cada etapa no Database Memory Service.
- [ ] O barramento Pub/Sub local deve garantir entrega at‑least‑once para todos os eventos críticos.
- [ ] Em caso de falha de qualquer agente, o fluxo deve ser recuperável a partir do último ponto de checkpoint salvo.
- [ ] O tempo total do fluxo end‑to‑end não deve exceder 5 minutos em ambiente de teste local.

## Definition of Done

- [ ] Código implementado em `src/core/pubsub.ts` com suporte a múltiplos listeners e replay.
- [ ] Todos os agentes atualizados para usar o novo barramento e persistir checkpoints.
- [ ] Testes unitários cobrem 100 % das rotas de mensagem críticas (`deno test --coverage`).
- [ ] Documentação atualizada em `docs/architecture.md` descrevendo o fluxo end‑to‑end.
- [ ] CI pipeline verifica lint, type‑check e cobertura ≥ 90 %.

## Implementation Plan

1. **Design do barramento** – criar interface `MessageBus` e implementação `LocalPubSubBus` com suporte a replay e múltiplos listeners.
2. **Atualizar agentes** – refatorar cada agente (`src/agent/agents/*`) para publicar/receber eventos via `MessageBus`.
3. **Persistência de checkpoints** – adicionar tabela `flow_checkpoints` no PostgreSQL e camada de acesso em `src/core/db/`.
4. **Teste de integração** – escrever script de end‑to‑end que simula um ciclo completo e verifica logs e checkpoints.
5. **Documentação** – atualizar `docs/architecture.md` e README com diagramas de fluxo.
6. **CI/Entrega** – garantir que o pipeline execute lint, type‑check, testes e gere cobertura.
