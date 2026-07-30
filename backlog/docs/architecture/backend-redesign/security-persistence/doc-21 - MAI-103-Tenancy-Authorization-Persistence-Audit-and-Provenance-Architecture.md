---
id: doc-21
title: >-
  MAI-103 Tenancy, Authorization, Persistence, Audit, and Provenance
  Architecture
type: specification
created_date: '2026-07-30 06:03'
updated_date: '2026-07-30 06:51'
---
# MAI-103 Tenancy, Authorization, Persistence, Audit, and Provenance Architecture

- **Document ID:** doc-21
- **Authority ID:** doc-21
- **Authority:** Canonical proposed security and data architecture
- **Owner:** Security and Data Architecture
- **Freshness:** Proposed as of 2026-07-30
- **Language:** English
- **Update trigger:** Tenancy, authorization, persistence, concurrency, audit, provenance, retention, or recovery changes
- **Status:** Proposed for owner approval
- **Implementation boundary:** Design only; no migration, schema, middleware, identity, secret, or deployment code is created

## 1. Security model

### 1.1 Scope hierarchy

```text
Institution / Tenant
└── Workspace
    ├── Organization Registry
    └── Deal
        ├── bounded-context aggregates
        ├── object restrictions
        └── field restrictions
```

`tenantId` is mandatory on every tenant-owned record and cache/job/index/object-storage key. `workspaceId` is mandatory where an institution has multiple workspaces. Every deal-owned record also carries `dealId`. IDs from a client are selectors, never authorization evidence.

### 1.2 Authentication boundary and assumptions

- An enterprise OIDC/OAuth 2.1 identity provider authenticates internal users. The backend validates issuer, audience, signature, expiry, nonce, and subject; it maps the external subject to one MAI `UserIdentity`.
- Browser sessions use a secure, `HttpOnly`, `SameSite` cookie established by a backend-for-frontend/session boundary. Bearer tokens are accepted only for documented machine/integration clients.
- An external participant uses a separate reduced-scope portal session. Invitation/submission tokens are single-purpose, stored as digests, exchanged for a short-lived session, and never used as ordinary query parameters after exchange.
- Access tokens identify the actor; they do not carry the complete authorization decision. Active membership, grants, restrictions, deal relationships, sponsor, purpose, expiry, field policy, and current aggregate state are evaluated server-side.
- Service and job identities are distinct from humans and AI actors. A worker receives the captured initiating actor/scope reference plus a narrow service capability.
- Secrets and integration credentials are referenced by opaque secret-vault IDs. Secret values never enter PostgreSQL business tables, logs, audit payloads, API DTOs, prompts, generated artifacts, or frontend props.

### 1.3 Authorization composition

MAI uses three complementary models:

| Model | Use |
| --- | --- |
| RBAC | Institution roles such as banker, deal lead, counsel, investment-committee member, approver, security administrator, records administrator, and integration administrator provide coarse capabilities. |
| ABAC | Tenant/workspace/deal, object classification, field sensitivity, transaction side, phase, purpose, sponsor, expiry, authority ceiling, separation of duties, legal hold, and actor type refine the result. |
| ReBAC | Membership-to-workspace, participant-to-deal, relationship-owner-to-organization, approver-to-request, sponsor-to-external participant, and signatory-to-legal entity relationships establish scoped access. |

The policy result is:

```text
allow | deny
allowed actions
allowed object scope
field include/omit mask
redaction obligations
purpose and expiry
authority snapshot reference
decision reason code
```

Deny dominates allow. A restriction can only narrow a grant. Temporary access requires purpose, sponsor, and expiry. External access additionally requires an explicit object/field/action allow-list.

### 1.4 Deny before loading and permission-before-props

Application services execute in this order:

1. authenticate and resolve tenant/workspace;
2. resolve membership and actor type;
3. evaluate route/action/resource policy using identifiers and permitted relationship indexes;
4. return protected `404` for denied or absent protected targets;
5. load the aggregate through a tenant/deal-scoped repository;
6. re-evaluate state-dependent policy before mutation;
7. map through a permission-aware DTO assembler that omits restricted fields and supplies server-derived `allowedActions`;
8. persist state, audit, and outbox atomically.

Repositories do not expose unscoped `getById`. Query objects require an authorization scope. DTO assemblers receive a field mask before data is serialized. The frontend never receives a protected value merely to hide it with CSS or conditional rendering.

### 1.5 Least privilege, temporary access, and external isolation

- Institution membership does not imply deal access.
- Deal assignment does not imply approval authority.
- Organization relationship does not imply access to deals involving that organization.
- Approval authority applies to a named action, object type, threshold, deal, and time window.
- External access requires an active external identity, sponsor, purpose, expiry, deal, allowed objects, allowed fields, and allowed actions.
- External participants cannot access internal search, candidate identities outside scope, conflicts, relationship owners, internal positions, BATNA, mandate ceilings, negotiation strategy, unrestricted evidence, internal audit, or Copilot.
- Revocation/offboarding invalidates sessions, permission caches, pending external tokens, active portal uploads, subscriptions, and affected background jobs.
- Audit export requires a separate permission and applies event-level field filtering.

### 1.6 Restricted identities, strategy, and fields

Restricted identity policy supports withholding existence, identity, relationship owner, contact details, evidence, and ranking inputs while still returning a safe workflow state such as `restricted candidate`. Internal strategy fields include BATNA, mandate ceilings, concessions, internal valuation thresholds, relationship notes, and conflict rationale. These fields use omit-by-default DTOs; redacted placeholders are returned only when the product authority explicitly requires a placeholder.

### 1.7 Break-glass

Break-glass is permitted only for internal security/continuity emergencies. It requires:

- a pre-approved break-glass role;
- strong reauthentication;
- a stated incident/reason and bounded tenant/deal/object scope;
- a maximum one-hour expiry;
- no ability to sign, waive, release externally, change retention/legal hold, or erase data;
- immediate immutable audit and notification to security reviewers;
- retrospective review.

There is no break-glass path for external participants or AI actors.

### 1.8 Cross-boundary isolation controls

| Boundary | Required control |
| --- | --- |
| Cross-tenant | Tenant required in every repository predicate, foreign key strategy, RLS policy, cache/index/object key, outbox/inbox/job row, and provider credential lookup. |
| Cross-workspace | Workspace membership and policy checked even inside one tenant; workspace included in caches and projections. |
| Cross-deal | Deal grant/relationship checked before load; deal ID included in document, vector, search, job, event, audit, and storage keys. |
| Document retrieval | Evidence query starts from an authorized document-version scope; result chunks cannot introduce another deal/version. |
| Vectors/embeddings | Separate tenant/workspace/deal/document-version columns and predicates; no global nearest-neighbor query over client evidence. |
| Cache | Keys include policy-version/actor scope when results vary by permission; revocation invalidates by scope. |
| Background jobs | Job stores initiating scope/authority snapshot, revalidates before every side effect, and refuses cross-scope payload references. |
| Audit | Audit access is policy-filtered; stored event remains complete and immutable. |

## 2. PostgreSQL row-level security decision

**Decision: partially adopted.**

PostgreSQL RLS is adopted as defense in depth for tables that contain tenant/workspace/deal-owned transaction, document metadata, evidence, workflow, agent, deliverable, external-access, and audit records. The request transaction sets verified `app.tenant_id`, `app.workspace_id`, `app.actor_id`, and, when applicable, `app.deal_ids` or a policy-scope token through a non-user-controlled connection wrapper.

RLS is not the primary or only authorization system:

- it cannot express all action, field, purpose, sponsor, expiry, separation-of-duties, human-authority, and state-transition rules cleanly;
- application services still deny before aggregate loading and produce permission-safe DTOs;
- field omission/redaction remains an application projection responsibility;
- lookup/reference tables and operational tables without tenant data may not need RLS;
- migrations, privileged maintenance, and background workers use explicit narrowly scoped roles, never a broad application bypass by default.

RLS rollout is phased after the connection/session-context foundation and policy integration tests exist. Until a table’s policy is verified, the application predicate remains mandatory and the table is marked `RLS pending`; this is a partial-adoption rollout, not a deferral of the decision.

See proposed ADR doc-29.

## 3. Persistence responsibilities and schema boundaries

PostgreSQL is transaction truth for relational domain state, aggregate versions, immutable decisions, workflow state, audit events, outbox/inbox, jobs, idempotency, and projections that require relational querying.

Proposed schemas:

| Schema | Owned responsibilities |
| --- | --- |
| `iam` | institutions, workspaces, user identities, memberships, invitations |
| `access` | role-policy versions, grants, restrictions, revocations, break-glass sessions, authority snapshots |
| `organizations` | organizations, legal entities, persons, identity restrictions and merge aliases |
| `deals` | deals, configurations, mandates, parties, roles, authority constraints, lifecycle, milestones |
| `work` | workstreams, tasks, assignments, approval requests and steps |
| `documents` | documents, versions, sources, requests, processing runs, evidence, citations and dependency edges |
| `diligence` | facts/versions, interpretations, assumptions/versions, calculations/inputs/results, findings/impacts and decision records |
| `valuation` | model definitions/versions, scenarios, inputs, calculation runs and results |
| `matching` | criteria, runs, candidate assessments, conflicts, recommendations, shortlists and outreach authorization |
| `negotiation` | rounds, proposals/versions, normalized terms, internal positions and deliveries |
| `closing` | conditions, checklist items, waivers, readiness, signatures and packages |
| `agents` | missions, plans, runs, steps, tool activity, results, artifacts and usage |
| `deliverables` | deliverables/versions, redactions, releases, exports and distributions |
| `governance` | deal governance state, retention bindings, legal holds, deletion requests and erasure results |
| `external_access` | grants, allowed scopes, submissions, receipts and external approvals |
| `audit` | immutable audit events, integrity metadata and audit-export jobs |
| `notifications` | notifications, subscriptions and delivery attempts |
| `integrations` | connector accounts, capability snapshots, sync runs, provider cursors and webhook receipts |
| `platform` | idempotency records, outbox, inbox, durable jobs, attempts, dead letters and projection checkpoints |

Schema ownership is logical modular ownership inside one PostgreSQL cluster. Cross-schema foreign keys are used only for stable identity/isolation references where they do not couple aggregate internals. Contexts otherwise persist typed external IDs and validate through application services/events.

## 4. Transaction and concurrency strategy

- One command transaction modifies one aggregate root, its transactionally owned children/value objects, append-only audit rows, idempotency result, and outbox rows.
- A command never updates multiple context-owned aggregates in one distributed pseudo-transaction. Cross-context workflows use orchestration and compensating/review states.
- Each mutable aggregate root has `version BIGINT NOT NULL`, incremented exactly once per successful command.
- Writes use `UPDATE ... WHERE id = ? AND tenant_id = ? AND version = ?`; zero rows is `VERSION_CONFLICT`.
- Child entities owned by an aggregate are updated only through the root repository. References to other aggregates are typed IDs and target versions, never embedded mutable copies.
- Approval-sensitive commands require `If-Match`; create and retryable side effects require `Idempotency-Key`.
- An idempotency row stores tenant, actor, command type, target, payload digest, status, result/error reference, and expiry. Same key plus different digest is a conflict.
- Immutable versions and decision/audit records are inserts. “Current”, “latest draft”, and “current approved” are explicit pointers protected by the aggregate version.

## 5. Truth and provenance taxonomy

| Category | Authority and mutation rule |
| --- | --- |
| Transaction truth | Versioned domain aggregates in the owning context; semantic commands only. |
| Source documents | Immutable `DocumentVersion` bytes plus metadata/checksum; a new source creates a new version. |
| Approved facts | Immutable approved `FactVersion` with exact evidence/configuration/approver snapshot. |
| Interpretations | Versioned human or AI-authored statements, visibly distinct from fact. |
| Assumptions | Versioned inputs with author, rationale, scope, and downstream usage. |
| Calculations | Deterministic execution record with exact inputs, formula/model version, runtime, and output; completion is not approval. |
| Model recommendations | Nonbinding output with model/prompt/source/limitations provenance. |
| Human decisions | Immutable `DecisionRecord` referencing exact target/evidence/authority versions. |
| Generated drafts | Versioned reversible artifacts; never approval or release. |
| Released deliverables | Immutable released version, redaction, audience, authority, export/distribution record. |
| Audit records | Append-only reconstruction record; never edited by business flows. |

`Provenance` is a reusable immutable envelope referenced by evidence, calculations, recommendations, agent results, and generated artifacts:

```text
source kind and stable source ID
source object and version
document location/checksum where applicable
actor or system identity
prompt/model/tool/formula/provider versions
configuration and permission snapshot references
correlation/causation
created time
limitations
```

## 6. Documents, object storage, vectors, and derived data

### 6.1 Binary object storage

Object storage owns:

- source document-version bytes;
- external submission files in quarantine and accepted states;
- generated artifacts;
- closing packages;
- deliverable versions;
- exports and audit packages.

PostgreSQL owns metadata, checksum, classification, storage locator, encryption-key reference, retention/legal-hold state, provenance, and lifecycle. Object keys include environment/tenant/workspace/deal/object/version and use opaque IDs rather than filenames. Download URLs are short-lived signed URLs generated after authorization; server filesystem paths are never returned.

### 6.2 Document source and version relationships

`Document` is stable identity. `DocumentVersion` is immutable content. `DocumentSource` records local upload, external submission, or provider object identity/cursor. Provider resynchronization can create a new version but cannot overwrite an accepted version. Processing runs reference one exact version.

### 6.3 Vector-store ownership

The Documents & Evidence context owns evidence embeddings and chunk metadata. Agent Execution consumes authorized retrieval through the Evidence service. Vector records carry tenant/workspace/deal/document/version/chunk/classification and provenance. An index is derived and rebuildable; deleting/rebuilding it cannot delete document/evidence history.

User preferences and reusable domain knowledge, if retained, live in separately owned identity/agent-knowledge stores with explicit tenant and authority rules. They are never co-mingled with deal evidence.

### 6.4 Derived data and projections

Read models, search indexes, activity projections, counters, embeddings, recommendations, and cached summaries are rebuildable derived data. They store source versions and a projection watermark. Projection lag is returned as freshness metadata; it never changes transaction truth.

## 7. Events, outbox, inbox, jobs, and failure storage

- Domain state, audit, and transactional outbox records commit atomically.
- An outbox dispatcher publishes at least once. Consumers are idempotent.
- Integration consumers store an inbox entry keyed by provider/event/message identity before applying effects.
- Durable jobs store job ID, type, tenant/workspace/deal, initiating actor/authority snapshot, idempotency key, input versions, payload, state, progress, attempt count, lease, timeouts, cancellation state, result/error, correlation, and audit reference.
- Every attempt is append-only. A retry updates job state and adds an attempt; it does not erase the failure.
- Exhausted retryable jobs become `dead_lettered` with sanitized error, payload reference, and required operator action. Requeue creates an audited attempt under the same semantic operation.
- Side effects occur only after a persisted job and idempotency record exist.

## 8. Staleness, supersession, and history

No current value is destructively rewritten to simulate freshness.

| Concept | Representation |
| --- | --- |
| New source | New immutable version plus a changed current pointer. |
| Superseded object | Old version remains queryable; new pointer and `superseded_by` reference. |
| Stale object | Still usable with warning; dependency edge identifies changed source and materiality assessment. |
| Invalidated object | No longer valid for protected downstream action; historical state remains reconstructable. |
| Recalculation | New calculation/scenario version; prior approved result remains historical and is not automatically reapproved. |
| Released output | Released version never changes; a correction is a new deliverable/release. |
| Revoked access | Authorization ends; audit/history persists under audit policy. |

Dependency evaluation is targeted. A changed document does not make every downstream object stale. The evaluator records which field/location/version was consumed, materiality, whether deterministic recomputation is permitted, and whether human review is required.

## 9. Retention, archive, legal hold, deletion, and erasure

- Archive changes availability/governance; it is not deletion.
- Retention policies bind to tenant, deal, object class, jurisdiction, and release/signature status.
- Legal hold dominates archive, deletion, and ordinary retention expiry.
- A deletion request is a versioned approval workflow with scope preview, context-by-context erasure plan, external-provider plan, backup implications, and immutable erasure manifest.
- Audit records are retained or minimized according to legal policy; they are not casually erased with business objects. Where identity data must be erased, audit uses policy-approved pseudonymization while preserving event integrity.
- Erasure is idempotent and resumable. Partial provider/storage/database failures remain visible and retryable.
- Fixtures and seed data contain fictional identifiers only and are replaced or explicitly migrated; they are never imported as production records.

## 10. Backup, restoration, and recovery expectations

Proposed minimum production objectives, subject to operations approval:

- PostgreSQL point-in-time recovery with **RPO ≤ 5 minutes** and **RTO ≤ 4 hours**.
- Object storage versioning and cross-zone durability; restore metadata and objects as one tested recovery set.
- Encryption-key/secret-vault recovery procedure independent from database backup.
- Quarterly restore test for PostgreSQL plus sampled object/checksum reconciliation.
- Outbox, inbox, jobs, idempotency, and audit are in the protected backup set.
- Derived projections/vector indexes may be rebuilt after transaction truth restores; they do not determine the RPO.
- Restoration creates an audited operational record and runs tenant/deal isolation checks before reopening traffic.

## 11. Migration strategy

### 11.1 In-memory MVP store

The process-local `src/api/store/` state and frontend fixture data are demonstration data, not production truth. Migration treatment:

1. freeze the exact fixture set and classify it as test/demo evidence;
2. create target-context seed builders using fictional IDs only;
3. run dual contract tests against old fixtures and new permission-safe read models;
4. switch frontend adapters context by context;
5. retire the in-memory API/store after every consumer and test moves;
6. preserve historical files and PR evidence; do not import fixture records into production.

### 11.2 Current PostgreSQL structures

Current tables are assessed individually:

- `business`, `transaction`, role/advisor, `financial_structure`, phase, and history tables require explicit mapping into Organization, Deal, Mandate/Lifecycle, and audit/projection structures.
- `user_preferences`, `domain_knowledge`, and `company_culture_memory` require tenant/owner/purpose/provenance classification before migration; unclassifiable records are quarantined, not copied.
- `vdr_document_chunks` cannot migrate as authoritative evidence because it lacks tenant, document-version, checksum, classification, and provenance. Re-index from accepted source versions.
- `flow_checkpoints` may supply historical diagnostic evidence but is not a durable AgentRun/Audit source.

Migration uses reconciliation reports, per-context ownership, reversible cutover flags, and exclusive migration ownership. No compatibility shim is designed in MAI-103; downstream tasks must justify any time-bounded adapter and its removal condition.

## 12. Security and data validation gates

The implementation must prove:

- cross-tenant, workspace, deal, document, vector, cache, job, and audit isolation;
- protected-not-found non-disclosure;
- deny-before-load and field omission;
- AI actor rejection at every H-only command;
- optimistic conflict behavior with preserved user work;
- idempotent side effects and retry;
- immutable decisions, released versions, and audit;
- targeted stale/invalidation behavior;
- legal-hold blocking and resumable erasure;
- RLS application-role and maintenance-role behavior;
- backup restore and object/checksum reconciliation before production verification.
