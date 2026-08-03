---
id: doc-38
title: MAI-110 Deal Reconciliation Operator Procedure
type: guide
created_date: '2026-08-03 02:14'
updated_date: '2026-08-03 11:06'
---
# MAI-110 Deal Reconciliation Operator Procedure

- Authority ID: doc-38
- Owner: Deal Management and Platform Operations
- Authority: Bounded MAI-110 operator procedure
- Freshness: Current as of 2026-08-03
- Language: English
- Update trigger: Mapping, reconciliation, read-routing, or operator safety procedure changes

## Purpose and scope

This procedure covers the bounded MAI-110 legacy Deal mapping, per-Deal reconciliation, verification, and compatibility read routing. It does not perform a production cutover, delete legacy Deals, delete legacy schemas or tables, or reverse authoritative events. Physical cutover and legacy retirement remain outside this task.

## Preconditions

Before any command, the operator must confirm:

- an approved environment and maintenance window, when required;
- current application commit and database migration state;
- connectivity through the least-privilege migration and application credentials;
- an approved backup or restore point expectation;
- operator authorization for the target tenant and workspace;
- an approved active Identity Access operator session credential matching the actor, tenant, and workspace;
- the exact trusted `tenant_<slug>` and `workspace_<slug>` scope;
- no conflicting reconciliation, migration, deployment, or Backlog mutation process;
- a plan to retain reports without credentials or secrets.

Runtime startup does not apply migrations. Apply `deal_management-0002-reconciliation-routing` through the separately governed migration runner before using PostgreSQL reconciliation storage.

## Dry-run

Prepare a JSON array of `LegacyDealRecord` objects. Each record must contain `source`, `legacyDealId`, `parties`, and `team`; values that cannot be mapped safely are reported as explicit outcomes.

```bash
DENO_ENV=test deno run --allow-read --allow-env scripts/deal_reconciliation.ts --mode dry-run --input ./legacy-deals.json --tenant tenant_northstar --workspace workspace_alpha --actor actor_operator --correlation cor_reconciliation
```

Dry-run reads and maps the supplied legacy records. It reports mapped, invalid, missing-reference, unsupported-shape, scope, and conflict outcomes, plus deterministic authoritative IDs and source fingerprints. It makes zero authoritative Deal writes, aggregate-history writes, outbox writes, successful-migration command receipts, and read-routing changes. A dry-run diagnostic record, when retained by an approved runtime, is non-authoritative and must be marked `dry_run_valid`.

Abort if any required reference, currency, Deal type, confidentiality, party side, team role, mandate value, or scope is ambiguous. Do not convert an error into a successful mapping.

## Apply

The repository-owned `scripts/mai_110_runtime.ts` runtime constructs Identity Access authentication, authoritative authorization, the scoped PostgreSQL Deal repository, transaction runner, audit/outbox appender, legacy source, mapper, and reconciliation store. The runtime module must not use permissive authorization or anonymous actors.

```bash
DENO_ENV=test deno run --allow-read --allow-env --allow-net --allow-ffi --allow-run scripts/deal_reconciliation.ts --mode apply --input ./legacy-deals.json --tenant tenant_northstar --workspace workspace_alpha --actor actor_operator --correlation cor_reconciliation --runtime-module ./scripts/mai_110_runtime.ts --credential session_<approved-operator-session> --confirm APPLY_MAI_110
```

Apply is bounded per Deal and idempotent. The explicit confirmation is required for apply. Successful records move through `pending`, `applied`, and `verified`; conflicts and rejected records remain visible for operator review. No global authoritative-read flag is changed.

## Resume

```bash
DENO_ENV=test deno run --allow-read --allow-env --allow-net --allow-ffi --allow-run scripts/deal_reconciliation.ts --mode resume --input ./legacy-deals.json --tenant tenant_northstar --workspace workspace_alpha --actor actor_operator --correlation cor_reconciliation --runtime-module ./scripts/mai_110_runtime.ts --credential session_<approved-operator-session>
```

Resume reuses deterministic legacy identity and command keys. Verified Deals are not duplicated, failed Deals can be retried after review, and conflicts remain conflicts until the source or operator decision changes. A successful earlier Deal is never erased because a later Deal failed.

## Verification

```bash
DENO_ENV=test deno run --allow-read --allow-env --allow-net --allow-ffi --allow-run scripts/deal_reconciliation.ts --mode verify --input ./legacy-deals.json --tenant tenant_northstar --workspace workspace_alpha --actor actor_operator --correlation cor_reconciliation --runtime-module ./scripts/mai_110_runtime.ts --credential session_<approved-operator-session>
```

The verification command loads each legacy record, remaps it, loads the persisted reconciliation record and authoritative Deal, and compares the legacy identifier, deterministic authoritative identifier, tenant, workspace, name, Deal type, currency, parties, team roles, mandate, source fingerprint, persisted Deal document, aggregate history, command receipts, transactional outbox, reconciliation status, and routing mode. `verified` means the persisted authoritative state matches the intended mapped state; a successful insert alone is not verification. Drift is reported as an explicit conflict.

## Rollback-compatible read routing

Rollback means changing one reconciled Deal from authoritative reads to the legacy compatibility adapter. It retains authoritative rows, history, receipts, audit events, outbox events, and reconciliation evidence. It does not delete or reverse data.

```bash
DENO_ENV=test deno run --allow-read --allow-env --allow-net --allow-ffi --allow-run scripts/deal_reconciliation.ts --mode rollback-routing --input ./legacy-deals.json --tenant tenant_northstar --workspace workspace_alpha --actor actor_operator --correlation cor_reconciliation --runtime-module ./scripts/mai_110_runtime.ts --credential session_<approved-operator-session> --reason rollback-validation
```

The command reports the previous and next route, selected source, actor, correlation ID, reason, and timestamp. A subsequent read must identify `legacy` as the selected source through the named compatibility adapter. To restore one reviewed Deal to authoritative reads, use the explicit per-Deal operation:

```bash
DENO_ENV=test deno run --allow-read --allow-env --allow-net --allow-ffi --allow-run scripts/deal_reconciliation.ts --mode authoritative-routing --input ./legacy-deals.json --tenant tenant_northstar --workspace workspace_alpha --actor actor_operator --correlation cor_reconciliation --runtime-module ./scripts/mai_110_runtime.ts --credential session_<approved-operator-session> --reason restore-after-review
```

Neither operation enables a global cutover flag.

## Abort conditions

Abort and retain evidence for:

- tenant or workspace mismatch;
- deterministic identity collision or unexpected duplicate Deal;
- malformed legacy record;
- unsupported or non-uppercase currency;
- unsupported Deal type or missing confidentiality;
- missing required upstream reference;
- duplicate legacy party or team role;
- authority value above the mandate ceiling;
- reconciliation drift or changed source fingerprint;
- database transaction, audit, or outbox failure;
- partial state that cannot be safely resumed;
- unapproved production or development cutover request;
- any request to delete legacy records or schema objects.

## Evidence collection

Retain the command invocation, environment identifier, application commit, migration identifiers, target tenant and workspace, dry-run report, apply report, conflict report, verification result, routing-state changes, operator identity, and timestamps. Redact credentials, tokens, database URLs with passwords, and other secrets. Preserve prior failed evidence; append later correction evidence so chronology remains auditable.

## Explicit safety limits

No step in this procedure performs production cutover, legacy deletion, destructive migration, frontend or Figma changes, provider-specific infrastructure, or permissive authentication or authorization. MAI-110 remains `In Progress` until the Wave B finisher reviews the corrective evidence.
