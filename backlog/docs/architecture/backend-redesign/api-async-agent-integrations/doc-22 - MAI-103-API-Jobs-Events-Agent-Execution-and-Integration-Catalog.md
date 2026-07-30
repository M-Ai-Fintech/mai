---
id: doc-22
title: 'MAI-103 API, Jobs, Events, Agent Execution, and Integration Catalog'
type: specification
created_date: '2026-07-30 06:03'
updated_date: '2026-07-30 06:51'
---
# MAI-103 API, Jobs, Events, Agent Execution, and Integration Catalog

- **Document ID:** doc-22
- **Authority ID:** doc-22
- **Authority:** Canonical proposed synchronous/asynchronous and integration contracts
- **Owner:** API, Agent, and Integration Architecture
- **Freshness:** Proposed as of 2026-07-30
- **Language:** English
- **Update trigger:** API, error, job, event, agent execution, streaming, or integration contract changes
- **Status:** Proposed for owner approval
- **Base path:** `/api/v1`
- **Implementation boundary:** Contract design only; no handler, worker, transport, provider, or frontend adapter is implemented

## 1. API style and common contracts

### 1.1 Principles

- APIs expose workflow semantics, not generic CRUD.
- Queries use `GET`; creations and state transitions use `POST`; controlled editable fields may use `PATCH`.
- There is no generic `DELETE /deals/:id` for archive, termination, or erasure. Those are named commands with consequence previews and human authority.
- Protected resources return the same `404 PROTECTED_NOT_FOUND` whether absent or unauthorized.
- Every mutable aggregate response includes `ETag: "v<version>"` and a numeric `version`.
- Every material update requires `If-Match`. Every mutation accepts `Idempotency-Key`; it is mandatory for creates, commands, jobs, and side effects.
- Collection queries use opaque cursor pagination by default. Stable administrative tables may use page pagination when random access is required.
- Filtering/sorting/search fields are allow-listed per read model. Unknown fields return validation failure; raw SQL/provider syntax is never exposed.

Success:

```json
{
  "data": {},
  "meta": {
    "correlationId": "cor_...",
    "nextCursor": null,
    "projectionAsOf": "2026-07-30T00:00:00Z",
    "freshness": "current",
    "warnings": []
  }
}
```

Accepted asynchronous command:

```json
{
  "data": {
    "operationId": "op_...",
    "jobId": "job_...",
    "status": "queued",
    "statusUrl": "/api/v1/jobs/job_..."
  },
  "meta": { "correlationId": "cor_..." }
}
```

Error:

```json
{
  "error": {
    "code": "VERSION_CONFLICT",
    "message": "The aggregate changed after the supplied version.",
    "correlationId": "cor_...",
    "fieldErrors": {},
    "retryable": false,
    "expectedVersion": 7,
    "currentVersion": 8,
    "operationId": null,
    "safeComparisonUrl": "/api/v1/..."
  }
}
```

## 2. Stable error catalog

| HTTP | Code | Contract |
| --- | --- | --- |
| 422 | `VALIDATION_FAILED` | Safe message plus field errors; includes offending value only when not sensitive and expected shape. |
| 401 | `UNAUTHENTICATED` | Session/token missing, invalid, or expired; no resource information. |
| 404 | `PROTECTED_NOT_FOUND` | Used for both unauthorized and absent protected objects; no existence, tenant, deal, owner, or field hint. |
| 403 | `ACTION_FORBIDDEN` | Used only when object disclosure is already permitted but the action is denied; safe reason code and allowed actions may be returned. |
| 409 | `VERSION_CONFLICT` | Expected/current version and safe comparison URL; preserves submitted draft separately. |
| 409 | `STALE_VERSION` | Exact referenced source/target version is no longer current for the command. |
| 409 | `IDEMPOTENCY_CONFLICT` | Same key was used for a different actor/target/command/payload digest. |
| 409 | `INVALID_TRANSITION` | Current state, attempted command, and permitted safe actions; no restricted prerequisite details. |
| 423 | `RETENTION_OR_LEGAL_HOLD` | Archive/erasure/termination action blocked by retention or hold; details require records permission. |
| 429 | `RATE_LIMITED` | Retry-after and limit scope; no cross-tenant information. |
| 503 | `DEPENDENCY_UNAVAILABLE` | Normalized dependency category, retryable flag, and optional operation reference; no secret/provider raw response. |
| 202/200 job terminal | `ASYNC_OPERATION_FAILED` | Job state has sanitized failure code, attempts, retryability, and operator/user action. |

## 3. Synchronous API catalog

All rows inherit the common error envelope, tenant/workspace scope, protected-not-found behavior, ETag rules, audit rules, and permission-safe DTO assembly. `I-M` means `If-Match`; `I-K` means `Idempotency-Key`.

| API family | Operation, method, and canonical route | Command/query semantics; actor | Request → response schema | Authorization and scope | Idempotency/concurrency; audit | Pagination/filter/sort/search; sync/async |
| --- | --- | --- | --- | --- | --- | --- |
| Session/identities | `GET /session/context`; `GET /identities/me` | Resolve current authenticated identity, memberships and safe shell actions; any authenticated actor | session selector → `SessionContext`, `IdentitySummary` | Active identity; no protected aggregate load before scope | ETag policy/session version; context selection audit when durable | none; synchronous |
| Institutions/workspaces | `POST /institutions`; `GET/PATCH /institutions/:tenantId`; `POST /workspaces` | Provision/update institution/workspace; platform/institution admin H | typed institution/workspace fields → versioned summaries | platform or institution admin; T/W | I-K create, I-M patch; audit create/config/suspend | page/filter status; sync |
| Organizations | `POST/GET /organizations`; `GET/PATCH /organizations/:organizationId`; `POST ...:merge` | Semantic Organization Registry operations; banker/admin H | organization/legal-registration/contact fields → permission-safe detail | T/W/O/F and relationship policy | I-K create/merge, I-M patch; audit material identity changes | cursor; filter type/country/status; sort name/updated; permission-safe search |
| Legal entities/persons | `POST /organizations/:id/legal-entities`; `POST .../persons`; `PATCH /legal-entities/:id`, `/persons/:id` | Maintain identity components; relationship/admin H | typed identity/PII fields → masked entity/person | T/W/O/F; restricted identity policy | I-K create, I-M patch; PII audit | cursor; restricted search; sync |
| Memberships | `GET /memberships`; `POST /invitations`; `POST /memberships/:id:{activate,suspend,start-offboarding,complete-offboarding}` | Membership lifecycle; identity/team/security admin H | invitation/sponsor/role/expiry or reason/impact → versioned status | T/W membership admin; H-only | I-K all commands, I-M target; immutable lifecycle audit | cursor; status/role filters; sort name/status; sync, invitation delivery async |
| Roles/permissions | `GET/POST /role-policies`; `POST /permission-grants`; `POST /permission-grants/:id:revoke`; `POST /restrictions` | Publish policies/grants/restrictions; security admin H | action/resource/field/purpose/sponsor/expiry → versioned policy/grant | T/W/D/O/F/action; H-only, SoD | I-K, I-M; authority snapshot and audit | cursor; filters role/action/scope/status; sync |
| Deals | `POST/GET /deals`; `GET/PATCH /deals/:dealId` | Create/configure deal; authorized banker/deal lead H | deal identity/type/confidentiality/currency → versioned `Deal`/`DealOverview` | T/W/D/F | I-K create, I-M patch; audit | cursor; filters phase/status/lead/attention; sort/search allow-list; sync |
| Deal parties/mandate | `GET /deals/:dealId/mandate`; `POST .../parties`; `POST .../mandate:publish`; `POST .../authority-constraints` | Configure parties, roles, mandate and ceilings; deal lead/mandate admin H | typed party refs/roles/limits → `DealMandate` | T/W/D/O/F; internal mandate fields | I-K, I-M mandate; audit and provenance | cursor parties; sync |
| Lifecycle/milestones | `GET /deals/:id/lifecycle`; `POST .../phase-transitions`; `POST/GET .../milestones`; `POST .../milestones/:id:complete` | Governed phase and milestone transitions; deal/workstream H | target state, reason, prerequisites/evidence refs → lifecycle/milestone | T/W/D/O/action | I-K, I-M; audit every transition | cursor milestones; status/owner/due filters; sync |
| Workstreams | `POST/GET /deals/:id/workstreams`; `POST .../:workstreamId:{activate,block,complete}` | Workstream lifecycle; deal/team H | scope/owner/state reason → versioned workstream | T/W/D/O | I-K, I-M; audit material transitions | cursor; status/owner filters; sync |
| Tasks | `POST/GET /deals/:id/tasks`; `GET /tasks`; `POST /tasks/:id:{start,block,complete,reassign,cancel}` | Exact-context task workflow; assignee/owner/admin H | target ref/assignment/due/evidence/reason → task | T/W/D/O/F; assignment relationship | I-K, I-M; audit transitions/reassignment | cursor; filter state/assignee/due/deal/type; sort priority/due; safe search; sync |
| Approvals | `POST /approval-requests`; `GET /approval-requests/:id/package`; `POST .../:id:{decide,withdraw}` | Review exact immutable package and record H decision | target/version/evidence/authority requirement; decision/rationale/conditions → request and decision ref | named active approver, T/W/D/O/F, SoD; H-only | I-K and I-M; immutable decision/audit | cursor listing by state/approver/deal/due; sync |
| Documents | `POST /deals/:id/documents:upload-init`; `GET /deals/:id/documents`; `GET /documents/:id`; `POST /documents/:id/versions` | Initiate upload, register version, list/read metadata; authorized H | metadata/checksum/classification/storage negotiation → upload operation/document | T/W/D/O/F | I-K, I-M document; audit source/version | cursor; filter source/type/state/freshness; sort name/updated; safe metadata search; upload async |
| VDR sources | `POST/GET /deals/:id/document-sources`; `POST /document-sources/:id:synchronize`; `GET ...:capabilities` | Register/sync provider source; integration/document admin H | connector account/provider object/folder → source/job | T/W/D and tenant connector account | I-K, I-M source; audit/provider provenance | cursor; provider/state filters; sync command returns 202 |
| Processing runs | `POST /document-versions/:id:process`; `GET /processing-runs/:id`; `POST ...:{retry,cancel}` | Durable processing lifecycle; H initiator/operator | requested stages/priority → job/run status | source access plus worker capability | I-K, I-M run; audit attempts | status query; 202 async |
| Evidence/citations | `POST/GET /evidence`; `GET /evidence/:id`; `POST ...:{validate,invalidate}` | Exact document-version/location evidence; analyst/reviewer H or authorized AI proposal | source/version/location/excerpt/hash/classification → Evidence/Citation | T/W/D/O/F; source access before load | I-K, I-M evidence; audit/provenance | cursor; filters source/validity/freshness; sync, derivation job optional |
| Facts/interpretations | `POST/GET /deals/:id/facts`; `POST /facts/:id:{approve,supersede}`; `POST /interpretations` | Fact-version and interpretation lifecycle; H/AI proposes, H approves | typed value/unit/period/evidence or statement/rationale → fact/interpretation | T/W/D/O/F; H-only approval | I-K, I-M; immutable approved version/audit | cursor; filters state/category; sync |
| Assumptions/calculations | `POST/GET /deals/:id/assumptions`; `POST /calculations`; `GET /calculations/:id` | Version inputs and execute deterministic formula; H/authorized AI | assumption/rationale/usage or formula/input versions → assumption/calculation/job | T/W/D/O/F and model permission | I-K, I-M assumption; provenance/audit | cursor; filters usage/state; calculation sync only under time budget else 202 |
| Findings | `POST/GET /deals/:id/findings`; `POST /findings/:id:{submit,record-impact,approve,invalidate}` | Evidence-based finding/impact workflow; analyst/AI proposes, H approves | category/severity/evidence/impact/treatment → finding | T/W/D/O/F | I-K, I-M; audit/provenance | cursor; state/category/severity/owner filters; sync |
| Decisions | `GET /decisions/:id`; `POST /decision-requests/:id:record`; `POST /decisions/:id:invalidate-basis` | Immutable human decision and later validity event | exact target/package/rationale/conditions → DecisionRecord | named H authority, SoD | I-K; target I-M; immutable audit | cursor by deal/type/state/actor/date; sync |
| Valuation | `POST/GET /deals/:id/valuation-scenarios`; `POST /valuation-scenarios/:id:{compute,approve,invalidate}`; `GET .../compare` | Scenario input/compute/review; analyst/AI compute, H approves | method/model/input/assumption versions → scenario/job/result | T/W/D/O/F, valuation role; H-only approval | I-K, I-M; calculation and decision provenance | cursor; filter state/method/date; compare explicit IDs; compute sync or 202 |
| Matching | `POST/GET /deals/:id/matching-criteria`; `POST .../matching-runs`; `GET /matching-runs/:id/candidates` | Criteria and computation; deal team/authorized AI | criteria/mandate/source versions → run/job/candidate projection | T/W/D/O/F; restricted candidate policy | I-K, I-M criteria; provenance/audit | cursor candidates; filter fit/conflict/state; sort allow-list; safe search; 202 |
| Conflicts | `POST/GET /deals/:id/conflicts`; `POST /conflicts/:id:{resolve,restrict,reopen}` | Conflict/restricted identity workflow; conflict officer H | candidate/evidence/reason/resolution → safe conflict view | T/W/D/O/F; relationship owner; protected 404 | I-K, I-M; immutable resolution audit | cursor; state/type filters; no unrestricted identity search; sync |
| Shortlist/outreach | `POST/GET /deals/:id/shortlists`; `POST /shortlists/:id:approve`; `POST /outreach-authorizations` | Nonbinding recommendation to H shortlist and outreach gate | run/candidate/conflict/mandate refs → shortlist/authorization | deal lead H-only decision | I-K, I-M; audit | cursor; sync |
| Negotiation | `POST/GET /deals/:id/negotiation-rounds`; `POST/GET /rounds/:id/proposals`; `POST /proposals/:id:{normalize,submit-for-approval,approve,withdraw}` | Record rounds/proposals/terms/internal position; banker/counsel/approver H, AI draft only | source/evidence/terms/mandate/position → versioned round/proposal | T/W/D/O/F; internal strategy omitted externally | I-K, I-M; received/send provenance and audit | cursor; state/round/side filters; sort received/date; sync |
| Proposal delivery | `POST /proposals/:id:send`; `GET /proposal-deliveries/:id`; `POST ...:{retry,cancel}` | Separate approved payload from H-authorized external send | proposal version/recipient/channel/payload digest → job/delivery | external-communication H permission, mandate, recipient allow-list | I-K mandatory, I-M proposal/delivery; audit every attempt | status query; 202 async |
| Closing | `POST/GET /deals/:id/closing-conditions`; `POST /closing-conditions/:id:{submit-evidence,satisfy,invalidate}`; waiver routes | Govern conditions/checklist/waivers; counsel/owner/approver H | condition/evidence/rationale/authority → condition/waiver | T/W/D/O/F; H-only satisfy/waive as policy | I-K, I-M; audit | cursor; status/owner/due/type filters; sync |
| Readiness/signatures/packages | `POST /closing-readiness:{request,approve}`; signature commands; `POST /closing-packages`; `POST ...:confirm-close` | Readiness, signature evidence, package and irreversible confirmation | prerequisite snapshot/signatory/package manifest/confirmation → status/job | named H approver/signatory; H-only | I-K, I-M; immutable audit | package assembly 202; other commands sync |
| Agent missions | `POST/GET /deals/:id/agent-missions`; `POST /agent-missions/:id:{submit-plan,approve-plan,start,cancel,invalidate}` | Mission/plan scope and H gate; H/AI proposal, H approval | objective/scope/tools/evidence/side-effect ceiling → mission/plan/run ref | T/W/D/O/F; actor-type and tool policy | I-K, I-M; prompt/plan/authority audit | cursor; state/creator/type filters; start 202 |
| Agent runs/tool activity | `GET /agent-runs/:id`; `GET .../{steps,tool-activities,artifacts}`; `POST ...:{retry,cancel}` | Inspect durable run and control attempts | run control reason → run/job; read DTOs omit inaccessible evidence | captured scope rechecked for every read/tool | I-K, I-M; append-only tool/provenance audit | cursor steps/tools; Poll or SSE progress |
| Activity/audit | `GET /deals/:id/activity`; `GET /audit-events/:id`; `POST /audit-exports` | Permission-safe timeline/reconstruction/export; auditor/deal lead H | filters/time/object/correlation/export format → projection/event/job | `audit.read`/`audit.export` plus event field policy | export I-K; immutable audit access record | cursor; filter event/object/actor/date/correlation; sort time; export 202 |
| Deal team/access | `GET /deals/:id/team`; `POST /deals/:id/{invitations,access-grants,restrictions}`; revoke/offboard commands | Deal participation separate from membership; deal/access admin H | participant/role/scope/purpose/sponsor/expiry/reason → grant/status | T/W/D/O/F; H-only | I-K, I-M; audit | cursor; role/state/classification filters; sync + delivery async |
| Deliverables | `POST/GET /deals/:id/deliverables`; `POST /deliverables/:id:{generate,submit,approve,mark-stale}` | Reversible draft, immutable version and content approval | type/audience/source snapshot/generation config → deliverable/job | T/W/D/O/F/audience; H-only approval | I-K, I-M; source/model/author audit | cursor; state/type/audience/freshness filters; generation 202 |
| Redaction/release | `POST /deliverable-versions/:id/redactions`; `POST /redactions/:id:approve`; `POST /releases`; `POST /releases/:id:{authorize,release,revoke}` | Redaction then separate release authority | rules/manifest/audience/external scope → redaction/release | redactor/release H roles, SoD where policy | I-K, I-M; immutable release audit | sync except release side effect may be 202 |
| Exports/distribution | `POST /exports`; `GET /exports/:id`; `POST ...:{retry,distribute}` | Generate controlled file and distribute only after H command | source/release/format/recipient/channel → job/export/receipt | export/distribute permission, recipient scope | I-K mandatory; I-M export/release; attempt audit | 202; Poll status |
| Deal governance | `GET /deals/:id/governance-impact`; `POST /deals/:id:{pause,resume,archive,restore,terminate}` | Named lifecycle consequences; deal lead/admin H | reason/impact snapshot/confirmation/target state → governance/job | H-only, T/W/D, hold/retention policy | I-K, I-M; immutable audit | restore/archive may 202; no pagination |
| Retention/deletion | `GET /deals/:id/retention`; `POST /legal-holds`; `POST /deletion-requests`; approve/cancel/execute routes | Retention/hold/erasure workflow; records/legal H | scope/reason/approvals/impact → hold/request/job | H-only dual control; legal hold dominates | I-K, I-M; immutable erasure manifest | 202 execute; Poll status |
| Notifications | `GET /notifications`; `POST /notifications/:id:mark-read`; `GET/PATCH /subscriptions/:id` | Awareness and personal delivery settings | read/subscription fields → notification/subscription | recipient only | I-K and I-M; read audit per policy | cursor; unread/type/deal filters; sort time; sync |
| External portal | `GET /external/workspaces/:id`; request/submission/approval routes; sponsor/scope/revoke internal routes | Purpose-bound external participation; external H and internal sponsor H | scoped submission/response/sponsor/expiry/object allow-list → safe portal DTO/status | external grant plus purpose/sponsor/expiry; no internal strategy | I-K, I-M; full sponsor/submission/decision/revocation audit | cursor requests/activity; upload 202; Poll/SSE upload |
| Jobs | `GET /jobs/:id`; `POST /jobs/:id:{retry,cancel}` | Durable operation control; initiating H or operator | reason → versioned job | same T/W/D scope and job ownership | I-K, I-M; attempt audit | Poll; optional SSE endpoint for approved job types |

## 4. Mechanism-selection rules

| Mechanism | Use | Do not use |
| --- | --- | --- |
| Synchronous HTTP | Fast validation, queries, semantic commands that commit one aggregate and no slow/external side effect | Long extraction, provider sync, AI/model runs, large exports or sends |
| Durable asynchronous job | Work that can outlive request/navigation, retry, time out, cancel, or call a provider | As a substitute for a simple aggregate command |
| Domain event | Business fact emitted after an aggregate transition inside one platform | Direct provider payload or mutable “current state” |
| Integration event | Stable external contract after outbox publication/translation | Internal implementation detail or before commit |
| Transactional outbox | Every durable event or asynchronous side effect caused by a committed command | Best-effort publish from application memory |
| Inbox | Deduplicate and trace incoming provider/webhook/event messages | Unverified unsigned payloads |
| Polling | Default job/projection progress via ETag/Retry-After | Tight subsecond UI loops |
| SSE | One-way progress for active document upload/processing, long agent run, or long export where it materially improves usability | Ordinary list refresh, business event backbone, or proof of durability |
| WebSocket | Not selected for the initial target; reconsider only for demonstrated bidirectional real-time collaboration | Notifications, job status, or agent progress that SSE/polling handles |
| Webhook | Signed provider callbacks and approved outbound integration notifications | Browser-facing internal state transport |

## 5. Asynchronous operation catalog

All jobs persist before execution, use the initiating scope/authority snapshot, reauthorize before each side effect, and have append-only attempts.

| Operation / initiating command | Job identity, scope, idempotency, payload and persistence | Retry, timeout, cancellation, failure and dead letter | Events, audit, progress and result retrieval | Stale-input and side-effect boundary |
| --- | --- | --- | --- | --- |
| Document upload `InitiateDocumentUpload` | `document-upload:{documentId}:{version}`; T/W/D; key required; checksum/classification/storage negotiation; platform job row | resumable chunks; 24h session; cancel before accept; scan failure; dead letter after policy attempts | upload/scan/version events; audit uploader/checksum; byte/stage progress; result DocumentVersion | reject changed metadata/classification; storage write only, no evidence acceptance |
| VDR sync `SynchronizeDocumentSource` | source/run ID; T/W/D/account; cursor/folder/capabilities | provider-aware backoff/rate limit; timeout; cancel; normalized failure/dead letter | sync events/audit/provider provenance; counts/cursor; result source versions | compare provider version/checksum; cannot overwrite accepted version |
| Conversion/OCR/extraction/classification | processing run per document version/stage | stage-specific retries/timeouts; cancellation; failure retained | processing events/tool metadata; stage progress; result artifacts | exact immutable input; results are derived, not evidence approval |
| Indexing/embeddings | processing run stage; T/W/D/document version/model | deterministic retry; cancel; dead letter bad model/input | index events/provenance; chunk progress; result index watermark | stale source writes separate version; no cross-deal query |
| Evidence derivation | evidence-derivation run; authorized source scope | retry pure derivation; timeout; cancel | proposed-evidence events/audit/model/tool provenance | output proposed only; H/system validation separate |
| Valuation computation | calculation job keyed by scenario/input/model versions | retry deterministic provider/runtime failures; cancel; dead letter invalid model | compute events/audit/formula/model; progress; result scenario version | stale input cancels; calculation cannot approve or set price |
| Matching computation | run keyed by criteria/mandate/source versions | provider/model retry; timeout; cancel | matching events/provenance; candidate count; result run | access/conflict rechecked; result cannot shortlist/outreach |
| Agent mission execution | run keyed by mission/plan version | provider/tool-aware retry; overall/step timeout; H cancel; dead letter exhausted run | run/step/tool/artifact events; complete prompt/model/cost/evidence audit; SSE/Poll | permission/source change blocks or invalidates; tools call application services only |
| Deliverable generation | generation keyed by deliverable/source snapshot/template/model | retry pure generation; cancel; failed version retained | generation/artifact events; provenance; progress; result draft version | source change marks draft stale; no approval/release |
| Export generation | export keyed by exact source/release/format | retry generation/storage; timeout; cancel; expiry/dead letter | export events/audit/manifest/checksum; Poll; signed result URL | source version fixed; no distribution |
| External release/distribution | delivery keyed by release/version/recipient/channel/payload digest | retry only safe idempotent provider operation; timeout; cancel before send; receipt failure | requested/sent/failed/receipt events; H authority audit; result delivery | revalidate release/grant/expiry immediately before send; send is only side effect |
| Notifications | delivery keyed by notification/channel/recipient | bounded backoff/rate limit; expiry; dead letter noncritical with audit | delivery events; status/attempts | destination reauthorized; notification cannot mutate source |
| Integration synchronization | sync keyed by account/capability/cursor/target | provider backoff, rate limit, timeout, cancel/dead letter | sync/inbox/outbox events; provider health/audit; result cursor | account/credential/scope revalidated; anti-corruption mapping before domain command |
| Archive/restore/erasure | governance job keyed by request/version | context-step retry; long timeout; cancel only before irreversible step; failed/dead-lettered with resumable checkpoint | governance/erasure events; immutable impact/manifest audit; context progress | legal hold/retention rechecked at each step; irreversible boundary explicitly recorded |

## 6. Agent execution architecture

### 6.1 Governed flow

```text
Human creates mission with deal/object/evidence scope
→ policy-safe MissionApplicationService persists proposed mission
→ agent may propose a structured plan
→ human approves plan when tools or consequential outputs require it
→ durable job creates AgentRun
→ each step receives a scoped ToolGateway
→ ToolGateway reauthorizes evidence and action
→ read tools query application services
→ write tools can only create drafts/proposals through application services
→ prompt/model/tool/evidence/cost metadata and output provenance are persisted
→ human reviews any resulting domain proposal
→ a separate human command performs any protected state change
```

### 6.2 Required records

- Mission objective, target scope, prohibited effects, budget/cost ceiling, evidence scope, model/provider policy, creator and authority snapshot.
- Plan version, steps, tool allow-list, evidence requirements, expected outputs, approval state and approver.
- Run/attempt, state, step state, tool activity, prompt template/version/hash, model/provider/version, generation parameters, usage/cost, timing, failures and retries.
- Evidence access decision for every retrieval; deal-silo and document-version identity.
- Generated artifact source snapshot, model/prompt/tool metadata, limitations and invalidation links.
- Provider failure normalized without secrets; model-version traceability retained.

### 6.3 Tool rules

- Tools receive `ActorContext`, `MissionId`, `RunId`, tenant/workspace/deal and correlation; they cannot accept unverified scope from model output.
- Evidence retrieval goes through the Documents & Evidence application service and permission-aware DTOs.
- Domain writes go through the owning application service. There is no direct repository, SQL, object-storage, event-bus, external-email, invitation, permission, archive, delete, signature, waiver, approval, release, or send tool.
- Secrets are resolved inside provider adapters for a specific connector account and capability; they never enter prompts.
- AI-created content is `proposed` or `draft`. Reversible artifact acceptance and every protected state change are separate H commands.

### 6.4 Failure, retry, cancellation, and invalidation

Runs support `queued`, `running`, `blocked`, `retrying`, `completed`, `failed`, `cancelled`, and `invalidated`. Retrying preserves attempts and idempotency. Cancellation is cooperative and cannot reverse committed domain effects. Provider or model failure is explicit; fallback requires a configured, audited policy and never silently changes model or capability. A changed permission/evidence/source version blocks the next tool call and triggers targeted output invalidation.

### 6.5 Current component disposition and maturity

| Current component | Disposition | Maturity evidence |
| --- | --- | --- |
| Eight `src/agent/agents/*` modules and schemas | Adapt | Partially implemented local agents; structured schemas/knowledge exist, but no governed mission/run/authorization/audit architecture |
| `AgentOrchestrator` / broker service | Replace orchestration boundary; adapt intent/domain knowledge | Local fallback and direct generate path; not a production candidate |
| `ClientSiloedRAG`, document/vector modules | Replace storage/retrieval boundary; adapt deal-silo intent | Local fixture and PostgreSQL fallback; missing tenant/version/classification/provenance |
| Engine tools | Adapt pure calculations; replace direct side-effect tools | Local deterministic/fixture behavior with tests; not production verified |
| `LocalPubSubBus` | Remove from production architecture | In-process local fixture only; no durable delivery |
| `AgentFlowWrapper` | Replace with durable job/run coordinator | Partially implemented checkpoints; no transactional job/audit |
| VDR providers | Adapt behind connector accounts/capabilities | Interface plus mocks/partial adapters; no production-verified status |
| Prediction/optimization/document engines | Adapt validated algorithms behind application services/jobs | Mixed local implementation and tests; artifact/provider readiness varies |

Maturity vocabulary is fixed: `interface only`, `local fixture`, `sandbox`, `partially implemented`, `production candidate`, `production verified`. Only deployment-specific executed evidence may assign the final two states.

## 7. Integration architecture catalog

| Integration | Owned interface and adapter boundary | Tenant credentials, secrets, capability discovery | Idempotency, retry, timeout, rate/failure normalization | Audit, residency/retention, health/fallback | Current readiness |
| --- | --- | --- | --- | --- | --- |
| VDR providers | `DocumentSourceProvider` lists metadata, versions, downloads/uploads and cursors; Papermark/iDeals/Intralinks adapters | ConnectorAccount→vault secret ref; per-tenant/workspace; discover folders/versioning/upload/webhook capabilities | provider request key/cursor; exponential backoff + `Retry-After`; configured timeout; normalized `ProviderError` | source/provenance audit; residency and provider retention recorded; health probe; no silent cross-provider fallback | interfaces/partial adapters/local fixtures; not production verified |
| Object storage | `BinaryObjectStore` put/get/version/delete/retention/legal-hold/signed-read | workload identity or tenant key policy; no browser credential | object key/checksum idempotency; retry safe operations; timeout/rate handling | object manifest audit; region/retention/hold; health and restore test | interface required; current server-file output is not candidate |
| AI providers | `ModelProvider` capability/model invocation and usage | tenant or platform policy; vault secret/workload identity | run/idempotency metadata; retry only safe failures; timeout/rate; normalized safety/provider errors | prompt/model/usage/audit; data-use/residency/retention policy; no silent model fallback | Google integration partially implemented/local fallback; not production verified |
| Embedding providers | `EmbeddingProvider` dimensions/model/batch/capability | scoped credential/policy | input digest idempotency; batch retry/timeout/rate | model/version/chunk provenance; residency; health; local fallback only when configured | local Transformers partially implemented; not production verified |
| Inference engines | `PredictionEnginePort` and deterministic calculation ports | artifact registry access, not end-user secret | input/model digest; bounded retry; timeout/resource normalization | artifact checksum/training provenance/usage audit; health; heuristic fallback must be explicit result type | local ONNX/algorithms partially implemented; model provenance unresolved |
| Document conversion/OCR | `DocumentProcessor` converts/extracts/classifies with stage results | scoped provider account or workload identity | document-version/stage key; retry/timeout/rate | page/location/tool provenance; data residency/retention; health; no invented extraction fallback | interface required; text decode/local generators are not production processing |
| Email/external communication | `ExternalCommunicationProvider` sends approved payload and returns receipt | tenant sender account; vault secret; recipient allow-list | payload/recipient idempotency; retry provider-safe operation; delivery timeout/rate | H authorization/payload digest/receipt audit; retention; health; no autonomous fallback | not implemented |
| Identity providers | `IdentityProvider` validates OIDC, provisions subject, revokes session | issuer/client refs in vault/config; tenant binding | nonce/session idempotency; bounded discovery retry | login/provision/revoke audit; regional/privacy policy; health; break-glass does not bypass IdP evidence | not implemented |
| Webhook consumers | `WebhookIngress` verifies signature, timestamp, replay and maps via inbox | provider/account signing secret in vault | provider event ID inbox; retry internal processing; size/rate/time limits | raw payload restricted retention; normalized audit/health/dead letter | not implemented |
| Webhook producers | `WebhookDispatcher` emits approved stable integration events | tenant endpoint/signing key ref | subscription/event/destination key; retry/timeout/rate/dead letter | delivery attempts and payload schema/version audit; retention; disable unhealthy endpoint | not implemented |
| Future event transport | `IntegrationEventPublisher/Consumer` behind outbox/inbox | workload identity and environment configuration | event ID idempotency, at-least-once, retry/dead letter | schema/correlation audit; residency; health; local durable dispatcher fallback | interface only; no cloud transport selected |

## 8. Observability and side-effect invariants

Every request/job/provider call has correlation and causation IDs, tenant/workspace/deal scope, actor/service identity, sanitized error code, duration, attempt, and result status. Metrics and logs must not contain document text, restricted identity, BATNA, secret, token, raw prompt, or provider credential.

No asynchronous side effect is valid without:

1. persisted initiating command and H authority where required;
2. idempotency record;
3. durable job;
4. audit record;
5. outbox event;
6. pre-effect reauthorization and stale-input check;
7. normalized provider result and retrievable status.
