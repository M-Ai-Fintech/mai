---
id: MAI-91
title: 'Design global, administration, and external screen families in Figma'
status: In Progress
assignee:
  - '@codex'
created_date: '2026-07-28 03:07'
updated_date: '2026-07-28 22:25'
labels:
  - figma
  - screen-design
  - global-ui
  - admin-ui
  - external-ui
  - mai-85-initiative
milestone: m-12
dependencies:
  - MAI-90
references:
  - 'https://www.figma.com/design/otMJE31OKIxdXogV4RNbGQ?node-id=193-662'
  - 'https://www.figma.com/design/otMJE31OKIxdXogV4RNbGQ?node-id=198-662'
  - 'https://www.figma.com/design/otMJE31OKIxdXogV4RNbGQ?node-id=199-662'
  - 'https://www.figma.com/design/otMJE31OKIxdXogV4RNbGQ?node-id=200-663'
  - 'https://www.figma.com/design/otMJE31OKIxdXogV4RNbGQ?node-id=202-665'
  - 'https://github.com/luisfelipeluis49/mai/pull/11'
documentation:
  - design/
  - >-
    backlog/docs/index/doc-10 -
    Documentation-Index-and-Information-Architecture.md
  - backlog/docs/product/mvp-gui-and-api/doc-9 - MVP-GUI-and-API-Behavior.md
modified_files:
  - >-
    backlog/tasks/mai-90 -
    Complete-and-govern-the-25-banker-workspace-design-definitions.md
  - >-
    backlog/tasks/mai-91 -
    Design-global-administration-and-external-screen-families-in-Figma.md
  - graphify-out/GRAPH_REPORT.md
  - graphify-out/graph.json
priority: high
ordinal: 400
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Delivery step 3 of the MAI-85 initiative.

Design the following 12 screen families in the approved Figma system:

- Application Shell & Navigation
- Command Center
- Deals Portfolio
- New Deal Setup
- Tasks & Approvals
- Organizations
- Organization Detail
- Team Workspace
- Notification Center
- Global Search
- Settings screen family
- External-participant screen family
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Approved Figma frames are linked for all 12 listed screen families.
- [x] #2 Every screen traces to its governed design definition and uses only approved design-system foundations and components.
- [x] #3 Relevant default, loading, empty, error, permission, unavailable, and destructive-action states are designed.
- [x] #4 Required desktop, tablet, and mobile behavior is explicit and reviewable.
- [x] #5 Navigation, role, organization, team, and external-participant access behavior is consistent across the family.
- [x] #6 Product, design, accessibility, and engineering review findings are resolved or explicitly tracked.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Batch 1 / Global Foundation: map Application Shell & Navigation, Command Center, and Deals Portfolio to governed definitions, approved shell evidence, responsive variants, states, permissions, and reusable global patterns.
2. Batch 2 / Work and Discovery: map New Deal Setup, Tasks & Approvals, Notification Center, and Global Search to governed definitions, shared state behavior, route boundaries, and reusable work-discovery patterns.
3. Batch 3 / Organizations and Team: map Organizations, Organization Detail, and Team Workspace to governed definitions, organization/team role boundaries, shared fixtures, and responsive review states.
4. Batch 4 / Administration and External: map Settings and External-participant screen families to governed definitions, admin/external permission boundaries, reduced-shell behavior, destructive states, and review handoff evidence.
5. Use one sequential Figma writer in file otMJE31OKIxdXogV4RNbGQ on page 06 Application Shell; reuse approved variables, styles, components, and shell frames; perform one rendered review per batch and resolve P0/P1 issues before draft PR handoff.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
2026-07-28 — MAI-91 started after MAI-90 was marked Done from merged PR #10. Scope is limited to the 12 global, administration, and external screen families in the governed Figma file otMJE31OKIxdXogV4RNbGQ; no MAI-92/93/94, frontend, token, Storybook, or backend implementation work is authorized.

2026-07-28 — Figma delivery evidence: created MAI-91 sections on governed page 06 Application Shell in file otMJE31OKIxdXogV4RNbGQ. Batch boards: Global Foundation 193:662; Work and Discovery 198:662; Organizations and Team 199:662; Administration and External 200:663; Coverage and Handoff 202:665. Validation confirmed all required sections, all 12 screen families, desktop/tablet/mobile frames for every family, four MAI-91 state specimens plus approved Shell states, and handoff board. Rendered reviews performed for each batch: Batch 1 found P1 mobile shell clipping and was repaired; Batch 2 no P0/P1; Batch 3 no P0/P1; Batch 4 found P1 mobile heading overflow and was repaired. Higgsfield pilot was skipped because tool discovery exposed no connected Higgsfield capability. Scope exclusions preserved: no MAI-92/93/94, frontend, token, Storybook, or backend implementation.

2026-07-28 — Verification evidence: git diff --check passed. Initial deno task verify failed under sandbox limits: Next.js production build could not fetch Google Fonts, and Storybook interaction tests hit listen EPERM on 127.0.0.1. Reran deno task verify with escalation; final summary passed Canonical documentation, I18n Strings Check, Deno tests, GUI unit tests, Next.js production build, Storybook documentation, Storybook build, and Storybook interaction tests. Figma read-only validation returned complete=true for required sections, all 12 families with desktop/tablet/mobile frames, state specimens, and handoff board.

2026-07-28 — PR handoff: draft PR #11 opened at https://github.com/luisfelipeluis49/mai/pull/11 from design/MAI-91-global-admin-external-screens to master. Commit in PR: c3b8f5185f8b9b7f28f94a2eb816932973cda519. Remaining action: one task-level owner review; keep MAI-91 In Progress and do not mark Done until owner review is complete and accepted.

2026-07-28 — PR metadata correction: PR #11 currently contains commit c3b8f514915426b36b8f0dce6421def7d10bd325. The earlier PR handoff note's commit value should be read as superseded by this corrected SHA.

2026-07-28 — Final PR branch commit set after handoff metadata push: c3b8f514915426b36b8f0dce6421def7d10bd325 and c51aa43e04dffeafb97af5167f94891cfd992104. Remaining action unchanged: one task-level owner review.
<!-- SECTION:NOTES:END -->
