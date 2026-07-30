---
id: doc-34
title: 'Proposed ADR: Agent Execution and Human Authority'
type: specification
created_date: '2026-07-30 06:03'
updated_date: '2026-07-30 09:33'
---
# Proposed ADR: Agent Execution and Human Authority

- **Authority ID:** doc-34
- **Owner:** Architecture
- **Authority:** Accepted ADR: Agent Execution and Human Authority
- **Status:** Accepted
- **Freshness:** Accepted as of 2026-07-30; original decision content retained
- **Language:** English
- **Update trigger:** A superseding owner-approved architecture decision, implementation evidence, or a material boundary change
- **Document ID:** doc-34
- **Decision owner:** MAI owner

## Context

Agent capabilities can retrieve evidence, compute and draft, but must not bypass application services, authorization, audit or human authority.

## Decision

Represent work as Mission→versioned Plan→durable Run→Step→Tool Activity→Result/Generated Artifact. Tools receive trusted scope and call context-owned application services through a ToolGateway. Evidence is authorized per access. Prompts, model/provider/version, tools, evidence, usage/cost and output lineage are recorded. AI may create only proposals, recommendations, calculations and reversible drafts. It cannot approve/reject, set price, send/communicate externally, waive, sign, invite/offboard, grant/revoke, release, archive/restore/terminate/delete, or perform any equivalent side effect. A separate human-authorized command is always required.

## Alternatives

- Direct agent repository/provider access: rejected.
- Broad “admin agent” with confirmation prompt: rejected; UI confirmation is not server authority.
- Disable agents entirely: rejected because safe analysis/drafting is valuable.

## Rationale

The model preserves useful autonomy inside explicit evidence, cost, tool and consequence boundaries.

## Consequences

Runs are durable, cancellable and invalidatable; permissions and source versions are rechecked before every tool/effect. Secrets remain inside adapters and never enter prompts. Fallback models require explicit audited policy.

## Migration implications

Adapt schemas/knowledge and pure algorithms; replace orchestration, RAG and tools; remove LocalPubSubBus from production. Existing output is historical/proposed.

## Unresolved risks

Plan-approval thresholds, model allow-lists, cost ceilings, prompt retention and provider data-use policy need operating decisions.

## Validation plan

Negative tests prove each prohibited action, tool authorization, cross-deal retrieval denial, stale invalidation, restart recovery and complete provenance.
