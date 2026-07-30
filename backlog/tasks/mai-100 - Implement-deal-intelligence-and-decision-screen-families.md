---
id: MAI-100
title: Implement deal intelligence and decision screen families
status: Done
assignee:
  - '@codex'
created_date: '2026-07-28 03:08'
updated_date: '2026-07-30 01:34'
labels:
  - frontend
  - screen-implementation
  - deal-intelligence
  - decision-ui
  - mai-85-initiative
milestone: m-12
dependencies:
  - MAI-99
documentation:
  - design/
  - >-
    backlog/docs/index/doc-10 -
    Documentation-Index-and-Information-Architecture.md
  - backlog/docs/product/mvp-gui-and-api/doc-9 - MVP-GUI-and-API-Behavior.md
modified_files:
  - gui/lib/shell/route-registry.ts
  - gui/lib/shell/route-registry.test.ts
  - gui/app/_shell/AppShell.tsx
  - gui/app/_shell/AppShell.test.ts
  - gui/screens/deal-intelligence/contracts.ts
  - gui/screens/deal-intelligence/fixtures.ts
  - gui/screens/deal-intelligence/DealIntelligenceBody.tsx
  - gui/screens/deal-intelligence/DealIntelligenceBody.module.css
  - gui/screens/deal-intelligence/DealIntelligenceBody.test.ts
  - gui/screens/deal-intelligence/DealIntelligenceBody.stories.tsx
  - gui/screens/deal-intelligence/state-coverage.ts
  - gui/scripts/verify-deal-screens.mjs
  - gui/scripts/verify-screens.mjs
  - gui/package.json
  - scripts/verify.ts
priority: high
ordinal: 87000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Delivery step 12 of the MAI-85 initiative.

Implement these approved Figma screen families:

- Deal Overview
- Target Dossier
- Documents & VDR
- Diligence Decision Room
- Valuation Lab
- Matching & Counterparty Universe

Use typed local fixtures and adapters where backend behavior has not yet been redesigned.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 All six listed screen families are implemented against their approved Figma frames and governed definitions.
- [ ] #2 Evidence, fact, provenance, confidence, approval, and permission boundaries match the approved experience.
- [ ] #3 Shared deal context, cross-screen navigation, decisions, and state transitions are consistent.
- [ ] #4 Required loading, empty, error, restricted, stale-data, destructive-action, and approval states are implemented.
- [ ] #5 Unapproved backend behavior is isolated behind typed local fixtures and adapters without false production claims.
- [ ] #6 Each screen family has focused component, interaction, route, state, and accessibility tests.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. baseline;
2. live Figma and contract audit;
3. deal-intelligence domain contracts;
4. Overview, Dossier, and Documents;
5. Decision Room;
6. Valuation and Matching;
7. focused tests;
8. rendered review;
9. final verification;
10. Draft PR.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Baseline: master contains 3ee491ab4600b92512bf63132674cb6005b05209. Initial canonical verify was blocked at GUI foundation because sandbox denied Node spawning git (EPERM); rerun under scoped Git permission started successfully but its terminal summary was not retained by the tool.

Implemented MAI-100 local-only typed contracts, six owned route bodies, cross-screen DOC-120/v18 -> FAC-018 stale -> FND-014 review -> VAL-HOR-03 provisional -> Overview blocker -> human decision trace, state matrix, Storybook coverage, and verification gate. Focused evidence: npm --prefix gui run test:unit (33 files, 81 tests passed); verify:tokens/components/shell/screens/foundation/deal-screens and lint passed; npm --prefix gui run build passed; build-storybook passed; test-storybook (26 files, 124 tests passed).

Rendered review limitation: in-app browser controller was unavailable in this session, so no manual screenshot inspection is claimed. Storybook build and interaction coverage completed. MAI-100 remains In Progress pending final verification, draft PR, and owner review.

Final verification sequence completed its visible GUI gates (including production build and Storybook build/test), then ran canonical deno task verify. The process exited, but the combined command channel lost its terminal summary; therefore canonical verification is not recorded as PASS. No Draft PR was opened: manual rendered inspection and retained canonical terminal output are required owner-gate evidence.

Rendered-review workflow attempt: temporary workflow commit 1936871 was pushed, but GitHub returned HTTP 404 before creating a job. No run ID, job ID, artifact, screenshots, report.json, or digest exists. Temporary workflow and runner were removed in the next commit; MAI-100 remains In Progress.
<!-- SECTION:NOTES:END -->
