---
canonical_name: "Deal Overview"
definition_id: "BD-05"
definition_status: "Governed for MAI-90"
screen_family: "deal-execution"
owning_task: "MAI-92"
canonical_routes:
  - "/deals/:dealId/overview"
figma_file_key: "otMJE31OKIxdXogV4RNbGQ"
figma_status: "Ready for owner review in MAI-92"
figma_area: "MAI Banker Workspace — Design System & Product UI / 06 Application Shell"
figma_nodes:
  - "https://www.figma.com/design/otMJE31OKIxdXogV4RNbGQ?node-id=205-662"
  - "https://www.figma.com/design/otMJE31OKIxdXogV4RNbGQ?node-id=205-3285"
  - "https://www.figma.com/design/otMJE31OKIxdXogV4RNbGQ?node-id=205-3349"
related_definitions:
  - "design/26_Cross_Screen_Interaction_Map.md"
  - "design/27_Shared_State_Model.md"
  - "design/0_Implementaion_Roadmap.md"
last_reviewed_task: "MAI-90"
implementation_capability_boundary: "Product definition only; no frontend, backend, Storybook, token export, or runtime behavior implemented by this file."
mock_demo_data_boundary: "Use fictional/demo transaction data only; do not encode real client, counterparty, credential, or confidential deal data."
---
# Deal Overview

## 1. Screen definition

The **Deal Overview** is the operational landing page for one transaction.

It consolidates the deal’s current state into a concise, decision-oriented view and routes the user into the correct specialized workspace.

It should answer five questions immediately:

1. **What transaction is this?**
2. **What phase and operating state is it in?**
3. **What materially changed?**
4. **What is blocked or at risk?**
5. **What requires attention next?**

The Deal Overview should summarize the transaction without attempting to reproduce the Target Dossier, Documents, Diligence, Valuation, Matching, Negotiation or Closing workspaces. This boundary is already established in the product architecture: the Overview is the landing page for a specific transaction and should explain its state, changes, blockers and next required action. 

Its central interaction is:

> **Understand deal state → Identify material exception → Enter exact workflow → Act**

---

# 2. Intention of the screen

## Primary intention

The Deal Overview should help a banker regain transaction context after:

* Opening the deal from the portfolio;
* Returning after several days;
* Receiving a task or notification;
* Joining the deal team;
* Preparing for an internal review;
* Preparing for a client meeting;
* Switching from another active transaction.

The user should not need to open five workspaces just to understand whether the deal is progressing normally.

## User outcome

After reviewing the screen, the banker should be able to say:

> “I understand where the transaction stands, what changed, what is threatening execution and which workspace I need to open next.”

## Product outcome

The screen should make M&Ai feel like a coherent transaction operating system.

It should visibly connect:

* Target and transaction context;
* Document readiness;
* Diligence findings;
* Valuation state;
* Counterparty activity;
* Negotiation status;
* Closing readiness;
* Tasks and approvals;
* Human ownership;
* Audit history.

M&Ai’s product model connects evidence, deterministic analysis and human decisions rather than presenting isolated AI outputs. The Overview should summarize that chain without exposing the underlying technical architecture. 

---

# 3. What the Deal Overview is not

The screen should not become:

* A miniature version of every deal workspace;
* A generic analytics dashboard;
* A transaction CRM record;
* A static company profile;
* A full Target Dossier;
* A Kanban board;
* A complete task manager;
* A notification feed;
* A large AI-generated narrative;
* A project plan with hundreds of checklist items;
* An audit log;
* A valuation model;
* A document browser;
* A permanent chat interface.

The Deal Overview should not try to answer every transaction question.

It should answer:

> **“Where does this deal stand, and where should I go next?”**

---

# 4. Relationship to adjacent screens

| Screen                       | Primary question                                                 |
| ---------------------------- | ---------------------------------------------------------------- |
| **Deals Portfolio**          | Which transaction should I open?                                 |
| **Deal Overview**            | What is happening in this transaction?                           |
| **Target Dossier**           | What do we know about the target and transaction context?        |
| **Documents & VDR**          | What evidence is available, missing or changing?                 |
| **Diligence Decision Room**  | Which material findings require review?                          |
| **Valuation Lab**            | How is the transaction value calculated and changing?            |
| **Buyer or Target Universe** | Which counterparties fit the transaction strategy?               |
| **Negotiation Room**         | Which commercial terms and alternatives are under consideration? |
| **Closing Control Room**     | What must be completed before legal closing?                     |
| **Tasks & Approvals**        | What work and decisions are assigned?                            |
| **Activity & Audit**         | How did the transaction state evolve?                            |

## Overview versus Command Center

The Command Center is institution-wide.

The Deal Overview is transaction-specific.

The Command Center may show:

> Project Horizon requires approval of a R$ 42 mi valuation adjustment.

The Deal Overview should show:

* Why the decision exists;
* which workstream created it;
* how it affects the transaction;
* which milestone it blocks;
* where the user can review it.

## Overview versus Target Dossier

The Overview may show:

> Atlas Industrial
> Industrial technology · Brazil
> LTM revenue: R$ 310 mi

The Target Dossier should contain:

* Detailed business model;
* ownership;
* products;
* markets;
* management;
* complete financial profile;
* evidence-linked facts;
* open questions;
* historical changes.

## Overview versus Tasks & Approvals

The Overview shows the most consequential open work inside this deal.

The complete Tasks & Approvals workspace supports:

* All tasks;
* assignment;
* delegation;
* filtering;
* completed work;
* approval history;
* batch operations.

---

# 5. Primary users

## 5.1 Associate

The associate needs to understand:

* Assigned work;
* missing evidence;
* open questions;
* workstream status;
* next deliverable;
* recent changes;
* review dependencies.

## 5.2 Vice President

The vice president needs:

* Required decisions;
* material findings;
* valuation changes;
* milestone readiness;
* team dependencies;
* unresolved blockers;
* client-facing implications.

## 5.3 Managing Director or Partner

The partner needs:

* Transaction status;
* material commercial risk;
* valuation range;
* current counterparty position;
* next external milestone;
* decisions requiring senior authority;
* concise explanation of what changed.

## 5.4 Specialist reviewer

A legal, tax, financial or operational specialist needs:

* Their assigned workstream;
* relevant blockers;
* source status;
* review requests;
* dependencies on other workstreams.

## 5.5 Auditor or observer

A read-only user needs:

* Current state;
* approved conclusions;
* milestone history;
* visible source provenance;
* restricted actions.

The screen should adapt emphasis and actions based on the user’s authority without changing its fundamental architecture.

---

# 6. Primary job to be done

> When I open a deal, summarize its current execution state, surface the most material exceptions and route me to the exact transaction context that requires work.

## Secondary jobs

The user should also be able to:

* Resume recent work;
* inspect the current transaction phase;
* review near-term milestones;
* see who owns each workstream;
* understand what changed since the last visit;
* identify missing evidence;
* see the latest approved valuation;
* review counterparty activity;
* access recent deliverables;
* ask M&Ai for a deal brief;
* open team and permission information;
* change stage or status, when authorized.

---

# 7. Core screen model

The Deal Overview should be organized around six layers:

## Layer 1 — Identity

What deal is this?

## Layer 2 — Operating state

Where is the transaction in its lifecycle?

## Layer 3 — Attention

What requires review, approval or intervention?

## Layer 4 — Transaction intelligence

What are the latest material conclusions?

## Layer 5 — Execution readiness

What milestones, workstreams or dependencies are incomplete?

## Layer 6 — Routing

Which specialized workspace should the user open?

The screen should not be organized by backend service or agent.

---

# 8. Recommended screen architecture

The Deal Overview should contain nine principal regions:

1. Deal page header;
2. Transaction snapshot;
3. Attention and decision queue;
4. Current-phase execution panel;
5. M&Ai Deal Brief;
6. Workstream status;
7. Upcoming milestones;
8. Key transaction outputs;
9. Team, activity and deliverables summary.

The first viewport should prioritize:

* Deal identity;
* current phase;
* material change;
* blockers;
* decisions;
* next milestone.

---

# 9. Deal page header

The global shell already displays the active deal context and navigation. The page header should therefore remain concise.

## Recommended title

> **Overview**

Supporting description:

> Current transaction state, material changes and next required actions.

## Primary action

The primary action should adapt to the transaction state.

Examples:

* **Complete setup**
* **Review findings**
* **Approve valuation**
* **Review buyer shortlist**
* **Open negotiation**
* **Review closing blockers**

Do not use a permanent generic action such as:

> Edit deal

## Secondary actions

Recommended:

* Generate deal brief;
* export summary;
* more actions.

The page header should contain no more than one primary and two secondary actions.

---

# 10. Deal identity and transaction snapshot

## Purpose

This component gives the user enough transaction context to orient themselves without opening the Target Dossier.

## Recommended information

* Deal codename;
* target or principal organization;
* transaction side;
* transaction type;
* current stage;
* workspace status;
* confidentiality;
* indicative value;
* jurisdiction;
* deal lead;
* expected close period.

Example:

> **Project Horizon**
> Atlas Industrial · Sell-side · Full acquisition
> Due Diligence · Active · Restricted
> Indicative enterprise value: **R$ 480 mi–R$ 520 mi**
> Brazil · Expected closing: Q1 2027

## Supporting identity

Optional:

* Client;
* seller;
* sponsor;
* internal reference;
* sector;
* date created.

## UX direction

Do not turn the snapshot into a large profile card.

It should occupy limited vertical space and route users to:

* Target Dossier;
* Deal Settings;
* Team & Access.

## Editable information

Most fields should not be edited inline.

Use:

> Edit deal details

to open the appropriate settings or dossier surface.

Inline editing on the Overview risks accidental changes to audited transaction context.

---

# 11. Transaction phase map

## Purpose

The phase map explains where the transaction is operating without implying false precision.

## Recommended structure

For a sell-side deal:

```text
Preparation
    ↓
Buyer Universe
    ↓
Outreach
    ↓
Due Diligence
    ↓
Valuation
    ↓
Negotiation
    ↓
Closing
```

The map should support states:

* Complete;
* active;
* upcoming;
* blocked;
* reopened;
* skipped;
* not applicable.

## Current mocked state

> **Due Diligence — Active**

Previous:

> Buyer Universe — Complete

Parallel:

> Valuation — In progress

Upcoming:

> Negotiation — Not started

## Nonlinear behavior

M&A transactions are not strict funnels.

The design must support:

* Valuation beginning during diligence;
* buyer outreach continuing while diligence starts;
* a prior stage reopening;
* negotiation continuing while closing preparation begins;
* skipped stages;
* paused execution.

## What not to display

Avoid:

> 63% complete

A transaction may be advanced in one workstream and blocked in another. A single progress percentage creates false confidence.

## Stage change

Authorized users may select:

> Manage stage

Stage changes should explain:

* Which workflows activate;
* which milestones are created;
* what is marked complete;
* who is notified;
* whether approval is required.

---

# 12. Deal operating state

Transaction phase and operating state should remain separate.

## Recommended operating states

* On track;
* attention required;
* at risk;
* blocked;
* paused;
* closing ready;
* completed;
* archived.

## Explainability

Every state must expose its reasons.

Example:

> **At risk**

Reasons:

* One high-severity financial finding unresolved;
* valuation scenario v4 awaiting approval;
* diligence committee in two days.

Do not display:

> Health score: 72

unless the score is fully explained and genuinely decision-useful.

## State ownership

The operating state may be:

* System-derived from explicit conditions;
* manually set by an authorized deal lead;
* or a combination.

The interface should distinguish:

> System-detected

from:

> Set by Marina Alves

---

# 13. Attention and decision queue

## 13.1 Purpose

This is the most important component on the Deal Overview.

It should answer:

> **What requires action inside this transaction?**

## 13.2 Item types

* Approval required;
* review required;
* missing evidence;
* overdue task;
* material finding;
* valuation assumption;
* shortlist decision;
* negotiation position;
* closing condition;
* document conflict;
* access issue;
* milestone blocker.

## 13.3 Item anatomy

Each item should display:

* Action type;
* concise title;
* material consequence;
* workstream;
* assignee;
* due date;
* blocking state;
* exact destination.

Example:

> **Approval required**
> Approve customer-concentration adjustment
> Risk-adjusted valuation midpoint decreases by **R$ 42 mi**
> Financial Diligence · Due today
> Blocks valuation scenario v4
>
> **Open review**

## 13.4 Recommended visible count

Show:

* Three to five items in the initial view;
* a **View all tasks and approvals** action.

Do not place the complete work queue on the Overview.

## 13.5 Action behavior

Material decisions must open the corresponding evidence and impact context.

Do not allow one-click approval from the Overview for:

* High-risk findings;
* valuation changes;
* buyer shortlist;
* negotiation position;
* closing readiness.

The user should review the underlying context first.

---

# 14. M&Ai Deal Brief

## 14.1 Purpose

The Deal Brief provides a concise, source-linked explanation of what materially changed inside the transaction.

It should answer:

> **What do I need to know since my last review?**

## 14.2 Recommended content

Three to five items:

* New material finding;
* revised valuation;
* document conflict;
* counterparty change;
* negotiation movement;
* closing-condition change;
* milestone risk.

## Example

> **Customer concentration now exceeds review threshold**
> The top three customers represent 41,2% of LTM revenue, up from 31,8%. The revised downside scenario reduces the enterprise-value midpoint by R$ 42 mi.
>
> 3 sources · Diligence finding · Scenario v4

## Another example

> **Buyer universe expanded**
> Three strategic buyers now exceed the approved fit threshold after updated sector and capacity analysis.
>
> Buyer Universe · Shortlist review required

## Source provenance

Each item should link to:

* Supporting documents;
* finding;
* calculation;
* decision;
* counterparty record;
* milestone;
* related workspace.

## Review state

Brief items may be:

* New;
* reviewed;
* superseded;
* restricted.

## UX rule

The Deal Brief should not become an unstructured AI-generated paragraph.

Each material change should be independently scannable and traceable.

---

# 15. Current-phase execution panel

## Purpose

The Deal Overview should adapt its central execution summary to the current phase.

This is the primary stage-aware component.

The overall page structure remains stable, but this panel changes emphasis.

---

# 16. Preparation-phase panel

When the deal is in Preparation, show:

* Target Dossier readiness;
* document-source readiness;
* workstream configuration;
* information memorandum status;
* financial model readiness;
* buyer or target criteria;
* team setup;
* first external milestone.

Example:

> **Preparation readiness**

* Target Dossier: 68% evidence coverage;
* document source: 127 files synchronized;
* financial history: missing FY2023 monthly detail;
* buyer criteria: approved;
* information memorandum: draft v2;
* launch readiness: 4 of 6 required conditions complete.

Avoid reducing this to one percentage.

---

# 17. Buyer or Target Universe panel

For a sell-side process:

> **Buyer Universe**

Show:

* Total reviewed;
* qualified;
* approved shortlist;
* contacted;
* responses;
* conflicts;
* next shortlist decision.

Example:

> 38 reviewed · 12 qualified · 8 approved · 5 contacted

Material item:

> Three newly identified strategic buyers exceed the approved fit threshold.

For a buy-side process:

> **Target Universe**

Show:

* Candidates identified;
* screened;
* active;
* rejected;
* priority targets;
* next investment decision.

---

# 18. Due Diligence phase panel

Show:

* Documents reviewed;
* open findings;
* high-severity findings;
* evidence completeness;
* workstreams complete;
* decisions pending;
* diligence report status.

Example:

> **Due Diligence**

* 127 documents synchronized;
* 18 open findings;
* 6 high-severity;
* 3 decisions pending;
* evidence coverage: 83%;
* financial and tax workstreams at risk.

Primary action:

> Open Diligence Decision Room

The panel should not duplicate the complete findings queue.

---

# 19. Valuation phase panel

Show:

* Current approved range;
* active scenario;
* methods completed;
* open assumptions;
* findings affecting valuation;
* pending approval;
* last material change.

Example:

> **Current approved range**
> R$ 438 mi–R$ 478 mi
> Risk-adjusted scenario v4

Supporting:

* DCF complete;
* trading comparables complete;
* precedent transactions in review;
* two assumptions awaiting approval;
* midpoint changed by −R$ 42 mi.

Primary action:

> Open Valuation Lab

---

# 20. Negotiation phase panel

Show:

* Active bidder or counterparty;
* latest proposal;
* valuation;
* consideration mix;
* material term changes;
* internal position;
* approval state;
* next deadline.

Example:

> **Latest proposal**
> R$ 465 mi enterprise value
> 80% cash · 10% escrow · 10% earn-out

Changes:

* Earn-out period increased from 18 to 24 months;
* escrow reduced from 15% to 10%;
* exclusivity requested for 45 days.

Primary action:

> Open Negotiation Room

Do not reveal restricted negotiation information to unauthorized users.

---

# 21. Closing phase panel

Show:

* Closing readiness;
* conditions precedent;
* blockers;
* signatures;
* funds flow;
* open deliverables;
* required final approvals;
* expected closing date.

Example:

> **Closing readiness**

* 21 of 24 conditions complete;
* 2 overdue;
* 1 awaiting external evidence;
* signature package ready;
* funds flow in review;
* closing readiness not approved.

Primary action:

> Open Closing Control Room

---

# 22. Completed or archived panel

For a completed deal, show:

* Completion date;
* final consideration;
* final approved valuation;
* deliverables;
* post-closing items;
* success-linked commercial record, when authorized;
* archive state.

For archived:

> **Archived · Read only**

Actions:

* View deliverables;
* export audit package;
* restore, when authorized.

Do not present a celebratory closing animation in the operating product.

---

# 23. Workstream status

## Purpose

The workstream panel shows how the transaction is progressing across disciplines.

## Recommended workstreams

* Financial;
* legal;
* tax;
* commercial;
* operational;
* technology;
* human resources;
* regulatory;
* environmental;
* cybersecurity.

Only enabled workstreams should appear.

## Required information

Each workstream should show:

* State;
* owner;
* open material items;
* evidence completeness;
* next action;
* due date.

Example:

| Workstream  | State       | Material items | Owner            | Next action                      |
| ----------- | ----------- | -------------: | ---------------- | -------------------------------- |
| Financial   | At risk     |              3 | Ana Costa        | Approve concentration adjustment |
| Legal       | In review   |              2 | External counsel | Review change-of-control clauses |
| Tax         | Blocked     |              1 | Daniel Ribeiro   | Request supporting tax documents |
| Commercial  | On track    |              1 | Felipe Rocha     | Complete market review           |
| Operational | Not started |              0 | Unassigned       | Assign workstream lead           |

## State vocabulary

* Not started;
* in progress;
* in review;
* attention required;
* blocked;
* complete;
* not applicable.

## UX direction

Use a structured table or compact rows.

Avoid presenting workstreams as large colorful doughnut charts.

---

# 24. Evidence and document readiness

## Purpose

This summary shows whether M&Ai has sufficient, current and reliable evidence to support transaction conclusions.

## Recommended metrics

* Documents synchronized;
* documents processed;
* processing failures;
* missing-document requests;
* evidence coverage;
* stale source;
* conflicting documents;
* latest synchronization.

Example:

> **Evidence readiness**

* 127 documents synchronized;
* 121 processed;
* 4 require classification;
* 2 failed extraction;
* 6 open information requests;
* synchronized 4 min ago.

## Important distinctions

### Document coverage

Are expected documents available?

### Evidence coverage

Do the required sources support a specific conclusion?

### Processing status

Can M&Ai read and structure the documents?

### Source freshness

Has the connected source been synchronized recently?

These concepts should not be combined into one “data quality” percentage.

## Primary action

> Review Documents

Secondary:

> View information requests

---

# 25. Diligence and risk snapshot

## Purpose

Expose the transaction’s most material unresolved risks without reproducing the Decision Room.

## Recommended content

* High-severity findings;
* findings awaiting approval;
* categories at risk;
* most material financial exposure;
* evidence gaps;
* report readiness.

Example:

> **6 high-severity findings**

Top items:

* Customer concentration · −R$ 42 mi valuation impact;
* Labor contingencies · R$ 11,4 mi potential exposure;
* Change-of-control clauses · 2 material contracts;
* Tax-credit recoverability · Evidence incomplete.

Primary action:

> Review findings

## UX rule

Show no more than three or four findings.

The complete queue belongs in Diligence.

---

# 26. Valuation snapshot

## Purpose

Give the user the latest approved valuation context and clearly distinguish approved, proposed and historical values.

## Required information

* Current approved range;
* value basis;
* scenario;
* valuation methods;
* version;
* approval status;
* last material adjustment;
* timestamp.

Example:

> **Approved enterprise value**
> R$ 438 mi–R$ 478 mi
> Risk-adjusted scenario v4

Supporting:

> DCF · Trading comparables · Precedent transactions
> Approved by Marina Alves · Today at 10:18

Pending:

> Proposed downside scenario v5 awaiting review

## Status distinction

Use clear labels:

* Approved;
* proposed;
* draft;
* superseded;
* restricted.

Do not display a proposed model output as the current deal valuation.

## Primary action

> Open Valuation Lab

---

# 27. Counterparty or matching snapshot

This component should adapt to transaction side.

## Sell-side

Show:

* Buyer universe;
* approved shortlist;
* outreach status;
* active bidders;
* withdrawn parties;
* next shortlist or offer decision.

## Buy-side

Show:

* Target universe;
* screened targets;
* priority targets;
* active engagement;
* rejected targets;
* next investment decision.

## Example

> **Buyer Universe**

* 38 reviewed;
* 12 qualified;
* 8 approved;
* 5 contacted;
* 2 active;
* 1 withdrew.

Material change:

> Three buyers moved above the approved strategic-fit threshold.

Primary action:

> Review Buyer Universe

This component may be hidden before the relevant workflow is activated.

---

# 28. Negotiation snapshot

Show only when negotiation activity exists.

Recommended information:

* Active counterparties;
* latest offer;
* internal position;
* unresolved material terms;
* next deadline;
* approval state.

Example:

> **Latest proposal · Northbridge Capital**

* Enterprise value: R$ 465 mi;
* cash at closing: 80%;
* earn-out: 10%;
* escrow: 10%;
* exclusivity: 45 days;
* 3 material terms unresolved.

Primary action:

> Compare proposals

Unauthorized users should see:

> Negotiation details restricted

rather than partial commercially sensitive information.

---

# 29. Closing snapshot

Show when closing preparation exists, even if the transaction remains in Negotiation.

Recommended information:

* Conditions complete;
* conditions overdue;
* signatures;
* funds flow;
* regulatory items;
* required approvals;
* target closing date.

Example:

> **Closing preparation**

* 21 of 24 conditions complete;
* 2 overdue;
* signature package in review;
* funds flow pending approval;
* target closing: 14 October 2026.

Primary action:

> Review closing readiness

---

# 30. Upcoming milestones

## Purpose

Show the next internal and external transaction commitments.

## Recommended visible count

Three to five milestones.

## Milestone types

* Diligence committee;
* management presentation;
* buyer shortlist;
* information-request deadline;
* initial bid;
* binding offer;
* valuation committee;
* term-sheet review;
* signing;
* closing;
* regulatory submission.

## Anatomy

Each milestone should show:

* Date and time;
* title;
* internal or external;
* owner;
* readiness;
* dependency;
* destination.

Example:

> **30 July · 14:00**
> Diligence committee
> Internal · Owner: Ana Costa
> **At risk** · Valuation scenario v4 awaiting approval

## Readiness states

* Ready;
* attention required;
* at risk;
* blocked;
* complete.

## UX rule

A milestone should explain why it is at risk.

Do not use a colored calendar dot without supporting text.

---

# 31. Deal team summary

## Purpose

Show accountability without turning the Overview into a complete permission-management screen.

## Recommended content

* Deal lead;
* current phase owner;
* key workstream owners;
* recent active users;
* unassigned workstreams;
* external advisors, when permitted.

Example:

> **Deal team**

* Marina Alves · Deal Lead;
* Ana Costa · Diligence and Valuation;
* Felipe Rocha · Financial and Commercial;
* Daniel Ribeiro · Tax;
* Vieira & Lopes · Legal advisor.

Status:

> Operational workstream has no assigned lead.

## Primary action

> View team and access

## Presence indicators

Optional:

* Last active;
* currently viewing;
* pending invitation.

Do not expose surveillance-style activity details.

---

# 32. Recent meaningful activity

## Purpose

Provide limited context on how the deal state changed.

## Recommended visible items

Three to five meaningful events.

Examples:

* Valuation scenario v4 generated;
* customer-concentration finding escalated;
* buyer shortlist approved;
* document source synchronized;
* closing condition reopened;
* team access changed.

## Actor distinction

Clearly distinguish:

* Human;
* AI agent;
* deterministic engine;
* document source;
* external participant.

Example:

> **10:03 · Ana Costa**
> Requested review of customer-concentration adjustment.

> **09:44 · Valuation Engine**
> Generated risk-adjusted scenario v4.

> **09:42 · Financial Risk Agent**
> Reconciled customer-revenue evidence from three sources.

## Primary action

> View full activity and audit

This should not become a social feed with likes, reactions or casual comments.

---

# 33. Deliverables summary

## Purpose

Expose the transaction artifacts most likely to be used next.

## Recommended content

* Latest diligence report;
* valuation report;
* buyer shortlist;
* information memorandum;
* negotiation comparison;
* term sheet;
* closing checklist;
* audit package.

Each should show:

* Version;
* preparation state;
* approval state;
* source date;
* owner.

Example:

> **Diligence report · v3**
> Draft · 2 sections awaiting review
> Updated today at 09:18

> **Valuation report · v4**
> Approved
> Updated today at 10:18

## Primary action

> View deliverables

Avoid placing every generated file on the Overview.

---

# 34. Next recommended actions

## Purpose

M&Ai may propose the next operational actions based on explicit transaction dependencies.

Examples:

* Review high-severity finding;
* approve valuation scenario;
* assign operational workstream;
* request missing tax evidence;
* approve buyer shortlist;
* prepare negotiation position;
* resolve closing condition.

## Recommendation anatomy

Each suggestion should show:

* Proposed action;
* reason;
* consequence;
* owner;
* exact destination.

Example:

> **Approve valuation scenario v4**
> Required before the diligence committee on 30 July.
> Blocks updated valuation report.
> Assigned to Marina Alves.

## Product language

Use:

* Recommended next action;
* suggested based on dependencies;
* requires review.

Avoid:

* AI has decided;
* autonomous next step;
* guaranteed best action.

## UX rule

Recommendations should be based on structured workflow dependencies, not vague AI intuition.

---

# 35. Contextual Copilot

The shell provides **Ask M&Ai**.

When opened from Deal Overview, suggested prompts should include:

* What changed since my last review?
* Why is this deal at risk?
* Which decisions block the next milestone?
* Summarize the highest-severity findings.
* Compare the approved and proposed valuation scenarios.
* Which workstreams are behind schedule?
* Prepare a brief for the diligence committee.
* Show missing evidence affecting valuation.

## Response behavior

The Copilot should inherit:

* Current deal;
* current user permissions;
* current stage;
* selected item, where applicable;
* latest approved versions.

Responses should:

* Link to source context;
* distinguish approved from proposed;
* identify stale information;
* avoid exposing restricted workstreams.

The Overview must remain fully useful without opening Copilot.

---

# 36. Stage-aware composition

The Overview should adapt emphasis while preserving stable spatial logic.

## Stable regions

Always retain:

* Transaction snapshot;
* attention queue;
* milestones;
* Deal Brief;
* team;
* recent activity.

## Stage-dependent regions

Change:

* Current-phase panel;
* primary action;
* key output snapshot;
* relevant workstream emphasis;
* suggested Copilot prompts.

## Example emphasis by phase

| Phase          | Primary emphasis                         |
| -------------- | ---------------------------------------- |
| Preparation    | Dossier, documents and launch readiness  |
| Buyer Universe | Counterparty qualification and shortlist |
| Due Diligence  | Findings, evidence and decisions         |
| Valuation      | Scenarios, assumptions and approval      |
| Negotiation    | Proposals, terms and trade-offs          |
| Closing        | Conditions, signatures and funds flow    |
| Completed      | Final deliverables, audit and archive    |

The layout should not completely rearrange itself when the phase changes. Predictability is more important than visual novelty.

---

# 37. Role-aware composition

The same components may change priority by user role.

## Associate

Order:

1. Assigned work;
2. workstream status;
3. evidence readiness;
4. milestones;
5. recent activity.

## Vice President

Order:

1. Decisions and blockers;
2. material changes;
3. current-phase state;
4. valuation;
5. milestones.

## Partner

Order:

1. Operating state;
2. material transaction changes;
3. valuation or latest proposal;
4. next external milestone;
5. decisions requiring authority.

Do not create completely separate products for each role.

Use controlled default ordering and permissions.

---

# 38. Recommended desktop layout

For a **1440 × 900** design canvas with a compact global sidebar and deal shell:

| Region                      | Approximate allocation |
| --------------------------- | ---------------------: |
| Global sidebar              |               72–80 px |
| Top bar                     |                  64 px |
| Deal context and navigation |             112–136 px |
| Main content                |        Remaining space |
| Main left column            |                 62–68% |
| Main right column           |                 32–38% |
| Page margins                |               24–32 px |

The shell design already identifies Deal Overview as a standard-width page rather than a dense full-width analytical workspace. 

## Recommended composition

```text
┌─────────────────────────────────────────────────────────────────┐
│ Deal context · Project Horizon · Due Diligence · Active         │
├─────────────────────────────────────────────────────────────────┤
│ Overview Dossier Documents Diligence Valuation ...              │
├───────────────────────────────────────┬─────────────────────────┤
│ Transaction snapshot                  │ Operating state         │
│ Atlas Industrial · Sell-side          │ At risk                 │
│ R$ 480 mi–R$ 520 mi                   │ 3 reasons               │
├───────────────────────────────────────┼─────────────────────────┤
│ Decisions & blockers                  │ Next milestones         │
│                                       │                         │
│ Approve concentration adjustment      │ Diligence committee     │
│ Review tax evidence                   │ Valuation review        │
│ Assign operational lead               │ Client update           │
├───────────────────────────────────────┼─────────────────────────┤
│ Current-phase execution               │ M&Ai Deal Brief         │
│ Due Diligence                         │                         │
│ 18 findings · 6 high-risk             │ 3 material changes      │
├───────────────────────────────────────┴─────────────────────────┤
│ Workstream status                                               │
├───────────────────────────┬─────────────────────────────────────┤
│ Valuation snapshot        │ Evidence readiness                  │
├───────────────────────────┼─────────────────────────────────────┤
│ Deal team                 │ Recent meaningful activity          │
└───────────────────────────┴─────────────────────────────────────┘
```

---

# 39. First-viewport requirement

The first viewport should show:

* Deal and current phase;
* operating state;
* valuation context where authorized;
* highest-priority decision;
* primary blocker;
* next milestone;
* current-phase summary;
* at least one material change.

The user should not scroll before learning why the deal requires attention.

---

# 40. Alternative layout for early-stage deals

A newly created deal will not have enough data for the complete Overview.

Use a setup-oriented composition:

```text
┌───────────────────────────────────────────────────────────────┐
│ Project Horizon · Preparation · Active                        │
├─────────────────────────────────┬─────────────────────────────┤
│ Setup readiness                 │ Immediate next actions      │
│                                 │                             │
│ Target Dossier        Incomplete│ Complete Target Dossier     │
│ Documents             6 uploaded│ Connect document source     │
│ Team                  Complete  │ Assign legal reviewer       │
│ Workflow              Complete  │ Set first milestone         │
├─────────────────────────────────┴─────────────────────────────┤
│ Initial milestones                                            │
├─────────────────────────────────┬─────────────────────────────┤
│ Transaction snapshot            │ Team                        │
└─────────────────────────────────┴─────────────────────────────┘
```

Do not fill empty regions with invented analytics.

---

# 41. UI design direction

## 41.1 Overall visual character

Aim for:

> **An executive transaction brief connected directly to operational work**

The screen should feel:

* Controlled;
* concise;
* current;
* evidence-aware;
* institutional;
* decision-oriented;
* professionally dense.

It should not feel:

* Promotional;
* celebratory;
* like a CRM;
* like a generic project dashboard;
* like a BI tool;
* like a collection of AI cards.

## 41.2 Visual hierarchy

Prioritize:

1. Operating state;
2. required decisions;
3. material consequence;
4. current phase;
5. next milestone;
6. supporting transaction context.

Do not make:

* Document count;
* agent activity;
* total messages;
* total tasks;

the largest typography on the page.

## 41.3 Color

Use the existing M&Ai foundation:

* Canvas Cream: `#F3F0EE`;
* Lifted Cream: `#FCFBFA`;
* Ink Black: `#141413`;
* Signal Orange: `#CF4500`;
* Light Signal Orange: `#F37338`;
* Dust Taupe: `#D1CDC7`;
* Slate Gray: `#696969`.

Recommended:

* Main background: Canvas Cream;
* functional surfaces: Lifted Cream;
* primary action: Ink Black;
* attention marker: Signal Orange;
* high risk: red-orange;
* blocked: deep red;
* approved or ready: green;
* metadata: Slate Gray;
* dividers: Dust Taupe.

Do not make the entire Overview orange because the deal requires attention.

## 41.4 Typography

Use Sofia Sans.

Recommended hierarchy:

| Element              |     Size |  Weight |
| -------------------- | -------: | ------: |
| Overview title       | 26–30 px | 500–600 |
| Transaction codename | 22–26 px | 550–650 |
| Operating state      | 18–22 px | 600–700 |
| Valuation range      | 22–30 px | 500–600 |
| Section title        | 15–17 px | 650–700 |
| Decision title       | 14–16 px | 600–700 |
| Body                 | 14–15 px | 450–500 |
| Metadata             | 12–13 px | 450–550 |
| Status label         | 11–12 px | 650–700 |

Use tabular numerals for:

* Currency;
* counts;
* percentages;
* dates;
* valuation ranges.

## 41.5 Cards and surfaces

Use:

* Shared larger surfaces for related information;
* thin neutral borders;
* 6–12 px radii;
* minimal shadows;
* 16–24 px internal spacing.

Avoid:

* One floating card per metric;
* oversized KPI tiles;
* gradients;
* glass effects;
* circular progress charts;
* excessive pill containers.

---

# 42. UX design principles

## 42.1 Exceptions before averages

Surface:

* Blockers;
* material changes;
* pending decisions;
* stale evidence;
* missed milestones.

Do not prioritize average task completion or generic activity volume.

## 42.2 Summary without duplication

Every panel should answer a distinct question and link to the specialized workspace.

## 42.3 Exact-context routing

Selecting:

> Customer-concentration adjustment

should open:

> Diligence Decision Room with the customer-concentration finding selected.

Selecting:

> Scenario v4 awaiting approval

should open:

> Valuation Lab with scenario v4 selected.

## 42.4 Approved versus proposed

Never combine:

* Approved valuation;
* proposed scenario;
* superseded output;
* draft recommendation.

These states must be visually and semantically distinct.

## 42.5 Materiality before recency

A new low-impact event should not appear above an older material blocker.

## 42.6 Show why something is at risk

At-risk and blocked states require explicit reasons.

## 42.7 Respect evidence state

Distinguish:

* Supported;
* partially supported;
* contradictory;
* missing;
* stale;
* restricted;
* not assessed.

## 42.8 Human authority remains visible

Display:

* Who owns the decision;
* who approved the current version;
* which authority is required;
* whether an action is restricted.

## 42.9 Preserve transaction context

Returning from a specialized workspace should preserve:

* Overview scroll position;
* expanded section;
* selected item;
* reviewed state.

## 42.10 Avoid false completeness

Do not represent incomplete or unavailable data as zero.

---

# 43. Data freshness

Every material summary should indicate freshness where relevant.

Examples:

* Updated 18 min ago;
* based on synchronization at 09:42;
* approved today at 10:18;
* changed since your last review;
* evidence current through 26 July 2026.

## Stale state

Example:

> **Evidence may be stale**
> The document source has not synchronized since 26 July at 18:32.

The affected panels should indicate that their conclusions may no longer reflect current documents.

Do not display a generic “live” badge.

---

# 44. Permission behavior

The Overview must remain coherent when the user has partial access.

## Restricted valuation

Display:

> **Valuation restricted**
> You do not have permission to view transaction value or assumptions.

## Restricted negotiation

Display:

> **Negotiation details restricted**
> Contact the deal administrator for access.

## Restricted workstream

The user may see:

> Legal workstream requires review

without seeing:

* Contract names;
* clauses;
* counterparties;
* findings.

## Side-channel protection

Restricted information must not leak through:

* Counts;
* card dimensions;
* sorting;
* Deal Brief;
* Copilot;
* activity;
* notifications;
* export.

---

# 45. System states

## 45.1 Newly created deal

> **Workspace created**
> Complete the initial transaction setup to begin evidence-linked analysis.

Show:

* Dossier readiness;
* documents;
* team;
* workflow;
* milestones.

## 45.2 No attention items

> **No decisions currently require attention**

Continue showing:

* Phase state;
* milestones;
* workstreams;
* material changes.

Do not use celebratory gamification.

## 45.3 No documents

> **No evidence source connected**
> Document-linked diligence and valuation reconciliation are unavailable.

Primary action:

> Connect documents

## 45.4 No valuation

> **Valuation not started**

Primary action:

> Open Valuation Lab

Do not display zero value.

## 45.5 No matching workflow

For a bilateral transaction:

> Counterparty universe not applicable

Hide irrelevant metrics.

## 45.6 Loading

Load components independently.

Use stable skeletons for:

* Attention queue;
* phase panel;
* milestones;
* workstreams;
* brief.

Do not block the complete screen because one subsystem is delayed.

## 45.7 Partial service failure

Example:

> **Valuation summary unavailable**
> Diligence, milestones and documents remain current.

## 45.8 Archived

> **Archived · Read only**

Disable editing and approval actions.

## 45.9 Paused

> **Paused since 12 July 2026**
> Review planned for 15 August 2026.

Explain whether:

* document synchronization continues;
* agents continue monitoring;
* reminders remain active.

## 45.10 Terminated

> **Transaction terminated**
> Client withdrew on 8 July 2026.

Show final deliverables and audit history where authorized.

## 45.11 Offline

> **Connection interrupted**
> Displayed information may be outdated. Approval and configuration actions are unavailable.

---

# 46. Responsive behavior

## Desktop — 1280 px and above

* Compact global sidebar;
* full deal header;
* two-column Overview;
* workstream table;
* visible decision queue;
* stage-aware summaries.

## Tablet — 768–1279 px

* Compact sidebar;
* top content becomes single column;
* attention queue remains first;
* right-side panels move beneath;
* phase map becomes horizontally scrollable;
* workstream table uses simplified columns.

## Mobile — below 768 px

Recommended order:

1. Deal identity;
2. operating state;
3. primary decision;
4. blockers;
5. current phase;
6. next milestone;
7. Deal Brief;
8. valuation or relevant key output;
9. workstreams;
10. team and activity.

Mobile should support:

* Reviewing status;
* opening tasks;
* reading briefs;
* navigating to specialized workspaces.

Dense analytical comparison remains desktop-first.

---

# 47. Accessibility requirements

The Deal Overview should support:

* Semantic heading hierarchy;
* landmarks for major sections;
* accessible state labels;
* no color-only risk communication;
* keyboard-accessible phase map;
* descriptive links;
* announced component updates;
* accessible currency values;
* explicit approval states;
* minimum 44 × 44 px targets;
* visible focus;
* accessible expand and collapse controls;
* reduced-motion preference;
* screen-reader descriptions for restricted content;
* accessible tables for workstreams;
* clear distinction between zero, unavailable and restricted.

Avoid repeated links labeled:

> View

Prefer:

> Review Project Horizon customer-concentration finding

---

# 48. Component architecture for Figma

## `DealOverviewHeader`

Properties:

* Preparation;
* Diligence;
* Valuation;
* Negotiation;
* Closing;
* Completed;
* Archived;
* primary action;
* restricted.

## `TransactionSnapshot`

Properties:

* Sell-side;
* buy-side;
* bilateral;
* value visible;
* value restricted;
* early-stage;
* completed.

## `DealOperatingState`

Variants:

* On track;
* attention required;
* at risk;
* blocked;
* paused;
* closing ready;
* completed.

## `DealPhaseMap`

Properties:

* Sell-side;
* buy-side;
* merger;
* complete;
* current;
* blocked;
* reopened;
* skipped;
* restricted.

## `DealAttentionQueue`

States:

* Populated;
* empty;
* loading;
* error;
* restricted.

## `DealAttentionItem`

Properties:

* Approval;
* review;
* blocker;
* missing evidence;
* milestone;
* overdue;
* material impact;
* restricted.

## `DealBrief`

States:

* New changes;
* no changes;
* loading;
* stale;
* restricted;
* error.

## `DealBriefItem`

Properties:

* Diligence;
* valuation;
* matching;
* negotiation;
* closing;
* documents;
* reviewed;
* superseded.

## `CurrentPhasePanel`

Variants:

* Preparation;
* matching;
* diligence;
* valuation;
* negotiation;
* closing;
* completed.

## `WorkstreamStatus`

States:

* Populated;
* empty;
* partial;
* restricted;
* loading.

## `WorkstreamRow`

Properties:

* Not started;
* in progress;
* in review;
* attention;
* blocked;
* complete;
* not applicable.

## `ValuationSnapshot`

Properties:

* Approved;
* proposed;
* draft;
* superseded;
* unavailable;
* restricted.

## `EvidenceReadiness`

Properties:

* Ready;
* incomplete;
* stale;
* conflict;
* processing error;
* no source.

## `MilestoneList`

Properties:

* Ready;
* attention;
* at risk;
* blocked;
* complete;
* empty.

## `TeamSummary`

Properties:

* Complete;
* unassigned;
* restricted;
* external advisor;
* pending invitation.

## `MeaningfulActivity`

Properties:

* Human;
* agent;
* engine;
* document;
* external participant;
* access event.

## `DeliverableSummary`

Properties:

* Draft;
* in review;
* approved;
* superseded;
* generating;
* error.

---

# 49. Production object model

## `DealOverviewSummary`

```text
dealId
codename
primaryOrganizationId
primaryOrganizationName
transactionSide
transactionType
currentStage
workspaceStatus
operatingState
operatingStateReasons
confidentialityLevel
indicativeValueLow
indicativeValueHigh
currency
valueBasis
dealLeadId
expectedCloseFrom
expectedCloseTo
lastMeaningfulChangeAt
lastSourceSyncAt
accessLevel
```

## `DealAttentionItem`

```text
id
dealId
type
domain
title
summary
materiality
financialImpact
currency
blocking
blockedObjectIds
assignedTo
requiredAuthority
dueAt
status
destinationRoute
sourceReferences
createdAt
updatedAt
```

## `DealMaterialChange`

```text
id
dealId
domain
changeType
before
after
impactSummary
sourceReferences
affectedDecisionIds
detectedAt
reviewedAt
supersededAt
accessLevel
```

## `DealWorkstreamStatus`

```text
id
dealId
workstream
state
leadUserId
openItemCount
highSeverityCount
evidenceCoverage
nextAction
nextActionDueAt
blockingDependencies
lastUpdatedAt
```

## `DealPhaseState`

```text
id
dealId
phase
state
startedAt
completedAt
reopenedAt
blockedReasons
ownerId
approvalId
updatedAt
```

## `DealOutputSnapshot`

```text
id
dealId
domain
outputType
title
version
status
summary
valueLow
valueHigh
currency
sourceVersionIds
approvedBy
approvedAt
updatedAt
destinationRoute
```

## `DealOverviewMilestone`

```text
id
dealId
title
type
dueAt
ownerId
external
readiness
readinessReasons
blockingDependencies
destinationRoute
status
```

The Overview should consume normalized outputs from each workspace rather than reconstructing state from raw agent activity.

---

# 50. Suggested route and URL behavior

Primary route:

```text
/deals/:dealId/overview
```

Selected attention item:

```text
/deals/:dealId/overview?attention=:attentionId
```

Focused section:

```text
/deals/:dealId/overview?section=workstreams
```

A specialized deep link should route directly to the source workspace:

```text
/deals/:dealId/diligence?finding=:findingId
```

The Overview URL should not contain ephemeral menu or tooltip state.

---

# 51. Repository direction

The Deal Overview should reuse the existing shell, fixture and deal-navigation foundations.

## Keep

* Shared `AppShell`;
* deal routes;
* deal identity fixtures;
* responsive layout;
* status components;
* activity primitives;
* approval interactions;
* valuation and diligence objects;
* contextual Copilot;
* source citations.

## Add

* Deal operating-state model;
* explainable state reasons;
* phase map;
* attention queue;
* Deal Brief;
* stage-aware execution panel;
* workstream summary;
* evidence readiness;
* approved-versus-proposed output states;
* milestone readiness;
* meaningful activity filter;
* exact-context deep links;
* role-aware emphasis;
* partial-access states.

## Reposition

* Generic deal KPIs as contextual summaries;
* agent activity as a small provenance layer;
* documents count as evidence readiness;
* valuation range as an approved output;
* pipeline state as phase context rather than CRM progress.

## Remove or avoid

* Technical engine status;
* generic AI confidence;
* average completion percentage;
* permanent chat panel;
* generic activity volume;
* one-click material approvals;
* unsupported health score;
* duplicated full workspace data.

---

# 52. What not to include

Avoid the following in the Deal Overview:

* A large static deal description;
* complete Target Dossier content;
* full document tree;
* all diligence findings;
* valuation formulas;
* every buyer or target candidate;
* complete negotiation matrix;
* full closing checklist;
* full audit history;
* every team member;
* complete tasks queue;
* generic KPI card wall;
* single transaction-progress percentage;
* unexplained health score;
* total agent runs;
* token usage;
* model names;
* infrastructure health;
* permanent AI chat;
* one-click material approval;
* proposed output shown as approved;
* aggregated values in a different currency;
* hidden permission leaks;
* invented content to fill early-stage empty space;
* real customer or VDR names in the pitch mock.

---

# 53. MOCKED — Pitch and demo specification

## 53.1 Purpose of the mocked Deal Overview

The mocked Overview should demonstrate that M&Ai brings the complete transaction state into one controlled operating surface.

Its pitch narrative is:

> **Every transaction has one decision-oriented home: current phase, material changes, blockers, valuation and next actions.**

This screen is useful for:

* Live-demo navigation;
* Platform breadth;
* Product architecture explanation;
* Showing lifecycle continuity;
* Transitioning from deal setup into diligence;
* Transitioning from portfolio to a specific transaction.

It is a strong supporting screen but should not replace the Diligence Decision Room as the primary hero.

---

# 54. Mocked shell state

Institution:

> **Atlas M&A Advisory**

User:

> **Ana Costa**
> Vice President

Breadcrumb:

> Deals / Project Horizon / Overview

Global sidebar:

* Deals active;
* Tasks & Approvals: **3**;
* Notifications: **2**;
* Ask M&Ai;
* compact state.

Deal navigation:

* **Overview**
* Dossier
* Documents
* Diligence
* Valuation
* Buyer Universe
* Negotiation
* Closing
* More

---

# 55. Mocked transaction context

## Primary identity

> **Project Horizon**

Supporting:

> Atlas Industrial · Sell-side · Full acquisition

State:

* **Due Diligence**
* **Active**
* **Restricted workspace**

Value:

> Indicative enterprise value
> **R$ 480 mi–R$ 520 mi**

Jurisdiction:

> Brazil

Expected closing:

> Q1 2027

Deal lead:

> Marina Alves

---

# 56. Mocked operating state

Display:

> **At risk**

Reasons:

* One high-severity finding awaiting approval;
* valuation scenario v4 not approved;
* diligence committee in two days.

Primary route:

> Review blockers

Do not use a numerical health score.

---

# 57. Mocked attention queue

Show three items.

## Item 1 — selected

> **Approval required**
> Customer-concentration adjustment
> Risk-adjusted valuation midpoint decreases by **R$ 42 mi**
> Due today · Blocks scenario v4
>
> **Open review**

## Item 2

> **Review required**
> Tax-credit recoverability
> R$ 11,4 mi exposure remains unsupported
> Overdue · Blocks diligence report

## Item 3

> **Assignment required**
> Operational workstream has no lead
> Initial review begins tomorrow

For pitch scale, the first item should dominate.

---

# 58. Mocked phase map

Show:

* Preparation — Complete;
* Buyer Universe — Complete;
* Outreach — In progress;
* **Due Diligence — Active**;
* Valuation — In progress;
* Negotiation — Upcoming;
* Closing — Upcoming.

Do not show a transaction completion percentage.

---

# 59. Mocked current-phase panel

Title:

> **Due Diligence**

Summary:

* **127** documents synchronized;
* **18** open findings;
* **6** high-severity;
* **3** decisions pending;
* **83%** evidence coverage;
* **2** workstreams at risk.

Primary action:

> **Open Diligence**

Supporting state:

> Financial and Tax require attention.

---

# 60. Mocked M&Ai Deal Brief

Show three material changes.

## Change 1

> **Customer concentration increased to 41,2%**
> The top three customers exceed the 35% review threshold. Scenario v4 reduces the valuation midpoint by R$ 42 mi.
>
> 3 sources · Open finding

## Change 2

> **Tax evidence remains incomplete**
> Supporting documentation for R$ 11,4 mi in recoverable credits has not been provided.
>
> 4 missing documents · Information request open

## Change 3

> **Three buyers exceed the fit threshold**
> The approved buyer universe may expand from eight to eleven counterparties.
>
> Buyer Universe · Shortlist review required

---

# 61. Mocked workstream status

| Workstream  | State      | Material items | Owner          |
| ----------- | ---------- | -------------: | -------------- |
| Financial   | At risk    |              3 | Ana Costa      |
| Legal       | In review  |              2 | Vieira & Lopes |
| Tax         | Blocked    |              1 | Daniel Ribeiro |
| Commercial  | On track   |              1 | Felipe Rocha   |
| Operational | Unassigned |              0 | —              |

At pitch scale, show only the first four rows.

---

# 62. Mocked valuation snapshot

Title:

> **Valuation**

Approved:

> Base scenario v3
> **R$ 480 mi–R$ 520 mi**

Proposed:

> Risk-adjusted scenario v4
> **R$ 438 mi–R$ 478 mi**

Impact:

> **−R$ 42 mi midpoint · −8,4%**

Status:

> Approval required

Primary action:

> Review scenario

The approved and proposed values must remain visually distinct.

---

# 63. Mocked evidence readiness

Show:

* 127 documents synchronized;
* 121 processed;
* 4 require classification;
* 2 extraction failures;
* 6 information requests open;
* source synchronized 4 min ago.

Primary action:

> Review documents

Do not show a real VDR provider logo.

---

# 64. Mocked milestones

## Milestone 1

> **30 July · 14:00**
> Diligence committee
> **At risk** · Scenario v4 awaiting approval

## Milestone 2

> **1 August · 10:30**
> Client progress review
> Attention required · Diligence report incomplete

## Milestone 3

> **7 August**
> Updated buyer shortlist
> On track

---

# 65. Mocked team summary

> **Marina Alves** · Deal Lead
> **Ana Costa** · Diligence and Valuation
> **Felipe Rocha** · Financial and Commercial
> **Daniel Ribeiro** · Tax
> **Vieira & Lopes** · Legal advisor

Alert:

> Operational workstream unassigned

---

# 66. Mocked activity

> **10:03 · Ana Costa**
> Requested review of customer-concentration adjustment.

> **09:44 · Valuation Engine**
> Generated risk-adjusted scenario v4.

> **09:42 · Financial Risk Agent**
> Reconciled customer revenue from three sources.

Primary action:

> View full activity

---

# 67. Pitch-specific simplification

For a static pitch image, retain:

* Project Horizon;
* Due Diligence;
* At risk;
* one primary approval;
* current-phase summary;
* valuation change;
* two material changes;
* next milestone.

Hide:

* Complete workstream table;
* full team list;
* all milestones;
* recent activity;
* document-processing detail;
* secondary actions;
* complete phase history;
* advanced status explanation.

## Recommended static composition

```text
┌──────────────────────────────────────────────────────────────┐
│ Project Horizon · Due Diligence · At risk                    │
│ R$ 480 mi–R$ 520 mi · Restricted workspace                  │
├────────────────────────────────┬─────────────────────────────┤
│ Approval required              │ Next milestone              │
│ Customer concentration         │ Diligence committee         │
│ −R$ 42 mi impact               │ 30 July · At risk           │
│ [ Open review ]                │                             │
├────────────────────────────────┼─────────────────────────────┤
│ Due Diligence                  │ Valuation                   │
│ 18 findings · 6 high-risk      │ v3: R$ 480–520 mi          │
│ 3 decisions pending            │ v4: R$ 438–478 mi          │
├────────────────────────────────┴─────────────────────────────┤
│ M&Ai Deal Brief                                             │
│ 41,2% customer concentration · Tax evidence incomplete      │
└──────────────────────────────────────────────────────────────┘
```

## Readability requirement

At deck scale, these must remain readable:

* **Project Horizon**
* **Due Diligence**
* **At risk**
* **−R$ 42 mi**
* **Open review**
* **18 findings**
* **R$ 438 mi–R$ 478 mi**
* **30 July**

---

# 68. Recommended demo flow

## Flow A — Enter from Deals Portfolio

```text
Deals Portfolio
  ↓
Select Project Horizon
  ↓
Deal Overview
  ↓
At-risk state explained
  ↓
Open customer-concentration review
  ↓
Diligence Decision Room
```

## Flow B — Enter after setup

```text
New Deal Setup
  ↓
Create Project Horizon
  ↓
Deal Overview
  ↓
Setup readiness displayed
  ↓
Complete Target Dossier
```

## Flow C — Review material change

```text
Deal Overview
  ↓
M&Ai Deal Brief
  ↓
Customer concentration increased
  ↓
Open supporting finding
  ↓
Review source evidence
```

## Flow D — Review proposed valuation

```text
Deal Overview
  ↓
Valuation snapshot
  ↓
Compare approved v3 and proposed v4
  ↓
Open Valuation Lab
```

## Flow E — Prepare for committee

```text
Deal Overview
  ↓
Diligence committee marked at risk
  ↓
Review blocking decisions
  ↓
Resolve valuation approval
  ↓
Milestone changes to Ready
```

## Flow F — Ask M&Ai

```text
Deal Overview
  ↓
Ask M&Ai
  ↓
“What changed since my last review?”
  ↓
Source-linked summary
  ↓
Open tax evidence request
```

---

# 69. UX prototype tasks to validate

Test with bankers using tasks such as:

1. Identify the current deal phase.
2. Explain why the deal is at risk.
3. Find the most urgent decision.
4. Determine the next external milestone.
5. Identify the latest approved valuation.
6. Distinguish the proposed valuation from the approved valuation.
7. Find which workstream is blocked.
8. Open the source context for the largest financial impact.
9. Determine whether evidence is current.
10. Identify who owns the Tax workstream.
11. Find the latest meaningful transaction change.
12. Open the complete diligence findings queue.
13. Identify what prevents the next milestone from being ready.
14. Return to the Overview without losing context.
15. Explain which information is restricted.

## Measures

Record:

* Time to understand deal condition;
* time to identify the highest-priority item;
* whether operating state is understood;
* whether phase and status are confused;
* whether approved and proposed values are distinguished;
* whether users notice blockers;
* whether users trust the Deal Brief;
* whether exact-context routing works;
* whether the screen feels overloaded;
* whether users can identify the next milestone;
* whether role and permission limits are clear.

---

# 70. Design validation criteria

The Deal Overview is ready for approval when:

1. The user understands the transaction state within five seconds.
2. The current phase and workspace status are distinct.
3. At-risk and blocked states expose their reasons.
4. The primary required decision is visible in the first viewport.
5. The next milestone and its readiness are visible.
6. The Overview summarizes rather than duplicates specialized workspaces.
7. Every material summary links to exact context.
8. Approved and proposed outputs are clearly distinguished.
9. Restricted information does not leak through summaries.
10. Evidence freshness is visible.
11. The Deal Brief cites source context.
12. The current-phase panel adapts without destabilizing the complete layout.
13. No transaction completion percentage is required.
14. No unexplained health score appears.
15. The page remains useful without Copilot.
16. Partial service failures do not block the complete screen.
17. Early-stage deals receive setup guidance rather than invented analytics.
18. Archived deals remain readable and auditable.
19. Material approvals cannot be completed blindly.
20. Workstream status identifies ownership and next action.
21. The transaction’s native currency is preserved.
22. Mobile preserves decisions, blockers and milestones.
23. Keyboard users can navigate every major section.
24. The pitch mock remains readable and fictional.
25. The Overview remains a supporting pitch screen rather than competing with the Decision Room.

---

# 71. Final design target

The correct design target is not:

> “A dashboard containing every deal metric.”

It is:

> **A decision-oriented transaction home that explains where the deal stands, what materially changed, what threatens execution and where the banker must act next.**

The screen should make the transaction understandable without making it appear simple.

Its defining interaction is:

> **Orient → Detect exception → Understand consequence → Open exact workspace**

**Next iteration: Target Dossier.**
