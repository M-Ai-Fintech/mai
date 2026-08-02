---
id: MAI-148
title: >-
  Provision and validate the MAI modular-monolith deployment and operations
  foundation
status: In Progress
assignee:
  - '@codex'
created_date: '2026-07-31 05:51'
updated_date: '2026-08-02 05:38'
labels:
  - backend
  - architecture
  - infrastructure
  - cloud
  - deployment
  - operations
  - security
  - observability
  - persistence
  - testing
  - mai-85-initiative
  - delivery-wave-a
milestone: m-12
dependencies:
  - MAI-106
references:
  - doc-37
  - doc-12
  - MAI-106
  - ef783f6
  - 'https://github.com/luisfelipeluis49/mai/pull/35'
modified_files:
  - .dockerignore
  - .github/workflows/mai-148-contract.yml
  - Dockerfile
  - deno.json
  - infra/README.md
  - infra/environments/development.json
  - infra/environments/staging.json
  - infra/environments/production.json
  - infra/local/docker-compose.yml
  - infra/schemas/mai-148-infrastructure-plan.schema.json
  - infra/runbooks/README.md
  - infra/runbooks/deployment.md
  - infra/runbooks/migration-coordination.md
  - infra/runbooks/rollback.md
  - infra/runbooks/backup-restore.md
  - infra/runbooks/incident-response.md
  - infra/runbooks/credential-rotation.md
  - infra/runbooks/failed-job-recovery.md
  - infra/runbooks/capacity-escalation.md
  - scripts/infra_validate.ts
  - scripts/infra_smoke.ts
  - src/api/server.ts
  - src/platform/jobs/v1.ts
  - src/platform/jobs/worker_process.ts
  - src/platform/operations/contract.ts
  - src/platform/operations/health.ts
  - src/platform/operations/smoke.ts
  - src/platform/operations/v1.ts
  - tests/platform/jobs/worker_process.spec.ts
  - tests/platform/operations/contract.spec.ts
  - tests/platform/operations/health.spec.ts
  - tests/platform/operations/smoke.spec.ts
  - >-
    backlog/docs/governance/document-inventory/doc-12 -
    Documentation-Inventory-and-Classification.md
  - >-
    backlog/docs/operations/deployment/doc-37 -
    MAI-148-Deployment-and-Operations-Foundation.md
priority: high
ordinal: 10800
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Replace the outdated deployment topology described by MAI-33 and MAI-36 with an infrastructure task aligned to the approved MAI modular-monolith architecture.

The deployment topology must follow actual executable and operational boundaries. It must not create independent “Core API”, “Agents”, and “Engines” microservices merely because those technical categories existed in the prototype.

The platform persistence, transactional outbox, inbox, and durable-job mechanisms implemented under MAI-106 remain the authoritative consistency foundation.

An external event broker may be introduced only behind the approved event transport boundary. It must not become necessary for transaction correctness.

This task owns:
- approved cloud-provider and deployment-topology decision;
- infrastructure as code;
- runtime packaging;
- environment separation;
- application and worker deployment;
- network and private connectivity;
- managed PostgreSQL deployment;
- object storage;
- IAM and workload identity;
- secrets management;
- encryption and key-management controls;
- observability;
- backup and restoration;
- deployment and rollback automation;
- operational runbooks;
- infrastructure smoke and recovery tests;
- cost and capacity controls.

This task does not own:
- bounded-context implementation;
- business database migrations;
- provider adapter implementation;
- AI, VDR, OCR, email, or identity-provider certification;
- historical data migration;
- frontend redesign;
- production promotion;
- final release authorization.

Provider-specific certification remains under MAI-127.

Business-data migration and prototype retirement remain under MAI-129.

The final security and operational production-candidate decision remains under MAI-131.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 The selected cloud provider, regions, account/project structure, and deployment topology are explicitly approved and recorded.
- [x] #2 The topology deploys the modular monolith and only those worker or job processes justified by runtime, scaling, isolation, or failure-boundary requirements.
- [x] #3 The topology does not create arbitrary Core, Agent, or Engine microservices merely to reproduce the prototype structure.
- [ ] #4 Infrastructure as code reproducibly provisions the approved development, staging, and production environment boundaries.
- [ ] #5 Infrastructure state uses an approved remote backend, access control, locking or concurrency protection, backup, and recovery procedure.
- [x] #6 Runtime services and jobs define: ownership; command or entry point; health and readiness behavior; CPU and memory limits; timeout; concurrency; minimum and maximum scaling; shutdown and drain behavior.
- [ ] #7 Managed PostgreSQL uses private or otherwise explicitly approved connectivity, approved availability settings, automated backups, point-in-time recovery, and a tested restoration procedure.
- [ ] #8 The availability topology, replicas, failover behavior, RPO, and RTO are derived from approved requirements rather than enabled by assumption.
- [x] #9 Object storage defines: data classifications; tenant and environment boundaries; versioning; lifecycle; retention; legal-hold compatibility; deletion behavior; approved encryption controls.
- [ ] #10 Secrets use the approved secrets manager or equivalent. No long-lived cloud-service credential is committed to the repository or required in CI.
- [ ] #11 CI and deployment automation use workload identity federation or equivalent short-lived credentials.
- [ ] #12 IAM follows least privilege and contains no production Owner, Editor, or equivalent broad grant without an explicit approved exception.
- [x] #13 Public ingress, private connectivity, network egress, administrative access, and service-to-service access are explicit and minimized.
- [x] #14 Transactional outbox, inbox, and durable jobs remain correct and recoverable without requiring a cloud message broker.
- [ ] #15 Any cloud event or message transport is implemented behind the approved event interface and has explicit retry, dead-letter, idempotency, and operational semantics.
- [x] #16 Schema migrations execute through a controlled pre-traffic or compatibility-safe deployment step and are not owned by the deployment runtime itself.
- [ ] #17 Staging smoke tests cover: application health; worker health; database connectivity; object-storage connectivity; secret resolution; durable-job execution; outbox dispatch; restart recovery.
- [ ] #18 Deployment rollback is tested without deleting authoritative database, outbox, inbox, job, audit, evidence, or object-storage records.
- [x] #19 Logs, metrics, traces, correlation IDs, dashboards, alerts, and audit access are defined for application, worker, database, storage, and deployment operations.
- [x] #20 Sensitive fields and secrets are redacted from logs, traces, deployment output, and infrastructure state where applicable.
- [ ] #21 Budget controls, cost attribution, capacity thresholds, and unexpected spend alerts are configured.
- [ ] #22 Backup and restoration evidence includes at least one executed restoration test in a non-production environment.
- [x] #23 Operational runbooks cover: deployment; rollback; database migration coordination; backup; restoration; incident response; credential rotation; failed-job recovery; capacity escalation.
- [x] #24 No provider, environment, control, or deployment is described as production-ready without executed environment-specific evidence.
- [x] #25 Infrastructure-focused verification and the canonical repository verification gate pass.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Read MAI-106 and deployment requirements; obtain approval for provider, topology, availability, RPO/RTO, and security controls.
2. Add approved modular-monolith IaC/runbooks for environments, database, storage, IAM, secrets, networking, observability, and costs.
3. Exclude migrations, domain implementation, provider certification, cutover, frontend, and production promotion; retain database-backed consistency.
4. Prove smoke, recovery, backup/restore, and rollback paths; run focused checks and deno task verify without unearned readiness claims.
5. Record the implementation evidence, commit the scoped changes, open a draft PR for owner review, keep MAI-148 In Progress, and do not self-merge or mark Done.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Implementation Notes:
- The target is a modular monolith, not a group of technical microservices.
- Durable database-backed jobs and outbox/inbox mechanisms are authoritative.
- Cloud messaging is optional transport, not transaction truth.
- Production promotion is controlled and is not automatic on every push to master.
- Read replicas, automatic failover, CMEK, and VPC Service Controls require explicit threat-model, availability, regulatory, and cost justification.
- Business-data cutover remains under MAI-129.
- Provider certification remains under MAI-127.
- Final production-candidate approval remains under MAI-131.
- Supersedes MAI-33.
- Supersedes MAI-36.
- Becomes a dependency of MAI-127.
- Becomes a dependency of MAI-129.
- Becomes a dependency of MAI-131.

MAI-148 may execute in parallel with bounded-context domain work after MAI-106, subject to exclusive ownership of infrastructure and deployment paths.

Papermark self-hosting infrastructure boundary

1. MAI-148 owns Papermark infrastructure only when self-hosting is explicitly selected for an approved MAI environment.

2. A local developer Papermark instance does not define staging or production topology.

3. Approved self-hosting must define:
   - pinned version;
   - runtime packaging;
   - managed PostgreSQL or approved persistence;
   - blob or object storage;
   - secrets;
   - identity and administrative access;
   - ingress and egress;
   - backups;
   - restoration;
   - monitoring;
   - alerts;
   - capacity;
   - upgrade;
   - rollback;
   - cost ownership.

4. Provider behavior and certification remain under MAI-127.

5. Document and source-domain behavior remains under MAI-112.

6. Papermark must not be provisioned merely because it is the selected MVP candidate.

7. Production self-hosting requires explicit infrastructure, security, operations, data-residency, and cost approval.

Discovery 2026-08-01: MAI-106 is Done and supplies the authoritative PostgreSQL, transactional outbox, inbox, and durable-job contracts. No existing infrastructure-as-code, deployment package, staging evidence, provider/region/account approval, or RPO/RTO/security-control approval was found in task/document authority. Per the Wave A plan, implementation must remain provider-neutral until those approvals are recorded; no cloud provisioning or production-readiness claim is authorized. The Backlog CLI encountered the known worktree FETCH_HEAD read-only limitation during concurrent/search reads; sequential task edits remain functional.

Implementation and evidence 2026-08-01: Added the provider-neutral MAI-148 infrastructure contract, separate development/staging/production manifests, modular-monolith API and durable-job worker packaging, health/readiness behavior, local Compose topology, storage/secrets/IAM/network/observability/cost controls, recovery-safe runbooks, migration coordination, and named smoke/recovery/rollback tests. Passed deno fmt --check, deno lint, deno check, deno task test:infra (12 passed, 0 failed), deno task infra:validate, deno task infra:smoke (8 checks), docker compose -f infra/local/docker-compose.yml config --quiet, and scripts/check_docs.ts. Full deno task test passed with 270 tests, 0 failures, and 21 ignored. deno task verify completed the canonical documentation and Deno gates but exited 1 because the GUI environment lacks eslint/vitest/next/playwright/storybook and the foundation script hits sandboxed spawnSync git EPERM; npm --prefix gui run lint also exited 127 for missing eslint. Real staging deployment, provider certification, environment-specific restart recovery, backup restoration, rollback execution, and production readiness remain unexecuted because required owner approvals and environment credentials are absent. MAI-148 remains In Progress; no provider, domain migration, frontend, or production promotion scope was added.

Delivery handoff 2026-08-01: reviewed commit ef783f6b11e034d43132fff5825a5fcedd48ef7d exists locally and the worktree is clean. Branch push and draft PR were not completed: the external-action approval gate rejected pushing the full private code change to origin without explicit destination authorization, and gh auth status reports the configured GitHub token is invalid. No workaround, self-merge, or Done transition was performed; MAI-148 remains In Progress pending explicit push/PR authorization and valid GitHub credentials.

Draft PR #35 opened through the GitHub connector on 2026-08-01: https://github.com/luisfelipeluis49/mai/pull/35. Head branch delivery/MAI-148-deployment-and-operations-foundation targets master and contains the MAI-148 implementation. The PR remains draft; no self-merge or Done transition was performed.

Wave A closure audit 2026-08-02: owner-approved PR #35 is merged on master at 47ea2f6c, focused infrastructure validation/smoke checks passed, and the final DENO_ENV=test deno task verify completed with exit 0 and all 17 verification categories PASS. The verified criteria cover the modular-monolith topology, justified worker boundary, runtime contract, storage/network/security/observability controls, migration ownership, recovery-safe runbooks, explicit non-production-readiness boundary, and canonical verification. The remaining approval/execution gates stay unchecked: provider/topology approval, reproducible environment provisioning, remote state/locking, provider-specific IAM/secrets/network/storage controls, staging smoke/restart recovery, rollback, budget controls, and executed backup restoration. DoD #1-#7 remain open for the same evidence gaps. The task remains In Progress; no feature implementation was changed during closure.

2026-08-02 closure audit: repository implementation and canonical verification are current, but no new authoritative environment evidence exists for provider/region/account/topology approval, provider-specific IaC/state locking, managed PostgreSQL/PITR/connectivity, reviewed RPO/RTO, secrets/workload identity/IAM/security review, real staging smoke/restart recovery, executed rollback, budget alerts, or non-production backup restoration. MAI-148 remains intentionally In Progress; no unsupported AC or DoD item was checked, no provider-neutral substitute was treated as cloud evidence, and it remains a continuing cross-wave release dependency.
<!-- SECTION:NOTES:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Every acceptance criterion is checked with current evidence.
- [ ] #2 The approved infrastructure topology is represented in version-controlled infrastructure as code.
- [ ] #3 A real staging deployment has passed the required smoke and restart recovery tests.
- [ ] #4 Backup restoration and rollback have been executed successfully in a non-production environment.
- [ ] #5 IAM, secrets, ingress, egress, storage, encryption, and database controls have current review evidence.
- [ ] #6 MAI-127, MAI-129, and MAI-131 depend on MAI-148.
- [ ] #7 Infrastructure documentation and operational runbooks are current.
- [x] #8 No prototype service topology or local Pub/Sub implementation is treated as production authority.
- [x] #9 No business-domain, provider-certification, migration, frontend, or final release scope was absorbed into MAI-148.
- [x] #10 The canonical repository verification gate passes.
<!-- DOD:END -->
