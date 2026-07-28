---
canonical_name: "Closing Control Room"
definition_id: "BD-12"
definition_status: "Governed for MAI-90"
screen_family: "deal-execution"
owning_task: "MAI-92"
canonical_routes:
  - "/deals/:dealId/closing"
figma_file_key: "otMJE31OKIxdXogV4RNbGQ"
figma_status: "Planned in MAI-92"
figma_area: "MAI Banker Workspace — Design System & Product UI / 06 Application Shell"
figma_nodes: []
related_definitions:
  - "design/26_Cross_Screen_Interaction_Map.md"
  - "design/27_Shared_State_Model.md"
  - "design/0_Implementaion_Roadmap.md"
last_reviewed_task: "MAI-90"
implementation_capability_boundary: "Product definition only; no frontend, backend, Storybook, token export, or runtime behavior implemented by this file."
mock_demo_data_boundary: "Use fictional/demo transaction data only; do not encode real client, counterparty, credential, or confidential deal data."
---
# Closing Control Room

## 1. Recommended product naming

Use:

* **Deal navigation:** `Closing`
* **Page title:** `Closing Control Room`
* **Primary operational artifact:** `Closing Checklist`
* **Final authorization:** `Closing Readiness Approval`
* **Historical package:** `Closing Record`
* **Post-completion area:** `Post-Closing Obligations`

“Closing Control Room” is the correct banker-facing name because this is not a legal-document folder or a celebratory completion page. It is the controlled execution workspace where conditions, documents, signatures, funds and approvals must converge before ownership and consideration can be exchanged.

The product architecture already defines the screen around the closing checklist, conditions precedent, responsible parties, completion evidence, contingencies, signatures, funds-flow readiness, blockers and a final approval gate. It should communicate control and accountability rather than imply completion prematurely. 

---

# 2. Screen definition

The **Closing Control Room** is the deal-level workspace used to prepare, authorize, execute and evidence legal completion of the transaction.

It converts the approved commercial position from Negotiation into a controlled closing plan containing:

* Conditions precedent;
* Closing deliverables;
* Responsible parties;
* Dependencies;
* Required evidence;
* Definitive documents;
* Signature packages;
* Funds-flow instructions;
* Ownership-transfer actions;
* Internal and external approvals;
* Closing-day sequencing;
* Post-closing obligations;
* Final audit record.

It should answer:

1. **What must happen before the transaction may close?**
2. **Which conditions remain open, satisfied, waived or disputed?**
3. **Which documents must be finalized and signed?**
4. **Which party owns each deliverable?**
5. **Which evidence proves completion?**
6. **What blocks signing or closing?**
7. **Are funds, payment instructions and settlement mechanics ready?**
8. **Who has authorized completion?**
9. **Which commercial terms changed between the approved term sheet and definitive documents?**
10. **What must continue after closing?**

Its central operating sequence is:

> **Agreed terms → Closing requirements → Evidence and documents → Signatures and funds → Human authorization → Completion record**

---

# 3. Primary intention

## Operational intention

Give the deal team one reliable workspace for coordinating every dependency required to reach legal and financial completion.

Closing work commonly becomes fragmented across:

* Counsel checklists;
* Banker spreadsheets;
* Email threads;
* signature platforms;
* bank instructions;
* document folders;
* regulatory correspondence;
* internal approval messages;
* completion calls;
* manually assembled closing binders.

The screen should replace this fragmented coordination layer without pretending to replace legal counsel, banks, signature platforms or official registries.

## User intention

A banker should be able to say:

> “I know exactly what remains open, who owns it, what evidence is required, whether funds and signatures are ready and whether the transaction is authorized to close.”

## Product intention

The Closing Control Room should make the Deal Workflow Orchestrator visible at the most consequential point in the transaction.

The deck describes that orchestrator as assigning tasks, monitoring exceptions and routing material outputs for human approval. Closing is where those capabilities must operate with the strictest control. 

---

# 4. Strategic product role

The Closing Control Room demonstrates that M&Ai supports transaction execution beyond analysis.

The lifecycle connection should be explicit:

```text
Diligence
  ↓
Material risks and protections
  ↓
Valuation
  ↓
Approved economic range
  ↓
Negotiation
  ↓
Agreed commercial baseline
  ↓
Closing
  ↓
Documents, signatures, funds and completion
```

This screen is strong pitch evidence for **workflow orchestration** because it visibly combines:

* Cross-party responsibilities;
* Deadline monitoring;
* Document version control;
* Exception detection;
* Approval gates;
* Evidence of completion;
* Auditability.

It should not compete with the Diligence Decision Room as the primary hero. Its role is to prove that M&Ai carries the transaction through execution rather than stopping at analysis.

---

# 5. What the Closing Control Room is not

The screen should not become:

* A celebratory “deal closed” page;
* A generic project-management board;
* A legal-advice engine;
* A document folder;
* A complete contract editor;
* A signature platform replacement;
* A banking or payment platform;
* A regulatory filing system;
* A static checklist spreadsheet;
* A collection of green completion percentages;
* An autonomous closing agent;
* A legal opinion generator;
* An uncontrolled closing-binder generator;
* A generic calendar;
* A social activity feed.

The central question is not:

> “How many checklist items are complete?”

It is:

> **“Is the transaction legally, operationally and financially ready to complete—and what evidence supports that conclusion?”**

---

# 6. Advisory and legal boundary

M&Ai may:

* Build the closing checklist;
* Extract conditions and deliverables from approved documents;
* Assign owners;
* monitor dates;
* link supporting evidence;
* compare commercial terms with definitive drafts;
* identify missing signatures;
* calculate funds-flow totals;
* detect inconsistent payment instructions;
* surface blockers;
* prepare completion summaries;
* route closing-readiness approval;
* preserve the closing record.

M&Ai should not:

* Determine legal sufficiency independently;
* waive a condition;
* bind a party;
* release funds;
* sign documents;
* file with authorities;
* confirm ownership transfer without evidence;
* declare legal completion without authorized human confirmation;
* replace external counsel;
* treat a generated document as executed;
* infer that silence constitutes consent.

The product language should use:

> **Counsel review required**

rather than:

> Legally valid

unless an authorized legal reviewer has explicitly recorded that conclusion.

---

# 7. Relationship to adjacent screens

| Screen                      | Primary responsibility                                       |
| --------------------------- | ------------------------------------------------------------ |
| **Negotiation Room**        | Establishes the approved commercial baseline                 |
| **Closing Control Room**    | Executes the agreed transaction requirements                 |
| **Documents & Evidence**    | Preserves source documents and exact evidence                |
| **Diligence Decision Room** | Supplies risks, contingencies and required protections       |
| **Valuation Lab**           | Supplies approved value and EV-to-equity inputs              |
| **Tasks & Approvals**       | Routes work and final authorization                          |
| **Deal Team & Access**      | Defines responsibilities, authority and restrictions         |
| **Deliverables & Exports**  | Preserves generated checklists, reports and closing packages |
| **Activity & Audit**        | Records every material action and decision                   |
| **Deal Overview**           | Summarizes closing readiness and principal blockers          |

## Closing versus Negotiation

Negotiation establishes:

* Agreed price;
* consideration;
* escrow;
* earn-out;
* conditions;
* exclusivity;
* timetable;
* governance;
* risk protections.

Closing verifies:

* Those terms are reflected in definitive documents;
* required conditions are satisfied or validly waived;
* documents are executable;
* signatures are complete;
* funds and transfer mechanics are ready;
* completion is authorized.

## Closing versus Documents

Documents & Evidence answers:

> Which document exists, which version is current and where is the evidence?

Closing answers:

> Is this the required document, is it executable, who must sign it and does it satisfy the relevant closing requirement?

## Closing versus Deliverables

Closing manages active execution.

Deliverables & Exports stores:

* Final closing checklist;
* signed-document index;
* closing memorandum;
* completion certificate;
* audit package;
* closing binder.

---

# 8. Transaction-closing modes

The screen should support different transaction structures.

## 8.1 Simultaneous signing and closing

Signing and legal completion occur as one coordinated event.

Primary focus:

* Final documents;
* signatures;
* payment;
* ownership transfer;
* immediate evidence;
* final authorization.

## 8.2 Deferred closing

Signing occurs before completion.

The screen must manage the interim period between:

* Signing;
* satisfaction or waiver of conditions;
* closing authorization;
* financial settlement;
* ownership transfer.

Primary focus:

* Conditions precedent;
* interim covenants;
* long-stop date;
* bring-down confirmation;
* updated evidence;
* regulatory and third-party approvals.

## 8.3 Staged or multi-step closing

Different entities, jurisdictions, assets or payments complete at different times.

The system should support:

* Multiple closing events;
* partial completion;
* sequential transfers;
* holdbacks;
* deferred jurisdictions;
* post-closing registrations.

## 8.4 Signing-only workspace

A deal may first need to complete signing before a later closing phase is activated.

## 8.5 Post-closing administration

The legal completion has occurred, but obligations remain.

Examples:

* Registrations;
* post-closing filings;
* purchase-price adjustment;
* escrow administration;
* earn-out monitoring;
* transition services;
* release of security;
* delivery of final records.

---

# 9. Primary users

## 9.1 Analyst

Needs to:

* Maintain checklist items;
* collect evidence;
* update document status;
* coordinate signatures;
* verify amounts;
* prepare the closing agenda;
* reconcile the closing record.

## 9.2 Associate

Needs to:

* Monitor dependencies;
* challenge completion evidence;
* coordinate counsel and client;
* identify blockers;
* verify funds-flow inputs;
* prepare approval materials.

## 9.3 Vice President

Needs to:

* Review critical conditions;
* monitor closing readiness;
* approve operational completion steps;
* coordinate escalation;
* verify that commercial terms remain intact.

## 9.4 Managing Director or Partner

Needs:

* Concise readiness state;
* material blockers;
* client authorization;
* final consideration;
* execution risk;
* completion timing;
* approval authority.

## 9.5 Legal counsel

Needs to:

* Own legal deliverables;
* review definitive documents;
* confirm conditions;
* validate signatures;
* review waivers;
* certify document completion;
* identify legal blockers.

## 9.6 Finance or funds-flow specialist

Needs to:

* Reconcile payment amounts;
* confirm bank instructions;
* verify sources and uses;
* coordinate escrow;
* record settlement evidence.

## 9.7 Client principal

May need to:

* Approve closing;
* confirm designated signatories;
* approve waivers;
* validate payment instructions;
* confirm receipt of proceeds;
* review selected blockers.

## 9.8 External counterparty

May receive restricted access to:

* Assigned deliverables;
* signature requests;
* document submissions;
* payment confirmation requests;
* condition evidence.

They should not see:

* Internal legal commentary;
* internal walk-away decisions;
* other parties’ bank details;
* privileged notes;
* internal risk assessments.

---

# 10. Primary job to be done

> When the transaction reaches signing and completion, coordinate every legal, operational and financial dependency through one evidence-backed workflow so the authorized team can determine whether the deal is ready to close.

## Secondary jobs

The user should also be able to:

* Import the approved negotiation baseline;
* create a closing checklist;
* assign counsel and counterparties;
* monitor conditions precedent;
* record satisfaction or waiver;
* compare definitive documents with agreed terms;
* create signature packages;
* verify signatory authority;
* reconcile funds flow;
* identify closing blockers;
* run a closing-readiness review;
* coordinate closing-day sequence;
* record completion;
* generate a closing memorandum;
* manage post-closing obligations;
* archive the final closing record.

---

# 11. Core conceptual model

The screen should separate seven layers.

## Layer 1 — Commercial baseline

The approved deal terms transferred from Negotiation.

## Layer 2 — Closing requirement

The condition, document, approval, payment or action that must occur.

## Layer 3 — Responsibility

The party and person accountable for completing it.

## Layer 4 — Evidence

The document, signature, confirmation, filing or payment proving completion.

## Layer 5 — Dependency

What the item blocks or depends on.

## Layer 6 — Human determination

Whether the requirement is accepted as satisfied, waived or unresolved.

## Layer 7 — Completion record

The immutable history of what happened and who authorized it.

---

# 12. Closing lifecycle

The workspace should have a transaction-level lifecycle.

## Setup

Closing requirements are being assembled.

## Preparing signing

Definitive documents and signing approvals are in progress.

## Signing ready

Signing requirements are complete and approved.

## Signed

Binding documents have been executed, but completion remains outstanding.

## Gap period

Conditions, covenants and completion preparations remain active.

## Preparing closing

Conditions and deliverables are being finalized.

## Closing review

The final closing-readiness gate is active.

## Authorized to close

Required authorities have approved completion.

## Closing in progress

Signatures, payments and transfers are actively being exchanged.

## Closed pending evidence

Parties report completion, but final evidence remains incomplete.

## Closed

Completion has been authorized and evidenced.

## Post-closing

Remaining obligations are being monitored.

## Completed

Required post-closing obligations are resolved or transferred.

## Aborted

The transaction did not complete.

## Archived

The closing record is read-only.

---

# 13. Recommended workspace structure

The Closing Control Room should contain eight principal subviews:

1. **Overview**
2. **Checklist**
3. **Conditions**
4. **Documents & Signatures**
5. **Funds Flow**
6. **Closing Agenda**
7. **Approvals**
8. **Post-Closing**

Supporting view:

9. **History**

## Overview

Current readiness, blockers and upcoming completion event.

## Checklist

Canonical registry of all requirements.

## Conditions

Conditions precedent, waivers and interim obligations.

## Documents & Signatures

Definitive documents, parties, versions and execution.

## Funds Flow

Price, deductions, payment instructions and settlement evidence.

## Closing Agenda

Sequenced closing-day steps and dependencies.

## Approvals

Signing, waiver and final closing authorization.

## Post-Closing

Continuing obligations after legal completion.

## History

Complete version and event record.

---

# 14. Page header

## Recommended title

> **Closing Control Room**

Supporting description:

> Coordinate conditions, documents, signatures, funds and final approval for Project Horizon.

## Header status

Example:

* **21 of 24 closing requirements accepted**
* **2 blockers**
* **1 item awaiting external evidence**
* **Closing review scheduled for 14 October**

## Primary action

Adapt to current state:

* **Build closing checklist**
* **Review blockers**
* **Approve signing readiness**
* **Start closing review**
* **Authorize closing**
* **Record completion**
* **Review post-closing obligations**

## Secondary actions

* Generate closing brief;
* export checklist;
* add requirement;
* more actions.

---

# 15. Closing-readiness summary

## Purpose

Provide a concise, explainable statement of whether the transaction is ready to proceed.

## Recommended dimensions

1. Conditions precedent;
2. Definitive documents;
3. Signatures;
4. Funds flow;
5. Corporate approvals;
6. Regulatory and third-party approvals;
7. Deliverables;
8. Final human approval.

## Example

> **Closing readiness: Blocked**

Reasons:

* Municipal tax certificate remains expired;
* one shareholder signature is missing;
* buyer payment instructions require verification.

## Summary counts

| Area       | Ready | Open | Blocked |
| ---------- | ----: | ---: | ------: |
| Conditions |     8 |    1 |       1 |
| Documents  |    12 |    2 |       0 |
| Signatures |    18 |    1 |       0 |
| Funds flow |     7 |    1 |       1 |
| Approvals  |     4 |    1 |       0 |

## UX rule

Do not compress readiness into one unexplained percentage.

A percentage may appear secondarily, but the user must see the exact blockers and their consequences.

---

# 16. Signing readiness versus closing readiness

These are distinct states.

## Signing readiness

Confirms that:

* Documents are agreed;
* execution versions are identified;
* signatories are authorized;
* signature packages are ready;
* signing approval is complete.

## Closing readiness

Confirms that:

* Conditions are satisfied or approved for waiver;
* completion documents are executable;
* funds flow is verified;
* transfer steps are ready;
* closing authority is complete.

A transaction may be:

> **Signed but not ready to close**

The screen must make this distinction unmistakable.

---

# 17. Closing checklist architecture

The checklist is the canonical operational record.

It should not be a free-form list of checkboxes.

Each item should contain:

* Item title;
* requirement category;
* legal or commercial basis;
* responsible party;
* individual owner;
* due date;
* dependency;
* evidence requirement;
* current evidence;
* review authority;
* state;
* last change;
* completion history.

## Example

> **Current municipal tax-clearance certificate**

Category:

> Condition precedent · Tax

Responsible party:

> Seller

Owner:

> Daniel Ribeiro

Due:

> 10 October 2026

Evidence required:

> Current certificate or approved waiver

Dependency:

> Blocks closing authorization

State:

> **Blocked · Submitted certificate expired**

---

# 18. Checklist item lifecycle

Recommended states:

* Not started;
* drafting;
* requested;
* submitted;
* under review;
* clarification required;
* conditionally accepted;
* accepted;
* satisfied;
* waived;
* rejected;
* overdue;
* blocked;
* not applicable;
* superseded;
* post-closing;
* restricted.

## Important distinction

### Submitted

Evidence has been provided.

### Accepted

The responsible reviewer considers the evidence adequate.

### Satisfied

The condition or requirement is formally recorded as complete.

The system should not automatically mark an item satisfied merely because a file was uploaded.

---

# 19. Checklist item anatomy

Each row should answer:

1. What is required?
2. Who must deliver it?
3. Who reviews it?
4. When is it due?
5. What evidence exists?
6. What does it block?
7. What is the next action?

## Recommended row

> **Bring-down confirmation**

Seller · Legal
Due 14 October · 09:00
Evidence submitted · Counsel review pending
Blocks closing authorization

Action:

> Review certificate

---

# 20. Checklist categories

Recommended categories:

* Commercial baseline;
* conditions precedent;
* corporate approvals;
* regulatory approvals;
* third-party consents;
* definitive documents;
* ancillary documents;
* signatures;
* financing;
* funds flow;
* ownership transfer;
* employee and management actions;
* escrow;
* insurance;
* filings and registrations;
* tax;
* post-closing obligations;
* internal approvals.

The exact taxonomy should be configurable by:

* Transaction type;
* jurisdiction;
* deal side;
* industry;
* institution playbook;
* counsel input.

---

# 21. Checklist templates

Templates may include:

* Sell-side share acquisition;
* buy-side share acquisition;
* asset acquisition;
* minority investment;
* merger;
* carve-out;
* cross-border transaction;
* simultaneous signing and closing;
* deferred closing;
* institution custom.

## Template behavior

A template may propose:

* Requirements;
* default owners;
* evidence expectations;
* dependencies;
* approval policies;
* expected documents.

It should never be treated as legal advice or as a substitute for counsel’s transaction-specific checklist.

---

# 22. Conditions precedent

## Purpose

Track every requirement that must be satisfied or validly waived before completion.

## Recommended fields

* Condition;
* category;
* obligor;
* beneficiary;
* source clause;
* evidence requirement;
* due date;
* long-stop date relationship;
* waiver authority;
* satisfaction reviewer;
* state;
* dependencies.

## Example

> **Third-party consent for change of control**

Obligor:

> Seller

Beneficiary:

> Buyer

Source:

> Definitive agreement · Clause 6.3

Evidence:

> Executed consent from the named customer

State:

> **Submitted · Buyer counsel review**

---

# 23. Condition-state model

* Draft;
* active;
* evidence requested;
* evidence submitted;
* partially satisfied;
* satisfied;
* waiver proposed;
* waived;
* disputed;
* failed;
* expired;
* converted to post-closing obligation;
* not applicable;
* restricted.

## UX principle

A waiver is not equivalent to satisfaction.

The interface must preserve:

* Who proposed it;
* who had authority;
* rationale;
* affected risk;
* approval;
* source document.

---

# 24. Condition detail panel

Selecting a condition should show:

### Requirement

* Normalized description;
* original clause;
* obligor;
* beneficiary.

### Evidence

* Documents;
* exact pages or clauses;
* external confirmation;
* reviewer comments.

### Dependencies

* Signing;
* closing approval;
* funds release;
* ownership transfer;
* other conditions.

### Decision

* Satisfied;
* waive;
* reject evidence;
* request clarification;
* convert to post-closing;
* escalate.

### History

* Prior evidence;
* prior decisions;
* source changes;
* reopened state.

---

# 25. Condition evidence

Acceptable evidence types may include:

* Executed document;
* certificate;
* consent;
* approval;
* filing receipt;
* bank confirmation;
* officer confirmation;
* legal opinion;
* registry extract;
* insurance policy;
* counsel confirmation;
* human-attested completion.

## Evidence-state model

* Missing;
* uploaded;
* processing;
* review required;
* accepted;
* insufficient;
* expired;
* contradictory;
* restricted.

## UX rule

M&Ai should verify that evidence exists, is current and matches the expected requirement.

The designated reviewer determines its legal sufficiency.

---

# 26. Waiver workflow

A waiver is a material decision.

## Required fields

* Condition;
* waiver scope;
* proposed by;
* beneficiary;
* reason;
* residual risk;
* financial consequence;
* legal-review state;
* approval authority;
* effective date;
* source document.

## Example

> **Waive updated municipal certificate?**

Reason:

> Updated certificate expected three business days after closing.

Residual risk:

> Potential municipal liability remains unconfirmed.

Proposed treatment:

> Convert to post-closing covenant with specific indemnity.

Required approvals:

* Buyer legal counsel;
* Deal Lead;
* client principal.

Actions:

* Approve waiver;
* request alternative protection;
* reject waiver.

---

# 27. Interim covenants and gap-period controls

For deferred closings, the screen should track obligations active between signing and completion.

Examples:

* Ordinary-course operation;
* restrictions on distributions;
* limitations on new debt;
* employee changes;
* capital expenditure limits;
* information obligations;
* regulatory cooperation;
* consent obligations;
* preservation of assets;
* prohibition on leakage.

## State

* Active;
* evidence current;
* exception requested;
* breached;
* cured;
* waived;
* expired at closing.

## UX principle

These should not be mixed with post-closing covenants.

Their active period and expiry must remain explicit.

---

# 28. Bring-down review

Before closing, material representations and conditions may require confirmation that they remain accurate.

The screen should support a controlled **bring-down review** containing:

* Relevant representation;
* prior approved state;
* current evidence;
* changed facts;
* reviewer;
* exception;
* impact;
* decision.

## Example

> **No material customer termination**

Prior state:

> Confirmed at signing

Current state:

> One top-ten customer issued non-renewal notice

Impact:

> Commercial review required before closing approval

This should route back to:

* Diligence;
* Valuation;
* Negotiation protections;
* Closing approval.

---

# 29. Material change review

A new event between signing and closing may affect:

* Conditions;
* valuation;
* negotiated protections;
* financing;
* closing timetable;
* approval authority.

## Event examples

* New litigation;
* customer loss;
* regulatory inquiry;
* financial deterioration;
* document inconsistency;
* covenant breach;
* financing change;
* ownership change;
* security incident.

## Workflow

```text
New material event
  ↓
Evidence captured
  ↓
Affected closing requirements identified
  ↓
Diligence or valuation reopened
  ↓
Closing readiness marked stale
  ↓
Human review required
```

---

# 30. Long-stop and critical dates

The screen should track:

* Signing date;
* target closing date;
* long-stop or outside date;
* regulatory deadlines;
* payment cut-offs;
* signature deadlines;
* filing deadlines;
* post-closing deadlines.

## Date state

* On track;
* attention required;
* at risk;
* overdue;
* extended;
* waived;
* complete.

## UX rule

A long-stop date should not simply appear on a calendar.

Show:

* Days remaining;
* open blockers;
* extension authority;
* termination consequence recorded in the transaction documents.

---

# 31. Corporate approvals

Possible requirements:

* Board approval;
* shareholder approval;
* investment-committee approval;
* partner approval;
* lender approval;
* trustee approval;
* fund approval;
* internal signing authority.

## Required information

* Approving body;
* resolution;
* quorum;
* signatory;
* evidence;
* effective date;
* scope;
* state.

## UX principle

Do not treat “client approved” as a sufficient substitute for the formal approval artifact where one is required.

---

# 32. Regulatory approvals

The screen should support transaction-specific regulatory approvals without hardcoding legal conclusions.

Recommended fields:

* Authority;
* filing type;
* responsible counsel;
* submission date;
* reference;
* expected response;
* approval state;
* conditions;
* expiry;
* evidence.

## States

* Not required;
* under analysis;
* preparing filing;
* filed;
* information requested;
* approved;
* approved with conditions;
* rejected;
* expired;
* restricted.

## Product boundary

The system tracks the workflow and evidence.

Qualified counsel determines whether an approval is legally required and whether the response is sufficient.

---

# 33. Third-party consents

Possible consent categories:

* Material customers;
* suppliers;
* lenders;
* landlords;
* licensors;
* joint-venture partners;
* insurers;
* government counterparties.

## Consent record

* Counterparty;
* agreement;
* consent requirement;
* outreach owner;
* request date;
* response;
* restrictions;
* evidence;
* state.

## Confidentiality

Certain consent processes may require restricted visibility because premature disclosure can create transaction risk.

---

# 34. Financing readiness

Where relevant, track:

* Equity commitment;
* debt commitment;
* financing conditions;
* lender deliverables;
* utilization request;
* funding confirmation;
* financing documents;
* expiry;
* funds availability.

## State

* Not applicable;
* planned;
* committed;
* conditional;
* available;
* drawdown requested;
* confirmed;
* failed;
* expired.

## UX principle

Do not infer that a financing commitment guarantees funds availability.

Show the current evidence and applicable conditions.

---

# 35. Definitive-document matrix

## Purpose

Maintain every document required for signing and closing.

## Recommended default columns

1. Document;
2. document type;
3. responsible drafter;
4. current version;
5. commercial alignment;
6. legal review;
7. execution state;
8. parties;
9. closing dependency;
10. actions.

## Typical document types

* Definitive acquisition agreement;
* shareholder agreement;
* escrow agreement;
* transition-services agreement;
* employment or retention agreement;
* disclosure schedules;
* corporate resolutions;
* transfer instruments;
* resignations;
* releases;
* closing certificates;
* funds-flow memorandum;
* powers of attorney;
* ancillary consents.

---

# 36. Document lifecycle

* Not started;
* outline;
* drafting;
* internal review;
* counterparty review;
* redlines;
* agreed form;
* execution version;
* partially signed;
* executed;
* effective;
* superseded;
* terminated;
* restricted.

## UX rule

“Agreed form” is not the same as “executed.”

“Executed” is not necessarily the same as “effective.”

---

# 37. Commercial-baseline comparison

The screen should compare definitive documents with the approved Negotiation baseline.

## Comparison categories

* Price;
* consideration;
* escrow;
* earn-out;
* net debt;
* working capital;
* conditions;
* timetable;
* governance;
* indemnification;
* exclusivity;
* restrictive covenants;
* post-closing obligations.

## Example

> **Commercial deviation detected**

Approved term sheet:

> 5% escrow for 18 months

Definitive agreement:

> 7,5% escrow for 24 months

Economic impact:

> Additional R$ 11,8 mi retained for six more months

State:

> Deal Lead and client review required

---

# 38. Definitive-document deviation states

* Aligned;
* immaterial drafting change;
* commercial deviation;
* legal clarification;
* reopened term;
* missing agreed term;
* additional obligation;
* restricted;
* unresolved.

## UX principle

M&Ai may detect textual or structured differences.

Counsel and bankers determine whether the drafting has a material legal or commercial effect.

---

# 39. Document approval

Before a document becomes an execution version, require:

* Correct parties;
* Correct commercial terms;
* Legal review;
* approved schedules;
* final attachments;
* version lock;
* signatory confirmation;
* required authority.

## Action

> **Approve execution version**

Consequence:

* Version becomes immutable;
* signature packages may be generated;
* later edits create a new version;
* audit record is created.

---

# 40. Generated artifacts

The legal-closing workflow may prepare structured previews or drafts for review, but every generated artifact must have an explicit state.

Recommended:

* Draft;
* generated;
* internal review;
* counsel review;
* approved for use;
* superseded;
* executed.

## UX rule

A generated PDF should never be labeled:

> Final

until the authorized human workflow has approved it.

---

# 41. Signature workspace

## Purpose

Coordinate every required signatory and execution package.

## Required information

* Document;
* party;
* signatory;
* signatory role;
* authority evidence;
* signature method;
* signature state;
* invitation state;
* signed timestamp;
* completion dependency.

## Example

> **Definitive Acquisition Agreement**

| Party                  | Signatory     | State              |
| ---------------------- | ------------- | ------------------ |
| Horizon Holdings       | Helena Duarte | Signed             |
| Northbridge Automation | James Hall    | Signed             |
| Atlas Industrial       | Ricardo Nunes | Awaiting signature |

---

# 42. Signatory authority

For each signatory, show:

* Name;
* organization;
* role;
* authority basis;
* supporting approval;
* power of attorney, when relevant;
* validity period;
* review state.

## UX principle

A signature should not be marked complete solely because a digital mark exists.

The configured reviewer must confirm:

* Correct individual;
* correct document;
* correct execution version;
* required authority.

---

# 43. Signature package

A package may contain:

* One or more documents;
* signing order;
* parties;
* instructions;
* attachments;
* signature fields;
* witness requirements;
* completion conditions.

## Package states

* Draft;
* review;
* approved;
* sent;
* viewed;
* partially signed;
* complete;
* declined;
* expired;
* voided;
* superseded.

---

# 44. Electronic-signature integration

Where integrated, the screen may:

* Create signature packages;
* synchronize status;
* retrieve executed copies;
* preserve completion certificates;
* verify document checksum;
* record event history.

## Boundary

M&Ai should not claim that a signature method is legally sufficient without the appropriate legal review and configured jurisdictional policy.

## Integration state

* Not connected;
* connected;
* pending authorization;
* error;
* status delayed;
* complete.

---

# 45. Signature exceptions

Examples:

* Signer declined;
* wrong signer;
* expired package;
* amended document;
* missing witness;
* authority not confirmed;
* signature mismatch;
* technical delivery failure.

Each exception should show:

* Consequence;
* responsible owner;
* next action;
* affected documents;
* closing impact.

---

# 46. Funds-flow workspace

## Purpose

Create a controlled financial settlement plan.

It should answer:

* How much is being paid?
* By whom?
* To whom?
* In which currency?
* Through which account?
* At what time?
* Which deductions and retentions apply?
* What evidence proves settlement?

## Primary concepts

* Sources;
* uses;
* payors;
* recipients;
* accounts;
* currency;
* deductions;
* escrow;
* debt repayment;
* transaction costs;
* taxes;
* net proceeds;
* settlement evidence.

---

# 47. Funds-flow summary

Example:

> **Total funding required**
> **R$ 419,6 mi**

Uses:

* Seller cash proceeds: R$ 401,2 mi;
* debt repayment: R$ 12,8 mi;
* advisory and transaction costs: R$ 5,6 mi.

Separate escrow funding:

> R$ 23,6 mi

State:

> **One payment instruction awaiting verification**

## UX rule

Funds-flow totals must reconcile.

A non-reconciling schedule should block final approval unless an authorized exception is recorded.

---

# 48. Sources and uses

## Sources

Possible:

* Buyer equity;
* debt financing;
* acquisition vehicle cash;
* rollover contribution;
* other funding.

## Uses

Possible:

* Seller proceeds;
* debt repayment;
* escrow funding;
* transaction costs;
* taxes;
* employee payments;
* option settlement;
* retained amount;
* regulatory fees.

## Example

| Use             |      Amount | State                 |
| --------------- | ----------: | --------------------- |
| Seller proceeds | R$ 401,2 mi | Ready                 |
| Debt repayment  |  R$ 12,8 mi | Confirmed             |
| Advisory costs  |   R$ 5,6 mi | In review             |
| Escrow account  |  R$ 23,6 mi | Instructions verified |

---

# 49. Payment instruction record

Each payment should contain:

* Payor;
* recipient;
* account holder;
* financial institution;
* account identifier;
* currency;
* amount;
* payment reference;
* timing;
* verification state;
* verifier;
* evidence.

## Security requirement

Highly sensitive bank details should:

* Be masked by default;
* require elevated access;
* record every view;
* use controlled verification;
* never appear in unrestricted exports;
* never be repeated by Copilot without authority.

---

# 50. Payment-instruction verification

Recommended controls:

* Independent confirmation;
* dual-person review;
* account-holder match;
* currency match;
* amount match;
* change detection;
* approved source;
* verification timestamp.

## Critical alert

> **Payment instructions changed after verification**

Consequences:

* Prior verification invalidated;
* payment blocked;
* independent re-verification required;
* security event recorded.

This should be one of the strongest system alerts in the product.

---

# 51. Funds-flow statuses

* Draft;
* reconciling;
* balanced;
* review required;
* verified;
* authorized;
* funding initiated;
* funds sent;
* funds received;
* partially settled;
* failed;
* reversed;
* restricted.

## Important distinction

### Authorized

The payment plan is approved.

### Funds sent

The payor reports transmission.

### Funds received

The recipient or designated verifier confirms receipt.

These should never be merged.

---

# 52. Purchase-price adjustment

Where completion accounts or another adjustment mechanism applies, track:

* Estimated purchase price;
* closing estimate;
* net debt;
* working capital;
* leakage;
* transaction expenses;
* final adjustment process;
* dispute deadline;
* responsible reviewer.

## Example

> **Estimated equity value at closing**

Enterprise value:

> R$ 472,0 mi

Less net debt:

> R$ 58,6 mi

Less debt-like items:

> R$ 8,4 mi

Working-capital adjustment:

> −R$ 2,3 mi

> **Estimated seller consideration: R$ 402,7 mi**

State:

> Draft funds-flow input · Working capital remains under review

---

# 53. Escrow funding

Track:

* Escrow amount;
* account;
* contributor;
* custodian;
* funding timing;
* release conditions;
* evidence;
* state.

The screen should link the escrow to:

* Negotiated term;
* definitive agreement;
* relevant diligence risks;
* post-closing release obligations.

---

# 54. Ownership-transfer mechanics

Possible actions include:

* Share or quota transfer;
* asset assignment;
* registry update;
* company-book update;
* beneficial ownership update;
* transfer instrument;
* board or management transition.

## Record fields

* Transfer object;
* transferor;
* transferee;
* effective time;
* required document;
* evidence;
* registry or book update;
* reviewer;
* state.

## Product boundary

The system tracks execution and evidence.

It should not claim legal transfer solely because the workflow item was checked.

---

# 55. Management and governance transition

Potential requirements:

* Director resignation;
* appointment of new officers;
* board reconstitution;
* powers of attorney;
* bank mandates;
* authorized-user updates;
* employee communication;
* transition-services activation.

These should be structured closing items with:

* Responsible party;
* document;
* effective date;
* evidence;
* post-closing dependency.

---

# 56. Closing agenda

## Purpose

Create the sequenced runbook for signing or closing day.

Each agenda step should contain:

* Sequence;
* time;
* action;
* prerequisite;
* responsible party;
* communication channel;
* evidence;
* completion authority;
* fallback action.

## Example

| Time  | Step                                 | Owner          | Dependency                      |
| ----- | ------------------------------------ | -------------- | ------------------------------- |
| 09:00 | Confirm final signature packages     | Counsel        | All execution versions approved |
| 10:00 | Release signature pages              | Deal Lead      | Final closing approval          |
| 11:00 | Confirm buyer funds available        | Buyer finance  | Funding certificate             |
| 12:00 | Initiate payments                    | Buyer finance  | Signature release               |
| 13:00 | Confirm seller receipt               | Seller finance | Payment evidence                |
| 14:00 | Release ownership-transfer documents | Counsel        | Funds received                  |
| 15:00 | Record legal completion              | Deal Lead      | All critical steps accepted     |

---

# 57. Closing agenda states

* Scheduled;
* ready;
* waiting;
* in progress;
* complete;
* delayed;
* blocked;
* skipped;
* rescheduled;
* aborted.

## UX principle

The agenda should not become active automatically merely because the target time has arrived.

An authorized user starts the closing event.

---

# 58. Closing-day mode

The interface may switch into a focused execution state.

## Recommended behavior

* Hide low-priority navigation;
* show current step;
* show next dependency;
* show critical contacts;
* display blockers prominently;
* provide rapid evidence upload;
* record timestamps;
* maintain complete audit history.

## Closing-day header

> **Closing in progress**

Current step:

> Confirming seller receipt of funds

Elapsed:

> 18 min

Next:

> Release ownership-transfer documents

Blocker:

> None

## UX rule

Avoid celebratory visual effects until completion is confirmed.

---

# 59. Dependency model

Requirements may depend on:

* Another requirement;
* document approval;
* signature;
* payment;
* consent;
* human approval;
* time;
* external confirmation.

## Example

```text
Buyer funding confirmation
  ↓
Payment authorization
  ↓
Funds transmitted
  ↓
Seller receipt confirmed
  ↓
Ownership documents released
  ↓
Closing recorded
```

The system should surface dependency loops and impossible sequences.

---

# 60. Critical path

The screen should identify items that directly determine the earliest possible closing time.

Example:

> **Critical path**

1. Updated tax certificate;
2. final execution version;
3. shareholder signature;
4. payment-instruction verification;
5. closing authorization.

## UX rule

The critical path must derive from explicit dependencies.

Do not present an unexplained AI-generated estimate.

---

# 61. Closing blockers

## Recommended blocker categories

* Condition precedent;
* legal-document deviation;
* missing approval;
* signature;
* signatory authority;
* funds flow;
* payment instruction;
* financing;
* regulatory;
* consent;
* material event;
* evidence quality;
* system or integration failure.

## Blocker anatomy

* Blocker;
* consequence;
* owner;
* required action;
* deadline;
* affected items;
* escalation path.

## Example

> **Payment instructions require re-verification**

Cause:

> Seller account details changed after dual approval.

Consequence:

> Funds release blocked.

Owner:

> Ana Costa

Required:

> Independent verbal confirmation and second approver.

---

# 62. Blocker severity

Recommended:

## Critical

Prevents closing.

## High

Likely to prevent closing unless resolved urgently.

## Medium

Requires resolution but does not currently block the critical path.

## Low

Administrative or post-closing item.

## UX principle

Severity should reflect closing consequence, not general legal significance.

---

# 63. Blocker resolution

Actions:

* Assign owner;
* request evidence;
* escalate;
* propose waiver;
* create alternative;
* move to post-closing;
* resolve;
* reopen.

Every resolution should record:

* Decision;
* evidence;
* authority;
* residual risk;
* affected timeline.

---

# 64. Final approvals

The Closing Control Room should support several separate approvals.

## Signing readiness approval

Authorizes execution of transaction documents.

## Condition-satisfaction approval

Confirms required conditions are satisfied.

## Waiver approval

Authorizes proceeding despite an unsatisfied condition.

## Funds-flow approval

Authorizes the settlement schedule and payment instructions.

## Closing-readiness approval

Authorizes the transaction to enter the closing sequence.

## Completion confirmation

Records that the closing sequence has completed.

## Post-closing transfer approval

Moves remaining obligations into post-closing administration.

These must not be collapsed into one generic “Approve Closing” status.

---

# 65. Final closing-readiness gate

Before authorizing closing, display:

* Closing date and time;
* transaction parties;
* current purchase price;
* conditions status;
* open waivers;
* execution-document status;
* signature readiness;
* funds-flow balance;
* payment-instruction verification;
* ownership-transfer readiness;
* material unresolved issues;
* required authorities;
* counsel confirmation.

## Example

> **Authorize Project Horizon to close?**

Status:

* 24 of 24 critical requirements resolved;
* one approved waiver;
* 19 execution documents ready;
* 22 of 22 required signatures ready for release;
* funds flow balanced at R$ 419,6 mi;
* payment instructions independently verified;
* no critical blockers.

Consequences:

* Closing-day agenda becomes active;
* signature and payment release actions become available;
* authorization is recorded;
* any subsequent material change invalidates approval.

---

# 66. Material-change invalidation

Closing approval should be invalidated when:

* An execution document changes;
* Payment instructions change;
* Purchase price changes;
* A condition reopens;
* A signatory changes;
* Financing status changes;
* A material event occurs;
* Counsel withdraws confirmation.

## UX treatment

> **Closing authorization invalidated**

Reason:

> Funds-flow amount changed by R$ 1,2 mi after approval.

Required:

> Reconcile funds flow and obtain renewed approval.

---

# 67. Approval authority

Authority may depend on:

* Transaction value;
* unresolved waiver;
* funds-flow change;
* price deviation;
* material document deviation;
* missing evidence;
* transaction side;
* institution policy.

## Example

* VP may approve operational readiness;
* Deal Lead approves funds flow;
* Partner approves material waivers;
* Client principal authorizes completion;
* counsel confirms legal-document readiness.

Role title alone should not imply authority.

---

# 68. Completion confirmation

The system should not mark the deal closed automatically after all items appear green.

Completion confirmation should require:

* Closing authority;
* Evidence that required payments occurred;
* Evidence that transfer actions occurred;
* Completion timestamp;
* Effective date;
* responsible confirmer;
* final exceptions;
* counsel or designated transaction confirmation.

## Primary action

> **Record legal completion**

Supporting:

> This records the transaction as closed and creates an immutable completion event.

---

# 69. Completion record

The immutable completion record should contain:

* Deal;
* parties;
* signing date;
* closing date and time;
* effective date;
* final consideration;
* funds-flow version;
* definitive-document versions;
* signatures;
* satisfied conditions;
* waivers;
* unresolved post-closing items;
* authorizing users;
* completion evidence;
* audit identifier.

It should not contain only:

> Closed by Ana Costa

---

# 70. Closed pending evidence

Sometimes parties confirm completion before every supporting artifact has been synchronized.

Use a distinct state:

> **Closed pending evidence**

Requirements:

* Authorized completion recorded;
* missing evidence identified;
* owners assigned;
* deadline defined;
* no ambiguity that the legal event has been reported.

This state should not be used to bypass substantive closing blockers.

---

# 71. Post-closing obligations

## Purpose

Track obligations that survive or begin after completion.

Potential categories:

* Registrations;
* final purchase-price adjustment;
* escrow release;
* earn-out;
* transition services;
* employee actions;
* regulatory notifications;
* debt releases;
* tax filings;
* document delivery;
* integration milestones;
* record updates.

## Item states

* Not started;
* active;
* evidence requested;
* under review;
* complete;
* overdue;
* disputed;
* waived;
* terminated.

---

# 72. Post-closing item anatomy

> **Register updated corporate documents**

Responsible:

> Buyer counsel

Due:

> 20 October 2026

Evidence:

> Filing receipt and final registry extract

Dependency:

> Required before Deal Archive

State:

> Filing submitted

---

# 73. Purchase-price adjustment after closing

Where applicable, the workspace should support:

* Estimated closing statement;
* buyer statement;
* seller review;
* disputed items;
* expert determination;
* final amount;
* payment or refund;
* evidence;
* final approval.

This may become a dedicated sub-workflow for complex transactions.

---

# 74. Escrow and earn-out monitoring

The Closing Control Room should create post-closing records from negotiated terms.

## Escrow record

* Amount;
* custodian;
* funded date;
* release dates;
* claims;
* remaining balance.

## Earn-out record

* Maximum amount;
* metric;
* measurement period;
* reporting obligations;
* dispute mechanism;
* expected payment date.

The full long-term monitoring experience may later become a separate post-closing module.

---

# 75. Completion deliverables

Appropriate outputs:

* Final closing checklist;
* closing memorandum;
* signed-document index;
* funds-flow statement;
* condition-satisfaction schedule;
* waiver register;
* signature report;
* completion certificate;
* post-closing obligations list;
* audit package;
* closing binder.

Every artifact should show:

* Version;
* generation state;
* source date;
* approval state;
* confidentiality;
* completion status.

---

# 76. Closing binder

The binder should be generated only after the relevant signed and final documents are available.

Recommended structure:

1. Closing memorandum;
2. definitive agreements;
3. ancillary documents;
4. corporate approvals;
5. conditions and waivers;
6. signature certificates;
7. funds-flow documents;
8. transfer evidence;
9. post-closing schedule;
10. audit manifest.

## UX principle

The binder is a generated package.

The authoritative evidence remains the underlying immutable document versions.

---

# 77. External-participant experience

External users should receive restricted views based on assignment.

## Possible external actions

* Upload deliverable;
* sign document;
* confirm payment;
* provide consent;
* review assigned condition;
* submit completion evidence.

## Hidden by default

* Internal blockers;
* privileged commentary;
* other party’s payment instructions;
* internal approval chains;
* negotiation analysis;
* risk assessments.

---

# 78. Counsel view

A counsel-oriented view may emphasize:

* Conditions;
* definitive documents;
* signature packages;
* legal deviations;
* waivers;
* transfer documents;
* closing memorandum.

It may de-emphasize:

* Internal valuation;
* banker-only task prioritization;
* commercial utility;
* other advisory workstreams.

Counsel access should remain deal- and workstream-scoped.

---

# 79. Client view

A client-facing closing view should contain:

* Closing date;
* principal conditions;
* material blockers;
* required client actions;
* signature status;
* final consideration;
* funds-flow summary;
* decisions requiring client authorization.

It should not expose:

* Internal counsel commentary;
* privileged advice;
* internal escalation notes;
* restricted bank details;
* other party’s confidential information.

---

# 80. Closing communications

The screen may prepare:

* Closing-status update;
* signing instructions;
* signature reminder;
* funds-flow confirmation request;
* condition reminder;
* client closing brief;
* completion notice.

## Boundary

External communication must require:

* Approved content;
* confirmed recipients;
* correct confidentiality;
* explicit send authorization.

---

# 81. Contextual Copilot

Suggested prompts:

* What currently blocks closing?
* Which conditions remain unsatisfied?
* Show every item due before 14 October.
* Compare the definitive agreement with the approved term sheet.
* Which signatures are still missing?
* Is the funds-flow statement balanced?
* Which payment instructions changed?
* Draft the closing-readiness brief.
* Which waivers require client approval?
* Prepare the closing-day agenda.
* Show every post-closing obligation.
* Which documents remain unexecuted?
* Explain why closing authorization was invalidated.

## Response requirements

The Copilot should:

* Use the active closing-checklist version;
* cite the underlying clause or document;
* distinguish satisfied from waived;
* distinguish submitted from accepted;
* identify restricted information;
* avoid legal conclusions;
* never reveal full bank details casually;
* never authorize closing;
* link to exact checklist or document context.

---

# 82. Search and filters

## Search

Searchable:

* Requirement;
* condition;
* document;
* party;
* signatory;
* payment;
* approval;
* clause;
* evidence;
* post-closing obligation.

Placeholder:

> Search conditions, documents, signatures or payments

## Primary filters

* Category;
* state;
* responsible party;
* owner;
* due date;
* blocker;
* closing event.

## Advanced filters

* Evidence state;
* approval state;
* document;
* party;
* jurisdiction;
* critical path;
* waiver;
* post-closing;
* restricted;
* changed since review;
* overdue;
* external dependency.

---

# 83. Saved views

Examples:

* Critical closing items;
* My assigned items;
* Conditions precedent;
* Seller deliverables;
* Buyer deliverables;
* Counsel review;
* Missing signatures;
* Funds-flow exceptions;
* Items due today;
* Approved waivers;
* Post-closing obligations.

---

# 84. Bulk actions

Appropriate:

* Assign owner;
* request evidence;
* update due date;
* send reminder;
* export filtered checklist;
* apply category;
* move non-critical items to post-closing, with authority.

Controlled:

* Mark satisfied;
* waive conditions;
* approve execution versions;
* authorize signatures;
* authorize funds flow;
* close multiple items.

Inappropriate:

* Bulk waive all open conditions;
* mark every submitted item satisfied;
* release all signatures;
* release all payments;
* delete checklist history.

---

# 85. Audit history

The screen should distinguish:

* Human action;
* counsel action;
* client action;
* counterparty action;
* document event;
* signature event;
* financial event;
* M&Ai workflow event;
* deterministic calculation;
* integration event.

## Examples

> **10:18 · Ana Costa**
> Approved closing funds-flow version 6.

> **10:12 · External counsel**
> Accepted the updated tax certificate.

> **09:58 · Signature provider**
> Received the final required signature for the definitive agreement.

> **09:44 · M&Ai**
> Invalidated closing readiness after payment instructions changed.

---

# 86. Recommended desktop layout

For a **1440 × 900** canvas:

| Region                       | Approximate width |
| ---------------------------- | ----------------: |
| Compact global sidebar       |          72–80 px |
| Checklist/category navigator |        220–260 px |
| Main closing workspace       |        600–720 px |
| Readiness/evidence panel     |        360–440 px |
| Page padding                 |          24–32 px |

## Recommended composition

```text
┌────────┬─────────────────────────────────────────────────────────────┐
│ Global │ Closing Control Room · 2 blockers · 14 October            │
│ shell  ├─────────────────────────────────────────────────────────────┤
│        │ Overview Checklist Conditions Documents Funds Agenda ...   │
│        ├──────────────┬──────────────────────────┬───────────────────┤
│        │ Categories   │ Closing requirements     │ Readiness         │
│        │              │                          │                   │
│        │ Critical     │ Tax certificate          │ Closing blocked   │
│        │ Conditions   │ Blocked · Seller         │                   │
│        │ Documents    │                          │ 21 / 24 accepted  │
│        │ Signatures   │ Buyer instructions       │ 2 blockers        │
│        │ Funds flow   │ Re-verification required │                   │
│        │ Approvals    │                          │ Next review       │
│        │ Post-closing │ Final signature          │ 14 Oct · 09:00    │
│        │              │ Awaiting shareholder     │                   │
│        │              │                          │ [ Review blockers]│
└────────┴──────────────┴──────────────────────────┴───────────────────┘
```

---

# 87. Closing-day layout

```text
┌──────────────────────────────────────────────────────────────────┐
│ Closing in progress · Project Horizon · Started 10:00            │
├──────────────────────────────────────┬───────────────────────────┤
│ Current step                         │ Critical status           │
│                                      │                           │
│ Confirm seller receipt of funds      │ Signatures       Complete │
│ Owner: Ana Costa                     │ Funding sent     Complete │
│ Started 12:08                        │ Funds received   Pending  │
│                                      │ Transfer docs    Waiting  │
│ [ Upload confirmation ]              │                           │
├──────────────────────────────────────┼───────────────────────────┤
│ Next step                            │ Closing contacts          │
│ Release ownership-transfer documents │ Counsel · Finance · Client│
├──────────────────────────────────────┴───────────────────────────┤
│ Event record                                                     │
└──────────────────────────────────────────────────────────────────┘
```

---

# 88. UI design direction

## Overall character

Aim for:

> **A transaction-control surface with the rigor of an aviation checklist and the restraint of institutional legal software**

The screen should feel:

* Controlled;
* exact;
* consequential;
* calm;
* auditable;
* deadline-aware;
* operationally disciplined.

It should not feel:

* Celebratory;
* gamified;
* visually frantic;
* like a generic task manager;
* like a legal-document archive;
* like a bright project-management board.

---

# 89. Visual hierarchy

Prioritize:

1. Closing state;
2. critical blockers;
3. current required decision;
4. closing date;
5. critical-path items;
6. signatures and funds;
7. responsible owner;
8. supporting evidence.

Do not prioritize:

* Total document count;
* generic checklist completion;
* number of messages;
* agent activity;
* file-storage volume.

---

# 90. Color application

Use the established M&Ai system:

* Canvas Cream: `#F3F0EE`;
* Lifted Cream: `#FCFBFA`;
* Ink Black: `#141413`;
* Signal Orange: `#CF4500`;
* Light Signal Orange: `#F37338`;
* Dust Taupe: `#D1CDC7`;
* Slate Gray: `#696969`.

## Semantic use

* Satisfied or complete: green;
* accepted with condition: amber;
* attention required: Signal Orange;
* blocked: deep red;
* waived: purple or distinctive neutral;
* submitted: blue;
* waiting external: gray-blue;
* post-closing: neutral;
* current closing step: Ink Black with restrained orange marker.

## Important

Do not color the entire screen green when closing authorization is granted.

The transaction remains operationally sensitive until completion is evidenced.

---

# 91. Typography

Use **Sofia Sans**.

| Element           |     Size |  Weight |
| ----------------- | -------: | ------: |
| Page title        | 26–30 px | 500–600 |
| Closing state     | 22–28 px | 600–700 |
| Critical blocker  | 16–20 px | 650–700 |
| Section title     | 15–17 px | 650–700 |
| Requirement title | 13–15 px | 600–700 |
| Financial total   | 22–30 px | 550–650 |
| Body              | 13–15 px | 450–500 |
| Metadata          | 12–13 px | 450–550 |
| Status            | 11–12 px | 650–700 |

Use tabular numerals for:

* Currency;
* dates;
* times;
* counts;
* completion amounts;
* payment references.

---

# 92. Geometry and density

Recommended:

* Main surfaces: 6–10 px radius;
* Checklist rows: 52–68 px;
* critical items: 64–80 px where consequence requires;
* status tags: compact pills;
* evidence panel: rectangular;
* agenda rows: 48–60 px;
* drawers: flush to viewport edge.

Avoid:

* One large card per checklist item;
* circular completion charts;
* oversized success icons;
* confetti;
* heavy shadows;
* decorative gradients.

---

# 93. UX design principles

## 93.1 Blockers before completion counts

Two blockers matter more than 95 completed administrative items.

## 93.2 Submitted is not satisfied

Evidence requires review.

## 93.3 Satisfied is not waived

Preserve the legal and risk distinction.

## 93.4 Signing is not closing

Keep the two events separate.

## 93.5 Authorized is not completed

Closing authority does not prove that funds and ownership were exchanged.

## 93.6 Current document is not execution version

Only an explicitly approved version may be signed.

## 93.7 Commercial alignment remains visible

Definitive documents must be compared with approved negotiation terms.

## 93.8 Funds instructions require exceptional control

Changes should invalidate prior verification.

## 93.9 Dependencies before dates

A scheduled time does not make a step ready.

## 93.10 Human authority remains explicit

M&Ai coordinates and validates workflow state. Authorized people close the transaction.

## 93.11 Preserve every exception

Waivers, deviations and conditional approvals must remain auditable.

## 93.12 Post-closing is part of execution

Do not archive the deal while material obligations remain unowned.

---

# 94. System states

## 94.1 Closing not configured

> **Set up the closing workspace**

Requirements:

* Import agreed commercial baseline;
* select closing template;
* assign counsel;
* define target date.

## 94.2 No signed agreement

> **Closing conditions unavailable**

The workspace may prepare requirements, but the legal checklist remains provisional.

## 94.3 Checklist being extracted

Show:

* Source documents;
* requirements identified;
* items requiring validation.

Do not activate extracted items without human review.

## 94.4 Closing on track

Show remaining items and date without celebratory treatment.

## 94.5 Closing at risk

Explain the exact risks and affected date.

## 94.6 Closing blocked

Show the critical blockers and owners first.

## 94.7 Evidence submitted

Make clear that reviewer acceptance remains pending.

## 94.8 Waiver pending

Keep the original unsatisfied condition visible.

## 94.9 Signature package partially complete

Show exact missing signatories.

## 94.10 Payment instruction changed

Invalidate verification and block funds release.

## 94.11 Funds flow does not reconcile

Show the unreconciled amount and affected lines.

## 94.12 Closing approval invalidated

Explain the material change.

## 94.13 Closing in progress

Use closing-day mode.

## 94.14 Closing delayed

Preserve the original target and new estimate.

## 94.15 Closed pending evidence

Assign missing evidence and deadline.

## 94.16 Closed

Show completion record and post-closing obligations.

## 94.17 Post-closing overdue

Do not represent the deal as administratively complete.

## 94.18 Aborted closing

Preserve every document, payment state and authorization.

## 94.19 Restricted

Do not reveal values, signatories or bank details.

## 94.20 Offline

Allow safely cached review where policy permits.

Disable:

* Approval;
* signature release;
* payment authorization;
* completion recording;
* external communication.

---

# 95. Responsive behavior

## Desktop — 1280 px and above

* Compact global sidebar;
* persistent category navigator;
* checklist or agenda workspace;
* persistent readiness and evidence panel;
* side-by-side document or funds review.

## Tablet — 768–1279 px

* Navigator collapses;
* readiness panel becomes drawer;
* checklist columns reduce;
* closing-day mode remains single-focus;
* funds-flow tables scroll horizontally.

## Mobile — below 768 px

Recommended order:

1. Closing state;
2. critical blockers;
3. next required action;
4. closing date;
5. my assigned items;
6. signatures;
7. funds-flow state;
8. approvals;
9. agenda.

Mobile should support:

* Status review;
* evidence submission;
* task completion;
* approval;
* closing-day confirmation.

Complex document comparison and funds-flow editing remain desktop-first.

---

# 96. Accessibility requirements

The Closing Control Room should support:

* Semantic checklist tables;
* row headers for requirements;
* accessible dependency descriptions;
* no color-only state;
* keyboard checklist navigation;
* visible focus;
* announced blocker changes;
* accessible closing agenda;
* explicit dates and time zones;
* correct currency pronunciation;
* masked sensitive information;
* accessible signature-status labels;
* minimum 44 × 44 px controls;
* descriptive approval actions;
* accessible funds-flow tables;
* accessible document-comparison alternatives;
* screen-reader descriptions of waived conditions;
* correct distinction between submitted, accepted and satisfied.

Avoid generic actions:

> Approve

Prefer:

> Approve Project Horizon funds-flow version 6

---

# 97. Figma component architecture

## `ClosingHeader`

Properties:

* Setup;
* signing preparation;
* signed;
* closing preparation;
* blocked;
* authorized;
* in progress;
* closed;
* post-closing;
* restricted.

## `ClosingReadiness`

Variants:

* Ready;
* attention;
* at risk;
* blocked;
* authorized;
* stale.

## `ClosingWorkspaceTabs`

* Overview;
* checklist;
* conditions;
* documents;
* funds flow;
* agenda;
* approvals;
* post-closing;
* history.

## `ClosingChecklist`

States:

* Populated;
* filtered;
* empty;
* loading;
* partial;
* error;
* closing-day mode.

## `ClosingRequirementRow`

Properties:

* Not started;
* requested;
* submitted;
* review;
* accepted;
* satisfied;
* waived;
* blocked;
* overdue;
* post-closing;
* restricted.

## `ConditionDetail`

Properties:

* Active;
* evidence submitted;
* partial;
* satisfied;
* waiver proposed;
* waived;
* failed;
* converted.

## `EvidenceState`

Properties:

* Missing;
* uploaded;
* processing;
* accepted;
* insufficient;
* expired;
* contradictory;
* restricted.

## `WaiverApproval`

States:

* Draft;
* legal review;
* client review;
* approve;
* rejected;
* conditional.

## `DefinitiveDocumentMatrix`

Properties:

* Drafting;
* redlines;
* agreed form;
* execution version;
* partially signed;
* executed;
* effective.

## `CommercialDeviation`

Properties:

* Aligned;
* immaterial;
* commercial;
* legal clarification;
* reopened;
* missing term.

## `SignaturePackage`

Properties:

* Draft;
* review;
* sent;
* partial;
* complete;
* declined;
* expired;
* superseded.

## `SignatoryRow`

Properties:

* Authority pending;
* ready;
* invited;
* viewed;
* signed;
* declined;
* invalid.

## `FundsFlowSummary`

Properties:

* Draft;
* unbalanced;
* balanced;
* verified;
* authorized;
* settlement in progress;
* complete.

## `PaymentInstruction`

Properties:

* Unverified;
* first review;
* dual verified;
* changed;
* blocked;
* paid;
* received.

## `ClosingAgenda`

Properties:

* Scheduled;
* ready;
* in progress;
* delayed;
* blocked;
* complete;
* aborted.

## `ClosingBlocker`

Properties:

* Critical;
* high;
* medium;
* resolved;
* escalated.

## `ClosingApprovalPanel`

States:

* Signing readiness;
* condition satisfaction;
* funds flow;
* closing readiness;
* completion;
* insufficient authority;
* invalidated.

## `CompletionRecord`

Properties:

* Closed;
* pending evidence;
* reopened;
* archived.

## `PostClosingObligation`

Properties:

* Active;
* due soon;
* overdue;
* disputed;
* complete;
* waived.

---

# 98. Production object model

## `ClosingWorkspace`

```text
id
dealId
status
closingType
signingDate
targetClosingAt
actualClosingAt
effectiveAt
longStopAt
currentChecklistVersionId
currentFundsFlowVersionId
currentAgendaVersionId
commercialBaselineId
confidentialityLevel
createdAt
updatedAt
```

## `ClosingChecklistVersion`

```text
id
closingWorkspaceId
version
status
templateId
templateVersion
sourceDocumentIds
createdBy
approvedBy
approvedAt
createdAt
```

## `ClosingRequirement`

```text
id
checklistVersionId
requirementType
category
title
description
basis
sourceClauseReference
responsiblePartyId
ownerId
reviewerId
dueAt
criticality
state
evidenceRequirement
blocking
postClosing
accessLevel
createdAt
updatedAt
```

## `ClosingDependency`

```text
id
requirementId
dependencyType
dependencyRequirementId
dependencyObjectType
dependencyObjectId
state
createdAt
```

## `ClosingEvidence`

```text
id
requirementId
evidenceType
documentId
documentVersionId
externalReference
submittedBy
submittedAt
state
reviewedBy
reviewedAt
reviewComments
expiresAt
createdAt
```

## `ClosingCondition`

```text
id
requirementId
conditionType
obligorPartyId
beneficiaryPartyId
satisfactionStandard
waiverAuthority
state
satisfiedBy
satisfiedAt
waivedBy
waivedAt
residualRisk
createdAt
updatedAt
```

## `ClosingWaiver`

```text
id
conditionId
scope
reason
residualRisk
proposedBy
legalReviewState
requiredApprovalIds
status
approvedBy
approvedAt
effectiveAt
createdAt
```

## `ClosingDocument`

```text
id
closingWorkspaceId
documentType
title
currentVersionId
draftingOwnerId
commercialAlignmentState
legalReviewState
executionState
requiredPartyIds
closingRequirementIds
createdAt
updatedAt
```

## `ClosingDocumentVersion`

```text
id
closingDocumentId
version
documentId
documentVersionId
state
commercialBaselineComparison
approvedForExecutionBy
approvedForExecutionAt
checksum
supersededBy
createdAt
```

## `ClosingSignatory`

```text
id
closingDocumentVersionId
partyId
personId
role
authorityEvidenceId
signatureMethod
signatureState
invitedAt
signedAt
signatureEvidenceId
createdAt
updatedAt
```

## `SignaturePackage`

```text
id
closingWorkspaceId
providerType
providerPackageId
documentVersionIds
signingOrder
status
approvedBy
sentAt
completedAt
certificateDocumentId
createdAt
```

## `FundsFlowVersion`

```text
id
closingWorkspaceId
version
currency
status
totalSources
totalUses
reconciliationDifference
commercialBaselineId
preparedBy
reviewedBy
approvedBy
approvedAt
createdAt
```

## `FundsFlowLine`

```text
id
fundsFlowVersionId
lineType
category
payorPartyId
recipientPartyId
amount
currency
paymentInstructionId
dueAt
state
sourceReference
evidenceId
createdAt
updatedAt
```

## `PaymentInstruction`

```text
id
closingWorkspaceId
partyId
accountHolder
institutionName
maskedAccountIdentifier
currency
verificationState
firstVerifiedBy
firstVerifiedAt
secondVerifiedBy
secondVerifiedAt
changedAt
accessLevel
createdAt
updatedAt
```

## `ClosingAgendaVersion`

```text
id
closingWorkspaceId
version
status
scheduledStartAt
timezone
createdBy
approvedBy
createdAt
```

## `ClosingAgendaStep`

```text
id
agendaVersionId
sequence
scheduledAt
title
description
ownerId
dependencyIds
evidenceRequirement
state
startedAt
completedAt
completedBy
createdAt
```

## `ClosingApproval`

```text
id
closingWorkspaceId
approvalType
objectType
objectId
requiredAuthority
assignedTo
status
conditions
submittedAt
decidedBy
decidedAt
invalidatedAt
invalidationReason
createdAt
```

## `ClosingBlocker`

```text
id
closingWorkspaceId
sourceType
sourceId
title
description
severity
consequence
ownerId
dueAt
state
resolution
resolvedBy
resolvedAt
createdAt
```

## `CompletionRecord`

```text
id
closingWorkspaceId
signingAt
closingAt
effectiveAt
finalConsideration
currency
fundsFlowVersionId
documentVersionIds
conditionSnapshot
waiverSnapshot
approvalSnapshot
completionEvidenceIds
confirmedBy
confirmedAt
status
auditIdentifier
createdAt
```

## `PostClosingObligation`

```text
id
closingWorkspaceId
sourceRequirementId
obligationType
title
responsiblePartyId
ownerId
dueAt
evidenceRequirement
state
completedBy
completedAt
createdAt
updatedAt
```

The domain should be append-oriented and versioned. A signed document, approved funds-flow statement or completion record should never be silently mutated.

---

# 99. Suggested routes

Primary:

```text
/deals/:dealId/closing
```

Checklist:

```text
/deals/:dealId/closing?view=checklist
```

Selected requirement:

```text
/deals/:dealId/closing?requirement=:requirementId
```

Conditions:

```text
/deals/:dealId/closing?view=conditions
```

Documents:

```text
/deals/:dealId/closing?view=documents&document=:documentId
```

Signatures:

```text
/deals/:dealId/closing?view=documents&panel=signatures
```

Funds flow:

```text
/deals/:dealId/closing?view=funds-flow
```

Closing agenda:

```text
/deals/:dealId/closing?view=agenda
```

Approvals:

```text
/deals/:dealId/closing?view=approvals
```

Closing-day mode:

```text
/deals/:dealId/closing/live
```

Post-closing:

```text
/deals/:dealId/closing?view=post-closing
```

Completion record:

```text
/deals/:dealId/closing/completion
```

---

# 100. Repository direction

The repository already provides useful closing foundations:

* A dedicated legal-closing agent;
* Closing-document generation concepts;
* Conditions-precedent material;
* SPA and term-sheet structures;
* Explicit preview-before-generation behavior;
* Human approval before definitive artifact generation;
* Transaction-lifecycle support through legal closing.

The architecture documentation also explicitly states that closing artifacts require a human approval boundary and must not be presented as autonomous legal conclusions.

## Keep

* Legal-closing agent separation;
* structured closing outputs;
* preview-before-final-generation;
* explicit human approval;
* versioned document generation;
* transaction-specific playbooks;
* closing-related source material;
* deterministic comparison where inputs are structured.

## Reframe

The current implementation direction appears heavily centered on:

* Generating or reviewing closing documents;
* comparing drafts;
* producing PDF artifacts.

The final product screen must be broader.

Closing is not only document generation. It must coordinate:

* Conditions;
* evidence;
* signatures;
* funds;
* ownership transfer;
* approvals;
* closing-day sequence;
* post-closing obligations.

## Add

* Closing-workspace domain;
* versioned closing checklist;
* requirement dependencies;
* condition lifecycle;
* waiver workflow;
* commercial-baseline comparison;
* signature packages;
* signatory authority;
* funds-flow versions;
* payment verification;
* closing agenda;
* final approval gate;
* completion record;
* post-closing obligations;
* closing-binder generation;
* restricted external views.

## Critical product boundary

Do not expose agent or document-generation completion as:

> Closing complete

The transaction is complete only after authorized people confirm the required legal and financial events with appropriate evidence.

---

# 101. What not to include

Avoid:

* Confetti when closing is authorized;
* automatic closing declaration;
* one generic checklist percentage;
* submitted evidence treated as satisfied;
* waived conditions treated as satisfied;
* signing treated as closing;
* a generated PDF treated as executed;
* a signature image treated as authority confirmation;
* payment authorization treated as receipt;
* bank details shown openly;
* a one-click “release all funds” action;
* an autonomous waiver;
* legal conclusions without counsel review;
* silent definitive-document deviations;
* mutable signed documents;
* deleted checklist history;
* unversioned funds flow;
* one generic approval state;
* post-closing obligations hidden after completion;
* raw agent prompts;
* model names;
* technical document-generation controls;
* real client bank information in the mock;
* real external counsel names;
* unsupported claims about electronic-signature providers;
* unsupported legal sufficiency claims.

---

# 102. MOCKED — Pitch and demo specification

## 102.1 Purpose of the mocked screen

The mocked Closing Control Room should demonstrate that M&Ai carries the transaction from negotiated terms into controlled execution.

Its pitch narrative is:

> **M&Ai turns closing from a fragmented legal and operational checklist into an evidence-backed, approval-controlled execution workflow.**

This screen is particularly useful for:

* Demonstrating workflow orchestration;
* showing human approval;
* proving lifecycle coverage;
* live-demo transition from Negotiation;
* investor discussion of execution breadth.

It should not be the primary hero because closing control is operationally powerful but visually less immediate than the Diligence Decision Room.

---

# 103. Mocked shell state

Institution:

> **Atlas M&A Advisory**

User:

> **Ana Costa · Vice President**

Deal:

> **Project Horizon**
> Atlas Industrial · Sell-side
> Closing · Restricted workspace

Breadcrumb:

> Deals / Project Horizon / Closing

Deal navigation:

* Overview;
* Dossier;
* Documents;
* Diligence;
* Valuation;
* Buyer Universe;
* Negotiation;
* **Closing**.

---

# 104. Mocked page header

Title:

> **Closing Control Room**

Description:

> Conditions, documents, signatures and funds for Project Horizon.

Summary:

* **21 of 24 requirements accepted**
* **2 blockers**
* **1 external item pending**
* **Closing review: 14 October 2026**

Primary action:

> **Review 2 blockers**

Secondary:

> Generate closing brief

---

# 105. Mocked readiness

Display:

> **Closing readiness: Blocked**

Reasons:

1. Municipal tax certificate expired;
2. Seller payment instructions changed after verification.

Supporting:

* Conditions: 8 of 9 accepted;
* documents: 12 of 14 execution-ready;
* signatures: 21 of 22 ready;
* funds flow: balanced but verification invalidated;
* approvals: 4 of 5 complete.

---

# 106. Mocked critical blockers

## Blocker 1

> **Updated municipal tax certificate required**

Responsible:

> Seller

Owner:

> Daniel Ribeiro

State:

> Replacement requested · Due today at 16:00

Consequence:

> Blocks final condition-satisfaction approval

Action:

> Review request

## Blocker 2

> **Seller payment instructions require re-verification**

Cause:

> Account details changed after dual approval.

Owner:

> Ana Costa

Consequence:

> Blocks funds release

Action:

> Start independent verification

---

# 107. Mocked conditions

Show five representative conditions:

| Condition                 | State        | Owner            |
| ------------------------- | ------------ | ---------------- |
| Regulatory approval       | Satisfied    | External counsel |
| Buyer corporate approval  | Satisfied    | Buyer counsel    |
| Material customer consent | Satisfied    | Felipe Rocha     |
| Municipal tax certificate | **Blocked**  | Daniel Ribeiro   |
| Bring-down confirmation   | Under review | External counsel |

Summary:

> **8 satisfied · 1 blocked · 1 approved waiver**

---

# 108. Mocked approved waiver

> **Updated insurance endorsement**

State:

> Waived for closing

Residual obligation:

> Deliver endorsement within five business days after closing.

Protection:

> Specific covenant and holdback of R$ 1,5 mi.

Approvals:

* External counsel;
* Marina Alves;
* client principal.

---

# 109. Mocked definitive documents

| Document                         | Version | State              |
| -------------------------------- | ------- | ------------------ |
| Definitive Acquisition Agreement | v12     | Execution version  |
| Escrow Agreement                 | v6      | Execution version  |
| Transition Services Agreement    | v4      | Legal review       |
| Seller Closing Certificate       | v3      | Awaiting signature |
| Buyer Closing Certificate        | v2      | Ready              |

Commercial deviation:

> None unresolved

Supporting:

> Approved term-sheet baseline v3 fully reconciled.

---

# 110. Mocked signatures

Summary:

> **21 of 22 signatures ready**

Missing:

> Ricardo Nunes · Seller Closing Certificate

State:

> Invitation viewed · Not signed

Due:

> Today at 18:00

Authority:

> Confirmed through seller corporate approval.

Primary action:

> Send reminder

---

# 111. Mocked funds flow

## Summary

> **Total funding required**
> **R$ 419,6 mi**

Uses:

* Seller proceeds: **R$ 401,2 mi**
* Debt repayment: **R$ 12,8 mi**
* Advisory and transaction costs: **R$ 5,6 mi**

Separate escrow:

> **R$ 23,6 mi**

Reconciliation:

> Balanced · R$ 0 difference

Verification:

> **Blocked · Seller instructions changed**

---

# 112. Mocked payment instructions

## Buyer funding account

> Verified by two reviewers

## Seller proceeds account

> **Changed after verification**

Masked account:

> •••• 4271

Required:

* Independent call-back;
* second reviewer;
* client confirmation.

## Debt repayment account

> Verified

## Escrow account

> Verified

No real banking information should appear.

---

# 113. Mocked closing agenda

Closing date:

> **14 October 2026**

| Time  | Step                           | State     |
| ----- | ------------------------------ | --------- |
| 09:00 | Final closing-readiness review | Scheduled |
| 10:00 | Release signature packages     | Waiting   |
| 11:00 | Confirm buyer funding          | Ready     |
| 12:00 | Initiate payments              | Blocked   |
| 13:00 | Confirm seller receipt         | Waiting   |
| 14:00 | Release transfer documents     | Waiting   |
| 15:00 | Record legal completion        | Waiting   |

---

# 114. Mocked approval panel

Title:

> **Final closing approval**

State:

> Not ready

Required authorities:

* Marina Alves · Deal Lead — Approved;
* Ana Costa · Funds-flow review — Pending;
* external counsel · Legal readiness — Pending;
* client principal · Completion authority — Approved.

Open conditions:

* Tax certificate;
* payment-instruction re-verification.

Primary action:

> **Review blockers**

Disabled action:

> Authorize closing

Supporting:

> Available when all critical requirements are resolved or validly waived.

---

# 115. Mocked final ready state

After blockers are resolved:

> **Ready for closing authorization**

Summary:

* 24 of 24 critical requirements resolved;
* 19 execution documents approved;
* 22 required signatures ready;
* funds flow balanced;
* payment instructions dual-verified;
* no critical blockers;
* one approved post-closing covenant.

Primary action:

> **Authorize closing**

---

# 116. Recommended static pitch composition

```text
┌──────────────────────────────────────────────────────────────────┐
│ Closing Control Room · 21 / 24 accepted · 2 blockers            │
├─────────────────────────────────┬────────────────────────────────┤
│ Critical requirements           │ Closing readiness              │
│                                 │                                │
│ Tax certificate                 │ BLOCKED                        │
│ Replacement required            │                                │
│                                 │ Conditions       8 / 9         │
│ Payment instructions            │ Documents       12 / 14        │
│ Re-verification required        │ Signatures      21 / 22        │
│                                 │ Funds flow       Balanced       │
│ Final signature                 │                                │
│ Awaiting seller                 │ Closing review   14 October    │
├─────────────────────────────────┴────────────────────────────────┤
│ Final approval unavailable until both blockers are resolved      │
└──────────────────────────────────────────────────────────────────┘
```

This communicates:

* Operational readiness;
* evidence-based blockers;
* multi-domain orchestration;
* human authorization;
* no premature completion.

---

# 117. Pitch-specific simplification

## Keep visible

* Closing Control Room;
* 21 of 24 requirements;
* 2 blockers;
* tax certificate;
* payment-instruction verification;
* signature status;
* balanced funds flow;
* closing date;
* final approval unavailable.

## Hide

* Complete checklist;
* every condition;
* full document matrix;
* full funds-flow lines;
* bank details;
* long approval chain;
* post-closing items;
* activity history;
* source clauses;
* advanced filters.

## Readability requirement

At deck scale, these must remain readable:

* **Closing Control Room**
* **2 blockers**
* **Tax certificate**
* **Payment instructions**
* **21 / 22 signatures**
* **Funds flow balanced**
* **14 October**
* **Final approval unavailable**

---

# 118. Recommended demo flows

## Flow A — Negotiation to Closing

```text
Negotiation Room
  ↓
Signed term sheet approved
  ↓
Transfer commercial baseline
  ↓
Closing Control Room created
  ↓
Checklist generated for review
  ↓
Owners assigned
```

## Flow B — Condition to evidence

```text
Conditions
  ↓
Municipal tax certificate
  ↓
Submitted certificate expired
  ↓
Create replacement request
  ↓
New certificate uploaded
  ↓
Counsel accepts evidence
  ↓
Condition satisfied
```

## Flow C — Commercial deviation

```text
Definitive document v12
  ↓
Compare with term-sheet baseline
  ↓
Escrow deviation detected
  ↓
Open source clauses
  ↓
Counsel confirms correction
  ↓
Execution version approved
```

## Flow D — Signature coordination

```text
Documents & Signatures
  ↓
One signature missing
  ↓
Inspect signatory authority
  ↓
Send reminder
  ↓
Signature received
  ↓
Package complete
```

## Flow E — Payment-security exception

```text
Funds Flow
  ↓
Seller account changed
  ↓
Prior verification invalidated
  ↓
Independent confirmation
  ↓
Second reviewer verifies
  ↓
Funds release becomes available
```

## Flow F — Final approval

```text
Closing blockers resolved
  ↓
Start closing-readiness review
  ↓
Review conditions, documents, signatures and funds
  ↓
Client and counsel authority confirmed
  ↓
Authorize closing
```

## Flow G — Closing day

```text
Closing-day mode
  ↓
Release signatures
  ↓
Confirm buyer funding
  ↓
Transmit funds
  ↓
Confirm seller receipt
  ↓
Release transfer documents
  ↓
Record completion
```

## Flow H — Post-closing

```text
Closing completed
  ↓
One insurance endorsement remains
  ↓
Post-closing obligation assigned
  ↓
Evidence received
  ↓
Obligation completed
  ↓
Deal ready to archive
```

---

# 119. UX prototype tasks to validate

Test with bankers and counsel using tasks such as:

1. Identify why the transaction cannot close.
2. Find every critical condition.
3. Determine whether a condition is satisfied or waived.
4. Inspect evidence supporting one condition.
5. Find the owner of an overdue deliverable.
6. Identify the current execution version of the definitive agreement.
7. Compare it with the approved term sheet.
8. Find every missing signature.
9. Confirm a signatory’s authority.
10. Determine whether the funds-flow statement balances.
11. Find which payment instruction changed.
12. Re-verify that instruction.
13. Determine who can authorize closing.
14. Identify whether client approval is complete.
15. Run the final readiness review.
16. Authorize closing.
17. Follow the closing-day agenda.
18. Record seller receipt of funds.
19. Record legal completion.
20. Find every post-closing obligation.
21. Generate the final closing checklist.
22. Open the completion record.
23. Return to the same blocker after inspecting evidence.

## Measures

Record:

* Time to identify the principal blocker;
* whether submitted and satisfied are confused;
* whether satisfied and waived are confused;
* whether signing and closing are confused;
* whether users trust the readiness state;
* whether funds-flow reconciliation is understandable;
* whether bank-detail restrictions are clear;
* whether final approval feels adequately controlled;
* whether closing-day mode reduces coordination overhead;
* whether users can reconstruct the completion event;
* whether the interface feels like a generic task manager;
* whether external counsel can use the workflow without unnecessary banker data.

---

# 120. Design validation criteria

The Closing Control Room is ready for approval when:

1. Signing readiness and closing readiness are distinct.
2. Submitted evidence is not treated as accepted.
3. Accepted evidence is not automatically treated as condition satisfaction.
4. Satisfied and waived conditions remain distinct.
5. Critical blockers appear before completion counts.
6. Every requirement has an owner and evidence expectation.
7. Dependencies identify the critical path.
8. Closing templates remain counsel-reviewable.
9. Definitive documents compare with the approved commercial baseline.
10. Execution versions are immutable.
11. Generated documents do not appear executed.
12. Signature packages identify every required party.
13. Signatory authority is explicit.
14. Funds-flow sources and uses reconcile.
15. Payment instructions use controlled verification.
16. Instruction changes invalidate approval.
17. Authorized funds flow is distinct from funds sent.
18. Funds sent is distinct from funds received.
19. Ownership transfer requires evidence.
20. Closing authority is explicit.
21. Material changes invalidate closing approval.
22. The system never closes a transaction autonomously.
23. Completion produces an immutable record.
24. Closed pending evidence remains distinct from Closed.
25. Post-closing obligations remain visible.
26. Restricted details do not leak through Copilot or exports.
27. External users see only assigned requirements.
28. The screen remains useful without Copilot.
29. The screen remains useful without document-generation agents.
30. Partial integration failures do not hide existing evidence.
31. Archived closing records remain auditable.
32. Mobile supports review, evidence and approval.
33. Closing-day mode supports rapid execution without losing auditability.
34. All critical actions are keyboard accessible.
35. The pitch mock remains fictional.
36. No real banking information appears.
37. The static screen remains readable.
38. The screen communicates orchestration rather than premature celebration.

---

# 121. Final design target

The correct design target is not:

> “A digital checklist that turns green when every task is complete.”

It is:

> **An evidence-backed transaction-control workspace where conditions, definitive documents, signatures, funds and human authority converge into a defensible legal-completion record.**

Its defining interaction is:

> **Establish the closing requirements → resolve the blockers → verify documents and evidence → confirm signatures and funds → obtain final authority → execute the agenda → record completion**

**Next iteration: Agentic Workspace.**
