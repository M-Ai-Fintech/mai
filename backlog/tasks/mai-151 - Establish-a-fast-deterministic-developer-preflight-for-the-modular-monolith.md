---
id: MAI-151
title: Establish a fast deterministic developer preflight for the modular monolith
status: To Do
assignee: []
created_date: '2026-07-31 17:33'
updated_date: '2026-08-01 11:14'
labels:
  - backend
  - architecture
  - testing
  - developer-experience
  - reliability
  - preflight
  - mvp
  - delivery-wave-a
milestone: m-12
dependencies:
  - MAI-79
  - MAI-106
priority: high
ordinal: 10900
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Create a fast deterministic developer preflight for the approved MAI modular monolith.

The preflight provides inexpensive local and CI feedback before the complete canonical verification gate.

It is not:
- a banker-facing CLI command;
- a substitute for `deno task verify`;
- a substitute for `deno task verify:integration`;
- a real PostgreSQL, Gemini, Papermark, Transformers, identity-provider, VDR, cloud, or production health check;
- permission to report unavailable dependencies as healthy;
- permission to use silent mocks.

MAI-79 remains the authoritative complete repository gate.

The explicit integration profile remains the authority for real configured providers and infrastructure.

MAI-151 owns:
- a documented fast preflight command;
- an explicit manifest of included checks;
- deterministic fixture selection;
- offline execution;
- minimum permissions;
- bounded modular-monolith contract checks;
- clear component-level failure output;
- measured execution budget;
- prevention of static or fabricated "healthy" reports.

Relationships:
- Supersedes: MAI-3
- Complements: MAI-79
- Dependency of: MAI-131
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 One documented command exists, preferably: deno task verify:fast or an equivalently clear non-product name.
- [ ] #2 The command is explicitly developer/operator tooling and is not registered as a banker-facing interactive CLI command.
- [ ] #3 The command runs with network access disabled.
- [ ] #4 The command does not require a live PostgreSQL server.
- [ ] #5 The command does not require Gemini, Papermark, Transformers downloads, cloud credentials, VDR credentials, or identity-provider credentials.
- [ ] #6 Every fixture, fake, or in-memory adapter used by the preflight is selected explicitly and labelled as a test adapter.
- [ ] #7 A failed live dependency must not silently cause selection of a fixture adapter.
- [ ] #8 The included-check manifest covers the currently approved fast critical boundaries, including as applicable: core API contract parsing; authorization policy evaluation; Deal terminology enforcement; deterministic workflow transitions; persistence contract types; durable-job state mechanics; outbox/inbox contract mechanics; Target Dossier proposal boundary; term-sheet contract separation; DomainArea and RiskSeverity contracts.
- [ ] #9 The preflight excludes checks that require: live providers; external network access; production builds; Storybook browser execution; cloud infrastructure; long-running model downloads.
- [ ] #10 Excluded checks are documented and remain covered by deno task verify, deno task verify:integration, or their owning implementation tasks.
- [ ] #11 The command reports each component as: passed; failed; skipped by explicit manifest; unavailable by explicit configuration.
- [ ] #12 It never prints a static "database healthy", "network healthy", "provider healthy", or equivalent message without executing the corresponding real check.
- [ ] #13 Any failed included component causes a non-zero final exit code.
- [ ] #14 The command uses only the minimum required Deno permissions.
- [ ] #15 The command is deterministic for identical repository state and fixture inputs.
- [ ] #16 A controlled failing test proves failure propagation.
- [ ] #17 A reference-runner benchmark records at least ten runs.
- [ ] #18 The initial p95 execution target is no more than five seconds on the documented reference runner.
- [ ] #19 The five-second target is not represented as a universal cross-machine SLA.
- [ ] #20 Documentation explains the difference between: fast preflight; canonical repository verification; live integration verification; deployed environment health checks.
- [ ] #21 Focused tests and deno task verify pass.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Inventory deno configuration, verification scripts, smoke tests, and MAI-106 contracts; define an explicit fast manifest and exclusions.
2. Add offline minimum-permission verify:fast with explicit deterministic fixtures and component status reporting.
3. Exclude live DB/network/providers/cloud/browser/builds and fail closed on unavailable live dependencies.
4. Add determinism, permission, failure, manifest, and ten-run p95 benchmark evidence; run focused checks and deno task verify.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Record:
- The existing tests/smoke.spec.ts and test:smoke task are migration evidence, not automatically the target design.
- Existing useful deterministic tests may be adapted rather than discarded.
- The MvpStore lifecycle alone is not sufficient preflight coverage.
- Real provider and infrastructure checks belong to the explicit integration and deployment gates.
- MAI-150 remains responsible for retiring the legacy product CLI.

Do not check acceptance criteria during task creation.
<!-- SECTION:NOTES:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Every acceptance criterion is checked with current evidence.
- [ ] #2 The preflight command is documented and reproducible.
- [ ] #3 The included and excluded check manifests are explicit.
- [ ] #4 Offline and minimum-permission execution is proven.
- [ ] #5 Deterministic fixtures cannot be selected through silent production fallback.
- [ ] #6 Controlled failure propagation is proven.
- [ ] #7 Reference-runner timing evidence is recorded.
- [ ] #8 MAI-131 depends on MAI-151.
- [ ] #9 MAI-79 remains the authoritative complete verification gate.
- [ ] #10 No banker-facing CLI command was introduced.
- [ ] #11 The canonical repository verification gate passes.
<!-- DOD:END -->
