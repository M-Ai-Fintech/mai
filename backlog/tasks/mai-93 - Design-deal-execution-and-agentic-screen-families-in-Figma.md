---
id: MAI-93
title: Design deal execution and agentic screen families in Figma
status: In Progress
assignee: []
created_date: '2026-07-28 03:07'
updated_date: '2026-07-29 02:59'
labels:
  - figma
  - screen-design
  - deal-execution
  - agentic-ui
  - mai-85-initiative
milestone: m-12
dependencies:
  - MAI-92
documentation:
  - design/
  - >-
    backlog/docs/index/doc-10 -
    Documentation-Index-and-Information-Architecture.md
  - backlog/docs/product/mvp-gui-and-api/doc-9 - MVP-GUI-and-API-Behavior.md
priority: high
ordinal: 600
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Delivery step 5 of the MAI-85 initiative, re-baselined for the 12-day desktop-first MVP.

Objective:
Design only the execution and agentic surfaces required for a coherent banker MVP. All scope is desktop-only. Tablet/mobile composition is deferred to downstream implementation.

Keep/defer matrix:
| Screen family | MVP treatment | Rationale |
| Negotiation Room | Keep as the only new execution-room composition | Required to complete the banker path after Matching and to expose human negotiation approvals. Reuse approved Shell, Decision Room evidence, task, approval, and audit patterns. |
| Agentic Workspace | Keep as the only new agentic composition | Required to show proposed, running, blocked, failed, and completed work with citations, evidence, and tool activity. Reuse approved Copilot and task patterns where possible. |
| Deal Activity & Audit | Keep as a shared pattern, not a full new composition | Represent through the existing Activity & Audit output pattern and Decision Room audit linkage. |
| Deal Team & Access | Defer full composition; reuse MAI-91 administration/access patterns | Existing governed global/admin access evidence is sufficient for MVP handoff. |
| Closing Control Room | Defer | Not required for the bounded critical banker path; revisit after MVP validation. |
| Deliverables & Exports | Defer full composition; reuse Documents action pattern | Export/open-source actions can be represented by existing Documents and task patterns. |
| Deal Settings & Archive | Defer full composition; reuse existing admin/settings pattern | No critical-path banker outcome requires a new screen in the 12-day window. |

Non-authoritative responsive drafts are not required. Runtime responsive derivation remains downstream implementation work. No frontend implementation is included.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Desktop-only MVP frames are linked for Negotiation Room and Agentic Workspace; deferred families have an explicit shared-pattern or defer treatment.
- [x] #2 Every kept surface traces to its governed design definition and approved design-system components.
- [x] #3 Human approval, permission, escalation, audit, destructive-action, and irreversible-transition boundaries are explicit.
- [x] #4 Agentic states distinguish proposed, running, blocked, failed, and completed work and expose citations, evidence, and tool activity where required.
- [x] #5 Relevant desktop default, loading, empty, error, restricted, destructive-action, and workflow states are designed.
- [x] #6 Tablet/mobile composition is explicitly deferred for MVP and downstream implementation responsibility is recorded.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Desktop-only Negotiation Room and Agentic Workspace compositions using approved Shell, Decision Room, Tasks & Approvals, Copilot, Evidence, Provenance, Dialog, and Drawer patterns. 2. Document shared-pattern treatment for Activity & Audit, Deal Team & Access, Deliverables & Exports, and Deal Settings & Archive. 3. Verify desktop states, authority, permissions, audit, agentic boundaries, and implementation handoff. 4. Record deferred scope; no tablet/mobile design pass.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Owner re-baseline: MAI-93 is desktop-only for the 12-day MVP. Full compositions are limited to Negotiation Room and Agentic Workspace; Activity & Audit uses an existing shared pattern; administration, access, closing, deliverables, and settings scope is deferred or represented by existing governed patterns.

Desktop-only MVP scope: Negotiation Room node 239:3 and Agentic Workspace node 239:551, with reuse/defer board 239:921, on Figma page 06 Application Shell in section MAI-93 — Desktop Execution & Agentic MVP. Tablet/mobile deferred. Closing Control Room full composition deferred; Deliverables & Exports full composition deferred; Deal Settings & Archive full composition deferred. Deal Activity & Audit and Deal Team & Access represented through shared-pattern reuse. Rendered P0/P1 gate passed; no open P0; no open P1; P2 only. Draft PR #13.

Verification: deno run --allow-read scripts/check_docs.ts passed; git diff --check passed; all seven frontmatters were reviewed with string node IDs 239:3, 239:551, and 239:921; no tablet/mobile nodes were added; no frontend or backend files changed. Acceptance evidence is the completed rendered P0/P1 gate and MAI-93 Figma handoff. Task remains In Progress pending owner review of Draft PR #13.

Delivery: commit b7af96b pushed to design/MAI-93-desktop-execution-agentic-mvp; Draft PR #13 updated at https://github.com/luisfelipeluis49/mai/pull/13. Owner review remains required; MAI-93 intentionally stays In Progress.
<!-- SECTION:NOTES:END -->
