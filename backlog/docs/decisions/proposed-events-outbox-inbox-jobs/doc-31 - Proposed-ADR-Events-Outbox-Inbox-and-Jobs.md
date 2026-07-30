---
id: doc-31
title: 'Proposed ADR: Events, Outbox, Inbox, and Jobs'
type: specification
created_date: '2026-07-30 06:03'
updated_date: '2026-07-30 06:34'
---
# Proposed ADR: Events, Outbox, Inbox, and Jobs

- **Document ID:** doc-31
- **Status:** Proposed
- **Decision owner:** MAI owner

## Context

Document processing, computation, agents, exports, releases and integrations outlive HTTP requests and can fail or retry. The current LocalPubSubBus and AgentFlowWrapper are process-local.

## Decision

Emit domain events after aggregate transitions and persist them with audit/idempotency in a transactional outbox. Translate stable integration events at the boundary. Consume external/events through an inbox that deduplicates by provider/event identity. Persist Job and JobAttempt records with tenant/deal scope, input versions, state, progress, timeout, cancellation, retry and dead-letter outcome. Polling is the default progress mechanism; SSE is limited to material one-way long-run progress. No initial WebSocket or external event-broker dependency is selected.

## Alternatives

- In-process publish/subscribe: rejected for durable work.
- Publish after commit without outbox: rejected due to lost-event windows.
- Queue as transaction truth: rejected.
- Streaming for every update: rejected as unjustified complexity.

## Rationale

Durable database-backed coordination gives atomic initiation and recoverability while keeping transport replaceable.

## Consequences

Consumers are idempotent and at-least-once. Every side effect has an initiating command, job, audit and outbox trail. Dead letters are terminal visible states, not silent logs.

## Migration implications

Replace generic engine/chat run records and wrappers after the job foundation exists; migrate in-flight prototype work as failed/cancelled historical evidence, not live jobs.

## Unresolved risks

Worker concurrency, lease protocol, retention, future broker trigger and SSE capacity need implementation benchmarks.

## Validation plan

Crash-before/after-commit, duplicate delivery, timeout, cancellation, dead-letter, stale-input and restart recovery tests.
