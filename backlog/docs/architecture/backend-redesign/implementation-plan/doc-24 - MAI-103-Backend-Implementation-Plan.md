---
id: doc-24
title: MAI-103 Backend Implementation Plan
type: specification
created_date: '2026-07-30 06:03'
updated_date: '2026-07-30 09:32'
---
# MAI-103 Dependency-Ordered Backend Implementation Plan

- **Document ID:** doc-24
- **Authority ID:** doc-24
- **Authority:** Approved implementation plan
- **Owner:** Backend Architecture and Delivery
- **Freshness:** Approved as of 2026-07-30
- **Language:** English
- **Update trigger:** Owner decision, architecture dependency, task scope, delivery order, or rollout constraint changes
- **Status:** Approved
- **Identifier rule:** `BE-Pxx` identifiers are temporary and are not Backlog IDs
- **Creation rule:** Owner approval on 2026-07-30 authorized task creation; real IDs below preserve the approved dependency graph.

## 1. Delivery graph and waves

```text
BE-P01 shared contracts
├─ BE-P02 policy model
└─ BE-P03 persistence/events/jobs
BE-P02 + BE-P03 ── BE-P04 identity/tenancy/access
                   ├─ BE-P05 organization registry
                   └─ BE-P08 audit/activity foundation
BE-P04 + BE-P05 ── BE-P06 deal management/mandate
BE-P06 + BE-P08 ── BE-P07 lifecycle/milestones
BE-P03 + BE-P04 + BE-P06 + BE-P08 ── BE-P09 documents/sources/processing
BE-P09 ── BE-P10 evidence/facts/assumptions/calculations/provenance
BE-P06 + BE-P07 + BE-P10 ── BE-P11 workstreams/tasks/approvals ── BE-P12 findings/decisions
BE-P10 + BE-P12 ── BE-P13 valuation
BE-P06 + BE-P10 + BE-P12 ── BE-P14 matching/conflicts/shortlist
BE-P06 + BE-P10 + BE-P12 + BE-P14 ── BE-P15 negotiation
BE-P06 + BE-P10 + BE-P11 + BE-P12 ── BE-P16 closing
BE-P03 + BE-P04 + BE-P08 + BE-P10 + BE-P11 ── BE-P17 agent runtime
BE-P13 + BE-P14 + BE-P15 + BE-P16 + BE-P17 ── BE-P18 governed agents/tools
BE-P08 + BE-P10 + BE-P11 + BE-P17 ── BE-P19 deliverables/exports
BE-P03 + BE-P04 + BE-P06 + BE-P08 ── BE-P20 notifications
BE-P04 + BE-P06 + BE-P09 + BE-P11 ── BE-P21 team/external access
BE-P06 + BE-P08 + BE-P21 ── BE-P22 pause/archive/termination/deletion
BE-P06 through BE-P22 ── BE-P23 frontend adapter migration
BE-P04 + BE-P09 + BE-P15 + BE-P17 + BE-P19 + BE-P20 ── BE-P24 integration certification
BE-P03 + BE-P06 through BE-P24 ── BE-P25 data migration/MVP retirement
BE-P23 + BE-P24 + BE-P25 ── BE-P26 end-to-end release verification
```

| Wave | Tasks | Exit outcome |
| ---: | --- | --- |
| 1 | BE-P01 | Shared architecture and API contracts |
| 2 | BE-P02–P03 | Policy and durable persistence/event/job primitives |
| 3 | BE-P04–P05, P08 | Identity/access, organization and immutable audit foundations |
| 4 | BE-P06 | Deal identity, parties and mandate |
| 5 | BE-P07, P09 | Deal lifecycle/milestones and documents/processing |
| 6 | BE-P10 | Evidence, facts, assumptions, calculations and provenance |
| 7 | BE-P11 | Workstreams, tasks and approval requests |
| 8 | BE-P12 | Findings and immutable human decisions |
| 9 | BE-P13–P14 | Valuation, matching, conflicts and shortlist |
| 10 | BE-P15–P17 | Negotiation, closing and durable agent runtime |
| 11 | BE-P18–P21 | Governed agents, deliverables, notifications and external access |
| 12 | BE-P22, P24 | Deal governance and provider certification |
| 13 | BE-P23 | Frontend adapters migrate without changing approved behavior |
| 14 | BE-P25 | Data migration and prototype retirement after consumer cutover |
| 15 | BE-P26 | Approved workflow, isolation, recovery and operational verification |

## 2. Task scope catalog

Every task uses TDD, context-owned interfaces, named fakes for external I/O, `deno task verify`, and task-specific integration/security tests. No task may silently broaden into another context or modify Figma/approved frontend behavior.

| ID / title | Objective and exact scope | Explicit exclusions | Dependencies / ADRs | Likely files or subsystems | Deliverables |
| --- | --- | --- | --- | --- | --- |
| BE-P01 Shared architecture contracts and API primitives | Establish branded IDs, actor/scope context, command/query ports, error/success/page/job envelopes, correlation, idempotency and ETag parsing. | No domain handler, auth provider, DB schema or job runner. | None; doc-25, 26, 33 | `src/shared`, new `src/platform/api`, contract tests | Versioned shared package, validation/error tests, API conventions |
| BE-P02 Authorization policy model and evaluator | Implement resource/action/field/purpose/sponsor/expiry vocabulary, RBAC+ABAC+ReBAC evaluator, protected-not-found, deny-before-load and permission-safe DTO policy. | No IdP, membership UI or RLS policy deployment. | P01; doc-27, 29 | new `src/platform/authz`, policy tests | Policy port/evaluator, decision reasons, leakage regression suite |
| BE-P03 Persistence, concurrency, outbox, inbox and jobs | Establish context migration framework, transaction runner, aggregate version checks, idempotency records, durable jobs/attempts, outbox/inbox dispatcher and named fakes. | No business-context tables, provider transport or production deployment config. | P01; doc-28, 30, 31 | `src/core/db`, new `src/platform/{persistence,events,jobs}` | Foundational migrations, repositories, worker protocol, recovery tests |
| BE-P04 Identity, institution, workspace and access lifecycle | Deliver Identity, Membership, Invitation, Role Policy, Grant, Restriction and Revocation aggregates plus authn adapter boundary and safe session context. | No specific IdP certification or deal participation. | P02,P03; doc-27–31 | new `src/identity_access`, API routes, migrations | Vertical slice, policy integration, lifecycle/state tests |
| BE-P05 Organization Registry | Deliver Organization, Legal Entity and Person identity/version lifecycle with restricted-field omission and merge semantics. | No deal-party mandate or external participant portal. | P02,P03; doc-26–30 | new `src/organization_registry` | Commands, projections, repository/API, PII policy tests |
| BE-P06 Deal Management, parties and mandate | Deliver Deal, Deal Party, Deal Role, Mandate and Authority Constraint aggregates and APIs. | No lifecycle/milestone engine, negotiation action or archive. | P04,P05; doc-26–30,33 | new `src/deal_management` | Versioned deal/mandate slice and invariant tests |
| BE-P07 Deal lifecycle and milestones | Deliver Deal Lifecycle and Milestone state machines, prerequisite evaluation and projections within Deal Management. | No workstreams, tasks, findings or closing conditions. | P06,P08; doc-26,30–33 | `src/deal_management/lifecycle` | Semantic commands/events/read models and transition tests |
| BE-P08 Immutable audit and activity projections | Deliver append-only Audit Event, authority/evidence snapshots, redaction policy, activity projection builder and audit export job boundary. | No SIEM provider or historical data import. | P02,P03; doc-29,31,32 | new `src/audit_activity` | Immutable store, projection watermark, access/export tests |
| BE-P09 Documents, object storage, VDR sources and processing | Deliver Document/Version/Source/Processing Run, upload negotiation, checksum/version provenance, object-store/provider ports and processing jobs. | No provider production certification, evidence approval or frontend adapter cutover. | P03,P04,P06,P08; doc-31,32,35 | new `src/documents`, VDR adapters, jobs | Document slice, named fakes, processing/retry/isolation tests |
| BE-P10 Evidence, citations, facts, interpretations, assumptions and calculations | Deliver exact-version evidence and citation, validation/freshness, approved/superseded facts, interpretations, assumptions, calculation records and targeted invalidation. | No valuation model, generic RAG endpoint or AI approval. | P09; doc-26,30–32,35 | new `src/evidence_knowledge`, vector port | Vertical slice, lineage graphs, stale/leakage tests |
| BE-P11 Workstreams, tasks and approval requests | Deliver Workstream and Task state machines plus Approval Request packages, named approvers, SoD, exact-version decisions/withdrawal and notifications via event contracts. | No domain-specific approval outcome implementation beyond target command dispatch. | P06,P07,P10; doc-26,27,30–33 | new `src/work_management` | Workstream/task state machines, approval package, policy/concurrency tests |
| BE-P12 Findings, impacts and decisions | Deliver Finding/Impact proposals, approval/invalidation, Decision Request and immutable Decision Record with basis versions. | No valuation, shortlist or closing-specific calculations. | P10,P11; doc-26,30,32,33 | new `src/diligence_decisions` | Commands/projections/audit and supersession tests |
| BE-P13 Valuation | Deliver Valuation Model/Scenario/Input/Result aggregates, compute job/port, comparison projection, approval and invalidation. | No AI-set price or external model certification. | P10,P12; doc-26,30–33 | new `src/valuation`, adapt optimization valuation | Scenario slice, golden algorithm tests, human approval tests |
| BE-P14 Matching, conflicts and shortlist | Deliver Criteria/Run/Candidate projections, Conflict/Restriction and Shortlist/Outreach Authorization state machines. | No outreach send, generic candidate CRUD or unscoped identity search. | P06,P10,P12; doc-26,27,30–33 | new `src/matching`, adapt matching engines | Compute jobs, protected conflict views, shortlist authority tests |
| BE-P15 Negotiation | Deliver Round, Proposal, normalized Terms, Internal Position/BATNA, mandate comparison, approval and separate delivery authorization/job. | No AI send, email-provider certification or universal term schema. | P06,P10,P12,P14; doc-26–33 | new `src/negotiation` | Negotiation slice, internal/external DTO tests, send boundary |
| BE-P16 Closing | Deliver Condition, Checklist Item, Waiver, Readiness, Signature evidence, Closing Package and irreversible confirmation controls. | No electronic-signature provider certification or AI waiver/signature. | P06,P10,P11,P12; doc-26–33 | new `src/closing` | State machines, dual-control/irreversibility tests, package job |
| BE-P17 Agent mission/run platform | Deliver Mission, Plan, Run, Step, Tool Activity, Result and Artifact records; durable runner; model metadata/cost; cancellation/retry/stale invalidation. | No specialist-agent migration or direct side-effect tool. | P03,P04,P08,P10,P11; doc-31,32,34 | replace `src/agent` orchestration/pubsub; new runtime | Durable runtime, recovery/failure/policy tests |
| BE-P18 Governed agent definitions and tools | Adapt eight agents, schemas and pure engines to versioned definitions and ToolGateway read/proposal capabilities. | No approval, send, invite, permission, release, archive, delete, waiver or signature tool. | P13–P17 as capability-specific; doc-34 | `src/agent/agents`, `src/agent/tools`, RAG/engines | Migrated agents, provenance and human-boundary E2E tests |
| BE-P19 Deliverables, redaction, release and exports | Deliver draft/version, stale marking, redaction, approval, release and export/distribution jobs with immutable manifests. | No provider certification or autonomous release. | P08,P10,P11,P17; doc-31–35 | new `src/deliverables`, adapt generators | Slice, renderer port, release/recipient/idempotency tests |
| BE-P20 Notifications and subscriptions | Deliver recipient-safe Notification/Subscription projections and delivery jobs. | No marketing broadcast or source-domain mutation. | P03,P04,P06,P08; doc-27,31,33 | new `src/notifications`, replace memory store | Slice, retry/expiry/recipient-isolation tests |
| BE-P21 Deal team and external-participant access | Deliver Deal Participation, purpose-bound external grant, sponsor/expiry, portal object scope, submission/receipt, revoke/offboard. | No new frontend behavior or organization membership conflation. | P04,P06,P09,P11; doc-27,29,33 | `src/identity_access`, new external portal API | External-safe projections, revocation and leakage tests |
| BE-P22 Pause, archive, restore, termination, retention and deletion | Deliver Deal Governance aggregate, consequence previews, multi-context orchestration, holds, deletion request/approval and erasure manifest. | No physical erase without approved retention policy/infrastructure; no generic delete. | P06,P08,P21; doc-28,31,32 | new `src/deal_governance`, context jobs | State machines, resumable jobs, legal-hold/irreversibility tests |
| BE-P23 Frontend adapter migration | Replace local API fixtures behind typed adapters family by family while preserving all 25 approved screen states/routes and accepted MAI-102 deviations. | No visual, route-ownership, Figma or workflow redesign; fixtures remain for Storybook/tests. | P06–P22 for each family | `gui/lib`, fixture adapters/tests/verifiers only | v1 adapters, contract tests, per-family parity/cutover evidence |
| BE-P24 Integration adapters and certification | Implement/configure approved IdP, object store, VDR, AI, embedding, inference, conversion/OCR, communication and webhook adapters with capability/health evidence. | No “production verified” label without environment-specific tests; no unapproved provider. | P04,P09,P15,P17,P19,P20; doc-35 | provider adapter packages, integration tests | Conformance/sandbox suites, readiness register, operator docs |
| BE-P25 Data migration and MVP retirement | Implement approved migration/dual-read/reconciliation/cutover/rollback for in-memory fixtures and current PostgreSQL; retire legacy/MVP registrations after consumers move. | No historical evidence deletion or compatibility shim that distorts target domain. | P03,P06–P24; doc-36 | migrations, import/reconciliation tools, old API/store/schema | Rehearsed migration, manifests, rollback, retirement proof |
| BE-P26 End-to-end, security and operational release gate | Verify complete desktop path, all roles/external isolation, authority rules, concurrency, jobs, audit reconstruction, backup/restore and failure modes. | No feature implementation or GitHub Actions iteration loop. | P23,P24,P25 | cross-context integration/E2E/operations tests | Executed release dossier, P0/P1 closure, production-candidate decision |

## 3. Acceptance, verification, and delivery properties

| ID | Acceptance criteria and verification strategy | Migration / rollout / rollback implications | Complexity; parallelization; recommended model |
| --- | --- | --- | --- |
| BE-P01 | All shared contracts reject malformed IDs/scopes/headers; stable errors serialize; contract tests and full verify pass. | Additive package; no runtime cutover; rollback import adoption. | M; serial foundation; Terra High |
| BE-P02 | Policy denies before loaders run; protected absent/unauthorized indistinguishable; field omission property tests pass. | Add shadow policy decisions before enforcement; rollback enforcement flag, never omit audit. | H; parallel with P03 after P01; Sol High; security review |
| BE-P03 | Concurrent update loses safely; idempotent replay stable; outbox/job survives restart; inbox deduplicates; recovery tests pass. | Exclusive migration ownership; additive foundation then enable workers; rollback worker/dispatcher with rows retained. | XL; serial DB owner; Sol High; data-model/security review |
| BE-P04 | Tenant/workspace/session and all access lifecycles enforce state/sponsor/expiry/revocation; API/repository/policy tests pass. | Import identities/memberships with external ID map; staged auth enforcement; break-glass rollback only. | XL; parallel P05/P08 after foundations; Sol High; security+data approval |
| BE-P05 | Org/legal entity/person invariants, merge history and restricted PII omission pass. | Map legacy entities; dual-read comparison; rollback reads without dropping new records. | L; parallel P04/P08; Terra High; data/security review |
| BE-P06 | Deal/party/mandate commands are versioned and constraints prevent unauthorized/over-limit actions. | Map legacy deals/team; per-deal reconciliation; adapter rollback. | XL; serial core domain; Sol High; data-model approval/frontend coordination |
| BE-P07 | Every deal lifecycle/milestone transition table case, prerequisite and invalid transition is executable and audited. | Derive legacy phase with explicit uncertainty; cutover commands; rollback read adapter. | L; parallel with P09 after P06/P08; Sol High |
| BE-P08 | Audit is append-only; redaction is overlay; projections rebuild deterministically; export access audited. | Begin dual audit before slice cutovers; rebuild projections; never rollback/delete audit. | XL; parallel P04/P05; Sol High; security/data approval |
| BE-P09 | Document versions immutable; uploads/sync/process retries idempotent; storage/VDR and T/W/D leakage tests pass. | Import metadata/binaries/checksums; dual index; rollback source adapter, retain objects. | XL; exclusive document migration owner; Sol High; credentials/infrastructure later |
| BE-P10 | Evidence binds exact source; approved facts immutable/superseded; targeted staleness/invalidation and vector isolation pass. | Rebuild embeddings with versioned index; no legacy memory promoted to fact; rollback query adapter. | XL; serial after P09; Sol High; data-model/security review |
| BE-P11 | Workstream/task/approval states, named authority, SoD, exact package version and AI denial tests pass. | Map open work conservatively; require re-review of ambiguous approvals; rollback read-only legacy view. | XL; serial after P10/P07, then unlocks P12; Sol High; security review |
| BE-P12 | Findings/decisions preserve evidence versions and immutable H actor; invalidation never rewrites decision. | Import only supported findings as proposed; legacy decisions need authority evidence. | L; follows P10/P11; Sol High; data approval |
| BE-P13 | Deterministic scenario results/golden tests, provenance, stale invalidation and H-only approval pass. | Wrap existing algorithms; compare outputs before cutover; rollback compute adapter. | L; parallel P14; Terra High; finance/data approval |
| BE-P14 | Matching inputs versioned; restricted candidates protected; conflicts precede shortlist/outreach; H-only tests pass. | Import criteria only; recompute candidates; never migrate fixture score as truth. | XL; parallel P13; Sol High; security review |
| BE-P15 | Internal fields never enter external DTO; proposal/round states and separate H send idempotency/failure tests pass. | Import negotiations as records with provenance status; provider delivery feature-gated. | XL; parallel P16; Sol High; security/frontend coordination/credentials |
| BE-P16 | Conditions, waivers, readiness, signatures/package and irreversible confirmation authority/prerequisite tests pass. | Import conditions with evidence review; irreversible commands start disabled; rollback before confirmation only. | XL; parallel P15; Sol High; legal/security review |
| BE-P17 | Runs recover after restart, tools reauthorize, stale sources invalidate, cost/model/tool records complete, prohibited effects impossible. | Shadow existing agent outputs; no side-effect cutover; rollback runner while preserving attempts. | XL; parallel P13–P16 after deps; Sol High; security/infrastructure |
| BE-P18 | All agents produce schema-valid proposed artifacts; evidence access and every H-only prohibition has regression coverage. | Migrate definitions one by one with version pins; rollback definition version. | XL; capability groups parallel after P17/domain ports; Sol High |
| BE-P19 | Draft→approval→redaction→release→export states, stale propagation, recipient scope and retry receipts pass. | Import generated files as historical drafts; object migration; release feature-gated. | XL; parallel P20–P22; Sol High; security/frontend/infrastructure |
| BE-P20 | Recipient isolation, subscription versioning, delivery retry/expiry and non-mutating source behavior pass. | Dual notification projection; channel rollout; rollback delivery adapter. | M; parallel P19/P21/P22; Terra High; credentials for channels |
| BE-P21 | Invitation/grant requires H sponsor/scope/expiry; external DTO/retrieval leakage, revoke/offboard and submission tests pass. | Migrate team as internal grants only after review; external portal gated. | XL; parallel P19/P20; Sol High; mandatory security review/frontend coordination |
| BE-P22 | Consequence preview, H-only transitions, retention/hold dominance, resumability and irreversible checkpoint tests pass. | Start with pause/archive; rehearse restore; erase disabled until policy/backup approvals. | XL; parallel P19–P21 but exclusive governance migration; Sol High; legal/security/infrastructure |
| BE-P23 | All 25 families pass existing workflow verifier plus contract/error/stale/permission tests against v1; fixtures remain deterministic. | Per-family feature flags and canary; rollback adapter flag, not backend history. | XL; family groups parallel after APIs; Terra High; mandatory frontend coordination |
| BE-P24 | Each enabled adapter passes conformance, sandbox/failure/health/residency tests and readiness evidence; unsupported capability denied. | Provider-by-provider rollout/credential rotation; rollback adapter/capability flag. | XL; adapters parallel; Sol High for security, Terra High for mechanical adapters; credentials/infrastructure |
| BE-P25 | Rehearsed import/reconcile/cutover/rollback meets thresholds; no prototype writer/consumer remains; historical manifest retained. | Exclusive migration owner; staged tenant/deal batches; rollback within documented window. | XL; serial cutover; Sol High; data/security/operations approval |
| BE-P26 | Full canonical suite plus isolation, authority, concurrency, recovery, provider failure and all critical desktop workflows pass with zero open P0/P1. | Progressive production-candidate gate; rollback matrix exercised; no automatic promotion. | XL; verification streams parallel, final gate serial; Sol High; all reviews |

## 4. Parallel execution and ownership

Parallel groups after their dependencies are green:

- **Group A:** BE-P02 and BE-P03.
- **Group B:** BE-P04, BE-P05 and BE-P08.
- **Group C:** BE-P07 and BE-P09.
- **Group D:** BE-P13 and BE-P14.
- **Group E:** BE-P15, BE-P16 and BE-P17.
- **Group F:** BE-P18, BE-P19, BE-P20 and BE-P21 after their P13–P17 prerequisites.
- **Group G:** BE-P22 and BE-P24 after Group F dependencies are complete; provider adapters inside P24 can run independently.
- **Group H:** BE-P23 adapters by independent screen family after the corresponding P06–P22 APIs are complete.
- **Group I:** BE-P26 security, workflow, recovery and provider test streams; final release decision remains serial.

Exclusive ownership:

- BE-P03 owns foundation migrations and database conventions.
- BE-P09 owns document/object/vector migration until BE-P10 reindex completes.
- BE-P22 owns governance/retention/erasure orchestration.
- BE-P25 is the only cutover and compatibility-retirement owner.

Required approvals/inputs:

- Data-model approval: P03–P16, P19, P22 and P25.
- Security review: P02, P04, P05, P08–P12, P14–P25.
- Frontend coordination: P06–P07, P09–P23 and P26.
- Integration credentials: P15 delivery, P16 signature provider if selected, P20 channels and P24.
- Production infrastructure: P03, P08–P10, P15–P22, P24–P26.

## 5. Owner approval record

The owner approved this plan and the target architecture baseline on 2026-07-30. The deferred implementation inputs remain explicit dependencies, approval gates or acceptance conditions in the applicable tasks: provider/infrastructure selections, PostgreSQL RLS rollout scope, production IdP, break-glass policy, RPO/RTO, model/prompt retention, migration/cutover windows, credentials and production-readiness evidence.

No task was started by this approval. MAI-103 closure authorizes the plan only; implementation begins only when a later owner-directed execution task is set In Progress.

## 6. Approved Backlog mapping

| Temporary plan ID | Backlog task |
| --- | --- |
| BE-P01 | MAI-104 |
| BE-P02 | MAI-105 |
| BE-P03 | MAI-106 |
| BE-P04 | MAI-107 |
| BE-P05 | MAI-108 |
| BE-P06 | MAI-110 |
| BE-P07 | MAI-111 |
| BE-P08 | MAI-109 |
| BE-P09 | MAI-112 |
| BE-P10 | MAI-113 |
| BE-P11 | MAI-114 |
| BE-P12 | MAI-115 |
| BE-P13 | MAI-116 |
| BE-P14 | MAI-117 |
| BE-P15 | MAI-118 |
| BE-P16 | MAI-119 |
| BE-P17 | MAI-120 |
| BE-P18 | MAI-121 |
| BE-P19 | MAI-122 |
| BE-P20 | MAI-123 |
| BE-P21 | MAI-124 |
| BE-P22 | MAI-125 |
| BE-P23 | MAI-126 |
| BE-P24 | MAI-127 |
| BE-P25 | MAI-129 |
| BE-P26 | MAI-131 |

The mapping is one-to-one. The dependency graph in Sections 1–4 remains authoritative; real IDs replace temporary identifiers in the corresponding Backlog task dependencies.
