---
canonical_name: "Deal Activity & Audit"
definition_id: "BD-20"
definition_status: "Governed for MAI-90"
screen_family: "deal-governance"
owning_task: "MAI-93"
canonical_routes:
  - "/deals/:dealId/activity"
figma_file_key: "otMJE31OKIxdXogV4RNbGQ"
figma_status: "Shared-pattern reuse documented in MAI-93"
figma_area: "MAI Banker Workspace — Design System & Product UI / 06 Application Shell / MAI-93 — Desktop Execution & Agentic MVP"
figma_nodes:
  - "239:921"
related_definitions:
  - "design/26_Cross_Screen_Interaction_Map.md"
  - "design/27_Shared_State_Model.md"
  - "design/0_Implementaion_Roadmap.md"
last_reviewed_task: "MAI-93"
implementation_capability_boundary: "Product definition only; no frontend, backend, Storybook, token export, or runtime behavior implemented by this file."
mock_demo_data_boundary: "Use fictional/demo transaction data only; do not encode real client, counterparty, credential, or confidential deal data."
---
# Deal Activity & Audit

## 1. Recommended product naming

Use:

* **Deal navigation:** `Activity & Audit`
* **Page title:** `Deal Activity & Audit`
* **Default view:** `Timeline`
* **Immutable record:** `Audit Event`
* **Human-readable grouping:** `Activity Group`
* **State comparison:** `Change Record`
* **Calculation history:** `Execution Record`
* **Decision history:** `Decision Record`
* **Exported package:** `Audit Package`

Keep the navigation label concise:

> **Activity & Audit**

Use the full page title to clarify that the workspace serves two related but distinct purposes:

* **Activity** supports transaction operations and investigation.
* **Audit** preserves authoritative provenance and accountability.

The canonical product architecture defines this screen as a chronological record of meaningful transaction activity, distinguishing human actions, agent actions, deterministic-engine executions, document events, VDR synchronization, decisions, data changes, generated artifacts and access changes. It should support operational review and auditability rather than resemble a social activity feed. 

---

# 2. Screen definition

**Deal Activity & Audit** is the deal-level workspace where authorized users reconstruct what happened during a transaction, who or what caused it, which object version was affected and what consequence followed.

It consolidates authoritative events from:

* Deal lifecycle;
* Target Dossier;
* Documents & Evidence;
* Diligence;
* Valuation;
* Buyer or Target Universe;
* Negotiation;
* Closing;
* Agentic Workspace;
* Tasks & Approvals;
* Deal Team & Access;
* Deliverables & Exports;
* integrations.

It should answer:

1. **What happened?**
2. **When did it happen?**
3. **Who or what performed the action?**
4. **Which transaction object and version were affected?**
5. **What changed before and after the event?**
6. **Which source evidence or calculation supported it?**
7. **Was the action automated, deterministic or human?**
8. **Which approvals or permissions applied?**
9. **What downstream objects became stale, invalidated or updated?**
10. **Can the transaction state be reconstructed from the record?**

Its central operating sequence is:

> **Action or system event → Immutable audit event → Object-version change → Downstream consequence → Reviewable transaction history**

---

# 3. Primary intention

## Operational intention

Allow deal teams to investigate transaction history without searching through:

* Emails;
* chat transcripts;
* spreadsheet versions;
* document folders;
* task comments;
* approval messages;
* system logs;
* agent conversations.

## User intention

A banker should be able to say:

> “I can reconstruct how the transaction reached its current state and identify every material person, source, calculation and decision involved.”

## Product intention

This screen should make M&Ai’s auditability tangible.

M&Ai’s core operating model is:

> **Information → Analysis → Impact → Human decision → Audit record**

Activity & Audit is where the final layer is made inspectable across the complete deal. 

---

# 4. Strategic product role

Activity & Audit is the historical spine of the transaction workspace.

It connects otherwise separate workstreams:

```text
Document version changed
  ↓
Approved fact marked stale
  ↓
Diligence finding reopened
  ↓
Valuation scenario recalculated
  ↓
Approval invalidated
  ↓
Negotiation reference updated
```

Without a unified audit workspace, each module may appear internally traceable while the complete transaction remains difficult to reconstruct.

The page should demonstrate that M&Ai is not only:

* A document-analysis product;
* a valuation tool;
* a workflow system.

It is also:

> **A controlled system of record for how transaction intelligence becomes an approved transaction action.**

---

# 5. What Deal Activity & Audit is not

The screen should not become:

* A social activity feed;
* a notification inbox;
* a task queue;
* a chat transcript;
* a raw application log;
* a security-operations console;
* a database transaction viewer;
* an agent chain-of-thought viewer;
* a list of every page view;
* a live employee-monitoring feed;
* a generic timeline of comments;
* an editable history;
* a replacement for institution-level compliance;
* a technical error console;
* a permanent record of every insignificant UI interaction.

The central question is not:

> “What did everyone click?”

It is:

> **“Which material events explain the current transaction state?”**

---

# 6. Relationship to adjacent screens

| Screen                             | Primary responsibility                             |
| ---------------------------------- | -------------------------------------------------- |
| **Deal Activity & Audit**          | Reconstructs meaningful deal events and provenance |
| **Notification Center**            | Delivers personalized awareness of selected events |
| **Tasks & Approvals**              | Contains work and decisions requiring human action |
| **Deal Overview**                  | Summarizes the current transaction state           |
| **Authoritative workspaces**       | Display and edit current domain objects            |
| **Agentic Workspace**              | Displays mission-specific execution detail         |
| **Deliverables & Exports**         | Stores generated business artifacts                |
| **Deal Team & Access**             | Manages current participants and access            |
| **Institution Audit & Compliance** | Reviews cross-deal security and compliance         |
| **System administration**          | Diagnoses infrastructure and operational health    |

Activity & Audit belongs in the deal-level **More** menu alongside Deal Team, Deliverables and Deal Settings rather than overloading the primary phase navigation. 

---

# 7. Activity versus audit

## Activity

The banker-readable interpretation of a meaningful event.

Example:

> **Customer-concentration treatment approved**

## Audit event

The immutable technical and governance record supporting that activity.

It includes:

* Event ID;
* actor;
* timestamp;
* object and version;
* operation;
* source;
* authorization;
* integrity metadata;
* consequence.

## Recommended behavior

The default timeline shows **Activity** language.

An advanced panel exposes the complete **Audit event**.

This keeps the workspace useful to bankers without sacrificing detailed provenance.

---

# 8. Audit versus notifications

A notification answers:

> Which relevant event should this particular user know about?

Audit answers:

> What materially happened in this deal, whether or not a notification was sent?

Example:

### Audit events

* Source synchronization started;
* 127 documents compared;
* four versions changed;
* two facts became stale;
* one review task created.

### Notification

> Four changed documents affected approved transaction work.

Marking the notification read has no effect on the audit record.

---

# 9. Audit versus Tasks & Approvals

Tasks & Approvals owns:

* Current work;
* active review;
* decision controls;
* deadlines;
* assignment.

Activity & Audit owns:

* Task creation;
* assignment changes;
* review submissions;
* decision outcomes;
* invalidations;
* completion history.

Example:

> **10:18 — Ana Costa approved the valuation treatment.**

The decision is historical and immutable here.

The current scenario remains editable only through Valuation.

---

# 10. Deal audit versus institution audit

## Deal Activity & Audit

Scoped to one transaction.

Contains:

* Deal objects;
* transaction decisions;
* document and model versions;
* deal access changes;
* transaction exports.

## Institution Audit & Compliance

Scoped across the institution.

Contains:

* Cross-deal access;
* authentication;
* role-policy changes;
* security events;
* administrator actions;
* compliance exports;
* platform governance.

A Deal Lead should not automatically gain access to institution-wide audit information.

---

# 11. Primary users

## 11.1 Analyst

Needs to:

* Find when a value changed;
* identify who updated it;
* compare document versions;
* understand why work was reopened;
* locate prior calculations.

## 11.2 Associate

Needs to:

* Reconstruct workstream changes;
* inspect source and assumption history;
* verify whether an action occurred;
* prepare senior-review materials.

## 11.3 Vice President

Needs to:

* Review material changes;
* trace decisions;
* understand invalidations;
* verify approval and authority;
* investigate workflow exceptions.

## 11.4 Managing Director or Partner

Needs:

* Material decision history;
* transaction-stage history;
* commercial changes;
* approval attribution;
* closing authorization;
* concise explanation rather than technical noise.

## 11.5 Legal, tax or financial specialist

Needs to:

* Reconstruct evidence and review state within an authorized workstream;
* identify exact object versions;
* confirm whether previous analysis remains current.

## 11.6 Auditor

Needs:

* Complete event history;
* exact timestamps;
* actor and authority;
* before-and-after values;
* source and calculation versions;
* integrity state;
* export.

## 11.7 Deal administrator

Needs to:

* Investigate access;
* resolve missing event context;
* support export;
* identify failed integration events;
* manage retention state.

---

# 12. Primary job to be done

> When a user needs to understand or prove how the transaction reached its current state, provide a chronological and filterable record linking every material action to its actor, object version, evidence, authority and downstream consequence.

## Secondary jobs

The user should also be able to:

* Find a specific event;
* compare before and after;
* inspect an approval;
* trace a calculation;
* investigate a stale output;
* identify when access changed;
* locate generated artifacts;
* reconstruct a deal phase;
* export an audit package;
* inspect a historical state;
* identify missing or failed activity;
* verify that an event is authentic and immutable.

---

# 13. Core conceptual model

The screen should separate eight layers.

## Layer 1 — Event

Something material happened.

## Layer 2 — Actor

A person, agent, deterministic engine, integration or policy performed or caused it.

## Layer 3 — Object

The transaction object affected.

## Layer 4 — Version

The exact state before and after the event.

## Layer 5 — Evidence or input

The source information supporting the action.

## Layer 6 — Authority

The permission, assignment or approval policy allowing it.

## Layer 7 — Consequence

The downstream object or workflow affected.

## Layer 8 — Integrity

The event’s immutable identity and verification state.

---

# 14. Principal event taxonomy

Use banker-readable event categories:

1. **Deal lifecycle**
2. **Documents & evidence**
3. **Facts & data**
4. **Diligence**
5. **Valuation**
6. **Counterparties**
7. **Negotiation**
8. **Closing**
9. **Tasks & decisions**
10. **M&Ai execution**
11. **Deliverables**
12. **Team & access**
13. **System & integration**

Each category may contain several event types.

---

# 15. Actor taxonomy

The timeline should visibly distinguish:

## Human

* Internal banker;
* client;
* external counsel;
* specialist;
* counterparty;
* administrator.

## M&Ai agent

* Orchestrator;
* financial review;
* legal review;
* document analysis;
* negotiation preparation;
* closing coordination.

## Deterministic engine

* Valuation calculation;
* concentration calculation;
* normalization bridge;
* reconciliation;
* optimization.

## Integration

* VDR;
* document source;
* electronic signature;
* identity provider;
* external portal.

## Policy or scheduler

* Deadline escalation;
* access expiry;
* approval invalidation;
* retention action.

## System administrator

Shown distinctly when performing administrative changes.

---

# 16. Human versus agent versus engine

The distinction is fundamental.

Example:

> **Financial Review proposed a 5,0% revenue downside.**

Actor:

> M&Ai Financial Review

Then:

> **Risk-adjusted valuation scenario v4 calculated.**

Actor:

> Deterministic Valuation Engine

Then:

> **Customer-concentration treatment approved.**

Actor:

> Ana Costa · Vice President

The page should never compress these into:

> M&Ai changed the valuation.

---

# 17. Recommended workspace structure

Use six principal views:

1. **Timeline**
2. **Decisions**
3. **Changes**
4. **Executions**
5. **Access**
6. **Exports**

Supporting view:

7. **Integrity**

## Timeline

Complete banker-readable chronological record.

## Decisions

Approvals, rejections, waivers and review outcomes.

## Changes

Before-and-after object and data changes.

## Executions

Agent missions, deterministic calculations and document processing.

## Access

Participant, permission and restriction changes.

## Exports

Generated and downloaded transaction artifacts.

## Integrity

Advanced event verification and coverage state.

---

# 18. Default view: Timeline

The Timeline should show all meaningful transaction activity in reverse chronological order.

Recommended date grouping:

* Today;
* yesterday;
* earlier this week;
* earlier this month;
* older.

Within a minute or one workflow operation, related events may be grouped.

The default should not show:

* Page views;
* hover events;
* search queries;
* every autosave;
* each streamed response token;
* background retry attempts that did not affect user-visible state.

---

# 19. Page header

## Recommended title

> **Deal Activity & Audit**

Supporting description:

> Review material actions, decisions, calculations and access changes for Project Horizon.

## Header summary

Example:

* **342 material events**
* **18 decisions**
* **7 model versions**
* **3 access changes**
* **Audit current through 10:42 BRT**

## Primary action

> **Export audit package**

## Secondary actions

* Compare deal state;
* verify integrity.

The event count should remain secondary to audit freshness and material history.

---

# 20. Audit coverage statement

The page should clearly state what the audit record covers.

Example:

> **Audit coverage**

> Material deal actions, approved object changes, deterministic calculations, document-source events, access changes and generated artifacts are recorded.

Supporting:

> Low-level interface telemetry and non-material background operations are excluded.

This prevents users from assuming the timeline is a record of every technical event.

---

# 21. Audit freshness

Display:

> **Current through 28 jul. 2026 · 10:42 BRT**

Possible states:

* Current;
* processing recent events;
* delayed;
* partial;
* source unavailable;
* archived.

Example:

> **Recent VDR events delayed**

> Transaction activity remains current through 10:31 BRT. Document-source events after that time are pending synchronization.

---

# 22. Event-row anatomy

Every event row should answer:

1. What happened?
2. Who or what caused it?
3. Which object was affected?
4. When did it occur?
5. What changed?
6. Why does it matter?
7. Where can the user inspect the exact context?

## Example

> **Customer-concentration treatment approved**

> Ana Costa · Vice President
> Valuation · Scenario v4
> 28 jul. 2026 · 10:18 BRT

Impact:

> Enterprise-value midpoint decreased by R$ 42 mi.

Actions:

* View decision;
* open scenario;
* inspect evidence snapshot.

---

# 23. Timeline density

Recommended row heights:

* Compact event: 52–60 px;
* material change: 72–88 px;
* grouped event: 64–80 px;
* expanded event: variable.

Each row should contain no more than:

* One primary event title;
* one context line;
* one consequence line;
* status and time;
* direct destination.

Detailed metadata belongs in the selected-event panel.

---

# 24. Event significance

Recommended levels:

## Material

Changed a decision, valuation, transaction term, closing state or material evidence.

## Operational

Changed workflow, assignment, processing or transaction state.

## Administrative

Changed access, metadata or configuration.

## Technical

Relevant failure, retry or integrity event.

The default timeline may hide non-material technical events.

---

# 25. Significance is not severity

A high-severity finding and a highly significant audit event are different.

Example:

> A low-severity finding was approved.

The finding severity may be Low.

The approval event may still be Material because it changed the approved transaction record.

---

# 26. Activity grouping

Related events should be grouped when they form one understandable operation.

Example group:

> **Customer-revenue workbook version 3 processed**

Contains:

* New version synchronized;
* integrity check completed;
* extraction completed;
* three facts recalculated;
* one finding marked for review;
* one valuation assumption became stale;
* one task created.

Group summary:

> 7 related events · 3 downstream objects affected

---

# 27. Group expansion

Expanded activity groups should show:

* Ordered child events;
* event timestamps;
* actors;
* state;
* failures or limitations;
* affected objects.

The user may open a child event independently.

The group remains a display abstraction.

Each child audit event remains immutable and individually addressable.

---

# 28. Causal chain

The selected-event panel should expose a **causal chain** where known.

Example:

```text
Revenue workbook v3 synchronized
  ↓
Top-three concentration recalculated
  ↓
Approved fact changed from 39,8% to 41,2%
  ↓
Diligence finding reopened
  ↓
Valuation scenario v4 created
  ↓
Treatment approved
```

This is more valuable than a flat list of timestamps.

---

# 29. Event causality states

Not every relationship is equally certain.

Use:

* Direct trigger;
* declared dependency;
* workflow consequence;
* related event;
* inferred relationship.

Avoid presenting a merely correlated event as a direct cause.

---

# 30. Human actions

Examples:

* Deal created;
* fact approved;
* finding rejected;
* assumption changed;
* candidate shortlisted;
* proposal normalized;
* closing condition waived;
* access granted;
* export downloaded.

Human event detail should include:

* User;
* institution role;
* deal role;
* action;
* object version;
* authority snapshot;
* rationale, where required.

---

# 31. Agent actions

Examples:

* Mission planned;
* source selected;
* document comparison completed;
* finding proposed;
* information request drafted;
* artifact prepared;
* mission stopped;
* limitation recorded.

Agent event detail should include:

* Business capability;
* mission;
* step;
* context snapshot;
* result type;
* approval boundary;
* status.

Do not display private chain-of-thought or hidden prompts.

---

# 32. Deterministic-engine executions

Examples:

* Customer concentration recalculated;
* DCF scenario calculated;
* comparable-company range calculated;
* funds-flow schedule reconciled;
* payment total validated.

Execution detail should include:

* Engine purpose;
* engine version;
* input snapshot;
* output reference;
* rounding policy;
* started and completed times;
* success or failure;
* reproducibility identifier.

---

# 33. Integration events

Examples:

* VDR synchronization started;
* document version retrieved;
* signature status synchronized;
* external response submitted;
* access token expired;
* source authorization renewed.

Show the integration in banker language:

> Secure document source

Technical provider names may appear in advanced detail where useful.

---

# 34. Deal-lifecycle events

Examples:

* Deal created;
* phase changed;
* deal paused;
* deal resumed;
* mandate terminated;
* signing recorded;
* closing authorized;
* legal completion recorded;
* deal archived.

A phase change should show:

* Previous phase;
* new phase;
* user or workflow;
* effective time;
* rationale;
* unresolved work.

---

# 35. Documents & evidence events

Recommended event types:

* Source connected;
* synchronization started;
* synchronization completed;
* document added;
* version changed;
* document reclassified;
* processing completed;
* extraction failed;
* permission revoked;
* document removed;
* evidence reference created;
* source became stale.

## Example

> **Customer_Revenue_2025.xlsx updated**

Previous:

> Version 2

Current:

> Version 3

Downstream:

* 3 Dossier facts;
* 2 findings;
* 1 valuation input.

---

# 36. VDR synchronization event

A synchronization summary should show:

* Source;
* folders inspected;
* documents inspected;
* new documents;
* changed versions;
* removed documents;
* failed items;
* duration;
* downstream changes.

Example:

> **VDR synchronization completed**

> 127 documents inspected · 3 new · 4 changed · 2 failed

Action:

> Open synchronization details

---

# 37. Fact and data events

Examples:

* Fact extracted;
* fact reconciled;
* fact approved;
* fact disputed;
* source changed;
* fact superseded;
* manual correction submitted.

A data-change event should show:

* Field;
* previous value;
* new value;
* unit;
* state;
* source;
* reviewer.

Example:

> **Top-three concentration changed**

> 39,8% → 41,2%

Cause:

> Customer revenue workbook version 3

---

# 38. Diligence events

Examples:

* Finding created;
* severity changed;
* evidence added;
* financial impact calculated;
* review requested;
* finding approved;
* finding rejected;
* finding reopened;
* treatment assigned.

The event should preserve:

* Finding version;
* current and prior state;
* affected evidence;
* reviewer;
* rationale;
* downstream impact.

---

# 39. Valuation events

Examples:

* Input changed;
* normalization adjustment proposed;
* assumption approved;
* comparable removed;
* DCF recalculated;
* scenario created;
* range changed;
* model approved;
* approval invalidated;
* export generated.

Example:

> **Risk-adjusted scenario v4 calculated**

Inputs changed:

* Customer downside: 0,0% → −5,0%;
* WACC: 13,25% → 14,00%.

Output:

> R$ 438 mi–R$ 478 mi

---

# 40. Counterparty events

Examples:

* Candidate added;
* candidate excluded;
* conflict discovered;
* shortlist submitted;
* shortlist approved;
* outreach authorized;
* outreach recorded;
* NDA status changed.

The event should distinguish:

* Organization identity;
* transaction-specific candidate record;
* human decision;
* external communication.

---

# 41. Negotiation events

Examples:

* Proposal received;
* proposal extracted;
* term corrected;
* round created;
* counterproposal drafted;
* counterproposal approved;
* external response sent;
* commercial baseline approved;
* term sheet signed.

Example:

> **Northbridge proposal Round 3 added**

> Enterprise value: R$ 472 mi
> Cash at closing: 85%
> Earn-out: 10%
> Escrow: 5%

State:

> Extracted · Review completed by Felipe Rocha

---

# 42. Closing events

Examples:

* Closing requirement created;
* condition evidence submitted;
* condition satisfied;
* waiver approved;
* document approved for execution;
* signature received;
* funds flow approved;
* payment instructions changed;
* closing authorized;
* completion recorded.

Critical distinctions must remain visible:

* Submitted versus accepted;
* satisfied versus waived;
* authorized versus completed;
* funds sent versus funds received.

---

# 43. Task events

Examples:

* Task created;
* task assigned;
* due date changed;
* task started;
* evidence submitted;
* task completed;
* task reopened;
* task escalated.

The timeline should not show every reminder unless it materially changed escalation state.

---

# 44. Approval events

Approval events should include:

* Approval submitted;
* reviewer assigned;
* decision recorded;
* condition added;
* approval completed;
* approval invalidated;
* approval superseded;
* approver recused.

## Example

> **Valuation treatment approved**

Decision:

> Approved

Scope:

> Customer-concentration treatment · Scenario v4

Authority:

> Financial Review VP

Rationale:

> Current evidence supports the threshold breach and no unresolved double counting remains.

---

# 45. Rejection events

A rejection should preserve:

* Proposed state;
* rejected by;
* rationale;
* affected object version;
* follow-up action;
* whether a revision was requested.

Example:

> **Normalization adjustment rejected**

Adjustment:

> +R$ 2,3 mi management add-back

Reason:

> Supporting evidence does not establish that the expense is non-recurring.

---

# 46. Access events

Examples:

* Participant invited;
* invitation accepted;
* access granted;
* permission changed;
* workstream added;
* restricted document access granted;
* external access extended;
* access suspended;
* access revoked;
* member removed.

Access events should show:

* Subject;
* actor;
* previous scope;
* new scope;
* effective date;
* expiry;
* reason.

---

# 47. Sensitive access-event handling

Some access events may contain restricted information.

Example:

> **External participant access changed**

Visible to authorized users:

* Participant;
* organization;
* workstream;
* affected documents.

Visible to less-authorized users:

> An external-access change occurred.

The timeline itself must obey the current user’s permission model.

---

# 48. Generated-artifact events

Examples:

* Report generation started;
* report prepared;
* report review requested;
* report approved;
* report exported;
* report superseded;
* generation failed.

The event should show:

* Artifact;
* version;
* source snapshot;
* generated by;
* reviewed by;
* destination;
* confidentiality.

---

# 49. Export and download events

Relevant events:

* Audit package exported;
* valuation report downloaded;
* closing binder exported;
* document bundle downloaded;
* external package shared.

Do not record every insignificant browser-generated file operation unless policy requires it.

## Export detail

* Exported object;
* version;
* user;
* scope;
* included records;
* confidentiality;
* recipient or destination, when relevant;
* checksum.

---

# 50. Before-and-after comparison

Every material data or state change should support a comparison view.

Example:

| Field                   |   Before |                After |
| ----------------------- | -------: | -------------------: |
| Top-three concentration |    39,8% |                41,2% |
| Finding state           | Approved |      Review required |
| Valuation assumption    |  Current |                Stale |
| Scenario status         | Approved | Approval invalidated |

The comparison should distinguish:

* Added;
* removed;
* changed;
* unchanged;
* restricted.

---

# 51. Structured diff

Structured objects should use field-level comparison.

Examples:

* Dossier fact;
* assumption;
* finding;
* proposal;
* funds-flow line;
* access permission.

Avoid showing raw JSON as the principal comparison.

Advanced audit detail may provide a structured payload.

---

# 52. Document-version comparison

Document events should support:

* Metadata comparison;
* textual redline;
* spreadsheet cell comparison;
* source-path comparison;
* checksum;
* processing changes;
* downstream dependency comparison.

The audit screen links to Documents & Evidence for the complete comparison.

---

# 53. Decision snapshot

Every approval or rejection should preserve the decision context as it existed when decided.

The snapshot should include:

* Object version;
* evidence references;
* proposed state;
* current state;
* financial or workflow consequence;
* approver authority;
* decision;
* rationale.

Later source changes must not rewrite the historical decision snapshot.

---

# 54. Authority snapshot

A decision event should preserve the authority used at the time.

Example:

> Ana Costa approved as Financial Review VP under Valuation Policy v3.

If the user’s role changes later, the historical event remains valid for the recorded decision context.

---

# 55. Evidence snapshot

Audit history should preserve:

* Document ID;
* document version;
* exact location;
* fact version;
* finding version;
* source state at decision time.

If the source is later removed, the audit record should still resolve to:

* An archived source, where retention permits;
* a metadata record;
* or a clear unavailable state.

---

# 56. Input snapshot

Deterministic executions should preserve the exact inputs used.

Example:

> **Valuation Engine execution**

* Adjusted EBITDA: R$ 57,8 mi;
* selected multiple: 8,4x;
* WACC: 14,00%;
* terminal growth: 4,00%;
* model version: v4.

Output:

> Enterprise value midpoint: R$ 493,3 mi

---

# 57. Calculation trace

Users should be able to inspect:

> Adjusted EBITDA R$ 57,8 mi × 8,4x = R$ 485,5 mi enterprise value

The audit event should additionally preserve:

* Raw decimal values;
* displayed rounded values;
* formula identity;
* calculation-engine version.

This prevents unexplained discrepancies caused by display rounding.

---

# 58. Reproducibility state

Execution records should show:

* Reproducible;
* reproducible with archived inputs;
* source unavailable;
* engine version unavailable;
* external manual step;
* incomplete historical record;
* invalidated.

## Example

> **Reproducible**

> The same input snapshot and Valuation Engine v1.4 produce the recorded result.

---

# 59. Agent mission trace

A mission audit record should include:

* User objective;
* scope;
* context snapshot;
* plan;
* steps;
* agents or capabilities;
* tools;
* outputs;
* corrections;
* limitations;
* approval handoff;
* final state.

It should not include:

* Hidden chain-of-thought;
* private model scratchpads;
* system prompts;
* unrestricted tool credentials.

---

# 60. Event integrity

Every audit event should have an integrity state.

Recommended:

* Verified;
* pending verification;
* imported;
* external attestation;
* incomplete;
* legacy record;
* integrity issue.

## Example

> **Verified**

> Event payload, actor, object version and timestamp are stored in the immutable audit record.

Avoid claiming cryptographic immutability unless it is actually implemented and verified.

---

# 61. Append-only principle

Audit events should be append-only.

Users should not be able to:

* Edit an event;
* change its timestamp;
* replace its actor;
* delete its rationale;
* rewrite before-and-after values.

Corrections create a new event.

Example:

> **Audit annotation corrected**

References:

> Event A-02842

The original event remains intact.

---

# 62. Event correction

When an event contains incorrect descriptive metadata:

1. Create a correction event;
2. identify the original event;
3. explain the corrected field;
4. identify the authorized corrector;
5. preserve both states.

Example:

> **Event annotation corrected**

Previous description:

> Document removed

Corrected description:

> Document moved to restricted folder

The underlying original system event is not rewritten.

---

# 63. Event invalidation

An event itself is not generally invalidated.

The **business state created by the event** may be invalidated.

Example:

> Approval event remains valid historically.

A later event states:

> Approval invalidated because the source version changed.

Both events remain in the timeline.

---

# 64. Supersession

Use supersession for:

* Model versions;
* documents;
* findings;
* approval requests;
* generated artifacts;
* access policies.

Example:

> Scenario v4 superseded scenario v3.

The audit timeline should link both versions.

---

# 65. Historical reconstruction

Users should be able to inspect:

> **Deal state as of 27 July 2026 · 18:00 BRT**

A historical reconstruction may show:

* Deal phase;
* current documents;
* approved facts;
* active findings;
* approved valuation;
* shortlist;
* latest proposals;
* open closing requirements;
* team and access.

The view must be clearly read-only.

---

# 66. Historical reconstruction limitations

A reconstruction should state when it is incomplete.

Example:

> **Partial historical state**

> Complete model snapshots were not retained before Valuation v2.

Do not silently reconstruct missing data from the current state.

---

# 67. Decisions view

The Decisions view should include:

* Approvals;
* conditional approvals;
* rejections;
* waivers;
* recusal;
* review acceptance;
* invalidation;
* supersession.

Recommended columns:

1. Decision;
2. object;
3. outcome;
4. decided by;
5. authority;
6. effective version;
7. decided at;
8. current validity.

---

# 68. Decision validity

Recommended states:

* Current;
* satisfied;
* conditional;
* invalidated;
* superseded;
* expired;
* withdrawn;
* historical.

Example:

> **Approved · Invalidated**

Reason:

> Customer-revenue source changed after approval.

---

# 69. Changes view

The Changes view should focus on data and object differences.

Recommended filters:

* Documents;
* facts;
* findings;
* assumptions;
* scenarios;
* proposals;
* closing requirements;
* permissions.

Recommended columns:

1. Object;
2. changed field;
3. before;
4. after;
5. actor;
6. source;
7. downstream impact;
8. changed at.

---

# 70. Executions view

The Executions view should contain:

* Document processing;
* agent missions;
* deterministic-engine calls;
* external integrations;
* artifact generation.

Recommended columns:

1. Execution;
2. capability;
3. input snapshot;
4. output;
5. state;
6. duration;
7. limitations;
8. started by;
9. completed at.

---

# 71. Execution states

* Queued;
* running;
* awaiting input;
* awaiting approval;
* completed;
* completed with limitations;
* failed;
* cancelled;
* timed out;
* superseded.

A completed calculation must not be confused with an approved business output.

---

# 72. Access view

The Access view should show:

* Participant invitations;
* access grants;
* role changes;
* workstream changes;
* restricted-source access;
* external access expiry;
* suspension;
* revocation;
* access reviews.

Recommended columns:

1. Participant;
2. event;
3. previous access;
4. new access;
5. changed by;
6. effective date;
7. expiry;
8. reason.

---

# 73. Exports view

The Exports view should show:

* Artifact;
* version;
* export type;
* included scope;
* exported by;
* recipient or destination;
* confidentiality;
* checksum;
* timestamp.

Useful categories:

* Internal report;
* client deliverable;
* data export;
* audit package;
* closing binder;
* source package.

---

# 74. Integrity view

The Integrity view is an advanced auditor and administrator surface.

It should show:

* Audit coverage;
* latest event;
* delayed sources;
* event gaps;
* imported legacy records;
* integrity verification;
* retention state;
* export readiness.

It should not expose infrastructure metrics to normal bankers by default.

---

# 75. Selected-event panel

Selecting an event should open a right-side panel containing:

1. Human-readable summary;
2. actor;
3. time;
4. affected object;
5. object version;
6. before and after;
7. evidence or input;
8. authority;
9. downstream consequence;
10. related events;
11. audit metadata;
12. exact destination.

---

# 76. Advanced audit metadata

A collapsible section may include:

* Event ID;
* event type;
* correlation ID;
* causation ID;
* object type;
* object ID;
* object version;
* actor ID;
* policy version;
* payload checksum;
* source system;
* ingestion timestamp;
* verification state.

This detail should remain secondary to banker-readable content.

---

# 77. Correlation and causation IDs

Use:

## Correlation ID

Groups events from one transaction operation.

Example:

> One VDR synchronization.

## Causation ID

References the event that directly triggered another.

Example:

> Document version changed → fact invalidation.

These identifiers support technical reconstruction but should not appear prominently.

---

# 78. Related objects

The selected-event panel should list related objects.

Example:

> **Affected by this event**

* Dossier Fact F-102;
* Diligence Finding DD-018;
* Valuation Assumption A-044;
* Approval AP-027.

Each should open in exact context.

---

# 79. Downstream impact

A material event should indicate what became:

* Updated;
* stale;
* blocked;
* invalidated;
* regenerated;
* reopened;
* superseded.

Example:

> **Downstream impact**

* 3 approved facts marked for review;
* 2 findings reopened;
* scenario v4 invalidated;
* valuation report draft marked stale.

---

# 80. Audit annotations

Authorized users may add an annotation to an event.

Examples:

* Explain external context;
* record an investigation conclusion;
* link an omitted source;
* state why no action was required.

An annotation should be:

* A new immutable object;
* attributed;
* timestamped;
* permission-scoped;
* versioned.

It should not alter the original event.

---

# 81. Event bookmarking

Users may bookmark events for:

* Committee preparation;
* audit export;
* closing review;
* internal investigation.

Bookmarks are personal or team-scoped metadata.

They should not alter the audit record.

---

# 82. Search

Searchable fields:

* Event title;
* actor;
* object;
* source document;
* finding;
* calculation;
* decision rationale;
* event ID;
* artifact;
* access subject.

Placeholder:

> Search deal activity, decisions or event IDs

Examples:

* `customer concentration`
* `Ana Costa`
* `scenario v4`
* `payment instructions`
* `A-02842`

---

# 83. Primary filters

* Event category;
* actor type;
* workstream;
* significance;
* date;
* object type;
* decision outcome;
* execution state.

---

# 84. Advanced filters

* Human actor;
* agent capability;
* engine;
* source integration;
* object version;
* approval validity;
* downstream invalidation;
* access event;
* export;
* failed event;
* legacy record;
* integrity state;
* annotation;
* bookmarked.

---

# 85. Saved views

Recommended:

* Material events;
* decisions;
* document changes;
* valuation history;
* access changes;
* closing-day activity;
* failed executions;
* invalidated approvals;
* exports;
* events involving me.

Saved views preserve:

* Filters;
* grouping;
* columns;
* date range;
* sort.

---

# 86. Timeline grouping options

Support grouping by:

* Date;
* workstream;
* actor;
* correlation;
* object;
* phase.

Default:

> Date

For investigations:

> Correlation or object

---

# 87. Phase markers

The timeline may contain restrained phase markers:

> **Due Diligence began · 12 May 2026**

> **Negotiation began · 22 August 2026**

> **Signing recorded · 3 October 2026**

These improve orientation without turning the timeline into a rigid linear workflow.

---

# 88. Time and time zones

Store timestamps precisely.

Display the deal or user time zone:

> 28 jul. 2026 · 10:18 BRT

Advanced detail may show:

> 2026-07-28T13:18:42.287Z

For external events, preserve:

* Event-reported time;
* system-received time.

---

# 89. Event ordering

Default ordering should use authoritative occurrence time.

Where an integration delivers an event late:

> **Occurred at 09:42 · Received at 10:03**

The event should be placed according to occurrence time with a delayed-delivery marker.

---

# 90. Permissions

Permissions may apply to:

* Event existence;
* title;
* actor;
* object;
* before-and-after values;
* evidence;
* rationale;
* access details;
* technical metadata;
* export.

The audit page must not become a route around normal data restrictions.

---

# 91. Redacted event

Example:

> **Restricted access change**

> An access event occurred in the Legal workstream.

Available:

* Timestamp;
* event category;
* current access consequence.

Restricted:

* Participant identity;
* documents;
* reason.

---

# 92. Side-channel protection

Restricted information must not leak through:

* Event counts;
* filter counts;
* actor filters;
* object names;
* export counts;
* causal graphs;
* before-and-after values;
* search suggestions;
* Copilot;
* correlation group size.

The permission model should be applied before aggregation.

---

# 93. External-participant view

External participants should not receive the complete internal audit timeline.

They may see events such as:

* Their submission;
* their assigned task;
* their approval;
* their access;
* their signed document;
* their external communication.

They should not see:

* Internal findings;
* negotiation strategy;
* internal comments;
* valuation deliberation;
* unrelated participants;
* privileged access decisions.

---

# 94. Auditor mode

An auditor-oriented presentation may emphasize:

* Event integrity;
* exact identifiers;
* versions;
* authority;
* evidence snapshots;
* exports;
* retention.

It should remain read-only.

Auditor mode should not provide broader content access than the auditor’s authorization permits.

---

# 95. Senior-review mode

A Partner or Deal Lead may default to:

* Material decisions;
* valuation movements;
* negotiation terms;
* closing events;
* major document changes.

The underlying events remain identical.

Only presentation and grouping differ.

---

# 96. Contextual Copilot

Suggested prompts:

* What materially changed this week?
* Why was scenario v4 invalidated?
* Show the events that led to the R$ 42 mi valuation movement.
* Who approved the customer-concentration treatment?
* Which source version was used?
* Show every access change this month.
* Which decisions remain current?
* Reconstruct the closing sequence.
* Which agent executions completed with limitations?
* Prepare an audit summary for the investment committee.

## Response requirements

The Copilot should:

* Cite audit events;
* preserve chronology;
* distinguish causation from association;
* distinguish agent, engine and human actions;
* respect redaction;
* avoid exposing private chain-of-thought;
* route to exact events and objects.

---

# 97. Audit export

The primary export should be a controlled **Audit Package**.

Configurable scope:

* Complete deal;
* date range;
* workstream;
* decisions only;
* access only;
* closing period;
* selected events;
* selected bookmarks.

---

# 98. Audit-package contents

Recommended package:

1. Cover and scope;
2. deal identity;
3. export metadata;
4. event chronology;
5. decision register;
6. object-version register;
7. execution register;
8. access-change register;
9. export register;
10. source manifest;
11. integrity manifest;
12. limitations and redactions.

---

# 99. Audit-package metadata

Every package should state:

* Deal;
* institution;
* generated by;
* generated at;
* date range;
* included event types;
* excluded event types;
* permission scope;
* redactions;
* audit freshness;
* package version;
* checksum.

---

# 100. Export authorization

Some exports may require approval when they include:

* Restricted evidence;
* personal information;
* access history;
* privileged legal material;
* full transaction records;
* external recipients.

Exporting should create its own audit event.

---

# 101. Retention

Events should follow the deal’s retention policy.

Possible states:

* Active retention;
* archived retention;
* legal hold;
* deletion scheduled;
* partially retained;
* metadata only.

The page should display:

> **Retention: 7 years after deal archive**

as a configured policy, not a universal legal requirement.

---

# 102. Legal hold

Where a legal hold applies:

* Events remain preserved;
* deletion is blocked;
* relevant exports are controlled;
* hold scope is recorded;
* authorization is restricted.

The timeline may show only:

> **Legal hold active**

Detailed reason may be restricted.

---

# 103. Deal deletion requests

A delete request should not silently remove audit history.

The system must distinguish:

* Deal archive;
* delete request;
* retention expiry;
* legal hold;
* anonymization;
* metadata retention.

The applicable behavior belongs in Deal Settings and Security & Data Governance.

Activity & Audit displays the state and consequences.

---

# 104. Archived deal behavior

For an archived deal:

* Timeline becomes read-only;
* filters and exports remain available;
* historical objects remain accessible where retained;
* annotations may be disabled according to policy;
* event integrity remains visible.

Reopening the deal creates a new event.

---

# 105. Performance and pagination

Large transactions may contain thousands of audit events.

Recommended behavior:

* Virtualized timeline;
* date-range pagination;
* server-side filters;
* progressive detail loading;
* grouped events;
* separate summary counts;
* deep links to event IDs.

Do not load the complete audit payload into the browser at once.

---

# 106. Recommended desktop layout

For a **1440 × 900** canvas:

| Region                  | Approximate width |
| ----------------------- | ----------------: |
| Compact global sidebar  |          72–80 px |
| Deal context navigation |        112–136 px |
| Filter and view rail    |        220–260 px |
| Timeline                |        560–680 px |
| Event detail panel      |        380–460 px |
| Page padding            |          24–32 px |

## Recommended composition

```text
┌────────┬──────────────────────────────────────────────────────────────┐
│ Global │ Project Horizon · Activity & Audit · Current through 10:42 │
│ shell  ├──────────────────────────────────────────────────────────────┤
│        │ Timeline  Decisions  Changes  Executions  Access  Exports   │
│        ├──────────────┬─────────────────────────┬─────────────────────┤
│        │ Filters      │ Activity timeline       │ Selected event      │
│        │              │                         │                     │
│        │ Material  26 │ 10:18                   │ Treatment approved  │
│        │ Decisions 18 │ Valuation treatment     │                     │
│        │ Changes   31 │ approved                │ Ana Costa · VP      │
│        │ Access     3 │ −R$ 42 mi midpoint      │ Scenario v4         │
│        │              │                         │                     │
│        │ Workstream   │ 09:46                   │ 39,8% → 41,2%      │
│        │ Financial    │ Source workbook changed │                     │
│        │ Diligence    │ 3 facts affected        │ Evidence · B12:M14  │
│        │ Valuation    │                         │                     │
│        │              │ 09:42                   │ [ Open decision ]   │
│        │              │ VDR sync completed      │                     │
└────────┴──────────────┴─────────────────────────┴─────────────────────┘
```

---

# 107. Causal-chain layout

```text
┌──────────────────────────────────────────┬───────────────────────────┐
│ Event chain                              │ Decision record           │
│                                          │                           │
│ 09:42 Workbook v3 synchronized           │ Approved                  │
│    ↓                                     │                           │
│ 09:44 Concentration recalculated         │ Ana Costa · VP            │
│    ↓                                     │ 28 jul. · 10:18 BRT       │
│ 09:46 Fact changed 39,8% → 41,2%         │                           │
│    ↓                                     │ Enterprise-value impact   │
│ 09:47 Finding reopened                   │ −R$ 42 mi midpoint        │
│    ↓                                     │                           │
│ 10:02 Scenario v4 calculated             │ Authority snapshot        │
│    ↓                                     │ Valuation Policy v3       │
│ 10:18 Treatment approved                 │                           │
│                                          │ [ Open scenario ]         │
└──────────────────────────────────────────┴───────────────────────────┘
```

---

# 108. Mobile behavior

Recommended order:

1. Audit freshness;
2. search;
3. material events;
4. decisions;
5. timeline;
6. filters;
7. event detail.

Mobile event cards should show:

* Event;
* actor;
* context;
* consequence;
* time;
* primary destination.

Complex diff, causal reconstruction and package configuration remain desktop-first.

---

# 109. UI design direction

## Overall character

Aim for:

> **An institutional transaction ledger combining banker-readable chronology with evidence-grade provenance**

The screen should feel:

* Exact;
* calm;
* chronological;
* immutable;
* evidence-aware;
* investigative;
* permission-conscious.

It should not feel:

* Social;
* conversational;
* noisy;
* futuristic;
* like application telemetry;
* like an administrator terminal.

---

# 110. Visual hierarchy

Prioritize:

1. Material event;
2. actor;
3. object and workstream;
4. before-and-after consequence;
5. time;
6. current validity;
7. evidence and authority;
8. technical metadata.

Do not prioritize:

* Avatar;
* reaction count;
* comment count;
* event ID;
* engine name;
* raw payload.

---

# 111. Color application

Use the M&Ai palette:

* Canvas Cream: `#F3F0EE`
* Lifted Cream: `#FCFBFA`
* Ink Black: `#141413`
* Signal Orange: `#CF4500`
* Light Signal Orange: `#F37338`
* Dust Taupe: `#D1CDC7`
* Slate Gray: `#696969`

## Semantic use

* Human decision: restrained orange marker;
* deterministic calculation: blue-neutral;
* agent activity: purple-neutral;
* document event: gray-blue;
* access event: dark neutral;
* completed: green;
* rejected or failed: red;
* invalidated: red-orange;
* superseded: gray;
* integrity warning: deep red.

Do not create a rainbow timeline where every category has an intense color.

---

# 112. Typography

Use **Sofia Sans**.

| Element              |     Size |  Weight |
| -------------------- | -------: | ------: |
| Page title           | 26–30 px | 500–600 |
| Event title          | 14–16 px | 650–700 |
| Selected-event title | 19–23 px | 600–700 |
| Change value         | 17–22 px | 550–650 |
| Section heading      | 15–17 px | 650–700 |
| Body                 | 13–15 px | 450–500 |
| Metadata             | 11–13 px | 450–550 |
| Status               | 11–12 px | 650–700 |
| Technical ID         | 11–12 px | 500–600 |

Use tabular numerals for:

* Timestamps;
* values;
* versions;
* event IDs;
* durations;
* checksums.

Use pt-BR formatting:

* `R$ 42 mi`
* `41,2%`
* `28 jul. 2026 · 10:18 BRT`

---

# 113. Geometry and density

Recommended:

* Timeline row: 52–88 px;
* date separator: 32–40 px;
* detail panel: flush drawer or 8 px internal radius;
* status tags: compact;
* causal nodes: rectangular, not circular;
* diff table rows: 40–48 px;
* restrained borders and shadows.

Avoid:

* Social-media cards;
* oversized avatars;
* giant timeline dots;
* playful connectors;
* one card per metadata field;
* large empty hero area.

---

# 114. Accessibility requirements

The screen should support:

* Semantic timeline or event list;
* clear chronological order;
* keyboard event navigation;
* visible focus;
* no color-only actor or event type;
* accessible before-and-after tables;
* accessible causal-chain alternative;
* descriptive event links;
* minimum 44 × 44 px controls;
* properly announced filter changes;
* exact timestamps available;
* correct currency and percentage reading;
* accessible redaction states;
* screen-reader distinction among human, agent and engine events;
* focus preservation after opening a destination.

Avoid:

> View

Prefer:

> Open customer-concentration approval in Valuation

---

# 115. System states

## 115.1 No material activity

> **No material transaction activity recorded**

Supporting:

> Document, workflow and decision events will appear as the deal progresses.

## 115.2 Loading

Use stable event skeletons.

## 115.3 Partial audit coverage

> **Some event sources are unavailable**

Available:

* Decisions;
* model executions;
* access changes.

Delayed:

* Document-source events after 10:31 BRT.

## 115.4 Integrity verification pending

> **Recent events awaiting verification**

The events may remain visible with a pending state.

## 115.5 Event detail unavailable

> The event exists, but its detailed payload is unavailable.

Show:

* Event ID;
* timestamp;
* source;
* limitation.

## 115.6 Source document unavailable

Show metadata and retained evidence reference where permitted.

## 115.7 Historical engine unavailable

> The recorded result is preserved, but the original engine version is no longer available for replay.

## 115.8 Restricted event

Redact according to policy.

## 115.9 Delayed external event

Show occurrence and ingestion times.

## 115.10 Archived deal

Read-only timeline.

## 115.11 Export preparation failed

Existing timeline remains usable.

## 115.12 Offline

Allow cached event review where policy permits.

Disable:

* New audit export;
* annotations;
* bookmarks synchronization;
* uncached event detail;
* historical reconstruction.

---

# 116. Figma component architecture

## `DealAuditHeader`

Properties:

* Current;
* delayed;
* partial;
* archived;
* integrity warning;
* restricted.

## `AuditViewTabs`

* Timeline;
* decisions;
* changes;
* executions;
* access;
* exports;
* integrity.

## `AuditCoverage`

Properties:

* Current;
* delayed;
* partial;
* legacy;
* unavailable.

## `AuditFilterRail`

States:

* Default;
* filtered;
* collapsed;
* mobile.

## `AuditTimeline`

States:

* Populated;
* grouped;
* filtered;
* empty;
* loading;
* partial error.

## `AuditDateGroup`

Properties:

* Today;
* yesterday;
* week;
* month;
* historical.

## `AuditEventRow`

Properties:

* Human;
* agent;
* engine;
* document;
* integration;
* decision;
* access;
* export;
* failure;
* invalidated;
* restricted.

## `AuditEventGroup`

Properties:

* Collapsed;
* expanded;
* partial;
* failed;
* mixed actors.

## `AuditActor`

Properties:

* Internal;
* external;
* agent;
* engine;
* integration;
* policy;
* administrator.

## `AuditSignificance`

Properties:

* Material;
* operational;
* administrative;
* technical.

## `AuditEventDetail`

Properties:

* Change;
* decision;
* execution;
* document;
* access;
* export;
* restricted.

## `ChangeComparison`

Properties:

* Field;
* state;
* monetary;
* percentage;
* document;
* permission;
* restricted.

## `CausalChain`

Properties:

* Complete;
* partial;
* inferred;
* restricted;
* circular-error.

## `DecisionRecord`

Properties:

* Approved;
* conditional;
* rejected;
* invalidated;
* superseded;
* recused.

## `ExecutionRecord`

Properties:

* Agent;
* engine;
* document;
* integration;
* complete;
* limited;
* failed.

## `AuditIntegrity`

Properties:

* Verified;
* pending;
* imported;
* incomplete;
* issue.

## `AuditAnnotation`

Properties:

* Internal;
* restricted;
* corrected;
* superseded.

## `AuditExportFlow`

States:

* Scope;
* filters;
* redactions;
* review;
* approval required;
* generating;
* complete;
* failed.

---

# 117. Production object model

## `DealAuditEvent`

```text
id
institutionId
dealId
eventType
eventCategory
significance
actorType
actorId
actorRoleSnapshot
objectType
objectId
objectVersion
operation
summary
occurredAt
recordedAt
correlationId
causationEventId
sourceSystem
integrityState
accessLevel
createdAt
```

## `AuditEventPayload`

```text
id
auditEventId
beforeSnapshot
afterSnapshot
inputSnapshot
outputSnapshot
authoritySnapshot
evidenceReferenceIds
limitationSummary
payloadHash
createdAt
```

## `AuditEventRelation`

```text
id
sourceEventId
targetEventId
relationType
relationshipState
createdAt
```

## `AuditObjectChange`

```text
id
auditEventId
objectType
objectId
objectVersionBefore
objectVersionAfter
fieldPath
valueBefore
valueAfter
changeType
unit
accessLevel
createdAt
```

## `AuditDecisionRecord`

```text
id
auditEventId
approvalRequestId
decisionType
decision
rationale
conditionIds
authorityPolicyId
authorityPolicyVersion
targetObjectType
targetObjectId
targetObjectVersion
validityState
invalidatedByEventId
createdAt
```

## `AuditExecutionRecord`

```text
id
auditEventId
executionType
capabilityType
runtimeVersion
inputSnapshotId
outputObjectType
outputObjectId
outputObjectVersion
status
startedAt
completedAt
durationMs
reproducibilityState
diagnosticReference
createdAt
```

## `AuditAccessRecord`

```text
id
auditEventId
subjectType
subjectId
accessScopeBefore
accessScopeAfter
effectiveAt
expiresAt
reason
authorityReference
createdAt
```

## `AuditExportRecord`

```text
id
auditEventId
exportType
artifactId
artifactVersion
scopeSnapshot
filterSnapshot
redactionSummary
recipientReference
confidentialityLevel
checksum
createdAt
```

## `AuditAnnotation`

```text
id
auditEventId
annotationType
content
accessLevel
createdBy
createdAt
supersededBy
```

## `AuditIntegrityRecord`

```text
id
auditEventId
verificationMethod
payloadHash
previousEventHash
verificationState
verifiedAt
verificationDetails
createdAt
```

## `AuditSourceCheckpoint`

```text
id
dealId
sourceType
sourceId
latestSourceEventAt
latestRecordedEventAt
coverageState
lastVerifiedAt
error
createdAt
updatedAt
```

## `AuditPackage`

```text
id
dealId
version
scope
dateFrom
dateTo
includedCategories
excludedCategories
redactionPolicy
status
requestedBy
approvedBy
generatedAt
artifactId
checksum
createdAt
```

---

# 118. Suggested routes

Primary:

```text
/deals/:dealId/activity
```

Decisions:

```text
/deals/:dealId/activity?view=decisions
```

Changes:

```text
/deals/:dealId/activity?view=changes
```

Executions:

```text
/deals/:dealId/activity?view=executions
```

Access:

```text
/deals/:dealId/activity?view=access
```

Exports:

```text
/deals/:dealId/activity?view=exports
```

Integrity:

```text
/deals/:dealId/activity?view=integrity
```

Selected event:

```text
/deals/:dealId/activity?event=:eventId
```

Causal chain:

```text
/deals/:dealId/activity?event=:eventId&panel=causal-chain
```

Historical state:

```text
/deals/:dealId/activity/snapshot?at=:timestamp
```

Export:

```text
/deals/:dealId/activity/export
```

---

# 119. API direction

Recommended endpoints:

```text
GET    /api/deals/:dealId/audit-events
GET    /api/deals/:dealId/audit-events/:eventId
GET    /api/deals/:dealId/audit-events/:eventId/relations
GET    /api/deals/:dealId/audit-events/:eventId/changes
GET    /api/deals/:dealId/audit-decisions
GET    /api/deals/:dealId/audit-executions
GET    /api/deals/:dealId/audit-access
GET    /api/deals/:dealId/audit-coverage
GET    /api/deals/:dealId/audit-snapshot
POST   /api/deals/:dealId/audit-annotations
POST   /api/deals/:dealId/audit-packages
GET    /api/deals/:dealId/audit-packages/:packageId
```

Event writes should occur through domain services, not directly from the browser.

The audit service should support:

* Append-only creation;
* idempotency;
* actor and authority snapshotting;
* object-version references;
* correlation and causation;
* permission-safe reads;
* integrity metadata;
* export audit.

---

# 120. Repository direction

The repository currently contains two relevant foundations:

* `phase_history`, which records transaction-phase progression;
* `flow_checkpoints`, which records workflow recovery state.

These are useful but insufficient for the final Activity & Audit product.

The governed data architecture explicitly describes `phase_history` as operational phase progression and states that it should remain distinct from other memory and persistence concerns. It should not be treated as a complete universal audit log. The current runtime also uses an in-process event bus whose history is not evidence of durable cross-process audit storage.

## Keep

* Phase-history records;
* flow checkpoint correlation;
* stable deal identity;
* transaction timestamps;
* structured JSON payload support;
* agent-run events;
* chat-stream event IDs;
* version-aware domain writes;
* existing audit-oriented backlog direction.

## Reframe

### `phase_history`

Use only for:

* Phase progression;
* phase status;
* phase comments;
* phase operational data.

Do not overload it with:

* Document changes;
* approvals;
* valuation inputs;
* access changes;
* exports;
* agent execution.

### Local event-bus history

Treat it as:

* Runtime delivery history;
* testing utility;
* migration seam.

Do not present it as:

> Durable audit trail

### Agent event streams

Stream events support user experience.

They are not automatically immutable audit records.

A separate persisted audit event should be created for material actions.

## Add

* Canonical audit-event store;
* actor and authority snapshots;
* object-version linkage;
* structured before-and-after values;
* decision records;
* engine execution records;
* document-source checkpoints;
* access-event records;
* export records;
* correlation and causation;
* integrity state;
* audit annotations;
* audit packages;
* historical reconstruction.

## Persistence requirement

Unlike the current in-memory MVP route store, the production audit domain must be durable.

An API restart must not erase:

* Decisions;
* model execution provenance;
* access history;
* document event history;
* export history.

---

# 121. What not to include

Avoid:

* A social activity feed;
* every UI interaction;
* page-view tracking in the banker timeline;
* hidden chain-of-thought;
* raw system prompts;
* full raw JSON as the default;
* editable audit events;
* deletable decisions;
* source changes rewriting historical snapshots;
* engine completion treated as approval;
* agent proposal treated as human judgment;
* notification-read events dominating the timeline;
* unrestricted access-event details;
* cross-deal events;
* technical event IDs as primary labels;
* universal claims of cryptographic immutability before implementation;
* in-memory history presented as durable;
* employee-monitoring metrics;
* real client data in mocked fixtures.

---

# 122. MOCKED — Product and demo specification

## Purpose

The mocked Deal Activity & Audit screen should demonstrate that M&Ai can reconstruct the chain from source evidence to transaction decision.

Its pitch narrative is:

> **Every material conclusion in M&Ai preserves the source, calculation, human authority and transaction consequence that produced it.**

This screen has moderate pitch value.

It is useful for:

* Enterprise diligence;
* risk and governance discussions;
* security review;
* explaining the decision-grade layer;
* demonstrating provenance after the Diligence or Valuation screen.

It should not replace the Diligence Decision Room as the primary product image.

The architecture classifies Activity & Audit as a POC expansion rather than a core MVP hero, but it is strategically important for making the product’s audit claims defensible. 

---

# 123. Mocked shell state

Institution:

> **Atlas M&A Advisory**

User:

> **Ana Costa · Vice President**

Deal:

> **Project Horizon**
> Atlas Industrial · Sell-side
> Due Diligence · Restricted workspace

Breadcrumb:

> Deals / Project Horizon / Activity & Audit

Deal navigation:

* Overview;
* Dossier;
* Documents;
* Diligence;
* Valuation;
* Buyer Universe;
* Negotiation;
* Closing;
* **More / Activity & Audit**.

---

# 124. Mocked page header

Title:

> **Deal Activity & Audit**

Description:

> Material actions, decisions and execution history for Project Horizon.

Summary:

* **342 material events**
* **18 decisions**
* **7 model versions**
* **3 access changes**
* **Current through 10:42 BRT**

Primary action:

> **Export audit package**

---

# 125. Mocked timeline

## 10:18 — Human decision

> **Customer-concentration treatment approved**

Actor:

> Ana Costa · Vice President

Object:

> Valuation · Scenario v4

Impact:

> Enterprise-value midpoint decreased by R$ 42 mi.

---

## 10:02 — Deterministic calculation

> **Risk-adjusted scenario v4 calculated**

Actor:

> Valuation Engine v1.4

Output:

> R$ 438 mi–R$ 478 mi

State:

> Complete · Human review required

---

## 09:47 — Workflow change

> **Customer-concentration finding reopened**

Cause:

> Approved concentration fact changed.

Previous:

> Approved

Current:

> Review required

---

## 09:46 — Fact change

> **Top-three customer concentration changed**

Previous:

> 39,8%

Current:

> 41,2%

Source:

> `Customer_Revenue_2025.xlsx` · Version 3

---

## 09:42 — Document event

> **VDR synchronization completed**

Result:

* 127 documents inspected;
* 3 new;
* 4 changed;
* 2 failed.

---

# 126. Mocked selected event

Title:

> **Customer-concentration treatment approved**

Actor:

> Ana Costa · Vice President

Time:

> 28 jul. 2026 · 10:18:42 BRT

Decision:

> Approve

Scope:

> Valuation treatment · Scenario v4

Authority:

> Financial Review VP · Valuation Policy v3

Evidence:

* Customer revenue workbook v3;
* approved concentration fact v6;
* high-severity finding v3.

Impact:

> Approved valuation: R$ 480 mi–R$ 520 mi
> Proposed risk-adjusted: R$ 438 mi–R$ 478 mi
> Midpoint movement: −R$ 42 mi

Primary action:

> **Open decision in Valuation**

---

# 127. Mocked causal chain

```text
09:42 · Workbook v3 synchronized
  ↓
09:44 · Concentration recalculated
  ↓
09:46 · Fact changed 39,8% → 41,2%
  ↓
09:47 · Finding reopened
  ↓
10:02 · Scenario v4 calculated
  ↓
10:18 · Treatment approved
```

Supporting states:

* 1 human action;
* 1 deterministic calculation;
* 1 document-source event;
* 3 workflow and data events.

---

# 128. Mocked access event

> **External counsel access extended**

Participant:

> Camila Nunes · Lume Legal Advisors

Previous expiry:

> 31 July 2026

New expiry:

> 30 September 2026

Scope:

> Legal workstream only

Approved by:

> Marina Alves

Reason:

> Closing support required

---

# 129. Mocked export event

> **Diligence committee package exported**

Artifact:

> Diligence Committee Brief · v3

Exported by:

> Felipe Rocha

Time:

> 27 jul. 2026 · 17:34 BRT

Scope:

> Approved findings and valuation reference

Confidentiality:

> Internal restricted

Checksum:

> Available in advanced detail

---

# 130. Recommended static composition

```text
┌──────────────────────────────────────────────────────────────────┐
│ Deal Activity & Audit · Current through 10:42 BRT               │
├───────────────────────────────┬──────────────────────────────────┤
│ Transaction history           │ Selected decision                │
│                               │                                  │
│ 10:18 Treatment approved      │ Ana Costa · Vice President      │
│ −R$ 42 mi midpoint            │                                  │
│                               │ 39,8% → 41,2%                   │
│ 10:02 Scenario v4 calculated  │                                  │
│ R$ 438 mi–R$ 478 mi          │ Valuation impact                 │
│                               │ −R$ 42 mi midpoint              │
│ 09:46 Concentration changed   │                                  │
│ 39,8% → 41,2%                │ Evidence                         │
│                               │ Revenue workbook · v3            │
│ 09:42 VDR sync completed      │ B12:M14                          │
│ 3 new · 4 changed             │                                  │
│                               │ [ Open decision ]                │
└───────────────────────────────┴──────────────────────────────────┘
```

This communicates:

* Chronology;
* evidence;
* deterministic calculation;
* human authority;
* transaction consequence.

---

# 131. Pitch-specific simplification

## Keep visible

* Deal Activity & Audit;
* current-through timestamp;
* workbook synchronization;
* 39,8% → 41,2%;
* scenario v4;
* R$ 438 mi–R$ 478 mi;
* −R$ 42 mi;
* Ana Costa;
* approved;
* exact evidence cells.

## Hide

* Complete filters;
* technical event IDs;
* raw hashes;
* all event categories;
* retention;
* access details;
* export configuration;
* annotations;
* integrity diagnostics.

## Readability requirement

At deck scale, these should remain readable:

* **Activity & Audit**
* **39,8% → 41,2%**
* **R$ 438 mi–R$ 478 mi**
* **−R$ 42 mi**
* **Approved by Ana Costa**
* **Revenue workbook v3**
* **B12:M14**

---

# 132. Recommended demo flows

## Flow A — Source to decision

```text
Activity & Audit
  ↓
Open workbook synchronization
  ↓
Follow causal chain
  ↓
Inspect changed fact
  ↓
Open valuation calculation
  ↓
Open human decision
```

## Flow B — Before-and-after value

```text
Changes
  ↓
Top-three concentration
  ↓
39,8% → 41,2%
  ↓
Open exact spreadsheet cells
  ↓
Return to audit event
```

## Flow C — Decision validity

```text
Decisions
  ↓
Scenario v3 approval
  ↓
State: Invalidated
  ↓
Reason: Source changed
  ↓
Open superseding scenario v4 decision
```

## Flow D — Engine reproduction

```text
Executions
  ↓
Valuation Engine v1.4
  ↓
Inspect input snapshot
  ↓
Open formula trace
  ↓
Confirm reproducibility state
```

## Flow E — Access investigation

```text
Access
  ↓
External counsel extension
  ↓
Compare previous and current scope
  ↓
Open Deal Team & Access
```

## Flow F — Closing reconstruction

```text
Filter: Closing day
  ↓
Closing authorization
  ↓
Signatures released
  ↓
Funds transmitted
  ↓
Receipt confirmed
  ↓
Ownership documents released
  ↓
Completion recorded
```

## Flow G — Audit export

```text
Export audit package
  ↓
Select decisions and valuation events
  ↓
Review redactions
  ↓
Generate package
  ↓
Export event recorded
```

---

# 133. UX prototype tasks to validate

Test whether users can:

1. Find the latest material event.
2. Identify who approved a valuation treatment.
3. Distinguish a human decision from an engine execution.
4. Find the source event that initiated a causal chain.
5. compare a value before and after.
6. identify the exact object version used.
7. determine whether a decision remains valid.
8. find why an approval was invalidated.
9. open the superseding approval.
10. inspect the evidence snapshot.
11. inspect the authority snapshot.
12. find every access change.
13. identify external-counsel access expiry.
14. reconstruct one VDR synchronization.
15. find every failed execution.
16. determine whether a calculation is reproducible.
17. open the complete Agentic mission trace.
18. find the export history.
19. annotate an event without editing it.
20. reconstruct deal state at a prior date.
21. export a scoped audit package.
22. identify redacted information.
23. distinguish delayed events from events that occurred late.
24. return to the same timeline position after opening an object.

## Measures

Record:

* Time to reconstruct the source-to-decision chain;
* whether actors are correctly distinguished;
* whether users confuse execution with approval;
* whether event grouping reduces noise;
* whether before-and-after values are clear;
* whether audit metadata overwhelms bankers;
* whether auditors can locate exact versions;
* whether restricted information leaks;
* whether users expect the ability to edit history;
* whether the page feels like a social feed or technical log.

---

# 134. Design validation criteria

Deal Activity & Audit is ready when:

1. The screen remains deal-scoped.
2. Activity and audit detail are distinguishable.
3. Human, agent, engine and integration actors are distinct.
4. Material events appear before low-level technical events.
5. The page does not become a social activity feed.
6. Every event has an authoritative timestamp.
7. Every material event identifies its object and version.
8. Data changes support before-and-after comparison.
9. Decision events preserve evidence and authority snapshots.
10. Historical decisions are not rewritten after source changes.
11. Invalidations create new events.
12. Superseded objects remain historically resolvable.
13. Deterministic executions preserve input snapshots.
14. Calculation records expose reproducibility.
15. Agent records expose work trace without private reasoning.
16. Related events can be correlated.
17. Causal relationships distinguish direct triggers from inference.
18. Document events link to exact versions.
19. Access events remain permission-aware.
20. Restricted information does not leak through event counts.
21. External participants cannot see internal audit history.
22. Audit events are append-only.
23. Corrections create annotations or new events.
24. Exports create audit events.
25. Audit packages declare scope and redactions.
26. Audit freshness is visible.
27. Partial coverage is stated honestly.
28. Runtime event history is not presented as durable audit storage.
29. Phase history remains distinct from the universal audit domain.
30. Archived deals retain read-only history.
31. Historical reconstruction states limitations.
32. Search supports event ID and business terminology.
33. Mobile supports investigation and exact-context navigation.
34. The screen remains useful without Copilot.
35. The pitch mock remains fictional.
36. The static composition remains readable.
37. Every material event has a valid destination.
38. The page makes M&Ai’s auditability defensible rather than decorative.

---

# 135. Final design target

The correct design target is not:

> “A timeline showing everything users and AI did.”

It is:

> **An immutable, permission-aware transaction ledger where every material change can be traced from its actor and source through its calculation, authority, version and downstream consequence.**

Its defining interaction is:

> **Find the event → identify the actor and object version → compare the change → inspect evidence and authority → follow the causal chain → open the authoritative transaction context**

**Next iteration: Deal Team & Access.**
