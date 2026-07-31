---
id: MAI-71
title: Restore Storybook build and component preview
status: Done
assignee:
  - '@codex'
created_date: '2026-07-19 23:37'
updated_date: '2026-07-28 03:00'
labels:
  - storybook
  - frontend
  - bug
  - qa
  - revalidated
milestone: m-12
dependencies: []
references:
  - gui/.storybook/main.ts
  - gui/components
documentation:
  - gui/README.md
modified_files:
  - gui/.storybook/main.ts
  - gui/.storybook/test-runner.ts
  - gui/components
  - gui/scripts/validate-storybook-docs.mjs
  - gui/package.json
  - gui/package-lock.json
  - gui/README.md
priority: high
ordinal: 9
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Diagnose and repair the failing Storybook configuration or stories in gui without weakening component coverage. Preserve the Mastercard component library and verify both the static build and an interactive startup path.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Storybook static build completes successfully
- [x] #2 Storybook dev server starts and serves the component index
- [x] #3 The root cause is covered by configuration or regression validation without removing approved stories
- [x] #4 Relevant Storybook documentation reflects the working command and limitations
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Reproduce the Storybook failure and trace it through configuration, Vite, and the first failing story. 2. Apply the smallest compatible configuration or story fix. 3. Verify build-storybook and a local dev-server smoke response. 4. Record root cause, validation, and QA handoff.
<!-- SECTION:PLAN:END -->

## Comments

<!-- COMMENTS:BEGIN -->
author: @codex
created: 2026-07-22 05:30
---
## Done revalidation — 2026-07-22\n\nDone is preserved. Storybook documentation validation passes for 24 MDX files, 89/89 interaction tests pass, and the static Storybook build succeeds. The missing Stitch validator is unrelated obsolete scope tracked by MAI-83.
---

author: Codex
created: 2026-07-28 02:58
---
Retained as completed Storybook infrastructure evidence. Under the 2026-07-27 MAI-85 rebaseline, this task is not design authority; any reuse is subject to the approved Figma system and MAI-85.9 conformance requirements.
---
<!-- COMMENTS:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Repaired Storybook 10 component indexing: all 24 MDX pages now import their exact .stories.tsx module, with a regression validator at gui/scripts/validate-storybook-docs.mjs. Removed empty story globs and migrated obsolete test-runner packages/configuration to the existing Vitest addon, including story test imports. Made navigation active-state handling safe when Storybook supplies a null pathname, repaired a stale navigation interaction target, and corrected invalid table markup in the coverage story. Verified: npm run validate:storybook-docs (24 docs), npx tsc --noEmit, npm run test-storybook -- --run (89/89), npm run build-storybook, and a live Storybook dev server/index smoke response.
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 Storybook static build completes successfully
- [x] #2 All Storybook interaction tests pass
- [x] #3 Storybook documentation validation passes
<!-- DOD:END -->
