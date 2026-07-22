---
id: MAI-65
title: Audit backend support for prototype functionality
status: To Do
assignee: []
created_date: '2026-07-19 06:53'
updated_date: '2026-07-22 05:30'
labels:
  - backend
  - api
  - GUI
  - stitch
  - superseded
milestone: m-6
dependencies: []
references:
  - src/api/server.ts
  - gui/lib/api-client.ts
modified_files:
  - gui/docs/backend-capability-matrix.md
priority: high
ordinal: 3
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Check the Deno backend, Next API routes, ApiClient, repositories, and persistence model before committing UI flows to Stitch. The output is a capability matrix separating supported functionality from required backend work.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Deals, clients, team, chat, engines, notifications, and custom dashboard layout persistence are each classified as supported, partial, or missing
- [x] #2 Required API contracts are specified before the prototype prompt includes dependent interactions
- [x] #3 Unsupported features are either removed from the first prototype or converted into explicit backend tasks
- [x] #4 ApiClient changes required for the GUI are identified
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Trace backend routes, repositories, persistence, GUI API client, and tests.
2. Classify each prototype capability as supported, partial, or missing with evidence.
3. Specify stable request and response contracts needed by the prototype.
4. Identify ApiClient work and scope unsupported features for MAI-67.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Investigation traced each UI-to-client-to-route-to-persistence flow. Deals, chat, and engines are partial; entities, team, notifications, and server-backed dashboard layouts are missing. Frozen DTO and endpoint contracts define what MAI-66 may prototype and what MAI-67 must implement. Validation: file evidence checked with rg; git diff --check passed; artifact is non-empty.
<!-- SECTION:NOTES:END -->

## Comments

<!-- COMMENTS:BEGIN -->
author: @codex
created: 2026-07-22 05:29
---
## Rebaseline disposition — 2026-07-22\n\nSuperseded by the current repository-wide rebaseline. The claimed backend capability matrix artifact is absent, so this historical audit is not reproducible evidence.\n\nThis task is archived as superseded rather than treated as completed. Any remaining required outcome is tracked by the referenced replacement task or milestone.
---
<!-- COMMENTS:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Created the backend capability matrix with supported/partial/missing classifications, end-to-end root causes, frozen API contracts, ApiClient changes, implementation order, risks, and verification requirements.
<!-- SECTION:FINAL_SUMMARY:END -->
