---
id: MAI-150
title: Retire the legacy banker-facing CLI and preserve bounded operator tooling
status: To Do
assignee: []
created_date: '2026-07-31 06:17'
labels:
  - backend
  - architecture
  - cli
  - retirement
  - migration
  - security
  - operations
  - cleanup
  - mvp
milestone: m-12
dependencies:
  - MAI-126
priority: high
ordinal: 136000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Retire the legacy banker-facing interactive CLI after the approved frontend and API adapter cutover.

The CLI is not part of the target banker product experience.

The current command surface includes prototype-oriented technical commands such as:

- kyb;
- predict;
- portfolio;
- negotiate;
- document;
- chat.

Those commands must not remain as a second product interface or bypass the approved application services, authorization policies, audit boundaries, versioning, idempotency, and human-authority controls.

This task owns:

- complete inventory of CLI entry points, commands, dependencies, tests, documentation, and runtime registrations;
- classification of banker-facing commands versus legitimate developer or operator tooling;
- removal of the banker-facing interactive CLI;
- removal of obsolete CLI command dispatch and presentation code;
- removal of unused CLI-only dependencies;
- migration or retirement of CLI tests;
- documentation cleanup;
- preservation of bounded internal operator tooling where a current operational requirement exists;
- verification that no authoritative business workflow exists only through the CLI;
- verification that no CLI path bypasses application-service authorization, audit, idempotency, or human approval.

This task does not own:

- removal of domain engines;
- removal of mathematical calculations;
- removal of migration scripts;
- removal of operational diagnostics;
- frontend redesign;
- API redesign;
- business-data migration;
- provider certification.

Internal tooling may remain only when it is:

- explicitly non-product;
- documented;
- access-controlled where required;
- scoped to administrative or development operations;
- implemented through approved application services or platform ports;
- unable to bypass human-only decisions;
- unable to expose secrets or protected data.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Every CLI entry point, command, prompt, dependency, test, documentation reference, and runtime registration is inventoried.
- [ ] #2 Each item is classified as:

   - banker-facing product CLI;
   - developer utility;
   - migration utility;
   - operational diagnostic;
   - obsolete prototype code;
   - shared reusable implementation.
- [ ] #3 The banker-facing interactive CLI is removed from supported product entry points.
- [ ] #4 Prototype product commands such as `kyb`, `predict`, `portfolio`, `negotiate`, `document`, and `chat` are removed or made inaccessible as banker-facing CLI workflows.
- [ ] #5 Removal does not delete domain logic, engines, adapters, or calculations still used through approved application services.
- [ ] #6 No authoritative workflow exists only through the removed CLI.
- [ ] #7 Required product workflows are available through the approved frontend, API, jobs, or application-service boundaries before their CLI equivalent is removed.
- [ ] #8 Any retained internal command is placed under an explicit operator, migration, script, or development boundary.
- [ ] #9 Retained tooling cannot bypass:

   - tenant or workspace scope;
   - authorization;
   - permission-safe loading;
   - audit;
   - idempotency;
   - concurrency;
   - human approval;
   - external-side-effect authorization.
- [ ] #10 Retained tooling uses structured, sanitized errors and does not expose secrets, credentials, tokens, stack traces, or protected object details by default.
- [ ] #11 Debug output is explicitly enabled and remains subject to secret and protected-data redaction.
- [ ] #12 CLI-only packages and dependencies with no remaining consumer are removed.
- [ ] #13 CLI-only logs, generated files, history files, and local state are removed from product behavior or placed under explicit ignored operator paths.
- [ ] #14 Documentation no longer presents the CLI as a supported banker-facing product interface.
- [ ] #15 Tests prove:

    - removed entry points are unavailable;
    - supported server/frontend entry points remain functional;
    - retained operator tooling is bounded;
    - no authorization bypass exists;
    - secret redaction remains effective;
    - canonical workflows do not depend on the CLI.
- [ ] #16 The retirement is compatible with MAI-129 migration and rollback plans.
- [ ] #17 Focused tests and the canonical repository verification gate pass.
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Record:

- MAI-150 removes the legacy product CLI, not all command-line scripts.
- Migration, seed, diagnostic, and recovery scripts may remain when justified.
- Useful secret-redaction and structured-error behavior should be adapted into shared platform or operator tooling rather than deleted blindly.
- Existing CLI code and tests are migration evidence until the task executes.
- Physical removal occurs only after consumer cutover is proven.
<!-- SECTION:NOTES:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Every acceptance criterion is checked with current evidence.
- [ ] #2 The banker-facing interactive CLI is no longer a supported product surface.
- [ ] #3 Obsolete CLI dispatch, prompts, presentation code, tests, documentation, and unused dependencies are removed.
- [ ] #4 Shared domain and engine code required by the target architecture remains intact.
- [ ] #5 Any retained operator or migration tooling is explicitly bounded and documented.
- [ ] #6 No retained command bypasses security, audit, idempotency, concurrency, or human-authority controls.
- [ ] #7 MAI-129 depends on MAI-150.
- [ ] #8 The canonical frontend/API workflows remain operational.
- [ ] #9 Canonical repository verification passes.
<!-- DOD:END -->
