# Cross-Screen Interaction Map

## 1. Definition

The **Cross-Screen Interaction Map** defines how users, business objects, state changes and decisions move across M&Ai.

It specifies:

* Where each workflow begins;
* which screen owns each business object;
* how users enter exact transaction context;
* what information is carried between screens;
* which actions modify authoritative state;
* how downstream screens react;
* how versions, permissions and audit history remain intact;
* how users return without losing context.

M&Ai is organized around the **deal**, not around technical subsystems. Its recurring interaction model is:

> **Information → Analysis → Impact → Human decision → Audit record**

The cross-screen map turns that principle into a consistent product-wide navigation and state model. 

---

# 2. Primary intention

The interaction map should ensure that M&Ai feels like one connected transaction workspace rather than a collection of independent modules.

A banker should be able to:

> Find an issue, inspect its source, understand its financial impact, make the required decision and return to the original workflow without reconstructing context manually.

---

# 3. Strategic product role

The primary product differentiation does not come from any isolated screen.

It comes from the controlled connection among:

* VDR evidence;
* approved facts;
* findings;
* deterministic calculations;
* human reviews;
* transaction decisions;
* deliverables;
* audit history.

The product’s central value chain is:

```text
Source document
  ↓
Evidence reference
  ↓
Structured fact
  ↓
Finding or assumption
  ↓
Deterministic impact
  ↓
Human decision
  ↓
Approved transaction state
  ↓
Deliverable or external action
  ↓
Audit record
```

The canonical information architecture already identifies the exception-to-decision and new-document flows as the product’s most important recurring interactions. 

---

# 4. Design objective

The correct experience should allow a user to move through a transaction issue as one coherent thread.

Example:

```text
Task: Review customer concentration
  ↓
Diligence finding
  ↓
Revenue workbook evidence
  ↓
Approved Dossier fact
  ↓
Valuation scenario
  ↓
Approval package
  ↓
Decision record
  ↓
Audit event
```

Each transition should preserve:

* Active institution;
* active deal;
* selected object;
* selected object version;
* originating workflow;
* search or filter state;
* user permission context;
* Copilot context, where applicable.

---

# 5. What the interaction map is not

It is not:

* A site map alone;
* a route inventory;
* a rigid phase wizard;
* a visual flowchart disconnected from domain state;
* a front-end-only navigation specification;
* an excuse to duplicate objects between screens;
* a way to bypass authoritative workspaces;
* a global event bus carrying untyped state;
* a universal “Back” button;
* a requirement that every screen know every other screen.

The central question is not:

> “Which page links to which page?”

It is:

> **“Which object, context and authority must survive when the user moves from one transaction decision surface to another?”**

---

# 6. Core interaction principles

## 6.1 Every object has one authoritative workspace

Examples:

| Object                | Authoritative workspace |
| --------------------- | ----------------------- |
| Organization identity | Organization Detail     |
| Deal configuration    | Deal Settings           |
| Deal-specific fact    | Target Dossier          |
| Source document       | Documents               |
| Diligence finding     | Diligence               |
| Valuation scenario    | Valuation               |
| Candidate assessment  | Matching                |
| Proposal              | Negotiation             |
| Closing requirement   | Closing                 |
| Task or approval      | Tasks & Approvals       |
| Deliverable           | Deliverables & Exports  |
| Audit event           | Activity & Audit        |

Other screens may preview or reference the object.

They must not create competing authoritative copies.

---

## 6.2 Navigation preserves scope

Every transition should retain the applicable scope:

* Institution;
* deal;
* workstream;
* object;
* version;
* participant;
* audience.

The user should never move from a deal-scoped finding into a global screen and then unknowingly act on another deal.

---

## 6.3 Actions occur in the owning workspace

Examples:

* A notification may link to an approval, but cannot approve it.
* Search may open a finding, but cannot edit it.
* Deal Overview may preview a blocker, but resolution occurs in its source workspace.
* Activity may show a historical decision, but cannot rewrite it.
* Copilot may propose a change, but the relevant workspace owns submission and approval.

---

## 6.4 Preview is not authority

A preview may show:

* Summary;
* status;
* source;
* financial consequence;
* available destination.

It should not silently support all actions available in the authoritative workspace.

---

## 6.5 History is immutable

Returning to a historical version must not cause users to confuse it with the current state.

Historical context should always show:

* Version;
* historical timestamp;
* supersession state;
* current replacement;
* read-only status.

---

## 6.6 Material transitions create audit events

Material cross-screen actions include:

* Approval;
* rejection;
* source-version acceptance;
* finding reopening;
* valuation invalidation;
* external distribution;
* access grant;
* archive;
* policy change.

Navigation alone is not normally an audit event.

The resulting state change is.

---

# 7. Product modes

M&Ai has four principal application modes.

## Global workspace

Used for:

* Home;
* Deals;
* Organizations;
* Tasks & Approvals;
* Team;
* Notifications;
* Search.

## Deal workspace

Used for:

* Overview;
* Dossier;
* Documents;
* Diligence;
* Valuation;
* Matching;
* Negotiation;
* Closing;
* Agentic Workspace;
* Activity;
* Team & Access;
* Deliverables;
* Deal Settings.

## Administration

Used for:

* Institution settings;
* roles;
* integrations;
* security;
* templates;
* commercial settings;
* institution audit;
* API administration.

## External participation

Used for:

* Client Portal;
* Information Request Portal;
* External Approval Portal;
* Secure Document Submission.

Each mode has a distinct shell and authorization boundary. The external mode must use reduced navigation and must not expose internal global navigation or unrestricted Copilot access.

---

# 8. Canonical route families

```text
GLOBAL

/home
/deals
/deals/new
/organizations
/organizations/:organizationId
/contacts/:contactId
/tasks
/team
/notifications
/search
```

```text
DEAL

/deals/:dealId/overview
/deals/:dealId/dossier
/deals/:dealId/documents
/deals/:dealId/diligence
/deals/:dealId/valuation
/deals/:dealId/matching
/deals/:dealId/negotiation
/deals/:dealId/closing
/deals/:dealId/workspace
/deals/:dealId/activity
/deals/:dealId/team
/deals/:dealId/deliverables
/deals/:dealId/settings
```

```text
ADMINISTRATION

/settings/profile
/settings/institution
/settings/roles
/settings/integrations
/settings/security
/settings/templates
/settings/commercial
/settings/audit
/settings/developers
```

```text
EXTERNAL

/portal/project/:externalWorkspaceId
/portal/project/:externalWorkspaceId/requests
/portal/project/:externalWorkspaceId/approvals
/submit/:submissionToken
```

The Deal Settings family owns detailed controlled subflows such as archive,
reopen, pause, terminate and deletion requests under `/deals/:dealId/settings`;
those subflows do not create separate top-level deal workspaces.

The external block is a family summary. `design/25_External_Participant_Screen_Family.md`
is the detailed route authority for overview, request detail, submissions,
documents, activity and security surfaces under the reduced external shell.

The canonical route hierarchy intentionally avoids banker-facing destinations such as `/engines`, `/agents`, `/models`, `/rag` and `/memory`. 

---

# 9. Canonical context envelope

Every cross-screen transition should be capable of carrying a structured context envelope.

```text
InteractionContext
├── institutionId
├── membershipId
├── applicationMode
├── dealId
├── workspace
├── workstream
├── objectType
├── objectId
├── objectVersion
├── sourceObjectType
├── sourceObjectId
├── sourceObjectVersion
├── originRoute
├── returnRoute
├── returnLabel
├── filterSnapshot
├── selectedTab
├── searchQuery
├── searchScope
├── taskId
├── approvalId
├── notificationId
├── auditEventId
└── permissionSnapshotReference
```

Not every transition uses every field.

The structure prevents each screen from inventing its own incompatible navigation payload.

---

# 10. URL versus transient context

## URL state

Use for context that should survive:

* Refresh;
* deep link;
* browser history;
* shared internal link;
* reopening.

Examples:

* Deal;
* selected object;
* selected tab;
* query;
* primary filters;
* historical version;
* selected audit event.

## Transient interface state

Use for:

* Open tooltip;
* hover;
* temporary selection;
* unsaved form values;
* expanded row;
* local panel width;
* animation state.

## Persistent personal state

Use for:

* Density;
* default view;
* saved filters;
* preferred panel state;
* recently opened objects.

---

# 11. Deep-link standard

Every material object should have a stable internal deep link.

Examples:

```text
/deals/:dealId/diligence?finding=:findingId
```

```text
/deals/:dealId/documents/:documentId?version=:versionId&location=:locationId
```

```text
/deals/:dealId/valuation?scenario=:scenarioId&version=:versionId
```

```text
/tasks/:workItemId
```

```text
/deals/:dealId/activity?event=:eventId
```

The link must resolve through authorization before displaying object metadata.

---

# 12. Exact-context destination contract

A destination should include:

* Workspace;
* object;
* selected version;
* optional subobject;
* relevant view;
* intended action.

Example:

```text
Destination
workspace: diligence
objectType: finding
objectId: finding_018
objectVersion: 3
view: evidence
actionIntent: review
```

This is preferable to a generic:

> `/deals/project-horizon`

---

# 13. Return-path contract

When navigation originates from a transient workflow, preserve a return path.

Example:

> Tasks & Approvals → Diligence finding

The destination should show:

> **Return to Tasks & Approvals**

After the user completes or exits the review:

* Return to the original task;
* preserve its queue position;
* preserve filters;
* update task state;
* update counts.

---

# 14. Return-path priority

Use this order:

1. Explicit workflow return path;
2. origin route recorded in context;
3. browser history;
4. authoritative parent workspace;
5. Deal Overview;
6. Home.

Do not rely solely on browser history for controlled workflows.

The user may have opened the object in a new tab or refreshed the page.

---

# 15. Deal-context persistence

Inside a deal, moving between workspaces should preserve:

* Active deal;
* user’s last selected object per workspace where appropriate;
* workstream filter;
* current-versus-historical preference;
* contextual Copilot scope;
* unsaved-state warning.

Example:

```text
Diligence · Financial finding selected
  ↓
Valuation
  ↓
Return to Diligence
  ↓
Same Financial finding selected
```

This should be session persistence, not necessarily a permanent preference.

---

# 16. Deal switching

Switching deals is a material context change.

Before switching, validate:

* Unsaved edits;
* running draft;
* pending upload;
* active approval;
* open sensitive preview;
* Copilot mission tied to current deal.

Recommended confirmation where needed:

> **Leave Project Horizon?**

> Your draft response to Finding DD-018 has not been saved.

Actions:

* Save draft and switch;
* discard and switch;
* remain.

---

# 17. Institution switching

Institution switching should clear or revalidate:

* Active deal;
* recent objects;
* search scope;
* task counts;
* notification counts;
* saved filters;
* Copilot context;
* cached permissions.

It should not carry a deal ID from one institution into another institution’s workspace.

---

# 18. Permission changes during navigation

Access can change while a user is working.

The next request should re-evaluate authorization.

Possible outcomes:

## Access unchanged

Continue normally.

## Access reduced

Redact or close the current object.

## Access revoked

Terminate object access and show:

> Your access to this transaction content has changed.

## Authority removed

Allow read access where permitted, but disable the decision action.

---

# 19. Unsaved-change handling

Unsaved state should be owned locally by the authoritative workspace.

The shell should know only:

* Whether unsaved material state exists;
* whether navigation is safe;
* the save or discard callbacks.

Avoid placing complete draft objects in a global navigation store.

---

# 20. Concurrency handling

When another user updates an object while it is open:

1. Detect version mismatch;
2. preserve the user’s draft;
3. show current and attempted changes;
4. allow refresh, merge or resubmit;
5. prohibit silent overwrite.

Example:

> **Finding DD-018 changed while you were reviewing it**

Marina Alves changed:

* Severity: Medium → High;
* reviewer: Ana Costa.

Your draft changes:

* Financial impact;
* rationale.

---

# 21. Object version handoff

Every cross-screen reference to a versioned object should identify whether it means:

* Current version;
* specific historical version;
* latest approved version;
* latest draft;
* version at decision time.

Example:

> Valuation Scenario v4 approved

Opening the decision should load:

> Scenario v4 as decided

not:

> Current Scenario v6

A separate action may open the current version.

---

# 22. Authoritative object relationship graph

Recommended principal relationships:

```text
Organization
  ├── Contact
  ├── Deal Participation
  └── Relationship Record
```

```text
Deal
  ├── Deal Configuration
  ├── Deal Participant
  ├── Target Dossier
  ├── Document Source
  ├── Document
  ├── Evidence Reference
  ├── Fact
  ├── Finding
  ├── Valuation Scenario
  ├── Candidate Assessment
  ├── Proposal
  ├── Closing Requirement
  ├── Work Item
  ├── Decision
  ├── Deliverable
  └── Audit Event
```

Screens should navigate through these relationships rather than copy data.

---

# 23. Global-to-deal interaction map

```text
Home / Command Center
  ├── Attention item → exact deal object
  ├── Active deal → Deal Overview
  ├── Material change → affected workspace
  └── Assigned approval → Tasks & Approvals
```

```text
Deals Portfolio
  ├── Deal row → Deal Overview
  ├── Phase indicator → phase workspace
  ├── Attention indicator → exact blocker
  └── Create deal → New Deal Setup
```

```text
Organizations
  ├── Organization → Organization Detail
  ├── Related deal → Deal Overview
  ├── Contact → Contact Detail
  └── Create deal → New Deal Setup with organization preselected
```

```text
Tasks & Approvals
  ├── Task → exact authoritative object
  ├── Approval → decision package
  ├── Completed item → decision or audit record
  └── Deal → Deal Overview
```

```text
Notifications
  ├── Event → exact object
  ├── Assignment notification → Work Item
  ├── Decision notification → Decision Record
  └── System notice → relevant administrative workspace
```

```text
Global Search
  ├── Deal result → Deal Overview
  ├── Document result → exact source location
  ├── Finding result → Diligence
  ├── Decision result → decision snapshot
  └── Deliverable result → Deliverable version
```

---

# 24. Command Center transitions

The Command Center should behave as an attention router.

## Appropriate transitions

* Blocker → exact blocker;
* overdue approval → approval package;
* document change → synchronization detail;
* stale valuation → affected scenario;
* closing risk → requirement;
* deal row → Overview.

## Inappropriate transitions

* Generic cards all opening Deal Overview;
* dashboards opening filtered lists without retaining filters;
* portfolio counts that have no destination.

---

# 25. Deals Portfolio transitions

Recommended row targets:

| Row element     | Destination                    |
| --------------- | ------------------------------ |
| Deal name       | Deal Overview                  |
| Stage           | Current stage workspace        |
| Next action     | Exact task or blocker          |
| Deal Lead       | Deal Team & Access participant |
| Organization    | Organization Detail            |
| Archived state  | Archived Deal Overview         |
| Attention count | Filtered attention panel       |

The row itself may open Overview.

Specific elements should have distinct destinations.

---

# 26. Organization-to-deal flow

```text
Organization Detail
  ↓
Create deal
  ↓
New Deal Setup
  ↓
Organization preselected
  ↓
Assign deal-specific role
  ↓
Create deal
  ↓
Create Target Dossier
```

The organization remains reusable.

The Dossier remains deal-specific.

This separation is central to the canonical information architecture. 

---

# 27. Contact-to-deal flow

```text
Contact Detail
  ↓
Add to transaction
  ↓
Select deal
  ↓
Define participation role
  ↓
Internal or external classification
  ↓
Deal Team & Access
```

Adding a Contact to a deal should not automatically:

* Grant access;
* send an invitation;
* create approval authority;
* expose relationship notes.

---

# 28. Tasks-to-context flow

This is the principal human-in-the-loop flow.

```text
Tasks & Approvals
  ↓
Select work item
  ↓
Review summary, due date and consequence
  ↓
Open exact transaction context
  ↓
Inspect evidence and impact
  ↓
Complete work or make decision
  ↓
Authoritative object updated
  ↓
Work item updated
  ↓
Audit event created
  ↓
Return to queue
```

---

# 29. Task context bar

When a task opens another screen, show a persistent context bar.

Example:

> **Reviewing Approval AP-027**
> Customer-concentration treatment · Due today at 17:00 BRT

Actions:

* Return to approval;
* open task details;
* minimize context bar.

The context bar should disappear after the workflow is completed or exited.

---

# 30. Task versus authoritative object state

A task may be:

> Open

while the associated object is:

> Draft

or:

> Review required

Completing the object action should update the task through a domain event.

The object should not inspect or manipulate a generic task store directly.

---

# 31. Notifications-to-context flow

```text
Notification
  ↓
Open exact object
  ↓
Notification marked read
  ↓
Underlying state remains unchanged
```

If the notification references required work:

```text
Notification
  ↓
Task or approval
  ↓
Authoritative workspace
```

Read state must remain separate from task completion.

---

# 32. Search-to-context flow

```text
Search query
  ↓
Result selected
  ↓
Preview opened
  ↓
Exact version confirmed
  ↓
Authoritative workspace opened
```

The search context should preserve:

* Query;
* scope;
* filters;
* selected result.

Returning should restore the same result position.

---

# 33. Global Search to Copilot

```text
Search results
  ↓
Select one or more authorized objects
  ↓
Ask M&Ai about selected results
  ↓
Copilot receives explicit object references
  ↓
Source citations preserved
```

The Copilot should not receive:

* Hidden search candidates;
* inaccessible result counts;
* unrelated deal content.

---

# 34. Team-to-deal flow

```text
Team Workspace
  ↓
Select institution member
  ↓
Review deal assignments
  ↓
Open Project Horizon assignment
  ↓
Deal Team & Access
  ↓
Participant selected
```

Team Workspace owns institution membership.

Deal Team & Access owns transaction participation and permissions.

---

# 35. Settings-to-deal flow

Examples:

```text
Template published
  ↓
Active deals receive update available
  ↓
Deal Settings
  ↓
Compare current and new template
  ↓
Create deal-configuration proposal
```

```text
Role policy changed
  ↓
Affected deal assignments identified
  ↓
Deal Team & Access review created
```

Institution settings should not silently rewrite active deals unless the policy explicitly requires immediate enforcement.

---

# 36. Deal Overview as transaction router

Deal Overview should summarize and route.

It should contain:

* Current stage;
* required actions;
* recent material changes;
* key financial context;
* active blockers;
* workstream progress;
* recent decisions;
* next milestone.

Every summary item should link to the authoritative workspace.

Overview should not become a second implementation of:

* Diligence;
* Valuation;
* Closing;
* Tasks;
* Audit.

---

# 37. Overview-to-workspace destinations

| Overview element         | Destination                          |
| ------------------------ | ------------------------------------ |
| Dossier completeness     | Target Dossier                       |
| Document synchronization | Documents                            |
| Material finding         | Diligence                            |
| Valuation range          | Valuation                            |
| Buyer shortlist          | Matching                             |
| Current proposal         | Negotiation                          |
| Closing readiness        | Closing                              |
| Pending approval         | Tasks & Approvals                    |
| Recent decision          | Activity & Audit or source workspace |
| Team gap                 | Deal Team & Access                   |
| Stale report             | Deliverables                         |
| Archive blocker          | Deal Settings                        |

---

# 38. Documents-to-Dossier flow

```text
Document processed
  ↓
Proposed fact extracted
  ↓
Target Dossier review queue
  ↓
Fact reconciled
  ↓
Human approval
  ↓
Approved Dossier fact
```

The document remains the source.

The Dossier owns the structured fact.

---

# 39. Dossier-to-document flow

```text
Dossier fact
  ↓
Inspect evidence
  ↓
Documents
  ↓
Exact document version
  ↓
Exact page, sheet, cell or clause
```

The source viewer should include:

> Return to Dossier Fact F-102

---

# 40. Document-change flow

```text
VDR synchronization
  ↓
New document version
  ↓
Version comparison
  ↓
Affected evidence references
  ↓
Affected facts
  ↓
Affected findings and assumptions
  ↓
Review tasks
  ↓
Relevant approvals invalidated when required
```

This is a dependency-driven transaction update, not merely a notification.

---

# 41. Documents-to-Diligence flow

A document change may create or affect a finding.

```text
Document version 3
  ↓
Evidence reference
  ↓
Proposed finding
  ↓
Diligence review
  ↓
Approved finding
```

Documents may show:

> Used by 2 findings

Selecting the relationship opens the Diligence workspace.

---

# 42. Dossier-to-Diligence flow

```text
Approved fact
  ↓
Threshold or playbook rule evaluated
  ↓
Finding proposed
  ↓
Human review
  ↓
Finding approved, rejected or revised
```

An approved fact does not automatically imply an approved finding.

---

# 43. Diligence-to-Valuation flow

```text
Finding
  ↓
Potential financial impact
  ↓
Valuation treatment proposed
  ↓
Deterministic scenario calculated
  ↓
Human approval
```

Diligence should show:

> **Valuation impact**

* Proposed;
* calculated;
* awaiting review;
* approved;
* invalidated.

Selecting it opens the exact scenario or treatment.

---

# 44. Valuation-to-Diligence flow

A valuation assumption or adjustment should retain its source.

```text
Valuation adjustment
  ↓
Source finding
  ↓
Diligence
  ↓
Evidence and approved treatment
```

The Valuation screen must not display an unexplained adjustment detached from the finding that motivated it.

---

# 45. Diligence-to-Tasks flow

Actions that may create tasks:

* Review proposed finding;
* resolve evidence contradiction;
* quantify financial impact;
* request specialist review;
* approve treatment;
* obtain missing information.

The task should reference:

* Finding;
* version;
* requested action;
* due date;
* required authority;
* return path.

---

# 46. Valuation-to-Tasks flow

Tasks may include:

* Review assumption;
* approve normalization;
* validate comparable;
* approve treatment;
* approve complete scenario;
* investigate reconciliation difference.

The approval should route to the exact model version.

---

# 47. Valuation-to-Negotiation flow

Approved valuation may become a negotiation reference.

```text
Approved valuation scenario
  ↓
Negotiation baseline created
  ↓
Proposal compared
  ↓
Commercial alternatives assessed
```

The Negotiation Room should show:

* Valuation reference;
* version;
* approval date;
* whether it remains current.

A new valuation version should not rewrite historical proposal comparisons.

---

# 48. Matching-to-Negotiation flow

```text
Approved shortlist
  ↓
Outreach authorization
  ↓
Counterparty engagement
  ↓
Proposal received
  ↓
Negotiation Room
```

Candidate assessment and proposal are separate objects.

The same organization can have:

* Organization record;
* candidate assessment;
* outreach record;
* proposal;
* negotiation history.

---

# 49. Organization-to-Matching flow

```text
Organization Detail
  ↓
Add to counterparty universe
  ↓
Create deal-specific candidate record
  ↓
Matching assessment
```

The Organization record should not store:

* Deal-specific fit;
* outreach status;
* exclusion rationale;
* transaction scoring.

Those belong to the Candidate Assessment.

---

# 50. Negotiation-to-Closing flow

```text
Approved commercial position
  ↓
Agreed terms
  ↓
Closing requirements generated
  ↓
Execution documents
  ↓
Signatures and funds-flow controls
  ↓
Closing authorization
```

Negotiation should hand off:

* Agreed term version;
* approval decision;
* unresolved conditions;
* responsible parties.

Closing should not infer terms from an unapproved proposal.

---

# 51. Closing-to-Deliverables flow

Closing may generate:

* Closing readiness report;
* conditions register;
* signature-status report;
* funds-flow package;
* closing binder;
* completion memorandum.

Each deliverable should freeze the applicable Closing object versions.

---

# 52. Closing-to-Deal Settings flow

After legal completion:

```text
Closing completion recorded
  ↓
Deal business state becomes Completed
  ↓
Deal Settings archive readiness updated
  ↓
Access disposition review
  ↓
Archive preparation
```

Deal Settings should not create legal completion independently in the normal workflow.

---

# 53. Deliverables-to-source flow

A deliverable section should link to its source object.

Example:

```text
Diligence Committee Brief
  ↓
Customer concentration section
  ↓
Finding DD-018
  ↓
Fact F-102
  ↓
Revenue workbook v3
```

The user should be able to inspect the chain without leaving the deliverable version ambiguously.

---

# 54. Source-to-deliverable flow

Source workspaces should show usage.

Examples:

> Finding DD-018 is included in:

* Diligence Committee Brief v3;
* Client Risk Summary v2;
* Audit Package A-004.

A changed source should trigger deliverable freshness evaluation.

---

# 55. Activity-to-object flow

```text
Audit event
  ↓
Affected object
  ↓
Historical object version
```

Example:

> Scenario v4 approved

Open:

* Decision snapshot;
* scenario v4;
* evidence snapshot.

The Activity screen should not route to the current scenario when reconstructing a historical event unless the user explicitly requests it.

---

# 56. Object-to-Activity flow

Every authoritative workspace should provide:

> View activity

or:

> View audit history

This opens Activity & Audit filtered by:

* Object;
* version;
* related decisions;
* date range.

---

# 57. Agentic Workspace handoffs

The Agentic Workspace may:

* Investigate;
* compare;
* prepare;
* propose;
* draft;
* create a controlled handoff.

It should not become the authoritative owner of:

* Facts;
* findings;
* valuation;
* approvals;
* deliverables;
* external actions.

---

# 58. Agent proposal flow

```text
Mission output
  ↓
Structured proposal
  ↓
User reviews citations
  ↓
Create draft in authoritative workspace
  ↓
Human edits or submits
  ↓
Normal review and approval
```

Example:

> M&Ai proposes a customer-concentration finding.

Action:

> Create Diligence draft

Not:

> Approve finding directly from chat.

---

# 59. Contextual Copilot handoff

The Copilot should receive an explicit context bundle.

```text
CopilotContext
├── dealId
├── workspace
├── selectedObject
├── selectedObjectVersion
├── permittedEvidenceReferences
├── currentUserCapabilities
└── originRoute
```

It should not automatically receive every object in the deal.

---

# 60. Copilot-to-action flow

```text
User asks question
  ↓
Copilot produces cited answer
  ↓
User selects proposed action
  ↓
Structured draft created
  ↓
Authoritative workspace opens
  ↓
User reviews and submits
```

Examples:

* Create information request;
* propose finding;
* create scenario;
* prepare deliverable;
* create task.

---

# 61. Copilot correction flow

When a user corrects an output:

* Preserve the correction;
* identify the affected proposal;
* update the draft where applicable;
* avoid rewriting approved historical objects;
* optionally create evaluation feedback;
* keep deal isolation.

---

# 62. Deliverable review handoff

```text
Deliverable review task
  ↓
Deliverable version
  ↓
Assigned section
  ↓
Source inspection
  ↓
Approve or request changes
  ↓
Return to review task
```

The task context should remain visible while the reviewer opens supporting sources.

---

# 63. External information-request flow

```text
Internal team creates request
  ↓
Request approved for external release
  ↓
External participant notified
  ↓
External participant submits evidence
  ↓
Submission processed
  ↓
Internal reviewer accepts or returns
  ↓
Accepted evidence enters Documents
  ↓
Affected Dossier or Diligence workflows begin
```

External submission is not evidence acceptance.

---

# 64. Secure-submission flow

```text
Request-bound link
  ↓
External identity verification
  ↓
File upload
  ↓
Security and format validation
  ↓
Submission receipt
  ↓
Internal document review
  ↓
Evidence acceptance
```

The submitter sees their receipt.

They do not receive general deal access.

---

# 65. External approval flow

```text
Internal approval package prepared
  ↓
Release to external approver authorized
  ↓
External approver authenticates
  ↓
Evidence package reviewed
  ↓
Decision recorded
  ↓
Internal workflow updated
  ↓
Audit event created
```

The external decision must preserve:

* Object version;
* identity;
* authority;
* conditions;
* timestamp.

---

# 66. External access expiration flow

```text
Expiry approaching
  ↓
Sponsor notified
  ↓
Open work reviewed
  ↓
Extend, reduce or allow expiry
  ↓
Sessions and links revoked
  ↓
Historical submissions preserved
```

---

# 67. Tasks, notifications and audit boundary

| Concept      | Creates awareness | Requires action | Authoritative history |
| ------------ | ----------------: | --------------: | --------------------: |
| Notification |               Yes | Not necessarily |                    No |
| Task         |                No |             Yes |                    No |
| Approval     |                No |   Yes, decision |      Decision history |
| Audit event  |                No |              No |                   Yes |

A single domain event may produce all four objects, but they remain separate.

---

# 68. Example event choreography

Source event:

> Customer revenue workbook version 3 synchronized.

Resulting objects:

```text
Document Version
  ├── Evidence change
  ├── Dossier fact review
  ├── Finding reopened
  ├── Valuation scenario stale
  ├── Review task
  ├── Notification
  └── Audit events
```

The system should not create these through screen-to-screen imperative calls.

They should be created by domain workflow logic.

---

# 69. Action taxonomy

Use four action classes.

## Navigation action

No business-state mutation.

Examples:

* Open;
* inspect;
* compare;
* return.

## Draft action

Creates editable non-authoritative state.

Examples:

* Create draft finding;
* prepare scenario;
* draft deliverable.

## Workflow action

Changes work state.

Examples:

* Assign;
* submit for review;
* request changes;
* complete task.

## Material decision

Changes approved transaction state.

Examples:

* Approve finding;
* approve valuation;
* authorize outreach;
* waive condition;
* archive deal.

---

# 70. Action presentation rules

## Navigation

May appear inline.

## Draft action

May appear in menus or page controls.

## Workflow action

Requires clear state and consequence.

## Material decision

Requires:

* Complete context;
* authority validation;
* consequence summary;
* explicit confirmation;
* audit event.

---

# 71. Quick-action boundary

Appropriate quick actions:

* Mark notification read;
* follow object;
* assign routine task;
* save draft;
* open evidence.

Inappropriate quick actions:

* Approve valuation;
* release deliverable;
* grant clean-team access;
* waive closing condition;
* terminate mandate.

---

# 72. Drawer interaction rules

Use drawers for:

* Preview;
* metadata;
* source evidence;
* activity;
* comments;
* compact object inspection;
* non-material editing.

Use full pages for:

* Complex analysis;
* multi-step review;
* material approval;
* configuration;
* large comparisons;
* external distribution.

A drawer must not become a hidden full application inside a screen.

---

# 73. Modal interaction rules

Use modal dialogs for:

* Confirmation;
* short creation flow;
* tightly bounded choice;
* destructive-action review step;
* authentication challenge.

Avoid modals for:

* Long forms;
* complete findings;
* valuation analysis;
* document comparison;
* complete approval packages.

---

# 74. Split-view rules

Split views are appropriate where users repeatedly move between:

* List and selected object;
* finding and evidence;
* deliverable and review state;
* audit timeline and event detail;
* request and submission.

The selected object should be represented in the URL when deep linking is valuable.

---

# 75. Breadcrumb behavior

Recommended examples:

```text
Home / Organizations / Northbridge Automation
```

```text
Deals / Project Horizon / Diligence
```

```text
Settings / Roles & Permissions
```

When inside an exact object:

```text
Deals / Project Horizon / Diligence / Customer concentration
```

The current page is not clickable.

Long names truncate visually but remain available to assistive technology.

---

# 76. Browser Back behavior

Browser Back should return through navigation history.

Controlled workflow return controls should return through workflow history.

Example:

* Browser Back: previous screen.
* `Return to Approval AP-027`: authoritative workflow origin.

These may differ.

That is acceptable when labels are explicit.

---

# 77. Open in new tab

Support opening in a new tab for:

* Documents;
* evidence;
* findings;
* valuation scenarios;
* organizations;
* deliverables;
* audit events.

The new tab must reconstruct context from the URL and server state.

It must not depend on an in-memory origin object.

---

# 78. Current-context indicators

Every deal screen should show:

* Deal codename;
* organization and side;
* transaction stage;
* restricted-state indicator;
* active historical-view indicator, if applicable.

Every global screen should show:

* Institution;
* global scope;
* active filters.

Every external screen should show:

* Safe deal label;
* participant role;
* access expiry.

---

# 79. Historical-view indicator

When viewing historical data, show a persistent banner.

Example:

> **Historical view · Scenario v3 · Approved 24 jul. 2026**

> Current version: v4

Actions:

* Open current version;
* compare;
* remain in historical view.

---

# 80. Stale-context indicator

When an open object becomes stale:

> **Newer information is available**

Example:

> Revenue workbook version 4 was synchronized while you were reviewing version 3.

Actions:

* Continue reviewing version 3;
* compare;
* switch to version 4.

Do not refresh material context automatically.

---

# 81. Partial-processing behavior

A new document may be:

* Metadata searchable;
* previewable;
* not fully extracted;
* not available for semantic retrieval.

Cross-screen transitions should preserve the limitation.

Example:

> Evidence content is still processing. Filename and source metadata are available.

---

# 82. Error handoff

When a destination cannot load, preserve enough context to:

* Retry;
* return;
* open the parent workspace;
* report the issue.

Example:

> Finding DD-018 could not be loaded.

Actions:

* Retry;
* return to Approval AP-027;
* open Diligence.

---

# 83. Superseded destination

When a linked object was superseded:

> **This version was superseded by Finding v4.**

Actions:

* Open historical version;
* open current version;
* compare.

Do not redirect silently to the current version.

---

# 84. Removed destination

Where a source or object was removed:

> The referenced source is no longer available in its original location.

Available:

* Retained metadata;
* historical evidence reference;
* audit event;
* replacement source.

---

# 85. Restricted destination

When access is unavailable:

> You do not have access to this transaction object.

Do not reveal:

* Full title;
* value;
* object count;
* reason that exposes restricted information.

Provide:

* Return route;
* access-request route, where policy permits;
* support contact.

---

# 86. Access-request handoff

```text
Restricted destination
  ↓
Request access
  ↓
Deal Team & Access request form
  ↓
Scope and business reason prefilled
  ↓
Approval workflow
  ↓
Access activated or rejected
  ↓
Original destination available after activation
```

The access request should not grant temporary access while pending.

---

# 87. Cross-screen permission enforcement

Authorization should be evaluated by the server for:

* List;
* count;
* preview;
* detail;
* source excerpt;
* linked object;
* action;
* export;
* Copilot;
* notification;
* search.

The destination screen must not trust the fact that the user obtained a link from another authorized screen.

---

# 88. Redaction propagation

When an object is redacted, downstream surfaces must respect the same restriction.

Example:

> Customer names restricted to Financial Clean Team.

The following must remain sanitized:

* Dossier summary;
* Diligence finding;
* valuation explanation;
* deliverable;
* notification;
* search result;
* Copilot response;
* audit preview.

---

# 89. Derived-data propagation

Restricted source data may produce approved derived information.

Example:

```text
Restricted raw customer revenue
  ↓
Concentration calculation
  ↓
Reviewed derived metric: 41,2%
  ↓
Approved wider audience
```

The derived object needs:

* Source restriction;
* sanitization state;
* approving reviewer;
* permitted audience.

---

# 90. Version-invalidation propagation

Example:

```text
Document version changes
  ↓
Fact marked review required
  ↓
Finding reopened
  ↓
Valuation treatment invalidated
  ↓
Scenario approval invalidated
  ↓
Deliverable marked stale
  ↓
Negotiation reference flagged
```

Invalidation should follow declared dependencies.

It should not be a broad “mark everything stale” operation.

---

# 91. Dependency visibility

Every affected screen should show:

* Which dependency changed;
* previous version;
* current version;
* affected fields;
* current consequence;
* required action.

Example:

> **Scenario v4 approval invalidated**

Cause:

> Customer concentration fact changed from 39,8% to 41,2%.

---

# 92. Event-driven interaction model

Cross-screen state propagation should use domain events.

Examples:

```text
DocumentVersionCreated
FactProposed
FactApproved
FactSuperseded
FindingCreated
FindingReopened
ValuationScenarioCalculated
ApprovalRequested
DecisionRecorded
DeliverableMarkedStale
ExternalSubmissionReceived
DealArchived
```

Avoid UI-specific events such as:

```text
refreshValuationPage
updateDiligenceCard
showDashboardBadge
```

---

# 93. Event metadata

Each material domain event should include:

```text
eventId
eventType
institutionId
dealId
actorType
actorId
objectType
objectId
objectVersion
occurredAt
correlationId
causationEventId
permissionClassification
payloadReference
```

This supports:

* Audit;
* workflows;
* notifications;
* cache invalidation;
* analytics;
* external integrations.

---

# 94. Event fan-out

One event may produce several effects.

Example:

```text
DecisionRecorded
  ├── Update target object state
  ├── Complete approval work item
  ├── Create audit record
  ├── Notify relevant users
  ├── Recalculate dependent readiness
  ├── Refresh search index
  └── Update portfolio attention
```

These effects should be idempotent.

---

# 95. Source-of-truth rule

The event does not become the source of truth for the business object.

Example:

* `DecisionRecorded` records that approval occurred.
* `ValuationScenario` contains the current scenario state.
* `AuditDecisionRecord` preserves the decision snapshot.

The event coordinates state changes.

It does not replace the domain object.

---

# 96. Client cache invalidation

Recommended invalidation scopes:

## Object

Example:

> Finding DD-018 changed.

## Workspace

Example:

> Diligence summary counts changed.

## Deal

Example:

> Deal attention state changed.

## Global

Example:

> User’s task count changed.

Avoid refreshing every deal screen after any deal event.

---

# 97. Optimistic interaction boundaries

Appropriate optimistic updates:

* Mark notification read;
* archive notification;
* reorder personal list;
* save personal preference;
* add comment draft.

Use cautious or non-optimistic behavior for:

* Approvals;
* access changes;
* source acceptance;
* valuation calculation;
* external distribution;
* archive;
* deletion request.

---

# 98. Long-running operation handoff

Operations such as:

* VDR synchronization;
* document processing;
* agent mission;
* valuation calculation;
* deliverable generation;
* audit export;

should return a stable execution reference.

```text
User starts operation
  ↓
Execution object created
  ↓
User may leave screen
  ↓
Status visible in relevant workspace
  ↓
Completion notification
  ↓
Exact result destination
```

---

# 99. Running-operation continuity

The user should not need to keep a screen open.

Example:

> Diligence Committee Brief v3 is generating.

The user may:

* Continue working;
* inspect generation status;
* receive completion notification;
* open the final draft later.

---

# 100. Cancellation

Cancellation should distinguish:

* User requested;
* system stopped;
* dependency invalidated;
* timeout;
* policy blocked.

Partial outputs should be:

* Discarded;
* retained as draft;
* quarantined;
* available for review;

according to operation type.

---

# 101. Cross-screen comments

Comments should attach to a domain object or version.

Examples:

* Dossier fact;
* finding;
* scenario;
* proposal;
* closing condition;
* deliverable section.

A comment should not exist only as page-local state.

---

# 102. Mentions

Mention flow:

```text
User mentions colleague
  ↓
Comment created
  ↓
Notification created
  ↓
Recipient opens exact comment
  ↓
Comment marked seen
```

The mention itself does not create a task unless the user explicitly requests work or workflow rules create one.

---

# 103. Activity versus comment history

Object comments provide collaboration context.

Activity & Audit provides material transaction history.

Routine comment editing should not dominate the audit timeline.

Material decisions made through comments should be converted into governed decision objects rather than inferred from text.

---

# 104. Mobile cross-screen behavior

Mobile should preserve the same object relationships but simplify presentation.

Recommended:

* Full-screen object detail instead of split pane;
* bottom-sheet filters;
* persistent workflow return control;
* exact deep links;
* one primary action;
* visible deal identity;
* safe handling of unsaved forms.

Complex tasks such as:

* Valuation model comparison;
* access matrix editing;
* template migration;
* closing funds-flow review;

remain desktop-first.

---

# 105. Accessibility interaction rules

Cross-screen transitions should:

* Move focus to the destination heading;
* announce context changes;
* preserve focus on return;
* identify opened drawers and dialogs;
* provide descriptive destination labels;
* announce historical or restricted state;
* avoid color-only relation indicators;
* support keyboard return to origin;
* avoid unexpected automatic navigation.

Example link:

> Open customer-concentration evidence in Documents

not:

> View source

---

# 106. Interaction analytics

Product analytics may record:

* Route entered;
* workflow initiated;
* action completed;
* validation error;
* abandonment;
* return path used;
* time to exact object;
* task completion.

Avoid using analytics to record:

* Restricted evidence content;
* full search queries without policy;
* approval rationale;
* document excerpts;
* personal performance scores.

Analytics are not audit records.

---

# 107. Cross-screen implementation contract

Each screen should declare:

```text
ScreenContract
├── route
├── applicationMode
├── requiredContext
├── authoritativeObjectTypes
├── previewObjectTypes
├── permittedActions
├── materialActions
├── outgoingDestinations
├── incomingContextTypes
├── eventSubscriptions
├── eventEmissions
├── cacheKeys
├── permissionRequirements
├── auditRequirements
└── externalExposure
```

This prevents route implementation from becoming disconnected from domain ownership.

---

# 108. Example screen contract: Diligence

```text
route
/deals/:dealId/diligence

authoritative objects
Finding
FindingVersion
FindingEvidenceLink
FindingTreatment

incoming context
findingId
findingVersion
taskId
approvalId
evidenceReferenceId
returnRoute

outgoing destinations
Documents
Target Dossier
Valuation
Tasks & Approvals
Activity & Audit
Deliverables

material actions
submit finding
approve finding
reject finding
reopen finding
approve treatment
```

---

# 109. Example screen contract: Valuation

```text
route
/deals/:dealId/valuation

authoritative objects
ValuationAssumption
ValuationAdjustment
ValuationScenario
ValuationExecution

incoming context
scenarioId
scenarioVersion
findingId
approvalId
returnRoute

outgoing destinations
Diligence
Documents
Negotiation
Tasks & Approvals
Deliverables
Activity & Audit

material actions
submit assumption
approve adjustment
approve scenario
invalidate scenario
```

---

# 110. Example screen contract: Tasks & Approvals

```text
route
/tasks

authoritative objects
WorkItem
ApprovalRequest
Assignment
DecisionRequirement

incoming context
workItemId
dealId
view
filterSnapshot

outgoing destinations
Every authoritative transaction workspace

material actions
assign
delegate
submit
decide
request changes
escalate
```

---

# 111. Repository direction

The current repository provides several useful interaction foundations:

* Next.js route-based navigation;
* a reusable `AppShell`, `Sidebar` and `TopBar`;
* typed deal API clients;
* deal-version checks;
* screen-specific client hooks;
* route-aware Entity Detail state;
* Agentic Workspace state;
* streaming events;
* separate deal and entity stores.

However, the current interaction structure remains screen- and prototype-specific.

Current banker-facing routes primarily include:

* Deals;
* Deal Detail;
* Deal Chat;
* Deal Engines;
* Entities;
* Settings;
* dashboard prototypes.

The final cross-screen architecture requires a canonical route and context layer rather than adding isolated pages to the existing structure.

---

# 112. Repository components to keep

Keep and evolve:

* `AppShell`;
* `Sidebar`;
* `TopBar`;
* `navigation-model`;
* typed API clients;
* route query-state patterns;
* optimistic deal-version checking;
* event-stream utilities;
* screen model tests;
* Zod-based contracts;
* existing object IDs.

---

# 113. Repository components to reframe

## Current Deal Detail

Reframe as:

> Deal Overview

Its panels should become previews and routers into authoritative deal workspaces.

## Current Deal Chat

Reframe as:

> Agentic Workspace

Provide contextual Copilot access from every deal screen.

## Current Engines route

Split into banker-facing:

* Diligence;
* Valuation;
* other relevant workspaces.

Technical execution detail may remain behind advanced inspection.

## Current Entities routes

Rename product-facing routes and labels to:

> Organizations

Add separate Contact routes.

## Current Settings

Replace the single-page preference prototype with the structured Settings family.

---

# 114. Repository additions

Add:

* Canonical route registry;
* route-to-screen contracts;
* interaction-context schema;
* exact-destination builder;
* return-path manager;
* active-deal context provider;
* institution-context provider;
* authorization context;
* object-version resolver;
* historical-view state;
* workflow context bar;
* domain-event subscriptions;
* cache invalidation registry;
* permission-safe link resolver;
* external-shell separation.

---

# 115. Avoid a universal global store

Do not create one client-side store containing:

* Every deal;
* every document;
* every finding;
* every valuation;
* every task;
* every notification;
* every modal.

Use separate layers:

## Server domain state

Authoritative objects.

## Server-derived query state

Screen-specific projections and summaries.

## Client remote-state cache

Fetched objects and lists.

## URL state

Shareable selection and filters.

## Local UI state

Transient presentation.

## Draft state

Explicitly managed unsaved work.

---

# 116. Route-migration sequence

Recommended migration:

## Stage 1 — Canonical shell

Introduce:

* Global routes;
* deal routes;
* settings routes;
* application modes.

Maintain redirects from legacy routes.

## Stage 2 — Deal workspace split

Replace:

* `/deals/:id`

with:

* Overview;
* Documents;
* Diligence;
* Valuation;
* Agentic Workspace.

## Stage 3 — Global workspaces

Add:

* Tasks & Approvals;
* Organizations;
* Team;
* Notifications;
* Search.

## Stage 4 — Controlled execution

Add:

* Matching;
* Negotiation;
* Closing;
* Activity;
* Deliverables;
* Deal Settings.

## Stage 5 — Administration and external

Add:

* Settings family;
* external portals.

---

# 117. Legacy redirect strategy

Examples:

```text
/entities
  → /organizations
```

```text
/entities/:id
  → /organizations/:id
```

```text
/deals/:id/engines
  → /deals/:id/valuation
```

```text
/deals/:id/chat
  → /deals/:id/workspace
```

```text
/clients
  → /organizations?relationship=client
```

Redirects should preserve compatible query state.

---

# 118. Route ownership

Recommended route modules:

```text
routes/global
routes/deals
routes/organizations
routes/tasks
routes/team
routes/settings
routes/external
```

Each route definition should provide:

* Label;
* icon;
* mode;
* parent;
* permission;
* breadcrumb builder;
* context parser;
* destination builder.

---

# 119. Cross-screen test strategy

## Navigation tests

* Deep link loads exact object;
* refresh preserves context;
* Back restores filter and position;
* new tab reconstructs state;
* deal switch clears incompatible context.

## Permission tests

* Revoked access blocks deep link;
* restricted metadata does not leak;
* source redaction propagates;
* external shell cannot open internal routes.

## Workflow tests

* Task opens exact object;
* object completion updates task;
* decision creates audit event;
* notification read does not complete work.

## Version tests

* Historical decision opens historical object;
* superseded object remains accessible;
* stale source prompts comparison;
* current object is not substituted silently.

---

# 120. Cross-screen integration tests

Critical end-to-end scenarios:

1. Document change to finding review.
2. Finding to valuation treatment.
3. Valuation approval to negotiation reference.
4. Shortlist approval to outreach.
5. Agreed terms to Closing requirements.
6. Closing completion to archive readiness.
7. Finding to deliverable and stale propagation.
8. External submission to accepted evidence.
9. External approval to internal state.
10. Access revocation during an active session.
11. Search to exact historical decision.
12. Copilot proposal to governed draft.

---

# 121. MOCKED — Canonical interaction scenario

## Scenario

Project Horizon receives a new customer-revenue workbook.

## Initial event

> `Receita_por_Cliente_2025.xlsx` Version 3 synchronized

## Cross-screen sequence

```text
Documents
  ↓
Version comparison detects concentration change
  ↓
Target Dossier
  ↓
Top-three concentration changes 39,8% → 41,2%
  ↓
Diligence
  ↓
Customer-concentration finding reopened
  ↓
Valuation
  ↓
Scenario v4 calculated at R$ 438 mi–R$ 478 mi
  ↓
Tasks & Approvals
  ↓
Ana Costa approves the treatment
  ↓
Deliverables
  ↓
Diligence Committee Brief v2 marked stale
  ↓
Activity & Audit
  ↓
Complete causal chain preserved
```

---

# 122. Mocked navigation context

Task:

> **Approve customer-concentration valuation treatment**

Deal:

> Project Horizon

Origin:

> Tasks & Approvals · My Approvals

Destination:

> Valuation · Scenario v4 · Customer-concentration treatment

Return:

> Return to My Approvals

Related:

* Finding DD-018;
* Fact F-102;
* Workbook v3;
* Deliverable v2.

---

# 123. Mocked dependency map

```text
Revenue workbook v3
  ↓
Concentration fact v6
  ↓
Finding DD-018 v3
  ↓
Valuation treatment VT-012
  ↓
Scenario v4
  ↓
Approval AP-027
  ↓
Committee Brief v3
```

---

# 124. Mocked state transitions

| Object             | Previous         | Current                 |
| ------------------ | ---------------- | ----------------------- |
| Document           | Version 2        | Version 3               |
| Concentration fact | 39,8% · Approved | 41,2% · Approved        |
| Finding            | Approved         | Review required         |
| Valuation scenario | v3 · Approved    | v4 · Treatment approved |
| Valuation range    | R$ 480–520 mi    | R$ 438–478 mi           |
| Committee brief    | v2 · Current     | v2 · Stale              |
| Review task        | —                | Completed               |
| Decision           | —                | Approved                |

---

# 125. Mocked cross-screen controls

## In Tasks & Approvals

> Open exact context

## In Valuation

> Inspect source finding
> Open evidence
> Return to Approval AP-027

## In Diligence

> Open valuation impact

## In Documents

> Return to Customer Concentration Finding

## In Deliverables

> Review stale sections

## In Activity

> Follow causal chain

---

# 126. Recommended Figma interaction prototype

The prototype should include at least these connected frames:

1. Tasks & Approvals queue;
2. selected approval;
3. Valuation scenario;
4. Diligence finding;
5. document evidence;
6. decision confirmation;
7. completed task;
8. Activity causal chain;
9. stale deliverable.

The prototype should preserve:

* Deal identity;
* object selection;
* workflow context bar;
* return path;
* historical version state.

---

# 127. UX prototype tasks

Test whether users can:

1. Open a task and reach the exact transaction object.
2. identify which deal they are in.
3. inspect the supporting finding.
4. inspect exact document evidence.
5. return to the valuation treatment.
6. approve the treatment.
7. return to the task queue.
8. identify that the task is complete.
9. find the audit record.
10. identify the affected deliverable.
11. understand why it became stale.
12. create a refreshed version.
13. distinguish current and historical versions.
14. open an object in a new tab.
15. recover after a page refresh.
16. return to the same search result.
17. switch deals without losing an unsaved draft accidentally.
18. understand an access-revoked state.
19. distinguish a notification from a task.
20. distinguish a preview from the authoritative workspace.

---

# 128. UX validation measures

Record:

* Time from task to exact evidence;
* number of unnecessary screens opened;
* whether users lose deal context;
* whether users understand return controls;
* whether historical and current versions are confused;
* whether users mistake previews for editable records;
* whether users understand what becomes stale;
* whether users can reconstruct the causal chain;
* whether deep links survive refresh;
* whether permission failure states expose information.

---

# 129. Design validation criteria

The Cross-Screen Interaction Map is ready when:

1. Every material object has one authoritative workspace.
2. Every preview identifies its authoritative destination.
3. Deal context remains visible during navigation.
4. Institution switching clears incompatible context.
5. Deal switching detects unsaved work.
6. Deep links encode stable object context.
7. Material links include exact object versions where required.
8. Historical objects do not redirect silently to current objects.
9. Workflow return paths survive refresh.
10. Browser history and workflow return remain distinct.
11. Tasks open exact transaction context.
12. Completing an object action updates the corresponding work item.
13. Notifications remain separate from tasks.
14. Audit remains separate from notification delivery.
15. Search restores query, filters and selection after return.
16. Copilot receives only explicit authorized context.
17. Copilot proposals enter authoritative workspaces as drafts.
18. Source documents remain separate from structured facts.
19. Organizations remain separate from deal-specific roles.
20. Candidate assessments remain separate from organizations.
21. Findings remain separate from valuation treatments.
22. Content approval remains separate from release authorization.
23. External submission remains separate from evidence acceptance.
24. Material state changes use domain workflows.
25. Domain events do not use screen-specific naming.
26. Event effects are idempotent.
27. Permission checks occur again at every destination.
28. Redactions propagate to every derivative surface.
29. Derived sanitized outputs retain restricted provenance.
30. Version changes invalidate only declared dependencies.
31. Stale objects explain the changed dependency.
32. Concurrent edits cannot silently overwrite one another.
33. Long-running operations survive screen navigation.
34. Operation completion has an exact destination.
35. Drawers remain previews or bounded tools.
36. Material approvals use full decision context.
37. Access requests preserve the originally requested scope.
38. External portals cannot open internal routes.
39. Mobile preserves object and workflow context.
40. Accessibility preserves focus and announces context changes.
41. Analytics remain separate from audit.
42. Legacy routes redirect without discarding useful context.
43. The final architecture does not depend on a universal client store.
44. Current repository prototypes are migrated through explicit route contracts.
45. The mocked scenario remains fictional.
46. Every terminal state has a valid return or next action.

---

# 130. Final design target

The correct design target is not:

> “A set of screens connected by links.”

It is:

> **A transaction interaction system where every source, analysis, calculation, decision and output remains connected through stable object identity, explicit scope, version authority and controlled return paths.**

Its defining interaction is:

> **Enter from required work → open the exact transaction object → inspect connected evidence and consequence → perform the governed action → propagate state through declared dependencies → return with complete context and audit history**

**Next iteration: Shared State Model.**
