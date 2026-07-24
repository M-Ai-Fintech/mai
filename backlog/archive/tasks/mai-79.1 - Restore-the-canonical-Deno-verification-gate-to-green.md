---
id: MAI-79.1
title: Restore the canonical Deno verification gate to green
status: To Do
assignee: []
created_date: '2026-07-24 09:14'
labels:
  - testing
  - reliability
  - bug
milestone: m-9
dependencies: []
parent_task_id: MAI-79
priority: high
ordinal: 79000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Resolve the existing Deno failures exposed by MAI-79 so `deno task verify` passes from a clean checkout. This task is the prerequisite for closing MAI-79: on completion, record the exact green-gate evidence on MAI-79 and return ownership to that parent task. Do not weaken MAI-79 by excluding tests based on directory, filename, mocks, or unavailable services.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Every Deno failure currently reported by `deno task verify` is fixed or replaced with an explicit, real-service integration profile with no mock pass-through
- [ ] #2 `deno task verify` passes from a clean checkout after documented prerequisites
- [ ] #3 The gate continues to collect all supported test conventions under tests/, src/, and scripts/
- [ ] #4 Completion notes update MAI-79 with the green-gate evidence and direct finalization back to the parent task
<!-- AC:END -->
