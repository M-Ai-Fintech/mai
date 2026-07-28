---
id: MAI-92
title: Design deal intelligence and decision screen families in Figma
status: In Progress
assignee:
  - '@codex'
created_date: '2026-07-28 03:07'
updated_date: '2026-07-28 23:14'
labels:
  - figma
  - screen-design
  - deal-intelligence
  - decision-ui
  - mai-85-initiative
milestone: m-12
dependencies:
  - MAI-91
documentation:
  - design/
  - >-
    backlog/docs/index/doc-10 -
    Documentation-Index-and-Information-Architecture.md
  - backlog/docs/product/mvp-gui-and-api/doc-9 - MVP-GUI-and-API-Behavior.md
modified_files:
  - design/5_Deal_Overview.md
  - design/6_Target_Dossier.md
  - design/7_Documents_VDR.md
  - design/8_Diligence_Decision_Room.md
  - design/9_Valuation_Lab.md
  - design/10_Matching_Counterparty_Universe.md
  - >-
    backlog/tasks/mai-92 -
    Design-deal-intelligence-and-decision-screen-families-in-Figma.md
  - graphify-out/GRAPH_REPORT.md
  - graphify-out/graph.json
priority: high
ordinal: 500
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Delivery step 4 of the MAI-85 initiative.

Design the following six deal intelligence and decision screen families in the approved Figma system:

- Deal Overview
- Target Dossier
- Documents & VDR
- Diligence Decision Room
- Valuation Lab
- Matching & Counterparty Universe

Import, verify, and link the completed Diligence Decision Room design. Rework it only where needed for conformance with the approved design system and cross-screen workflow.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Approved Figma frames are linked for all six listed screen families.
- [x] #2 The completed Diligence Decision Room is imported, verified, linked, and assessed for design-system and workflow conformance.
- [x] #3 Evidence, fact, provenance, confidence, approval, and permission boundaries are visible and consistent wherever relevant.
- [x] #4 Cross-screen deal data, decisions, and workflow transitions are explicit and internally consistent.
- [x] #5 Relevant default, loading, empty, error, restricted, stale-data, destructive-action, and approval states are designed.
- [ ] #6 Required desktop, tablet, and mobile behavior is explicit, and review findings are resolved or tracked.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Batch 1 — Deal Context: compose and validate governed Deal Overview and Target Dossier desktop, tablet, mobile, state, route, authority, fixture, and handoff evidence.
2. Batch 2 — Documents and Diligence: compose Documents & VDR; link and verify approved Diligence Decision Room evidence plus cross-screen conformance, state, route, authority, and handoff evidence.
3. Batch 3 — Valuation and Matching: compose Valuation Lab and Matching & Counterparty Universe; consolidate state, responsive, accessibility, and engineering-handoff boards; resolve P0/P1, record P2, validate definition links, and open one draft PR.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
2026-07-28 — Started after MAI-91 owner-approved closure and PR #11 merge (118dcb21). Scope is exactly six MAI-92 deal-intelligence and decision families in Figma file otMJE31OKIxdXogV4RNbGQ. No MAI-93/94, frontend, Storybook, token, backend, legacy GUI, or external-integration implementation is authorized.

2026-07-28 — Blocked before MAI-92 review/PR: initial Batch 1 review found material P1 conformance gaps in viewport-integrated Deal Overview/Target Dossier content, responsive proof, and state-specimen evidence. A concrete viewport/fixture/state correction was applied, but full re-review and the remaining family-specific compositions are still required. No acceptance criteria were checked; no PR was opened; task remains In Progress.

2026-07-28 — Quality blocker resolved in existing MAI-92 nodes: inherited Diligence work canvases were hidden in the five affected families; in-place product surfaces now carry deal, dossier, document-control, valuation, and matching anatomy across desktop/tablet/mobile. Decision Room approved nodes 52:21, 56:39, 57:87, 58:97, 58:139, 59:115, and 59:144 were preserved; MAI-92 conformance board records document/evidence/fact/finding/scenario/approval/audit transitions. Read-only reviews found no P0. P1 overlap/sparse-surface findings were corrected in place and all affected nodes were re-rendered at native dimensions. P2: Decision Room conformance board could be formatted more scanably; no blocking action. Documentation check: deno run --allow-read scripts/check_docs.ts (passed). git diff --check (passed). No frontend implementation.

2026-07-28 — Draft PR #12 opened: https://github.com/luisfelipeluis49/mai/pull/12. Commits: 755d4ba, de9ea6a, e333ee2. Branch: design/MAI-92-deal-intelligence-decision-screens. MAI-92 remains In Progress pending owner approval; AC #1 and #6 remain unchecked by design.
<!-- SECTION:NOTES:END -->
