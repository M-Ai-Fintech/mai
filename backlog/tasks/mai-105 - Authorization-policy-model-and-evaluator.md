---
id: MAI-105
title: Authorization policy model and evaluator
status: In Progress
assignee: []
created_date: '2026-07-30 09:28'
updated_date: '2026-07-30 12:36'
labels:
  - backend
  - architecture
  - wave-2
  - mai-85-initiative
  - security
  - policy
milestone: m-12
dependencies:
  - MAI-104
documentation:
  - >-
    backlog/docs/architecture/backend-redesign/implementation-plan/doc-24 -
    MAI-103-Backend-Implementation-Plan.md
  - >-
    backlog/docs/decisions/proposed-tenancy-authorization/doc-27 -
    Proposed-ADR-Tenancy-and-Authorization-Model.md
  - >-
    backlog/docs/decisions/proposed-postgresql-row-level-security/doc-29 -
    Proposed-ADR-PostgreSQL-Row-Level-Security.md
modified_files:
  - src/platform/authz/v1.ts
  - src/platform/authz/vocabulary.ts
  - src/platform/authz/evaluator.ts
  - src/platform/authz/guard.ts
  - src/platform/authz/projection.ts
  - tests/platform/authz/v1.spec.ts
  - tests/platform/authz/guard_projection.spec.ts
priority: high
ordinal: 91000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Temporary plan identifier: BE-P02

Objective
Implement the resource/action/field/purpose/sponsor/expiry authorization vocabulary and server-side policy evaluator.

Exact scope
RBAC, ABAC and relationship-based checks; protected-not-found behavior; deny-before-load; permission-safe DTO policy; decision reasons and leakage regression suite.

Explicit exclusions
No identity-provider certification, membership UI, RLS deployment, frontend behavior change or provider selection.

Approved dependencies
BE-P01; real Backlog IDs are maintained in doc-24.

Required ADRs
doc-27, doc-29.

Likely files or subsystems
new `src/platform/authz`, policy tests.

Deliverables
Policy port/evaluator, decision reasons and protected-data regression suite.

Acceptance and verification strategy
Policy denies before loaders run; protected absent and unauthorized responses are indistinguishable; field omission property tests pass.
Run focused tests plus the canonical verification required at execution time; use named fakes for external I/O.

Migration, rollout and rollback
Add shadow policy decisions before enforcement; rollback the enforcement flag but never omit audit.

Complexity, parallelization and reviews
High complexity; Wave 2 parallel with BE-P03. Recommended model: gpt-5.6-sol, High reasoning. Security review required.

Deferred implementation inputs and approval gates
Final PostgreSQL RLS rollout scope and break-glass operating policy remain explicit approval gates; do not resolve them in this task.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Policy denies before loaders run; protected absent and unauthorized responses are indistinguishable; field omission property tests pass.
- [x] #2 Scope, exclusions, required ADRs, approval gates and review requirements are reflected in implementation evidence.
- [x] #3 No unauthorized backend/frontend/Figma redesign or production-provider certification is introduced.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Preserve the MAI-104 RequestContext contract and implement a new additive, versioned public authorization surface only at src/platform/authz/v1.ts; keep all evaluator internals private to src/platform/authz.
2. Work test-first at the v1 seam using named deterministic fakes: model trusted vocabulary/request/decision, evaluate deny-first RBAC/ABAC/relationship scope rules, and create immutable allowed-only approved-scope tokens.
3. Add a generic pre-load guard that returns MAI-104 protected 404 equivalently for denied and absent targets without calling denied loaders; add explicit DTO projection that copies only approved classified fields.
4. Cover temporary/external grants, authority constraints, expiry/revocation, scope isolation, safe reason codes, module dependency boundaries, and omission matrix tests without persistence, routing, providers, or GUI code.
5. Run focused checks during TDD, then one scoped final format/lint/test/canonical verification pass after ensuring MAI-106 is not concurrently running the full suite; perform one compact P0/P1 security review, commit, push, create a Draft PR, and retain MAI-105 In Progress pending owner review.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Intake recorded: starting SHA 9986b368ea7a0f1ce15d96345feb505197b7c17a; dedicated clean worktree /home/luis/mai-worktrees/mai-105; branch feat/MAI-105-authorization-policy-model-evaluator. MAI-104 is Done; MAI-105 depends only on MAI-104 and is unassigned. Local branches/commits and GitHub PR search found no competing MAI-105 implementation or PR. Graphify is stale for this boundary; scoped source/ADR discovery is the fallback. Model route per owner: gpt-5.6-terra High; Codex capacity is not exposed; escalate to gpt-5.6-sol High only for a concrete unresolved P0/P1 security or architecture issue.

TDD implementation slice complete. Added the isolated src/platform/authz v1 public surface, trusted pre-load policy vocabulary/evaluator, immutable allowed-only non-serializing scope token, MAI-104 protected-not-found guard, permission-safe projection, and additive shadow/enforce/rollback rollout contract. Focused verification: deno fmt --check src/platform/authz tests/platform/authz = 0; deno lint src/platform/authz tests/platform/authz = 0; deno test --allow-read tests/platform/authz/v1.spec.ts tests/platform/authz/guard_projection.spec.ts = 0 (19 passed). No persistence, events, jobs, API routes, GUI, Figma, lockfile, or Graphify file was changed.

Final security review (read-only): 0 open P0/P1. Verified deny-before-load and canonical protected-not-found equivalence, tenant/workspace/deal context equality, deny/restriction precedence, expiry/revocation plus purpose/sponsor external constraints, human-only authority, external internal-classification omission, classification-bound projection, non-serializing allowed-only tokens, safe reason codes, and v1-only public exports. Corrected one P1 during review: projection now requires an explicit schema field plus an exact approved field-classification match before copying. Final scoped evidence after that correction: git diff --check = 0; deno fmt --check changed MAI-105 files = 0; deno lint changed MAI-105 TypeScript files = 0; deno test --allow-read tests/platform/authz/v1.spec.ts tests/platform/authz/guard_projection.spec.ts = 0 (19 passed). Final deno task verify was executed once outside the sandbox: backend/docs and GUI boundary checks passed, but overall exit 1 because GUI vitest/next/playwright/storybook dependencies are absent; no dependency installation is authorized. Baseline had the same missing-GUI dependency limitation plus sandbox git-spawn EPERM; the escalated final run cleared the EPERM.
<!-- SECTION:NOTES:END -->
