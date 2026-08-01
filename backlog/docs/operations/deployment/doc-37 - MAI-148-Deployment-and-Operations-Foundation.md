---
id: doc-37
title: MAI-148 Deployment and Operations Foundation
type: guide
created_date: '2026-08-01 11:53'
updated_date: '2026-08-01 12:04'
tags:
  - operations
  - infrastructure
  - deployment
  - canonical
  - mai-148
---
- Authority ID: OPS-MAI-148-001
- Owner: Platform Architecture and Operations
- Authority: MAI-148 deployment and operations foundation
- Freshness: Current as of 2026-08-01
- Language: English
- Update trigger: Approved provider, topology, environment, control, runbook, or verification evidence changes

# MAI-148 Deployment and Operations Foundation

## Authority and boundary

MAI is deployed as one modular-monolith image with two process roles: an API
process and a durable-job worker. The worker is separated only because jobs
have independent lease, retry, concurrency, shutdown, and failure-boundary
requirements. Core, Agent, and Engine categories are not deployable services.

PostgreSQL is transaction truth for domain state, audit, idempotency, outbox,
inbox, and durable jobs. Object storage owns immutable bytes while PostgreSQL
owns object metadata, checksums, classifications, retention, legal holds,
provenance, and storage locators. A cloud broker is optional transport and is
not required for transaction correctness.

The version-controlled implementation contract is under `infra/`. Its source
of truth is `src/platform/operations/contract.ts`. Run `deno task
infra:validate` and `deno task infra:smoke` for local contract evidence.

## Approval gate

Development uses a local Compose adapter for deterministic contract evidence.
Staging and production remain `pending` until the owner records all of the
following in the corresponding manifest:

- cloud provider, regions, and account/project;
- application/worker topology, capacity, availability, replicas, and failover;
- RPO, RTO, data residency, retention, and legal-hold requirements;
- security controls, IAM roles, key management, network boundaries, and
  administrative access;
- remote state backend, locking, backup, recovery, cost attribution, and a
  provider adapter.

`assertProvisionable` fails closed when approval or the adapter is missing.
No environment is described as production-ready without provider-specific
execution evidence.

## Runtime contract

| Role | Entry point | Ownership | Health/readiness | Evidence boundary |
| --- | --- | --- | --- | --- |
| API | `deno task api:start` | platform runtime | `/health/live`, `/health/ready` | request handling and database readiness |
| Worker | `deno task worker:start` | platform jobs | contract paths; shutdown-aware loop | lease-fenced durable jobs and attempts |

Both roles define CPU/memory limits, timeout, concurrency, replica bounds,
drain, and shutdown grace. The worker requires an explicitly configured,
approved application worker factory; it fails safely when absent.

Schema migrations are owned by a separate pre-traffic or compatibility-safe
migration runner. The deployment runtime never migrates the database on start.

## Persistence, storage, and security controls

- PostgreSQL manifests require managed PostgreSQL, private or explicitly
  approved connectivity, automated backup, point-in-time recovery, and a
  tested restore procedure.
- Object keys include environment, tenant, workspace, deal, object, and
  version boundaries. Versioning, class-specific lifecycle, retention, legal
  hold compatibility, approval-controlled deletion, and encryption controls
  are required.
- Secrets are references to a secret manager. Long-lived credentials are
  forbidden; CI uses workload-identity federation or another approved
  short-lived equivalent. Logs, traces, deployment output, and state redact
  secrets and sensitive fields.
- IAM exposes only named runtime roles, keeps migration access separate, and
  rejects broad production Owner/Editor grants.
- Public ingress is API-only; database/storage/admin paths remain private or
  explicitly approved. Service-to-service access is internal and egress is
  allowlisted.
- Dashboards and alerts cover API, worker, database, storage, deployment,
  health, backlog, capacity, and unexpected spend with correlation IDs and
  operator audit access.

## Recovery and rollback

The protected recovery set includes PostgreSQL, `platform.outbox`,
`platform.inbox`, `platform.jobs`, audit, evidence, and object storage.
Rollback restores the application image and preserves those records; it does
not delete authoritative data or silently reverse migrations. Restore evidence
must reconcile object checksums, environment/tenant/workspace/deal isolation,
legal holds, key/secret recovery, and authoritative row counts in a
non-production environment before traffic reopens.

The local smoke path executes eight named seams: application health, worker
health, database connectivity, object storage connectivity, secret resolution,
durable-job execution, outbox dispatch, and restart recovery. The smoke path
uses named local fakes and is not staging or provider certification evidence.

## Operator procedures

See the implementation-local checklists:

- `infra/runbooks/deployment.md`
- `infra/runbooks/migration-coordination.md`
- `infra/runbooks/rollback.md`
- `infra/runbooks/backup-restore.md`
- `infra/runbooks/incident-response.md`
- `infra/runbooks/credential-rotation.md`
- `infra/runbooks/failed-job-recovery.md`
- `infra/runbooks/capacity-escalation.md`

## Current evidence and remaining gates

Current local evidence is limited to manifest validation, local smoke/recovery
assertions, focused platform tests, Compose configuration validation, and the
repository verification gate. Real staging deployment, staging restart
recovery, non-production backup restoration, provider-specific IAM/network/
storage/key review, and production promotion remain unexecuted until the
approval gate is satisfied.
