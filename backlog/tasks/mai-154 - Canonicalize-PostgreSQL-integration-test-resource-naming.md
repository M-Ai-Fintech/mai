---
id: MAI-154
title: Canonicalize PostgreSQL integration-test resource naming
status: In Progress
assignee: []
created_date: '2026-08-06 17:10'
updated_date: '2026-08-06 18:37'
labels: []
dependencies: []
priority: medium
ordinal: 131000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Canonical semantic naming for isolated PostgreSQL integration-test infrastructure across local Docker, tests, configuration, and documentation. Backlog task IDs remain governance references only and must not appear in runtime or resource identifiers.
<!-- SECTION:DESCRIPTION:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Investigation found task-derived MAI106 and MAI123 names inherited from bounded-context setup, plus MAI148 local infrastructure names. Canonical shared target: POSTGRES_INTEGRATION_TEST_DATABASE_URL / mai_test_postgres_integration / postgres-integration-test. Notifications use a distinct semantic target because its migration lifecycle is separate.

Final evidence 2026-08-06: canonical semantic naming guard now validates active file paths and contents; GUI authority matrix path was renamed; root AGENTS naming rule committed. Complete serial PostgreSQL suite passed 39 files with zero ignored. Canonical deno task verify remains blocked by parallel shared-database migration collisions; MAI-114 remains In Progress.

Final verification 2026-08-06: root cause was canonical Deno parallel execution sharing POSTGRES_INTEGRATION_TEST_DATABASE_URL and NOTIFICATIONS_INTEGRATION_TEST_DATABASE_URL while migration/setup tests created the same role_policies and deals relations. The correction adds scripts/run_canonical_deno_tests.ts, which keeps 145 non-PostgreSQL files parallel and runs 44 PostgreSQL/database-marked files serially; it also preserves parent environment variables in scripts/verify.ts and adds runner regression tests. Focused runner tests: 11 passed, 0 failed. Complete serial PostgreSQL pass: 44 files, 0 failed, 0 ignored. Final clean DENO_ENV=test deno task verify: all 18 categories passed, exit 0. Final commit: 71fb5ce. No task-derived resource naming, migration, or domain behavior changed.
<!-- SECTION:NOTES:END -->

## Comments

<!-- COMMENTS:BEGIN -->
created: 2026-08-06 18:37
---
Canonical verification blocker resolved in 71fb5ce. PostgreSQL setup/migration collisions are eliminated by deliberate category-level serialization; parallel non-database verification remains enabled.
---
<!-- COMMENTS:END -->
