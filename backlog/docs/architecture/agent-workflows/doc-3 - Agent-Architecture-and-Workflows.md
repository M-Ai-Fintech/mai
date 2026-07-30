---
id: doc-3
title: Agent Architecture and Workflows
type: specification
created_date: '2026-07-24 15:35'
updated_date: '2026-07-30 06:37'
tags:
  - architecture
  - agents
  - canonical
---
# Agent Architecture and Workflows

- **Authority ID:** ARCH-AGENT-001
- **Owner:** Agent Platform
- **Authority:** Canonical target agent architecture proposed by MAI-103
- **Freshness:** Proposed as of 2026-07-30
- **Language:** English
- **Update trigger:** Mission/run/tool/evidence boundary, model policy, human authority or agent inventory changes

## Target execution model

Agent work is Mission → versioned Plan → durable Run → Step → Tool Activity → Result/Generated Artifact. Missions declare tenant/workspace/deal/object/evidence scope, allowed tools, prohibited effects, model/provider policy and cost ceiling. Plans are versioned and require human approval when policy demands it.

The durable runner persists attempts, retries, cancellation, failures, model/prompt/tool metadata, evidence access, usage/cost and output provenance. Permission and source versions are rechecked at every retrieval and before any effect. Stale or revoked inputs block execution and invalidate dependent outputs without deleting history.

## Tool and evidence boundary

Tools receive trusted ActorContext and mission/run scope. Reads go through permission-safe application queries; domain writes can create only proposals or drafts through the owning context service. Agents never access repositories, SQL, secrets, raw provider clients, event transport or external communication directly. Secrets remain within tenant-scoped provider adapters and never enter prompts.

## Human authority

AI cannot approve/reject, establish price, send proposals, communicate externally, waive, sign, invite/offboard, grant/revoke access, release deliverables, archive/restore/terminate/delete, or make an equivalent consequential transition. AI output remains a proposal, recommendation, calculation or reversible artifact until a distinct human-authorized command.

## Current agent disposition

The eight specialist definitions, schemas and knowledge assets are **Adapt** candidates. Direct orchestration, RAG storage/retrieval boundaries and tools are **Replace**. LocalPubSubBus is **Remove** from production; AgentFlowWrapper is **Replace** with the durable runner. No agent/provider is production verified without implemented environment evidence.

Detailed state, tool and migration contracts are in doc-20, doc-22, doc-23 and proposed ADR doc-34.
