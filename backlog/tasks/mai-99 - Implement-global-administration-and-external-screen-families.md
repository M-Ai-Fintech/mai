---
id: MAI-99
title: 'Implement global, administration, and external screen families'
status: In Progress
assignee:
  - '@codex'
created_date: '2026-07-28 03:08'
updated_date: '2026-07-29 23:34'
labels:
  - frontend
  - screen-implementation
  - global-ui
  - admin-ui
  - external-ui
  - mai-85-initiative
milestone: m-12
dependencies:
  - MAI-98
references:
  - 'PR #19 https://github.com/luisfelipeluis49/mai/pull/19'
documentation:
  - design/
  - >-
    backlog/docs/index/doc-10 -
    Documentation-Index-and-Information-Architecture.md
  - backlog/docs/product/mvp-gui-and-api/doc-9 - MVP-GUI-and-API-Behavior.md
modified_files:
  - gui/.storybook/main.ts
  - gui/app/_shell/AppShell.tsx
  - gui/app/_shell/AppShell.test.ts
  - gui/lib/shell/route-registry.ts
  - gui/lib/shell/route-registry.test.ts
  - gui/screens/ScreenBody.tsx
  - gui/screens/ScreenBody.module.css
  - gui/screens/screen-contracts.ts
  - gui/screens/fixtures.ts
  - gui/screens/ScreenBody.test.ts
  - gui/screens/ScreenBody.stories.tsx
  - gui/scripts/verify-screens.mjs
  - gui/package.json
  - gui/vitest.unit.config.ts
  - scripts/verify.ts
priority: high
ordinal: 1200
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Delivery step 11 of the MAI-85 initiative.

Implement these approved Figma screen families:

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

Use typed local fixtures and adapters where backend behavior has not yet been redesigned.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 All 11 listed screen families are implemented against their approved Figma frames and governed design definitions.
- [x] #2 Required default, loading, empty, error, permission, unavailable, and destructive-action states are implemented.
- [x] #3 Role, organization, team, and external-participant access behavior is explicit and consistent.
- [x] #4 Desktop, tablet, mobile, keyboard, focus, and content behavior conforms to the approved designs.
- [x] #5 Unapproved backend behavior is isolated behind typed local fixtures and adapters without false production claims.
- [x] #6 Each screen family has focused component, interaction, route, state, and accessibility tests.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Baseline: verify MAI-98 merge ancestry and run the canonical repository gate once.\n2. Live Figma screen audit: inspect the 33 approved responsive frames and five state-coverage boards read-only; record node traceability and boundaries.\n3. Shared screen-state and fixture architecture: add typed local adapters, safe screen props, a route-to-body resolver, and the committed coverage matrix.\n4. Global/work screens: implement Command Center, Deals Portfolio, New Deal Setup, Tasks & Approvals, Notification Center, and Global Search with focused coverage.\n5. Organization/team screens: implement Organizations, Organization Detail, and Team Workspace with fixture and access boundaries.\n6. Administration/external screens: implement Settings and External Participation with masked, locked, sensitive, and privacy-safe states.\n7. Tests: add route, state, privacy, responsive, keyboard, focus, and confirmation coverage plus verify:screens.\n8. Rendered review: inspect all 33 approved desktop, tablet, and mobile frames with deterministic checks and documented evidence.\n9. Final verification: run the prescribed GUI and canonical gates, graph update, diff checks, and record exact results.\n10. Draft PR: commit cohesive slices, push the branch, open one Draft PR, and keep MAI-99 In Progress pending owner review and merge.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Model and ownership: gpt-5.6-sol Low completed the takeover as sole repository writer; no audit or implementation agent was spawned.

Figma frame matrix reviewed read-only: Command Center 193:957 / 193:1057 / 193:1157; Deals Portfolio 193:1258 / 193:1378 / 193:1498; New Deal Setup 198:665 / 198:731 / 198:784; Tasks and Approvals 198:824 / 198:888 / 198:939; Notification Center 198:977 / 198:1043 / 198:1096; Global Search 198:1136 / 198:1200 / 198:1251; Organizations 199:665 / 199:724 / 199:770; Organization Detail 199:810 / 199:869 / 199:915; Team Workspace 199:955 / 199:1014 / 199:1060; Settings 200:666 / 200:725 / 200:771; External Participant 200:811 / 200:868 / 200:912. State authorities: 193:1618, 198:1288, 199:1099, 200:951, 202:665.

Architecture: 11 approved route IDs resolve through the MAI-98 route registry into isolated typed screen contracts outside AppShell. Shared screen fixtures disclose local demonstration data. Global work, directory, administration, and external adapters keep loading, data, authorization, availability, and failure distinct. External fixtures are structurally limited to participant-safe fields and contain no internal strategy, findings, counts, organization metadata, unrestricted participant data, secrets, or production mutation claims.

State coverage: Command Center owns empty and unavailable; Deals owns loading and responsive table/list semantics; New Deal owns typed validation, unsaved draft, and discard confirmation; Tasks owns restricted exact-context work; Notifications owns unread, empty, and partial failure separately from approvals; Search owns loading, empty, partial failure, permission filtering, and keyboard results; Organizations owns duplicate review; Organization Detail owns restricted history; Team owns staffing gap, offboarding blocked, and destructive confirmation; Settings owns masked secret, policy locked, restricted, unsaved, and destructive states; External owns expired, restricted, unavailable, submitted, and error states. Long-content and mobile constraints are covered by responsive stories and rendered checks.

Focused verification: verify:screens PASS; verify:shell PASS; lint PASS; screen unit tests PASS. After the Storybook discovery correction, build-storybook PASS and 113 Chromium interaction tests across 25 files PASS. Tests cover all 11 mappings, state distinctions, permission-safe props, external exclusion, organization/dossier separation, task/notification separation, exact-context links, search filtering, new-deal validation/unsaved state, masked/locked settings, confirmations, responsive semantics, keyboard/focus, and MAI-100 absence.

Rendered review: initial run 30496183348, job 90725457291, artifact 8741757904, digest sha256:d3f17974a80c3d109b588670a7950f53ec43338dc8c2952f1fa4dae8b19a3142 captured all 33 approved views and report.json. It found one P1 class: link targets below 44 px in Deals, Tasks, Notifications, Search, and Organizations; no P0. Correction added governed 44 px link targets, screen-story discovery, Team destructive coverage, and verifier enforcement. Targeted run 30496639496, job 90726904380, artifact 8741873248, digest sha256:9c083b6e1ee243efbf704a5b8ff4c46229c129cbf999e017c7b8dedd95d0d15f reran all 15 affected responsive views and five edge views: New Deal validation, Team destructive action, Settings secret/policy, External expired/submitted, and Organization restricted history. All corrected views passed overflow, clipping, 44 px targets, semantic token, protected-data, external privacy, destructive-accessibility, and long-content checks. The job removed temporary machinery and its exact-final-tree deno task verify step exited successfully.

Temporary review workflows, runners, screenshots, caches, and artifacts have no final-tree diff. MAI-100 remains absent. verify:screens remains in canonical deno task verify. MAI-99 remains In Progress pending owner review and merge.

Owner-review P1 comment 5124397313 corrected: only MAI-99 global, administration, and external routes are screen-body. Every deal.* route is shell-placeholder with deferredScreenOwner MAI-100. AppShell now renders ScreenBody only for screen-body routes and otherwise shows the neutral MAI-100 deferred placeholder. resolveScreenFamily has no Command Center fallback. Added route, resolver, AppShell, and verifier coverage. Terminal PASS: verify:screens; verify:shell; unit tests 76/76 across 32 files; lint; production build; deno task verify.
<!-- SECTION:NOTES:END -->

## Comments

<!-- COMMENTS:BEGIN -->
author: @codex
created: 2026-07-29 22:42
---
Draft PR #19 opened: https://github.com/luisfelipeluis49/mai/pull/19. Final exact-tree verification is being recorded before owner handoff; no merge or self-approval requested.
---

author: @codex
created: 2026-07-29 22:50
---
Final exact-tree verification: GitHub Actions run 30497262425, job 90728857895, cleanup commit d7310ff, terminal success (exit 0). npm ci plus Chromium installation succeeded; tokens:check, verify:tokens, verify:components, verify:shell, verify:screens, verify:foundation, lint, test:unit, build, validate:storybook-docs, build-storybook, test-storybook, and deno task verify all completed successfully. The first final-only run 30497134279 failed solely because its temporary workflow omitted Playwright browser installation; corrected workflow setup resolved that CI-only defect. No application change followed d7310ff.
---

author: @codex
created: 2026-07-29 23:34
---
Owner-review P1 comment 5124397313 corrected: only MAI-99 global, administration, and external routes are screen-body. Every deal.* route is shell-placeholder with deferredScreenOwner MAI-100. AppShell now renders ScreenBody only for screen-body routes and otherwise shows the neutral MAI-100 deferred placeholder. resolveScreenFamily has no Command Center fallback. Added route, resolver, AppShell, and verifier coverage. Terminal PASS: verify:screens; verify:shell; unit tests 76/76 across 32 files; lint; production build; deno task verify.
---
<!-- COMMENTS:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
MAI-99 implements all 11 approved global, administration, directory, and external screen families with typed fixture boundaries, required state coverage, responsive Storybook stories, focused tests, and a deterministic 33-view rendered review. One P1 target-size class was corrected and rerun clean; no P0/P1 remains. Draft PR #19 is open for one owner review. Keep the task In Progress until owner approval and merge.
<!-- SECTION:FINAL_SUMMARY:END -->
