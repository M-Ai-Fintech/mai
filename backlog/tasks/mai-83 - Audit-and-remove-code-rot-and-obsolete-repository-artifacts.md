---
id: MAI-83
title: Audit and remove code rot and obsolete repository artifacts
status: To Do
assignee: []
created_date: '2026-07-22 05:24'
labels:
  - cleanup
  - architecture
  - code-rot
milestone: m-14
dependencies: []
priority: medium
ordinal: 75000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Run the code-rot-cleaner workflow in report-only mode first, then conservatively prove and remove approved dead code, orphan modules, duplicate implementations, stale scripts, obsolete validators, generated-looking artifacts, and unnecessary files. The broken Stitch validation script/reference is an explicit candidate. Discovery is not permission to delete.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 A deterministic report is generated under outputs/code-rot-cleaner/ with every candidate classified as SAFE TO REMOVE, REVIEW, or KEEP
- [ ] #2 Framework routes, dynamic imports, registries, CLI entry points, migrations, tests, and deployment conventions are checked before classifying candidates
- [ ] #3 Removal proof is performed only in disposable copies and only after approval to run the named project commands
- [ ] #4 The Stitch validator and any package-script reference to its missing implementation are evaluated as explicit candidates
- [ ] #5 Real repository deletions occur only after candidate-by-candidate approval naming exact IDs and paths
- [ ] #6 Approved cleanup is followed by the repository-wide verification gate and an inspected, scope-limited diff
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 The report records removable LOC/bytes, evidence, proof results, residual risk, and rejected candidates
- [ ] #2 No unapproved source, documentation, manifest, lockfile, test, or configuration change is made
- [ ] #3 All relevant verification commands pass after any approved cleanup batch
<!-- DOD:END -->
