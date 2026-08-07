---
id: doc-10
title: Documentation Index and Information Architecture
type: readme
created_date: '2026-07-24 15:37'
updated_date: '2026-08-07 02:15'
tags:
  - documentation
  - governance
  - canonical
---
# Documentation Index and Information Architecture

- **Authority ID:** DOC-IA-001
- **Owner:** Repository maintainers
- **Authority:** Canonical navigation for project documentation
- **Freshness:** Current as of 2026-08-06
- **Language:** English
- **Update trigger:** Any canonical path, authority, ownership rule or documentation class changes

## Canonical root and governance

`backlog/docs/` is the governed documentation root. Use Backlog document workflows for creation, metadata, relocation and content updates. English is canonical. The inventory and machine-readable manifest are doc-12; governance is doc-11; generated/local knowledge classification is doc-13.

The repository-level execution and verification authority is `prompts/OPERATING_RULES.md`; `prompts/README.md` explains prompt roles and `prompts/SUBAGENT_RULES.md` governs exceptional delegated execution. Operational setup and prewarming evidence belongs in doc-8.

## Start here

1. Execution and verification policy: `prompts/OPERATING_RULES.md`, with local environment operations in doc-8.
2. Product/frontend authority: doc-9, doc-15–18, design/1–28 and the MAI-102 authority matrix.
3. Target backend traceability: doc-19.
4. Domain/context/workflow authority: doc-7 and doc-20.
5. Security/data authority: doc-4 and doc-21.
6. API/async/agent/integration authority: doc-3, doc-5, doc-6 and doc-22.
7. Current-state migration inventory: doc-23.
8. Approved implementation sequence: doc-24.
9. Accepted decisions: doc-25–36.

## Canonical architecture and product documents

| Document | Authority |
| --- | --- |
| doc-2 System and Core Architecture | Target modular-monolith system boundary |
| doc-3 Agent Architecture and Workflows | Governed Mission/Plan/Run/Tool model |
| doc-4 Data and Memory Architecture | Persistence, truth, provenance and staleness |
| doc-5 Engine Architecture | Pure calculation/model boundaries |
| doc-6 VDR and Integration Architecture | Provider, secret and readiness boundaries |
| doc-7 M&A Domain Model | Business language and human authority |
| doc-8 Local Setup and Runtime Operations | Current operational setup |
| doc-9 MVP GUI and API Behavior | Approved frontend authority and backend alignment |
| doc-15–18 | Frontend foundation, tokens, components and shell |
| doc-19–24 | MAI-103 target specification and plan |
| doc-25–36 | MAI-103 accepted ADR baseline |

## MAI-103 authority map

- doc-19: complete frontend-to-backend gap matrix.
- doc-20: bounded contexts, aggregates, commands, events and state machines.
- doc-21: tenancy, authorization, persistence, concurrency, audit and provenance.
- doc-22: synchronous API, errors, jobs, events, agent execution and integrations.
- doc-23: Keep/Adapt/Replace/Remove inventory.
- doc-24: owner-approved dependency-ordered implementation plan and BE-Pxx-to-MAI mapping.
- doc-25–36: twelve accepted decisions with alternatives, migration, risks and validation; deferred implementation inputs remain task gates.

## Historical and local material

Deprecated documents retain historical context but are not current authority. `graphify-out/` is generated and non-authoritative. Storybook MDX and `src/agent/agents/**` knowledge are implementation-local. Backlog tasks/milestones are work records, not architecture authority. Figma/design artifacts retain the product authority assigned by approved frontend tasks.
