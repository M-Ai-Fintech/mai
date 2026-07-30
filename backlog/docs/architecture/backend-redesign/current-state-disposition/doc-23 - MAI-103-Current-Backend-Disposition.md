---
id: doc-23
title: MAI-103 Current Backend Disposition
type: specification
created_date: '2026-07-30 06:03'
updated_date: '2026-07-30 06:51'
---
# MAI-103 Current Backend Disposition

- **Document ID:** doc-23
- **Authority ID:** doc-23
- **Authority:** Canonical MAI-103 Keep/Adapt/Replace/Remove inventory
- **Owner:** Platform Architecture
- **Freshness:** Proposed as of 2026-07-30
- **Language:** English
- **Update trigger:** Current component inventory, disposition, migration dependency, or retirement condition changes
- **Status:** Proposed for owner approval
- **Rule:** Current code is migration evidence, not target-architecture authority

## 1. Disposition definitions

- **Keep:** responsibility and boundary survive; implementation still needs normal hardening.
- **Adapt:** useful responsibility or algorithm survives behind a target context-owned interface.
- **Replace:** boundary or implementation conflicts with the target and is superseded before cutover.
- **Remove:** no production responsibility survives; retain historical evidence until its documented retirement condition is met.

No item is removed by MAI-103. Tests remain evidence until replacement coverage and cutover criteria are satisfied.

## 2. Inventory

| # | Path or component | Current purpose and consumers | Current limitations | Target context | Disposition | Target replacement and migration dependency | Removal condition | Test consequence |
| ---: | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | `src/api/server.ts` | Deno HTTP entrypoint; CLI/tests | No authentication, policy boundary, durable jobs, versioning, or production persistence | Platform/API composition | Adapt | Composition root for `/api/v1`, authn, policy, context services, jobs; BE-P01-P03 | Old dispatch removed after adapter cutover | Replace router smoke tests with auth/scope/error tests |
| 2 | `src/api/mvp_routes.ts` | Monolithic mock route dispatcher; frontend/tests | Route shape and service boundaries are prototype-only | All product contexts | Replace | Context-owned semantic controllers and application services; BE-P04 onward | All approved frontend adapters use v1 contracts | Preserve behavior evidence; add contract/E2E replacements |
| 3 | `src/api/routes/shared.ts`, `dependencies.ts` | Route parsing/dependency bundle | Prototype request context, no actor/tenant/policy | Platform/API composition | Replace | Typed request context, policy-before-load dispatcher, dependency injection; BE-P01-P03 | New router fully owns requests | New unit tests for safe parsing and DI |
| 4 | `src/api/routes/entities_team.ts` | Entity/team mock endpoints | Conflates organizations, identities, membership and deal access | Organization Registry; Identity & Access | Replace | Organization, membership, invitation, grant command/query endpoints | Organization/access slices cut over | Replace endpoint tests with semantic lifecycle tests |
| 5 | `src/api/routes/deals.ts` | Deal CRUD/phase/team assignment | Generic update; no mandate, versions, prerequisites or authority | Deal Management; Work Management | Replace | Deal/mandate/lifecycle/milestone and workstream application services | Deal shell consumes v1 projections | Add state-machine/concurrency tests |
| 6 | `src/api/routes/chat.ts`, `chat_stream.ts` | In-memory chat plus SSE | Chat is not governed Agent Mission/Run; replay is process-local | Agent Execution | Replace | Mission/plan/run/tool activity APIs; Poll/SSE only for durable run progress | Agentic Workspace adapter migrated | Replace chat route tests with mission/run tests |
| 7 | `src/api/routes/engines_documents.ts` | Generic engine run, sample VDR and generated files | Generic run hides workflow semantics; filesystem output and mock VDR | Valuation; Matching; Documents; Deliverables | Replace | Named compute/process/generate commands and durable jobs | Each consuming screen uses context API | Split tests by context and job contract |
| 8 | `src/api/routes/notifications.ts` | List/read local notifications | No durable subscription, recipient isolation or delivery state | Notifications | Adapt | Notification projection/subscription service backed by durable records | New notification API reaches parity | Preserve basic list/read tests; add tenant/recipient tests |
| 9 | `src/api/routes/dashboard.ts` | Seeded dashboard summary | Not a canonical source; no freshness/projection watermark | Activity & Projections | Replace | Permission-safe Command Center projections | Projection builder established | Replace snapshot tests with projection/freshness tests |
| 10 | `src/api/routes/legacy.ts` | `/api/kyb`, `/predict`, `/portfolio`, `/negotiate`, `/document` | Retained compatibility routes bypass target domain and authority | Multiple | Remove | Explicit organization, valuation/matching, negotiation and document APIs | Consumers inventoried, migrated, deprecation window approved | Freeze then delete legacy-only tests |
| 11 | `src/api/contracts/common.ts`, `http.ts` | IDs, DTO helpers, envelopes | Prototype IDs/errors omit scope, policy, version and idempotency | Shared API contracts | Adapt | Branded context IDs, standard success/error/job/page/version contracts | v1 contract package adopted | Expand serialization/error property tests |
| 12 | `src/api/contracts/entities.ts` | Entity/team DTOs | Collapses legal entity/person/org/member/access concepts | Organization Registry; Identity & Access | Replace | Context-specific command/query DTOs with field omission | New APIs cut over | Replace fixtures and domain tests |
| 13 | `src/api/contracts/deals.ts` | Deal/phase/team DTOs | Status-shaped rather than invariant/state-machine contracts | Deal Management; Work Management | Replace | Versioned deal, mandate, lifecycle, milestone and workstream contracts | Deal adapters migrated | Add command and invalid-transition cases |
| 14 | `src/api/contracts/chat.ts` | Chat messages/events | Chat primitives do not express governed agent execution | Agent Execution | Remove | Mission/plan/run/step/tool/artifact contracts | Agentic Workspace migrated | Retire chat schema tests after replacement |
| 15 | `src/api/contracts/engines.ts` | Generic engine run/VDR/generation DTOs | Weak provenance and generic status | Valuation; Matching; Documents; Deliverables | Replace | Context-specific job/result/provenance contracts | Named APIs migrated | Replace generic engine contract tests |
| 16 | `src/api/contracts/notifications.ts` | Notification DTO | Missing subscriptions, delivery and protected target handling | Notifications | Adapt | Versioned recipient-safe notification contracts | New projection active | Extend tests |
| 17 | `src/api/contracts/dashboard.ts` | Dashboard DTO | Seed-bound and unwatermarked | Activity & Projections | Replace | Command Center/portfolio/attention read models | New projections adopted | Replace snapshot tests |
| 18 | `src/api/contracts.ts` | Legacy compatibility schemas | Entrenches legacy endpoint shapes | Multiple | Remove | `/api/v1` owned contract modules | Legacy routes retired | Retire legacy contract tests |
| 19 | `src/api/mvp_store.ts` | Compatibility export for memory store | Process-local transaction truth | All contexts | Remove | Context repositories and projections | No consumer remains | Store tests replaced by repository/service tests |
| 20 | `src/api/store/state.ts`, `types.ts`, `seed.ts`, `seed_ids.ts` | In-memory state and deterministic seed | Universal mutable store, no scope/version/audit | All contexts | Replace | Context schemas/repositories plus explicit dev fixtures | Persistent vertical slices and fixture factory exist | Replace state tests; retain curated seed scenarios |
| 21 | `src/api/store/entities.ts`, `team.ts` | Entity/team mutations | No lifecycle, policy or concurrency | Organization Registry; Identity & Access | Replace | Application services/repositories/state machines | Corresponding slices cut over | New authorization/lifecycle tests |
| 22 | `src/api/store/deals.ts` | Deal/phase/team mutations | Universal aggregate illusion and unversioned writes | Deal Management; Work Management | Replace | Separate Deal, Mandate, Lifecycle, Milestone and Workstream aggregates | Deal slice cut over | Add invariant/concurrency tests |
| 23 | `src/api/store/chat.ts` | In-memory messages | Not durable/auditable mission execution | Agent Execution | Remove | Agent Run/Step/Tool Activity records | Agent slice cut over | Remove chat store tests after migration |
| 24 | `src/api/store/engines.ts` | In-memory engine runs | No job durability, idempotency, provenance | Jobs; domain contexts | Replace | Durable Job/Attempt plus typed result records | Job runner adopted | Add retry/cancel/stale-input tests |
| 25 | `src/api/store/notifications.ts` | In-memory notification status | No durable delivery/subscription | Notifications | Replace | Notification/Subscription repository | Notification slice cut over | Repository and policy tests |
| 26 | `src/api/store/layouts.ts`, `accessors.ts`, `utils.ts`, `error.ts` | Seed layouts/access helpers/errors | Coupled to universal store | Projections; Shared API | Remove | Context projection builders, typed errors | No store consumer remains | Move useful assertions to new helpers |
| 27 | `src/core/db/schema.sql` | PostgreSQL transaction/memory/vector schema | No tenant/workspace/deal isolation across all records; no aggregate versions, audit, jobs, outbox/inbox | Persistence foundation | Replace | Context schemas and migration plan; BE-P03 then slices | Validated migration/cutover and rollback exist | Replace setup/schema tests; migration contract tests |
| 28 | `src/core/db/DatabaseConnection.ts`, `setup.ts` | PostgreSQL connection/setup | Useful driver wrapper, but setup owns prototype schema and configuration | Persistence foundation | Adapt | Injected pool/transaction runner, per-context migrations and DB roles | New persistence bootstrap active | Keep connection failure tests; add transaction/role tests |
| 29 | `src/core/db/TransactionRepository.ts`, transaction operations | Transaction aggregate persistence | Legacy universal transaction model and table ownership | Deal Management | Replace | Deal/mandate/lifecycle repositories owned by Deal Management | Data migration and read comparison complete | Replace repository tests with context repository contract tests |
| 30 | `src/core/db/DatabaseMemoryService.ts`, `memory_service.ts`, `memory_search.ts` | Agent memory/vector search | Deal-only silo intent, weak tenant/document-version/classification/provenance controls | Documents & Evidence; Agent Execution | Replace | Evidence retrieval and vector index ports with T/W/D/version scope | Reindex and retrieval leakage tests pass | Replace memory tests; add isolation/staleness tests |
| 31 | `src/core/pubsub/MessageBus.ts` | In-process publish/subscribe abstraction | Contract lacks durable delivery semantics | Events foundation | Adapt | Domain event/outbox/inbox publisher interfaces | Durable event foundation active | Contract tests for ordering/idempotency |
| 32 | `src/core/pubsub/LocalPubSubBus.ts` | Local events/history/replay | Process-local, mutable lifecycle, not a transactional source | Local testing only | Remove | Durable outbox dispatcher; optional named fake bus in unit tests | No production registration or test assumption | Retain as fake only if renamed and scoped |
| 33 | `src/core/pubsub/AgentFlowWrapper.ts` | Event-driven agent checkpoint wrapper | No durable job/authority/tool/evidence boundary | Agent Execution | Replace | Mission/Run coordinator over Jobs and ToolGateway | Agent workflow migrated | Replace wrapper tests with run recovery tests |
| 34 | `src/agent/index.ts`, `actions.ts`, `ai_provider.ts` | Agent orchestration and provider calls | Direct generate/fallback; insufficient scope/audit/human boundaries | Agent Execution | Replace | Mission application service, durable runner, model-provider port | Mission slice production candidate | New authority/provider/failure tests |
| 35 | `src/agent/agents/*/index.ts` | Eight specialist agent implementations | Useful prompts/schemas but direct orchestration and mixed effects | Agent Execution plus domain contexts | Adapt | Versioned agent definitions producing typed proposals through ToolGateway | Per-agent validation and provenance complete | Retain schema tests; add authority/evidence tests |
| 36 | Agent playbooks/rules/instructions/checklists/fonts/templates | Local specialist knowledge assets | Version/provenance/governance and stale-source treatment incomplete | Agent Execution knowledge registry | Adapt | Versioned knowledge bundle registry and validation | Bundle manifest and review process active | Snapshot/schema/provenance tests |
| 37 | Agent schemas | Structured inputs/outputs | Do not map cleanly to aggregate commands/read models; some outputs imply decisions | Agent Execution/domain contexts | Adapt | Explicit proposal schemas referencing exact versions/evidence | Target schemas and migrations complete | Compatibility parsing tests during transition |
| 38 | `src/agent/tools/*`, agent-specific tools | Memory, integration, AI and engine tool calls | Can bypass application service/policy/audit; direct side-effect risk | Agent Execution ToolGateway | Replace | Capability-scoped read/proposal tools only | No direct repository/provider tool remains | Tool authorization/denial/idempotency tests |
| 39 | `src/agent/rag_layer.ts`, `rag/documents.ts`, `rag/vectors.ts` | Client-siloed retrieval and vector helpers | No complete tenant/classification/version/provenance contract | Documents & Evidence | Replace | EvidenceRetrievalPort and scoped vector projections | Reindex and dual-read validation complete | Cross-tenant/deal/field leakage regression suite |
| 40 | `src/agent/continuous_learning.ts` | Feedback/learning loop | Learning from ungoverned outputs can blur facts, decisions and model artifacts | Agent Execution/Model Governance | Replace | Audited evaluation dataset and offline governed improvement workflow | Data-governance approval | Replace behavior tests with dataset lineage tests |
| 41 | `src/core/vdr/provider.ts`, `types.ts` | VDR provider abstraction/types | Useful boundary, missing connector account, capabilities, version/checksum, normalized failure | Documents & Evidence integration | Adapt | `DocumentSourceProvider` owned interface | Connector contract implemented | Expand provider conformance tests |
| 42 | `src/core/vdr/mock.ts`, `src/agent/vdr_mock.ts` | Local fixture VDR | Fixture may be mistaken for operational integration | Test fixtures | Keep | Named local fixture implementing provider conformance | Keep only in dev/test registration | Retain deterministic conformance tests |
| 43 | Papermark/iDeals/Intralinks adapters | Provider access | Mixed mock/partial behavior, no verified tenant credentials, retries, health or production evidence | Documents & Evidence integration | Adapt | Connector adapters behind accounts, vault refs and capability discovery | Provider-specific production validation | Add sandbox/conformance/failure tests; never label ready early |
| 44 | `src/engines/optimization/valuation/*` | Valuation algorithms/reconciliation | Algorithms not governed by scenario/input/result/provenance/approval aggregates | Valuation | Adapt | Pure calculation ports invoked by scenario service/job | Golden outputs and provenance validation | Keep algorithm tests; add scenario integration tests |
| 45 | `src/engines/optimization/matching/*`, `alternatives.ts`, `genetic.ts`, `constraints.ts` | Matching/optimization/BATNA calculations | Mixed generic optimization and internal strategy without policy boundary | Matching; Negotiation | Adapt | Pure algorithms behind typed application ports | Input/output/version/privacy contracts pass | Preserve mathematical tests; add restriction tests |
| 46 | `src/engines/optimization/kyc/*` | KYC valuation solver | Naming/domain overlap and generic engine entrypoint | Organization Registry/Risk (future boundary) | Replace | Explicit due-diligence/risk capability proposal, only if approved | Consumer and product requirement confirmed | Freeze tests until target decision |
| 47 | `src/engines/prediction/*` | ONNX/Transformers/heuristic predictions | Model artifact lineage/readiness/fallback ambiguity | Model-backed domain calculations | Adapt | Versioned inference port with explicit result provenance/fallback type | Artifact registry and validation evidence | Keep unit tests; add artifact/fallback tests |
| 48 | `src/engines/document-generator/*` | PDF/LaTeX generation | Server filesystem output; no deliverable/source/redaction/release model | Deliverables & Distribution | Adapt | Pure renderer behind deliverable generation job/object storage | Golden/render security tests and slice cutover | Preserve layout tests; add provenance/redaction tests |
| 49 | `tests/api/**` | Prototype route/contract/store regression | Encodes MVP shapes, not target authority | All API contexts | Replace | Contract, policy, state-machine, repository and E2E suites | Equivalent approved workflow coverage exists | Migrate per vertical slice; no big-bang deletion |
| 50 | `tests/core/**`, `tests/db_setup.spec.ts`, `tests/pubsub.spec.ts` | DB/memory/pubsub behavior | Validates prototype persistence and local bus | Persistence/Events | Replace | Migration, isolation, outbox/inbox/job/recovery tests | Durable foundation verified | Retain useful driver/error cases |
| 51 | `tests/agents/**`, `tests/e2e/flow*`, workflow schema tests | Agent/tool/end-to-end prototype evidence | Missing human authority, policy-before-load and durable-run coverage | Agent Execution | Adapt | Mission/run/tool/evidence/authority E2E tests | Approved target flows pass | Preserve valid schema/algorithm assertions |
| 52 | `tests/vdr*`, provider fixtures | Provider contract/fixture evidence | No tenant credential, capability, retry or production validation | Documents & Evidence integration | Adapt | Provider conformance + sandbox certification suites | New port adopted | Keep fixture evidence; expand failure/isolation coverage |
| 53 | `gui/screens/fixtures/*`, `gui/lib/*-api.ts`, stories/tests/verifiers | Approved frontend-backed fixture behavior and typed adapters | Simulates backend; not transaction truth | API consumers | Adapt | Migrate adapters family by family to v1 read models/commands | Parity, error, stale and permission tests pass | Retain fixtures as deterministic Storybook/test fixtures |
| 54 | doc-2 through doc-7, doc-9 | Current architecture/domain/API documentation | Valuable historical evidence but current MVP claims are no longer target authority | Canonical documentation | Adapt | Explicit target decisions and links to doc-19–36; mark current-state sections | Owner approves proposed authority | Documentation check and traceability |
| 55 | doc-10 and doc-12 | Documentation index and inventory | Must enumerate new authority and ownership | Documentation governance | Adapt | Add doc-19–36 and supersession/ownership metadata | Always retained | `scripts/check_docs.ts` |
| 56 | `src/core/boot.ts` / `AppBootstrapper` | Global composition, dependency initialization and fallback selection; server/CLI/tests | Central mutable bootstrap and implicit fallback can bypass context-owned composition, readiness and failure policy | Platform composition | Replace | Injected composition root and explicit provider/readiness registry after BE-P01–P03 | No production entrypoint or test imports `AppBootstrapper`; replacement startup/failure tests pass | Preserve startup-order intent; replace global/fallback tests with composition and degraded-readiness tests |

## 3. Counts

| Disposition | Count |
| --- | ---: |
| Keep | 1 |
| Adapt | 20 |
| Replace | 28 |
| Remove | 7 |
| **Total** | **56** |

Counts are inventory-row counts, not file counts. Grouped rows are intentionally one responsibility/boundary so the migration conditions remain executable.

## 4. Retirement sequencing

1. Freeze legacy and MVP contracts; record consumers and representative fixtures.
2. Establish shared authorization, persistence, concurrency, event and job foundations.
3. Deliver context slices with target contract tests and dual-read comparisons where data exists.
4. Move frontend adapters route family by route family; preserve Storybook fixtures as fixtures.
5. Stop writes to prototype stores/tables, reconcile, and cut reads.
6. Observe the approved rollback window.
7. Remove production registration, then delete retired code/tests in separately approved implementation tasks.

Historical documents, fixtures, tests, and migration manifests remain available after runtime retirement. Compatibility is not a reason to distort the target model.
