---
id: MAI-79
title: Establish a repository-wide verification gate
status: To Do
assignee: []
created_date: '2026-07-22 05:24'
labels:
  - testing
  - reliability
milestone: m-9
dependencies: []
priority: high
ordinal: 71000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Create one canonical local verification command that proves the repository state before any task can become Done. The current Deno configuration only discovers tests/**/*.spec.ts, omits colocated src/**/*.test.ts tests, and does not aggregate GUI, Storybook, build, or integration checks.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 One documented command runs every Deno unit, integration, and colocated test under both tests/ and src/
- [ ] #2 The gate runs GUI unit tests, Next.js production build, Storybook build, and Storybook interaction tests
- [ ] #3 The obsolete Stitch validator is not part of the canonical gate and no package script references a missing validator file
- [ ] #4 Any failed child command makes the aggregate command fail with a clear component-level summary
- [ ] #5 Real PostgreSQL, Gemini, and Papermark smoke tests are available in an explicit integration profile and never silently pass through mocks
- [ ] #6 The task completion workflow references this verification gate as mandatory evidence for Done
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 The aggregate gate passes from a clean checkout with documented prerequisites
- [ ] #2 A controlled failing check proves that failures propagate to the final exit code
- [ ] #3 No test suite is excluded solely because of its directory or filename convention
<!-- DOD:END -->
