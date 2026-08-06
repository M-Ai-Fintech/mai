---
id: MAI-154
title: Canonicalize PostgreSQL integration-test resource naming
status: In Progress
assignee: []
created_date: '2026-08-06 17:10'
updated_date: '2026-08-06 17:40'
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
<!-- SECTION:NOTES:END -->
