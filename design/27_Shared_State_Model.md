# Shared State Model

## 1. Definition

The **Shared State Model** defines how M&Ai represents, persists, versions, derives and synchronizes transaction state across every product surface.

It establishes:

* Which records are authoritative;
* which records are derived;
* which state belongs to one deal;
* which state belongs to the institution;
* which state belongs only to the current user;
* how drafts differ from approved records;
* how asynchronous operations report progress;
* how permissions affect state access;
* how changes propagate between workspaces;
* how historical decisions remain reconstructable.

The product should remain organized around the deal and its business objects rather than around technical subsystems. The central state transition remains:

> **Information → Analysis → Impact → Human decision → Audit record**

This follows the canonical product information architecture and the decision-grade positioning linking evidence, deterministic calculations and human approval.  

---

# 2. Primary intention

The state model should ensure that:

> **Every M&Ai screen reads and modifies the same governed transaction record without duplicating authority or losing provenance.**

A banker should never encounter:

* One valuation on Deal Overview and another in Valuation;
* a task marked complete while its approval remains open;
* an approved finding silently changed after its evidence updates;
* a stale deliverable presented as current;
* a notification treated as proof of completion;
* an external submission treated as accepted evidence;
* a historical decision reconstructed using current data.

---

# 3. Strategic state model

```text
Authoritative domain objects
  ↓
Versioned transaction state
  ↓
Derived workspace projections
  ↓
Tasks, notifications and search indexes
  ↓
Client-side remote-state cache
  ↓
URL and local interface state
```

Only the first two layers define transaction truth.

The other layers support presentation, navigation, retrieval or workflow.

---

# 4. State layers

M&Ai should distinguish ten state layers.

| Layer                   | Purpose                                      |       Authoritative? |
| ----------------------- | -------------------------------------------- | -------------------: |
| **Domain state**        | Current business objects and versions        |                  Yes |
| **Decision state**      | Approved, rejected or conditional outcomes   |                  Yes |
| **Workflow state**      | Tasks, reviews and approval requests         |                  Yes |
| **Execution state**     | Agent, calculation and processing runs       |          Operational |
| **Audit state**         | Immutable historical event record            | Historical authority |
| **Read-model state**    | Screen-optimized summaries and counts        |                   No |
| **Search state**        | Permission-safe retrieval index              |                   No |
| **Remote client cache** | Locally cached server responses              |                   No |
| **URL state**           | Shareable selection, filters and context     |                   No |
| **Local UI state**      | Panels, menus and unsaved presentation state |                   No |

---

# 5. Fundamental rule

> **No screen owns transaction truth merely because it displays it.**

The domain object owns the state.

Examples:

* Deal Overview displays a valuation range; `ValuationScenario` owns it.
* Command Center displays a blocker; the originating object owns its resolution.
* Notification Center displays an event; the underlying domain object owns its status.
* Search displays a finding; Diligence owns the finding.
* Activity displays a decision; the immutable decision record owns the historical outcome.

---

# 6. Avoid a universal state store

Do not build one client-side store containing:

* All deals;
* all organizations;
* all documents;
* all findings;
* all valuations;
* all tasks;
* all notifications;
* every open modal;
* every draft.

That approach creates:

* Cross-deal contamination risk;
* stale object copies;
* unclear write authority;
* difficult cache invalidation;
* oversized browser state;
* hidden coupling among screens.

Use separate state layers with explicit contracts.

---

# 7. Canonical scope hierarchy

```text
Platform
  ↓
Institution
  ↓
Membership
  ↓
Deal
  ↓
Workstream
  ↓
Object
  ↓
Object version
  ↓
Field or source location
```

Every stateful request should resolve at least:

* Institution;
* user membership;
* application mode;
* object scope;
* effective permission.

Deal-isolated processing and tenant-scoped retrieval are foundational architectural properties of M&Ai. 

---

# 8. Canonical scope envelope

```ts
interface StateScope {
  institutionId: string;
  membershipId: string;
  applicationMode:
    | "global"
    | "deal"
    | "administration"
    | "external";

  dealId?: string;
  workstreamId?: string;

  objectType?: string;
  objectId?: string;
  objectVersion?: number;

  externalParticipationId?: string;
  permissionContextVersion: string;
}
```

The envelope should be resolved by the server.

The client should not be allowed to declare its own trusted institution or membership scope.

---

# 9. Stable object identity

Every material object requires a stable opaque identifier.

Examples:

```text
deal_...
organization_...
contact_...
document_...
document_version_...
evidence_...
fact_...
finding_...
scenario_...
proposal_...
approval_...
decision_...
deliverable_...
audit_event_...
```

Display references such as:

> DD-018

may remain human-readable aliases.

They should not be the only database identity.

---

# 10. Identity versus version

A stable object and its versions should remain separate.

Example:

```text
Finding
  id: finding_018

FindingVersion
  version: 1
  version: 2
  version: 3
```

This supports:

* Historical decisions;
* comparisons;
* supersession;
* current-version resolution;
* audit reconstruction;
* deliverable snapshots.

---

# 11. Version semantics

Recommended fields for a versioned domain object:

```ts
interface VersionedRecord {
  id: string;
  version: number;

  createdAt: string;
  createdBy: string;

  effectiveFrom?: string;
  effectiveTo?: string;

  supersededAt?: string;
  supersededByVersion?: number;

  state: string;
}
```

A version number should be monotonically increasing within the stable object.

---

# 12. Mutable versus immutable records

## Mutable until submitted

Examples:

* Draft finding;
* draft scenario;
* draft deliverable;
* unsent information request.

## Immutable after approval

Examples:

* Approved finding version;
* approved scenario version;
* recorded decision;
* approved deliverable version;
* archive snapshot.

## Append-only

Examples:

* Audit events;
* decision records;
* export records;
* access events;
* execution records.

Corrections should create another version or event.

They should not rewrite history.

---

# 13. Standard state vocabulary

Use a restrained shared vocabulary.

## Preparation

* Draft;
* prepared;
* submitted;
* in review;
* changes requested.

## Decision

* Approved;
* conditionally approved;
* rejected;
* recused;
* withdrawn.

## Validity

* Current;
* stale;
* invalidated;
* superseded;
* expired;
* historical.

## Availability

* Available;
* restricted;
* unavailable;
* removed;
* archived.

## Execution

* Queued;
* running;
* awaiting input;
* completed;
* completed with limitations;
* failed;
* cancelled.

---

# 14. Avoid one universal status enum

A single `status` property cannot adequately represent:

* Workflow state;
* approval state;
* validity;
* processing;
* availability;
* archive state.

Example:

```ts
interface DeliverableVersionState {
  preparationState: "draft" | "review" | "approved";
  freshnessState: "current" | "stale" | "invalidated";
  releaseState: "not_authorized" | "authorized" | "distributed";
  availabilityState: "available" | "restricted" | "archived";
}
```

This prevents ambiguous states such as:

> Status: Complete

---

# 15. Current-state pointers

Stable objects may maintain explicit pointers such as:

```ts
interface CurrentVersionPointers {
  latestDraftVersionId?: string;
  currentApprovedVersionId?: string;
  latestVersionId: string;
}
```

These pointers are derived from governed transitions.

The browser should not determine the current version by sorting records locally.

---

# 16. Historical resolution

Every versioned object should support an explicit resolver:

```text
Current version
Latest draft
Current approved version
Version at timestamp
Version referenced by decision
Version referenced by deliverable
```

Example:

> Open scenario as approved in Decision AP-027

must resolve the exact decision-time version, not the latest scenario.

---

# 17. Domain ownership matrix

| State                             | Authoritative domain          |
| --------------------------------- | ----------------------------- |
| Institution identity              | Institution Configuration     |
| User membership                   | Team and Authorization        |
| Organization identity             | Organization                  |
| Contact identity                  | Contact                       |
| Deal identity                     | Deal                          |
| Deal operating rules              | Deal Configuration            |
| Transaction participation         | Deal Participation            |
| Source file                       | Document and Document Version |
| Exact source location             | Evidence Reference            |
| Structured transaction fact       | Target Dossier Fact           |
| Diligence conclusion              | Finding                       |
| Financial calculation             | Valuation Execution           |
| Approved valuation representation | Valuation Scenario            |
| Buyer or target fit               | Candidate Assessment          |
| Commercial proposal               | Proposal                      |
| Closing requirement               | Closing Requirement           |
| Required work                     | Work Item                     |
| Material decision                 | Decision Record               |
| Business output                   | Deliverable Version           |
| Historical event                  | Audit Event                   |

---

# 18. Institution state

Institution state should contain:

* Institution identity;
* offices;
* active configuration version;
* roles and policy versions;
* integration connections;
* security and data-governance policy;
* templates;
* commercial entitlements.

Institution state should not contain transaction evidence.

---

# 19. Membership state

Membership state should contain:

* User identity reference;
* institution role;
* active or suspended state;
* capabilities;
* office;
* authentication state;
* effective dates.

Deal participation should reference membership.

It should not duplicate the user’s identity fields.

---

# 20. Deal state

The Deal should remain the central transaction aggregate.

Recommended high-level fields:

```ts
interface Deal {
  id: string;
  institutionId: string;

  codename: string;
  internalTitle: string;

  transactionType: string;
  transactionSide: string;

  businessState:
    | "active"
    | "completed"
    | "terminated"
    | "withdrawn";

  administrativeState:
    | "active"
    | "paused"
    | "read_only"
    | "archived"
    | "deletion_requested";

  currentConfigurationVersion: number;
  createdAt: string;
  updatedAt: string;
  version: number;
}
```

Business and administrative state should remain separate.

---

# 21. Deal configuration state

Configuration should be versioned separately from the Deal identity.

It includes:

* Currency;
* jurisdiction;
* time zone;
* workflow template;
* workstreams;
* thresholds;
* confidentiality;
* source policy;
* automation boundaries;
* retention assignment.

Historical objects should retain the configuration version that governed them.

---

# 22. Organization state

The Organization should represent reusable institutional identity.

It may contain:

* Canonical name;
* organization type;
* aliases;
* legal entities;
* identifiers;
* corporate relationships;
* institution relationship;
* relationship owner.

It should not contain global buyer, seller or target roles.

Those roles belong to a deal participation record.

---

# 23. Contact state

Contact state should remain independent from:

* Organization;
* institution membership;
* external portal participation.

A Contact can:

* Work for an Organization;
* become an external participant;
* participate in several deals;
* change employer;
* remain historically linked to prior interactions.

---

# 24. Deal participation state

```ts
interface DealParticipation {
  id: string;
  dealId: string;

  participantType:
    | "organization"
    | "internal_member"
    | "external_contact";

  participantId: string;
  transactionRole: string;

  effectiveFrom: string;
  effectiveTo?: string;

  status: "proposed" | "active" | "suspended" | "ended";
}
```

Participation does not automatically grant access or approval authority.

---

# 25. Document state

Separate:

```text
Document
Document Version
Document Processing Run
Document Classification
Document Access Policy
```

## Document

Stable logical file identity.

## Document Version

Exact received content.

## Processing Run

Extraction or classification execution.

## Evidence Reference

Exact use of a document version in transaction work.

---

# 26. Document lifecycle

```text
Received
  ↓
Integrity validation
  ↓
Security validation
  ↓
Classification
  ↓
Extraction
  ↓
Available for evidence use
```

Alternative outcomes:

* Processing failed;
* quarantined;
* unsupported;
* removed at source;
* restricted.

“Uploaded” should not imply “fully processed.”

---

# 27. Evidence reference state

An Evidence Reference should preserve:

* Document;
* document version;
* source location;
* extracted excerpt or value;
* access classification;
* creation context;
* current availability.

Example:

```ts
interface EvidenceReference {
  id: string;
  dealId: string;

  documentId: string;
  documentVersionId: string;

  locationType: "page" | "sheet_range" | "clause" | "field";
  locationReference: string;

  accessZoneId?: string;
  createdAt: string;
}
```

---

# 28. Target Dossier fact state

Separate the stable fact definition from its versions.

```text
DossierFact
  ↓
DossierFactVersion
  ↓
FactEvidenceLink
  ↓
FactDecision
```

Fact states:

* Proposed;
* disputed;
* reconciled;
* review required;
* approved;
* superseded;
* unavailable.

---

# 29. Fact approval

An approved fact should preserve:

* Value;
* unit;
* period;
* currency;
* evidence versions;
* reviewer;
* decision;
* configuration version;
* approval timestamp.

A later source change should not rewrite the approved version.

It should create:

* New proposed version;
* review requirement;
* dependency evaluation.

---

# 30. Finding state

```text
Finding
  ↓
FindingVersion
  ├── Observation
  ├── Evidence links
  ├── Severity
  ├── Business consequence
  ├── Financial-impact proposal
  └── Review state
```

A finding should not store one free-text AI response as its complete state.

It should be structured.

---

# 31. Finding validity

Recommended dimensions:

```ts
interface FindingState {
  preparationState:
    | "draft"
    | "submitted"
    | "in_review"
    | "changes_requested"
    | "approved";

  validityState:
    | "current"
    | "review_required"
    | "invalidated"
    | "superseded";

  treatmentState:
    | "none"
    | "proposed"
    | "calculated"
    | "approved"
    | "rejected";
}
```

---

# 32. Valuation state

Separate:

* Assumptions;
* adjustments;
* calculation inputs;
* deterministic execution;
* output scenario;
* review;
* approval.

```text
Finding or approved fact
  ↓
Valuation treatment
  ↓
Input snapshot
  ↓
Deterministic execution
  ↓
Scenario version
  ↓
Human approval
```

The product’s valuation layer is deterministic and traceable rather than a single generated estimate. 

---

# 33. Deterministic execution state

```ts
interface DeterministicExecution {
  id: string;
  dealId: string;

  executionType: string;
  engineVersion: string;
  formulaVersion: string;

  inputSnapshotId: string;
  outputSnapshotId?: string;

  state:
    | "queued"
    | "running"
    | "completed"
    | "failed"
    | "cancelled";

  reproducibilityState:
    | "reproducible"
    | "partial"
    | "unavailable";

  startedAt?: string;
  completedAt?: string;
}
```

Execution completion does not equal business approval.

---

# 34. Scenario state

A Valuation Scenario should preserve:

* Method;
* assumption versions;
* adjustment versions;
* calculation execution;
* output range;
* currency;
* valuation date;
* review state;
* approval state;
* validity.

Example:

> Scenario v4 · Calculation completed · Treatment approved · Final scenario review pending

---

# 35. Matching state

Keep separate:

* Organization;
* candidate record;
* candidate assessment;
* shortlist decision;
* outreach record.

A global Organization should not contain deal-specific:

* Fit score;
* exclusion rationale;
* shortlist state;
* outreach status.

---

# 36. Negotiation state

Separate:

* Proposal;
* proposal version;
* normalized terms;
* internal position;
* response draft;
* approval;
* external transmission;
* agreed terms.

An approved response is not proof that it was externally sent.

---

# 37. Closing state

Separate:

* Closing requirement;
* condition;
* evidence submission;
* acceptance;
* waiver;
* signature;
* funds-flow event;
* closing authorization;
* legal completion.

Distinctions such as these must remain explicit:

* Submitted versus accepted;
* satisfied versus waived;
* authorized versus completed;
* funds sent versus funds received.

---

# 38. Work-item state

Tasks and approvals require a shared work-item foundation.

```ts
interface WorkItem {
  id: string;
  institutionId: string;
  dealId?: string;

  workItemType:
    | "task"
    | "review"
    | "approval"
    | "access_request";

  targetObjectType: string;
  targetObjectId: string;
  targetObjectVersion?: number;

  state:
    | "open"
    | "in_progress"
    | "submitted"
    | "completed"
    | "cancelled"
    | "superseded";

  assignedTo?: string;
  dueAt?: string;
  version: number;
}
```

---

# 39. Approval-request state

An approval request should remain separate from the final decision.

```text
Approval Request
  ↓
Evidence and consequence package
  ↓
Authority validation
  ↓
Decision
```

Possible request states:

* Draft;
* ready;
* assigned;
* under review;
* changes requested;
* decided;
* cancelled;
* expired;
* superseded.

---

# 40. Decision state

A Decision Record should be immutable.

It should preserve:

* Approval request;
* target object and version;
* decision;
* rationale;
* conditions;
* approver identity;
* authority snapshot;
* evidence snapshot;
* timestamp;
* validity state.

A later invalidation should create a new event linking to the original decision.

---

# 41. Notification state

Notification state is personalized awareness state.

```ts
interface NotificationState {
  deliveredAt?: string;
  seenAt?: string;
  readAt?: string;
  archivedAt?: string;
}
```

It should never determine:

* Task completion;
* object approval;
* blocker resolution;
* audit state.

---

# 42. Audit state

Audit Events should be append-only and deal or institution scoped.

```ts
interface AuditEvent {
  id: string;
  institutionId: string;
  dealId?: string;

  eventType: string;
  actorType: string;
  actorId: string;

  objectType: string;
  objectId: string;
  objectVersion?: number;

  occurredAt: string;
  recordedAt: string;

  correlationId?: string;
  causationEventId?: string;

  integrityState: string;
  accessClassification: string;
}
```

---

# 43. Deliverable state

Separate:

* Deliverable;
* deliverable version;
* source snapshot;
* review requests;
* content approval;
* release authorization;
* export;
* distribution.

A deliverable version can be:

> Content approved, release not authorized, export unavailable.

This is valid and should remain visible.

---

# 44. External-submission state

Separate:

* Request;
* external draft;
* submission;
* file-processing state;
* internal review;
* evidence acceptance.

```text
Draft response
  ↓
Submitted response
  ↓
File received
  ↓
Processing complete
  ↓
Internal review
  ↓
Accepted evidence
```

Submission is not acceptance.

---

# 45. Access state

Effective access should derive from:

```text
Institution policy
  ↓
Institution role
  ↓
Deal participation
  ↓
Role template
  ↓
Workstream grant
  ↓
Object restriction
  ↓
Access-zone restriction
  ↓
Temporary exception
  ↓
Expiry
```

Do not persist one generic `hasAccess: true` property as the complete authorization model.

---

# 46. Effective authorization result

```ts
interface AuthorizationDecision {
  decision: "allow" | "deny" | "partial";

  allowedCapabilities: string[];
  deniedCapabilities: string[];

  visibleFields?: string[];
  redactedFields?: string[];

  effectiveScope: StateScope;
  authority?: ApprovalAuthority;

  expiresAt?: string;
  explanationCode: string;
  policyVersionIds: string[];
}
```

The server should generate this decision.

---

# 47. Permission snapshot

Material actions should preserve the authority context used at the time.

Examples:

* Decision approval;
* access grant;
* release authorization;
* closing waiver;
* archive action.

Later policy changes should not rewrite the historical authority snapshot.

---

# 48. Permission-cache rule

Authorization may be cached briefly for performance, but must be revalidated for:

* Material writes;
* exports;
* source access;
* search results;
* Copilot retrieval;
* external actions;
* permission-sensitive aggregates.

A client-side role badge is not authorization.

---

# 49. Field-level protection

Some objects require field-level access.

Example organization fields:

* Public legal name: broadly visible;
* tax identifier: restricted;
* relationship notes: institution-private;
* restricted transaction participation: deal-team only.

Example deal fields:

* Deal codename: restricted;
* internal valuation floor: Negotiation team only;
* bank details: Funds Flow zone only.

---

# 50. Read models

Screens should use optimized read models rather than loading complete aggregates.

Examples:

```text
CommandCenterProjection
DealsPortfolioProjection
DealOverviewProjection
TaskQueueProjection
OrganizationDirectoryProjection
NotificationProjection
SearchResultProjection
ArchiveReadinessProjection
```

Read models are disposable and rebuildable.

They are not authoritative transaction state.

---

# 51. Projection freshness

Every read model should provide:

* Generated time;
* source checkpoint;
* partial state;
* delayed dependencies;
* current-through timestamp.

Example:

> Current through 28 jul. 2026 · 10:42 BRT

Do not present a delayed projection as real time.

---

# 52. Command Center state

The Command Center should derive:

* Required work;
* blockers;
* material changes;
* current deal state;
* due dates;
* workflow consequences.

It should not maintain independent blocker records.

---

# 53. Deal Overview state

Deal Overview should derive from:

* Deal;
* configuration;
* Dossier;
* document processing;
* findings;
* valuation;
* matching;
* negotiation;
* Closing;
* work items.

Its values should include source references such as:

```text
valuationRange.sourceScenarioId
blocker.sourceObjectId
nextAction.workItemId
```

---

# 54. Tasks projection

The Tasks projection should combine:

* Work item;
* target object summary;
* deal identity;
* authority state;
* due date;
* assignment;
* consequence.

It should not duplicate the complete target object.

---

# 55. Notification projection

The Notification projection should contain safe personalized metadata:

* Title;
* summary;
* category;
* context;
* destination;
* read state.

Sensitive content should be regenerated or redacted after permission changes.

---

# 56. Search projection

The search index should store:

* Canonical object identity;
* object version;
* searchable fields;
* destination;
* current or historical state;
* access-policy reference;
* indexing timestamp.

Permission-safe retrieval must occur before:

* Counts;
* snippets;
* facets;
* suggestions.

---

# 57. Contextual Copilot state

Copilot context should be explicit and ephemeral unless saved as an artifact.

```ts
interface CopilotContext {
  institutionId: string;
  dealId?: string;

  workspace: string;
  selectedObjects: Array<{
    objectType: string;
    objectId: string;
    objectVersion?: number;
  }>;

  permittedEvidenceReferenceIds: string[];
  userCapabilitySnapshot: string;
}
```

The Copilot should not automatically receive every object in a deal.

---

# 58. Conversation state

Separate:

* Conversation;
* user message;
* assistant response;
* citations;
* execution references;
* proposed artifacts;
* corrections.

A conversation is not an authoritative transaction object.

A proposed finding becomes authoritative only after it is created in Diligence.

---

# 59. Agent execution state

```ts
interface AgentExecution {
  id: string;
  dealId: string;

  objective: string;
  scopeSnapshotId: string;
  permissionSnapshotId: string;

  state:
    | "planned"
    | "running"
    | "awaiting_input"
    | "awaiting_review"
    | "completed"
    | "completed_with_limitations"
    | "failed"
    | "cancelled";

  resultArtifactIds: string[];
}
```

Do not persist or expose private model chain-of-thought.

Preserve:

* Plan summary;
* tools used;
* sources;
* structured outputs;
* limitations;
* human corrections.

---

# 60. Execution versus output

An execution record describes what ran.

An output object describes what resulted.

Example:

```text
Agent Execution
  ↓
Proposed Finding Draft
```

The finding draft can survive even if the user later archives the execution details.

The execution is not the finding.

---

# 61. Long-running operation state

Long-running operations should create stable execution objects.

Examples:

* VDR synchronization;
* document processing;
* agent mission;
* valuation calculation;
* deliverable generation;
* audit-package export.

The user should be able to leave the screen without cancelling the operation.

---

# 62. Execution progress

Recommended progress representation:

```ts
interface ExecutionProgress {
  stage: string;
  completedUnits?: number;
  totalUnits?: number;
  currentMessage?: string;
  lastCheckpointAt: string;
}
```

Avoid artificial percentages when the system cannot reliably determine total work.

Use stages instead:

> Validating → Processing → Reconciling → Preparing result

---

# 63. Execution completion

Completion should emit:

* Final execution state;
* result destination;
* limitation summary;
* affected objects;
* audit event;
* notification, when relevant.

Example:

> Valuation Scenario v4 calculated
> Human review required

---

# 64. Domain-event model

Use business events, not interface events.

Good:

```text
DocumentVersionCreated
DossierFactApproved
FindingReopened
ValuationScenarioCalculated
ApprovalDecisionRecorded
DeliverableMarkedStale
ExternalSubmissionAccepted
DealArchived
```

Poor:

```text
refreshOverview
updateBadge
reloadValuation
openModal
```

---

# 65. Event envelope

```ts
interface DomainEvent<TPayload> {
  eventId: string;
  eventType: string;

  institutionId: string;
  dealId?: string;

  actorType: string;
  actorId: string;

  objectType: string;
  objectId: string;
  objectVersion?: number;

  correlationId?: string;
  causationEventId?: string;

  occurredAt: string;
  payload: TPayload;
}
```

---

# 66. Transactional outbox

Material state changes should write:

1. Domain state;
2. outbox event;

within the same database transaction.

A separate publisher then distributes the event.

This prevents:

* State changing without an event;
* event delivery before the transaction commits;
* inconsistent audit and notification behavior.

---

# 67. Consumer idempotency

Every event consumer should record the processed `eventId`.

Consumers include:

* Audit recorder;
* task generator;
* notification service;
* search indexer;
* projection updater;
* freshness evaluator;
* external webhook dispatcher.

Retrying an event must not create duplicate tasks or decisions.

---

# 68. Correlation and causation

## Correlation

Groups one workflow.

Example:

> VDR synchronization run SYNC-028

## Causation

Identifies the direct prior event.

Example:

> `DocumentVersionCreated` caused `DossierFactReviewRequired`.

These relationships support the causal chain in Activity & Audit.

---

# 69. State-change choreography

Example:

```text
DocumentVersionCreated
  ↓
EvidenceDependencyChanged
  ↓
DossierFactReviewRequired
  ↓
FindingReopened
  ↓
ValuationTreatmentInvalidated
  ↓
DeliverableMarkedStale
```

This should occur through explicit dependency rules.

Screens should not call one another directly.

---

# 70. Dependency graph

Recommended dependency edge:

```ts
interface ObjectDependency {
  id: string;
  dealId: string;

  sourceObjectType: string;
  sourceObjectId: string;
  sourceObjectVersion?: number;

  targetObjectType: string;
  targetObjectId: string;
  targetObjectVersion?: number;

  dependencyType:
    | "evidence"
    | "calculation_input"
    | "approval_basis"
    | "deliverable_source"
    | "workflow_prerequisite";

  materialityRuleId?: string;
}
```

---

# 71. Change impact

When a source changes, evaluate:

* Whether the dependency is direct;
* whether the changed field was used;
* whether the effect is material;
* whether automatic recalculation is allowed;
* whether human review is required.

Do not mark every downstream object stale merely because the source document changed.

---

# 72. Staleness versus invalidation

## Stale

New information may affect the object.

The object requires review.

## Invalidated

The object’s approved basis is no longer valid under a declared rule.

Example:

* A supporting document changes: report may become stale.
* The approved scenario’s exact calculation input changes: scenario approval may become invalidated.

---

# 73. Recalculation rules

A deterministic calculation may be recalculated automatically when:

* Inputs are approved;
* formula version remains compatible;
* policy permits;
* no human judgment is required.

The resulting scenario should still be:

> Newly calculated · Human approval required

Automatic recalculation must not automatically reapprove the business result.

---

# 74. Draft state

Drafts should be explicit server-side objects for material work.

Examples:

* Finding draft;
* valuation-treatment draft;
* deliverable draft;
* approval rationale draft;
* external response draft.

Material drafts should not exist only in browser memory.

---

# 75. Draft ownership

A draft should define:

* Owner;
* collaborators;
* target object;
* base version;
* autosave version;
* updated time;
* submission state.

Example:

```ts
interface DraftState {
  id: string;
  ownerMembershipId: string;
  baseObjectVersion: number;
  draftVersion: number;
  lastSavedAt: string;
  state: "active" | "submitted" | "discarded";
}
```

---

# 76. Autosave

Autosave should be used for:

* Long narrative drafts;
* structured findings;
* scenario preparation;
* deliverable content;
* external submissions.

It should not automatically perform:

* Submission;
* approval;
* release;
* external transmission.

Display:

> Draft saved 14:32 BRT

---

# 77. Concurrent draft editing

Recommended default:

* One active editor;
* other users may inspect;
* controlled collaborative editing later.

Where simultaneous edits are supported, use field- or block-level conflict handling.

Do not silently apply last-write-wins to material transaction work.

---

# 78. Optimistic concurrency

Every material write should include the expected version.

HTTP patterns may use:

```text
ETag: "finding-018-v3"
If-Match: "finding-018-v3"
```

or an explicit request field:

```json
{
  "expectedVersion": 3
}
```

Mismatch returns a version conflict.

---

# 79. Conflict response

A conflict response should contain:

* Expected version;
* current version;
* changed fields;
* current editor;
* safe comparison link;
* draft-preservation reference.

The server should not return restricted field changes to an unauthorized user.

---

# 80. Optimistic interface updates

Appropriate:

* Mark notification read;
* pin an object;
* change a personal preference;
* follow a deal;
* archive an informational notification.

Not appropriate:

* Approve valuation;
* grant access;
* accept evidence;
* distribute deliverable;
* waive a Closing condition;
* archive a deal.

Material actions should wait for server confirmation.

---

# 81. Remote-state cache

Use a query-oriented remote-state cache for:

* Lists;
* detail reads;
* projections;
* counts;
* permissions;
* execution status.

The cache should store server responses, not become another domain database.

---

# 82. Cache-key structure

Recommended:

```text
institution:{institutionId}:deals
institution:{institutionId}:tasks:{view}:{filtersHash}

deal:{dealId}:overview
deal:{dealId}:documents:{filtersHash}
deal:{dealId}:finding:{findingId}:v{version}
deal:{dealId}:valuation:{scenarioId}:v{version}

user:{membershipId}:notifications
```

Institution and deal scope should always appear in protected cache keys.

---

# 83. Cache invalidation

Domain events should map to precise cache invalidations.

Example:

```text
FindingApproved
  ├── finding detail
  ├── diligence list
  ├── deal overview
  ├── task queue
  ├── search result
  └── relevant deliverables
```

Avoid clearing every cache entry for the deal.

---

# 84. Projection subscriptions

Real-time updates should be used selectively for:

* Task counts;
* notification counts;
* execution progress;
* document synchronization;
* active review state;
* access revocation;
* Closing-day controls.

Routine lists may refresh through event-informed invalidation.

---

# 85. Cross-tab behavior

Multiple browser tabs should synchronize:

* Permission revocation;
* sign out;
* institution switch;
* task completion;
* notification read state;
* material object updates.

One tab should not overwrite another tab’s draft silently.

---

# 86. URL state

URL state should include:

* Selected object;
* version;
* view;
* principal filters;
* search query;
* historical date;
* workflow context ID.

Example:

```text
/deals/project-horizon/diligence
  ?finding=finding_018
  &version=3
  &view=evidence
  &task=task_027
```

---

# 87. URL safety

Do not include:

* Confidential values;
* document excerpts;
* approval rationale;
* bank details;
* complete filenames where policy prohibits;
* authentication tokens in ordinary query parameters.

External routes should use opaque workspace or submission identifiers.

---

# 88. Local UI state

Appropriate local state:

* Drawer open;
* selected table rows;
* expanded sections;
* hover;
* tooltip;
* unsaved filter menu;
* column widths;
* local sorting before application.

Local state should never determine:

* Approval;
* current version;
* access;
* archive readiness;
* evidence acceptance.

---

# 89. Personal preference state

Personal preferences may persist:

* Density;
* appearance;
* locale;
* default view;
* panel behavior;
* saved filters;
* notification delivery.

They must not change:

* Transaction currency;
* finding severity;
* valuation assumptions;
* approval thresholds;
* deal strategy.

---

# 90. Offline state

Offline support should be intentionally limited.

Potentially available:

* Previously cached safe summaries;
* recent objects;
* personal drafts;
* previously downloaded authorized files.

Disabled:

* Material decisions;
* access changes;
* evidence acceptance;
* external distribution;
* archive;
* deletion;
* server-dependent calculations.

Offline state must be clearly labeled.

---

# 91. Partial failure

The state model should support partial availability.

Example:

> Document preview unavailable
> Finding and decision records remain available.

Example:

> Search indexing delayed
> Direct navigation remains available.

One failed subsystem should not convert the complete deal workspace into an error page.

---

# 92. Error-state taxonomy

Recommended categories:

* Validation error;
* authorization error;
* version conflict;
* dependency unavailable;
* execution failure;
* integration failure;
* projection delay;
* service unavailable;
* unsupported state;
* integrity issue.

The interface should receive a stable error code plus safe user-facing detail.

---

# 93. Command contract

Material write APIs should use command-specific endpoints or handlers.

Example:

```text
ApproveFinding
RejectFinding
RequestFindingChanges
CalculateValuationScenario
ApproveValuationTreatment
AuthorizeDeliverableRelease
AcceptExternalSubmission
ArchiveDeal
```

Avoid one generic endpoint:

```text
PATCH /object
```

for consequential transitions.

---

# 94. Command response

Recommended response:

```ts
interface CommandResult {
  commandId: string;
  state: "completed" | "accepted" | "rejected";

  objectType: string;
  objectId: string;
  objectVersion?: number;

  executionId?: string;
  auditEventId?: string;

  warnings?: Array<{
    code: string;
    message: string;
  }>;
}
```

A long-running command may return:

> Accepted · Execution started

---

# 95. Query contract

Queries should return:

* Data projection;
* permission-safe actions;
* object version;
* freshness;
* partial-state warnings.

```ts
interface QueryResult<T> {
  data: T;
  generatedAt: string;
  currentThrough?: string;
  partial: boolean;
  warnings: string[];
  allowedActions: string[];
}
```

---

# 96. Allowed actions from server

The server should return context-aware allowed actions such as:

```text
view
edit_draft
submit_review
approve
reject
request_changes
view_evidence
export
```

This supports interface rendering.

The server must still validate the action when executed.

---

# 97. Database boundaries

Recommended primary transactional store:

* Institution state;
* deals;
* organizations;
* contacts;
* versioned transaction objects;
* work items;
* decisions;
* audit events;
* configuration.

Separate or specialized stores may support:

* Original files;
* generated artifacts;
* full-text search;
* embeddings;
* execution logs;
* analytics.

Specialized stores should reference canonical object IDs.

---

# 98. Object storage

Object storage should contain:

* Source document versions;
* generated deliverables;
* audit packages;
* export files;
* submission files.

Each object should include metadata referencing:

* Institution;
* deal;
* domain object;
* object version;
* confidentiality;
* retention;
* checksum.

Do not use uncontrolled filesystem paths as the product contract.

---

# 99. Search and vector state

Search indexes and vector representations should be treated as rebuildable derived state.

They must not become the only location containing:

* Source text;
* facts;
* findings;
* decisions;
* permissions.

Deleting or rebuilding an index should not destroy transaction history.

---

# 100. Audit durability

Audit state must be durably persisted.

An application restart must not erase:

* Decisions;
* access changes;
* calculation provenance;
* document events;
* exports;
* archive actions.

A runtime event stream or in-process event history is not a durable audit record.

---

# 101. Repository direction

The current repository already provides useful foundations such as:

* Typed routes and API contracts;
* route-aware screens;
* version checks;
* deal and organization stores;
* agent execution events;
* reusable application-shell components.

However, the current prototype remains partially mock-backed and contains route-specific state and in-process behavior. The production product requires a durable canonical domain layer rather than treating screen stores or runtime events as transaction authority. 

---

# 102. Repository components to retain

Keep and evolve:

* Stable UUIDs;
* typed contracts;
* Zod validation;
* optimistic version checks;
* API-client boundaries;
* route query state;
* agent execution events;
* shell context;
* existing domain enums where semantically correct.

---

# 103. Repository components to replace

Replace or reframe:

## In-memory domain stores

Use durable transaction persistence.

## Whole-list replacements

Use granular commands for participants, permissions and other material records.

## Search-by-name relationships

Use explicit relationship tables.

## Runtime event history as audit

Persist material events independently.

## `EntityRole` as global buyer or seller status

Use organization type plus deal-specific participation.

## Dossier by organization ID

Move Dossier state to deal scope.

---

# 104. Recommended backend modules

```text
identity
institutions
authorization
organizations
contacts
deals
deal_configuration
deal_participation
documents
evidence
dossier
diligence
valuation
matching
negotiation
closing
work_items
decisions
deliverables
external_participation
audit
notifications
search
executions
```

Modules may share infrastructure.

They should not share mutable domain tables without explicit ownership.

---

# 105. Recommended state services

Cross-domain services:

* Authorization Service;
* Version Resolver;
* Dependency Service;
* Decision Service;
* Work Orchestrator;
* Audit Recorder;
* Notification Router;
* Projection Builder;
* Search Indexer;
* Execution Manager;
* File and Artifact Service.

---

# 106. Shared-state database groups

## Identity and institution

* Institutions;
* memberships;
* role policies;
* configuration versions.

## Reusable relationship domain

* Organizations;
* legal entities;
* identifiers;
* contacts;
* relationships.

## Deal core

* Deals;
* configurations;
* participations;
* workstreams;
* milestones.

## Evidence and analysis

* Documents;
* versions;
* evidence references;
* facts;
* findings;
* assumptions;
* calculations;
* scenarios.

## Execution

* Tasks;
* approvals;
* decisions;
* proposals;
* closing requirements;
* deliverables.

## Governance

* Access grants;
* restrictions;
* audit events;
* retention;
* archives;
* external participation.

---

# 107. Reference integrity

Use database constraints where possible for:

* Institution ownership;
* deal ownership;
* unique version numbers;
* one current approved pointer;
* immutable decision target;
* explicit source versions;
* archive snapshot uniqueness;
* idempotency keys.

Application validation alone is insufficient for fundamental integrity.

---

# 108. Soft deletion

Use soft deletion only where appropriate.

Possible:

* Draft records;
* duplicate Organization candidate;
* unused personal saved view.

Do not soft-delete as a substitute for:

* Archive;
* retention;
* legal hold;
* deletion workflow;
* audit history.

Material records should use explicit lifecycle state.

---

# 109. Temporal consistency

Material commands should operate on a defined snapshot.

Example approval package:

```text
Finding version 3
Dossier fact version 6
Revenue workbook version 3
Valuation scenario version 4
Permission policy version 3
```

If one required version changes before decision submission, the server should reassess whether the decision remains valid.

---

# 110. Decision-time validation

Immediately before recording a decision, validate:

* Object version remains current;
* evidence package remains valid;
* authority remains active;
* separation of duties remains satisfied;
* approval request remains open;
* deadline or expiry remains valid;
* no blocking dependency changed.

Do not rely on validation performed when the page first loaded.

---

# 111. Mocked canonical state chain

For the Project Horizon fixture:

```text
Document
Receita_por_Cliente_2025.xlsx
Version 3
  ↓
Dossier Fact F-102
Top-three concentration
Version 6 · 41,2%
  ↓
Finding DD-018
Customer concentration above threshold
Version 3
  ↓
Valuation Treatment VT-012
Revenue downside −5,0%
  ↓
Scenario VS-004
R$ 438 mi–R$ 478 mi
  ↓
Approval AP-027
Approved by Ana Costa
  ↓
Deliverable DV-003
Diligence Committee Brief v3
```

---

# 112. Mocked event propagation

```text
DocumentVersionCreated
  ↓
FactVersionProposed
  ↓
FactReviewCompleted
  ↓
FindingReopened
  ↓
ValuationScenarioCalculated
  ↓
ApprovalDecisionRecorded
  ↓
DeliverableVersionCreated
```

Related derived state:

* Task completed;
* notification delivered;
* search index updated;
* Deal Overview refreshed;
* audit chain extended.

---

# 113. Mocked state snapshots

## Before

| Object             | State            |
| ------------------ | ---------------- |
| Revenue workbook   | Version 2        |
| Concentration fact | 39,8% · Approved |
| Finding            | Approved         |
| Scenario           | v3 · Approved    |
| Committee Brief    | v2 · Current     |

## After document synchronization

| Object             | State                |
| ------------------ | -------------------- |
| Revenue workbook   | Version 3            |
| Concentration fact | Review required      |
| Finding            | Review required      |
| Scenario           | Approval invalidated |
| Committee Brief    | Stale                |

## After human review

| Object             | State                   |
| ------------------ | ----------------------- |
| Concentration fact | 41,2% · Approved        |
| Finding            | Approved                |
| Scenario           | v4 · Approved treatment |
| Committee Brief    | v3 · In review          |

---

# 114. Figma and prototype state library

Every major component should support state fixtures for:

* Loading;
* populated;
* empty;
* partial;
* draft;
* submitted;
* in review;
* approved;
* stale;
* invalidated;
* superseded;
* restricted;
* archived;
* error;
* version conflict.

The prototype should not demonstrate only the happy path.

---

# 115. Shared-state testing strategy

## Domain tests

* Valid transitions;
* prohibited transitions;
* version creation;
* current pointers;
* immutable decisions.

## Dependency tests

* Source changes;
* targeted staleness;
* invalidation;
* recalculation;
* deliverable freshness.

## Authorization tests

* Institution isolation;
* deal isolation;
* field redaction;
* authority expiry;
* external scope.

## Event tests

* Outbox creation;
* retry;
* idempotency;
* ordering;
* correlation.

## Client tests

* Cache invalidation;
* URL restoration;
* version conflict;
* multi-tab updates;
* offline restriction.

---

# 116. Critical invariants

The production system should enforce:

1. An object belongs to exactly one institution.
2. A deal-scoped object belongs to exactly one deal.
3. An approved version is immutable.
4. A decision references an exact target version.
5. A deliverable references an immutable source snapshot.
6. External submission does not equal evidence acceptance.
7. Notification read state does not modify work state.
8. Calculation completion does not equal approval.
9. Archive does not equal deletion.
10. Organization identity does not contain deal-specific role authority.
11. Access is revalidated for every material action.
12. Historical records are not reconstructed from current state.

---

# 117. What not to include

Avoid:

* One global front-end state store;
* screen-owned copies of business objects;
* last-write-wins for material records;
* one universal status enum;
* browser-only material drafts;
* current-version inference performed only by the client;
* name-based relationships;
* event-bus history presented as durable audit;
* search indexes treated as transaction truth;
* model output treated as an approved object;
* automatic reapproval after recalculation;
* permissions stored only as UI flags;
* institution or deal IDs trusted from the browser;
* archive implemented as an ordinary delete;
* real client information in fixtures.

---

# 118. Design validation criteria

The Shared State Model is ready when:

1. Every material object has a clear domain owner.
2. Domain, workflow, execution and interface state remain separate.
3. Institution and deal scope are explicit.
4. Reusable Organizations remain separate from deal participation.
5. Stable objects remain separate from versions.
6. Current approved and latest draft pointers are explicit.
7. Approved versions are immutable.
8. Historical decisions reference exact versions.
9. One universal status enum is avoided.
10. Business and administrative Deal state remain separate.
11. Documents, versions, processing and evidence references remain distinct.
12. Fact approval preserves evidence versions.
13. Finding state separates preparation, validity and treatment.
14. Calculation completion remains separate from approval.
15. Work items remain separate from decisions.
16. Notification state remains personalized awareness only.
17. Audit events are append-only.
18. Deliverable content approval and release remain separate.
19. External submissions require internal evidence acceptance.
20. Effective authorization is derived from policy and scope.
21. Material actions preserve authority snapshots.
22. Read models are rebuildable.
23. Search is permission-safe and rebuildable.
24. Copilot receives explicit context only.
25. Agent executions remain separate from resulting domain objects.
26. Long-running operations survive navigation.
27. Domain events use business terminology.
28. Event publishing uses a transactional outbox.
29. Event consumers are idempotent.
30. Dependencies support targeted staleness.
31. Staleness and invalidation remain distinct.
32. Deterministic recalculation does not automatically reapprove.
33. Material drafts are persisted.
34. Version conflicts preserve user work.
35. Material writes use optimistic concurrency.
36. Client caches remain scoped by institution and deal.
37. URL state supports deep links and restoration.
38. Local UI state cannot approve or authorize anything.
39. Partial failures remain localized.
40. Material commands use explicit transition contracts.
41. Queries expose freshness and allowed actions.
42. Original files and generated artifacts use controlled storage.
43. Runtime event history is not used as durable audit.
44. Current repository mock stores are not treated as production persistence.
45. Critical invariants have database and service-level tests.
46. The Project Horizon fixture remains fictional.

---

# 119. Final design target

The correct design target is not:

> “A shared front-end store used by every page.”

It is:

> **A deal-isolated, version-aware state architecture where authoritative business objects, human decisions, deterministic executions and immutable history remain distinct while derived screens stay synchronized through explicit domain events.**

Its defining sequence is:

> **Resolve institution and deal scope → load the authoritative object and version → perform a governed transition → persist state and event atomically → update projections and dependent objects → preserve exact historical context**
