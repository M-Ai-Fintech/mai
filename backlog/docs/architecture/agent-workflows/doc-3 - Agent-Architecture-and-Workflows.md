---
id: doc-3
title: Agent Architecture and Workflows
type: specification
created_date: '2026-07-24 15:35'
updated_date: '2026-07-24 15:50'
tags:
  - architecture
  - agents
  - canonical
---
# Agent Architecture and Workflows

- **Authority ID:** ARCH-AGENT-001
- **Owner:** Agent Platform
- **Authority:** Canonical agent topology and workflow responsibilities
- **Freshness:** Current for the modular agent implementation documented by MAI-84
- **Language:** English
- **Update trigger:** Agent directories, exported agents, workflow-role mapping, orchestration boundaries, schemas, or cross-agent guardrails change.

Colocated instructions, playbooks, rules, schemas, tools, and `fonts/` knowledge remain the detailed operating assets for each agent.

## Seven workflow roles, eight deployed agents

The product workflow has seven roles. Due diligence is one workflow role, implemented by a supervisor plus two specialist agents; therefore `src/agent/agents/` contains eight deployable agent directories.

| Workflow role | Implemented module(s) | Responsibility |
| --- | --- | --- |
| Broker orchestration | `broker-orchestrator` | Entry point, semantic routing, and preference/domain-context retrieval. |
| Sourcing and KYB | `sourcing-kyb` | Counterparty qualification and KYB workflow. |
| Due diligence | `general-dd`, `financial-risk`, `legal-dd` | DD coordinator plus financial-risk and legal-DD specialists. |
| Deal matching | `deal-matching` | Target/portfolio matching and valuation-range support. |
| Negotiation | `negotiation` | Advisory term-sheet alternatives and negotiation framing. |
| Legal closing | `legal-closing` | Closing-document preparation and approval-aware generation. |

`src/agent/index.ts` exports all eight agents and the broker service. It is the composition point for agent execution, not a claim that every agent is independently exposed as a public HTTP endpoint.

## Module contract

Each agent directory normally contains `index.ts`, `instructions.md`, `playbook.md`, `rules.md`, schemas, tool adapters, and a `fonts/` directory. These colocated files are controlled implementation knowledge, not duplicate canonical architecture documents. Update the canonical architecture when responsibility, boundary, or workflow policy changes; update colocated assets when the agent’s detailed prompt, procedure, or domain reference changes.

## Guardrails

- The broker context separates user preferences from domain knowledge before prompt assembly.
- General DD coordinates evidence; financial and legal specialists own their respective analyses.
- Negotiation is advisory: its instructions require alternatives rather than an imposed final agreement.
- Legal closing must preserve an explicit human approval boundary before producing legal artifacts. Current code and tests define the exact available interaction mechanics.
- Zod schemas define structured agent inputs and outputs where present; they are the executable contract.

## Model configuration

Do not treat historical model names in agent prose as a runtime promise. `src/agent/ai_provider.ts` resolves credentials, while concrete model construction is in the agent modules. This document intentionally avoids a version-specific model claim because provider configuration can change independently of the architecture.

See Data and Memory Architecture for the broker’s memory boundary and Engine Architecture for computational tools.
