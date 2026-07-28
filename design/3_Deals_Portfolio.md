---
canonical_name: "Deals Portfolio"
definition_id: "BD-03"
definition_status: "Governed for MAI-90"
screen_family: "global-foundation"
owning_task: "MAI-91"
canonical_routes:
  - "/deals"
figma_file_key: "otMJE31OKIxdXogV4RNbGQ"
figma_status: "Planned in MAI-91"
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
# Deals Portfolio

## 1. Screen definition

The **Deals Portfolio** is the institution-level workspace for finding, reviewing and managing every transaction the user is authorized to access.

It is the complete deal registry for M&Ai.

Where the Command Center presents a prioritized subset of urgent work, the Deals Portfolio presents the full transaction universe:

* Active deals;
* Proposed or pre-mandate opportunities;
* Paused transactions;
* Completed transactions;
* Lost or terminated processes;
* Archived workspaces.

Its primary operating sequence is:

> **Find deal → Understand current state → Open the correct workspace → Manage portfolio context**

The product information architecture identifies Deals as M&Ai’s principal global business object and defines the Deals Portfolio as the surface for browsing, filtering and managing active, paused, completed and archived transactions. 

---

# 2. Intention of the screen

## Primary intention

The Deals Portfolio should allow a banker to locate and understand any transaction without reconstructing its identity from folders, emails or internal spreadsheets.

The user should be able to answer:

1. **Which transactions exist?**
2. **Which transactions can I access?**
3. **What stage and state is each deal currently in?**
4. **Who owns each transaction?**
5. **Which deals require attention?**
6. **When was each deal last meaningfully updated?**
7. **How do I open the correct transaction workspace?**

## Product intention

The screen should reinforce that M&Ai supports **parallel deal execution**, not just isolated AI analyses.

The deck positions M&Ai around increasing banker capacity through parallel, tenant-isolated workflows while preserving human approval gates.  The Deals Portfolio is where that multi-deal operating model becomes visible.

It should communicate:

> “This institution can operate multiple confidential transactions through one controlled platform without mixing their evidence, permissions or decisions.”

## User outcome

After using the screen, the banker should be able to say:

> “I can find any transaction, understand its current operating state and enter the exact workspace I need.”

---

# 3. What the Deals Portfolio is not

The screen should not become:

* The Command Center;
* A generic CRM sales pipeline;
* A deal-sourcing database;
* A complete transaction analytics suite;
* A collection of oversized deal cards;
* A Kanban board as the only available view;
* A project-management board;
* An advisory revenue dashboard;
* A substitute for Deal Overview;
* A global activity feed;
* A platform administration screen;
* A grid of decorative company logos;
* A page dominated by total deal value.

The central question is not:

> “How impressive does our pipeline look?”

It is:

> **“Can I reliably find, compare and enter the right transaction?”**

---

# 4. Relationship to adjacent screens

| Screen                  | Primary question                                                    |
| ----------------------- | ------------------------------------------------------------------- |
| **Command Center**      | What requires my attention now?                                     |
| **Deals Portfolio**     | Which transactions exist, and how do I locate or manage them?       |
| **Deal Overview**       | What is happening inside this specific transaction?                 |
| **Tasks & Approvals**   | Which work items require action?                                    |
| **Organizations**       | Which companies and institutional relationships exist?              |
| **Portfolio Analytics** | How is the institution’s transaction activity performing over time? |

## Deals Portfolio versus Command Center

The Command Center is selective and action-oriented.

The Deals Portfolio is comprehensive and navigational.

The Command Center may show:

> Project Horizon requires a valuation approval.

The Deals Portfolio should show:

> Project Horizon exists, is an active sell-side transaction in Due Diligence, is led by Marina Alves and has two open decisions.

## Deals Portfolio versus Deal Overview

The portfolio should not attempt to display the full operational condition of each transaction.

It should provide enough information to:

* Identify the deal;
* Understand its stage and state;
* Detect attention requirements;
* Open it.

The Deal Overview provides the complete transaction summary after entry.

## Deals Portfolio versus Organizations

A deal is a transaction-specific workspace.

An organization is a reusable entity that may appear in multiple transactions.

For example:

> Atlas Industrial

may exist as an organization and appear as:

* Target in Project Horizon;
* Previous buyer candidate in Project Meridian;
* Portfolio company of another organization.

The deal object must preserve its own:

* Codename;
* Team;
* permissions;
* stage;
* evidence;
* decisions;
* documents;
* valuation;
* history.

---

# 5. Primary users

## 5.1 Analyst and associate

They need to:

* Find assigned deals;
* Resume recent work;
* filter by workstream or stage;
* identify transactions with missing inputs;
* distinguish active from archived workspaces.

## 5.2 Vice president

They need to:

* Review all deals they supervise;
* identify blocked transactions;
* see which deals require approval;
* check ownership and milestone state;
* move quickly between deals.

## 5.3 Managing director or partner

They need to:

* Review a concise portfolio universe;
* filter by deal lead, stage or transaction type;
* identify at-risk mandates;
* see indicative value where authorized;
* access negotiation or closing workspaces.

## 5.4 Operations or administrator

They need to:

* Identify unassigned deals;
* manage deal states;
* inspect data-source status;
* review access configuration;
* archive completed workspaces;
* enforce naming and ownership conventions.

The screen should adapt through permission scope rather than showing the same administrative controls to every user.

---

# 6. Primary job to be done

> When I need to locate or compare transactions across the institution, give me a reliable, permission-aware portfolio where I can filter, understand and open the correct deal without relying on external trackers.

## Secondary jobs

The user should also be able to:

* Create a deal;
* switch between personal and institution scope;
* save frequently used filters;
* identify recently accessed deals;
* see current transaction stage;
* see open work counts;
* identify stale or paused deals;
* export an authorized portfolio list;
* assign or change a deal lead;
* archive or restore a transaction;
* inspect deal access;
* open related organizations;
* ask M&Ai about the filtered portfolio.

---

# 7. Deal lifecycle model

The portfolio must distinguish **transaction stage** from **workspace status**.

These are not the same concept.

## 7.1 Transaction stage

The stage describes where the deal is in its lifecycle.

Recommended normalized stages:

1. Origination;
2. Mandate / Setup;
3. Preparation;
4. Target or Buyer Universe;
5. Marketing / Outreach;
6. Due Diligence;
7. Valuation;
8. Negotiation;
9. Signing;
10. Closing;
11. Post-closing;
12. Completed.

The exact sequence may vary by transaction type.

A sell-side deal may emphasize:

> Preparation → Buyer Universe → Outreach → Diligence → Negotiation → Closing

A buy-side deal may emphasize:

> Target Universe → Screening → Diligence → Valuation → Offer → Negotiation → Closing

The broader architecture already specifies that sell-side and buy-side workflows should share underlying components while adapting labels and phase emphasis to the transaction side. 

## 7.2 Workspace status

The status describes whether the deal workspace is operational.

Recommended statuses:

* Draft;
* Active;
* Paused;
* At risk;
* Restricted;
* Completed;
* Terminated;
* Archived.

### Example combinations

| Stage         | Workspace status | Meaning                                                  |
| ------------- | ---------------- | -------------------------------------------------------- |
| Due Diligence | Active           | Diligence is ongoing                                     |
| Negotiation   | Paused           | Negotiation started but process is temporarily suspended |
| Closing       | At risk          | Closing remains active but blockers threaten timing      |
| Completed     | Archived         | Transaction completed and workspace is read-only         |
| Preparation   | Terminated       | Mandate ended before market launch                       |

Do not overload one badge with both concepts.

---

# 8. Deal-state semantics

## Active

The transaction is progressing and accepts normal workflow actions.

## Draft

The workspace has been created but initial setup is incomplete.

Example causes:

* Target not associated;
* Team not assigned;
* Data source not connected;
* Workflow template not selected.

## Paused

Work is intentionally suspended.

The UI should show:

* Pause date;
* Reason;
* User who paused it;
* Planned review date;
* Whether automation or synchronization continues.

## At risk

The transaction remains active but has material operational concerns.

The state must be explainable.

Example:

> **At risk**
> Two closing conditions overdue · One client decision pending

Do not calculate an unexplained “deal health score.”

## Completed

The transaction has reached its defined completion state.

Completed does not necessarily mean archived.

Users may still need to:

* Prepare final deliverables;
* Review audit history;
* Complete success-fee records;
* Resolve post-closing obligations.

## Terminated

The transaction ended without completion.

The system should distinguish termination reasons such as:

* Client withdrew;
* Counterparty withdrew;
* No acceptable offers;
* Diligence failure;
* Financing unavailable;
* Regulatory issue;
* Mandate expired;
* Strategic pause.

## Archived

The workspace is retained but read-only by default.

Archive is a data-management state, not a transaction outcome.

---

# 9. Screen architecture

The recommended Deals Portfolio consists of eight principal regions:

1. Page header;
2. Portfolio scope and saved views;
3. Portfolio-state summary;
4. Search and filters;
5. View controls;
6. Deal registry;
7. Selection and bulk-management controls;
8. Optional deal preview panel.

---

# 10. Page header

## Recommended title

> **Deals**

Supporting description:

> Browse and manage the transactions available to your institution.

## Primary action

> **New deal**

## Secondary actions

* Export portfolio;
* Manage saved views;
* Import legacy deal, when supported.

The page header should not contain analytical charts.

## Scope summary

The header may include a restrained count:

> **24 accessible deals**

This count is context, not a principal KPI.

The shell specification explicitly warns against treating the number of deals as an attention badge because the count alone does not imply required action. 

---

# 11. Portfolio scope and saved views

## 11.1 Purpose

Scope controls define which deal universe is currently visible.

## Recommended default scopes

* **My deals**
* **All accessible**
* **Team deals**, when authorized
* **Recently opened**
* **Unassigned**, for managers
* **Archived**

The default for most users should be:

> **My deals**

## Saved views

Users should be able to save commonly used combinations of:

* Stage;
* status;
* transaction side;
* lead banker;
* sector;
* jurisdiction;
* value range;
* attention state;
* milestone period.

Examples:

> My active sell-side deals

> Closing this quarter

> Diligence deals requiring VP review

> Archived 2026 transactions

### Saved-view behavior

A saved view should preserve:

* Filters;
* sort order;
* visible columns;
* grouping;
* layout mode.

It should not preserve:

* A currently open menu;
* Temporary selection;
* Hover state;
* Expanded preview.

## Shared saved views

Institution administrators may define shared views such as:

* Active mandates;
* Closing committee;
* Partner review;
* Data-source exceptions.

Personal and shared views should be clearly distinguished.

---

# 12. Portfolio-state summary

## Purpose

The state summary gives a concise count of the currently accessible portfolio.

It is a navigation and filtering aid—not an analytics dashboard.

## Recommended categories

Use no more than five:

* Active;
* At risk;
* Paused;
* Completed;
* Archived.

Example:

| State     |  Count |
| --------- | -----: |
| Active    | **14** |
| At risk   |  **3** |
| Paused    |  **2** |
| Completed |  **4** |
| Archived  | **11** |

Selecting a state filters the registry.

## Alternative stage summary

A secondary compact stage distribution may be available:

* Preparation;
* Diligence;
* Valuation;
* Negotiation;
* Closing.

Do not place both state and stage as two large chart sections. One may appear as compact filter chips.

## Currency caution

Do not present:

> Total portfolio value: R$ 4,7 bi

unless:

* Every included deal uses the same currency;
* authorization permits aggregation;
* the valuation basis is consistent;
* the date and methodology are explicit.

A simple count is usually safer and more useful.

---

# 13. Search

## Purpose

Search should help users find a deal from any identifier they naturally remember.

## Searchable fields

* Deal codename;
* Target organization;
* Buyer or seller;
* Deal lead;
* Team member;
* sector;
* jurisdiction;
* transaction type;
* internal reference;
* mandate reference;
* optional client name.

Example search terms:

* Horizon;
* Atlas Industrial;
* healthcare;
* Ana Costa;
* buy-side;
* closing;
* Brazil.

## Search behavior

The search field should:

* update the visible registry;
* tolerate partial matches;
* ignore capitalization;
* support accented and unaccented Portuguese terms;
* highlight matched text;
* preserve filters;
* expose a clear reset action.

Placeholder:

> Search deals, organizations or deal leads

## Global search distinction

This page-level search filters deal records only.

The global command search can also return:

* Documents;
* findings;
* decisions;
* organizations;
* tasks.

The scope must remain explicit.

---

# 14. Filter system

## 14.1 Primary filters

Visible without opening an advanced panel:

* Status;
* stage;
* transaction side;
* deal lead;
* attention state.

## 14.2 Advanced filters

Available through a filter drawer or popover:

### Transaction

* Sell-side;
* buy-side;
* merger;
* minority investment;
* recapitalization;
* carve-out;
* other.

### Stage

* Preparation;
* universe building;
* diligence;
* valuation;
* negotiation;
* closing;
* completed.

### Status

* Draft;
* active;
* at risk;
* paused;
* completed;
* terminated;
* archived.

### Deal attributes

* Sector;
* sub-sector;
* jurisdiction;
* currency;
* indicative value range;
* creation date;
* expected close date;
* source of mandate.

### People

* Deal lead;
* assigned team member;
* external advisor;
* client relationship owner.

### Workflow condition

* Approval pending;
* overdue task;
* blocker present;
* missing evidence;
* synchronization warning;
* no activity in specified period.

### Access

* Restricted;
* read-only;
* externally shared;
* missing deal administrator.

## 14.3 Filter representation

Active filters should appear as removable chips:

> Active

> Due Diligence

> Sell-side

> Lead: Ana Costa

> Attention required

A visible action should clear all filters.

## 14.4 Filter semantics

Filters should combine predictably:

* Different categories use **AND**;
* Multiple selections inside one category use **OR**.

Example:

> Status is Active
> AND stage is Diligence or Valuation
> AND lead is Ana Costa

This behavior should be explained in advanced filtering.

---

# 15. View controls

The portfolio should support three views, but one should remain the primary default.

## 15.1 Table view — default

The table is the strongest default because it supports:

* Comparison;
* sorting;
* filtering;
* high information density;
* institutional portfolio management;
* accessibility;
* future bulk actions.

## 15.2 Compact card view

Useful when:

* The portfolio is small;
* Users rely on visual deal identity;
* tablet layouts require a stacked format;
* the user is browsing rather than comparing.

Cards should remain dense and structured.

## 15.3 Stage board — secondary

A stage board may be useful for a high-level process view.

Columns might include:

* Preparation;
* Diligence;
* Valuation;
* Negotiation;
* Closing.

However, it must not be the only or default representation.

### Board limitations

A board can obscure:

* Paused versus active status;
* permission distinctions;
* detailed sorting;
* cross-stage comparison;
* complete metadata;
* archived deals;
* accessibility.

### Drag-and-drop

Moving a card between stage columns should not silently change transaction stage.

A stage change may affect:

* workflows;
* available templates;
* milestones;
* permissions;
* reporting;
* approvals.

Therefore drag-and-drop should either:

1. Open a stage-change confirmation; or
2. Be disabled for users without stage-management authority.

---

# 16. Deal registry table

## 16.1 Purpose

The table is the canonical portfolio record.

Each row should answer:

* Which deal is this?
* What is its current state?
* Who owns it?
* What requires attention?
* When did something meaningful last change?

## 16.2 Recommended default columns

1. Deal;
2. transaction;
3. stage;
4. status;
5. attention;
6. indicative value;
7. deal lead;
8. next milestone;
9. last meaningful update;
10. actions.

## 16.3 Optional columns

Available through column settings:

* Target organization;
* client;
* sector;
* jurisdiction;
* currency;
* team;
* open findings;
* approvals pending;
* blockers;
* documents;
* expected close;
* created date;
* data-source state;
* access level;
* internal reference.

Do not show every possible column by default.

---

# 17. Deal row anatomy

## 17.1 Deal identity

Primary:

> **Project Horizon**

Secondary:

> Atlas Industrial

Optional tertiary label:

> Sell-side · Industrial technology

The codename should be the principal identifier because transaction confidentiality often makes codenames operationally important.

## 17.2 Transaction type

Examples:

* Sell-side;
* buy-side;
* merger;
* minority investment;
* carve-out.

Use text labels rather than relying exclusively on icons.

## 17.3 Stage

Example:

> **Due Diligence**

Stage should be readable and sortable.

Avoid a full-width progress bar implying linear completion.

## 17.4 Status

Examples:

* Active;
* at risk;
* paused;
* completed;
* archived.

Status and stage should appear separately.

## 17.5 Attention

Examples:

> **2 decisions**

> **1 blocker**

> **Evidence incomplete**

> **On track**

The attention column should summarize actionable conditions rather than generic activity.

## 17.6 Indicative value

Example:

> R$ 480 mi–R$ 520 mi

Requirements:

* Native deal currency;
* clear range or point estimate;
* permission-aware redaction;
* optional valuation version tooltip.

Restricted example:

> Restricted

Do not expose hidden value through sorting order or aggregate totals.

## 17.7 Deal lead

Display:

> Marina Alves

Optional compact avatar initials:

> MA

Avoid displaying the entire deal team in the row.

## 17.8 Next milestone

Example:

> Diligence committee
> 30 jul.

Use explicit overdue treatment where necessary.

## 17.9 Last meaningful update

Example:

> Valuation scenario v4 approved
> 18 min ago

This is preferable to:

> Updated 18 min ago

because it explains what changed.

## 17.10 Row actions

Recommended overflow actions:

* Open deal;
* open in new tab;
* copy deal link;
* view team and access;
* pause;
* archive;
* export summary;
* open settings.

Only authorized users should see administrative actions.

---

# 18. Expandable row or preview panel

## Purpose

A preview enables users to inspect a deal without losing portfolio context.

Recommended behavior:

* Select row;
* right-side preview panel opens;
* table remains visible;
* user may open full deal workspace.

## Preview content

### Identity

* Codename;
* organization;
* transaction side;
* stage;
* status.

### Attention

* Decisions required;
* blockers;
* overdue work;
* data-source warning.

### Next milestone

* Date;
* owner;
* dependency.

### Recent material change

Example:

> Customer concentration finding changed valuation midpoint by −R$ 42 mi.

### Team

* Deal lead;
* primary associate;
* client relationship owner.

### Quick destinations

* Overview;
* Diligence;
* Valuation;
* Negotiation;
* Closing.

## UX rule

The preview should summarize and route.

It should not reproduce the Deal Overview inside a drawer.

---

# 19. Sorting

## Recommended sort options

* Recommended;
* codename;
* stage;
* status;
* attention severity;
* next milestone;
* expected closing date;
* indicative value;
* recently updated;
* recently opened;
* deal lead.

## Default sorting

For **My active deals**:

1. At-risk or blocked deals;
2. deals with required decisions;
3. nearest milestone;
4. recently accessed deals;
5. remaining deals.

For **All accessible deals**:

* Recently updated or alphabetical may be more predictable.

## Explainability

When using “Recommended,” provide a tooltip:

> Prioritizes blocked deals, required decisions, near-term milestones and recent material changes.

Do not use unexplained ranking.

---

# 20. Grouping

The table may support optional grouping by:

* Stage;
* status;
* deal lead;
* transaction side;
* sector;
* expected close quarter.

Example:

```text
DUE DILIGENCE · 4

Project Horizon
Project Meridian
Project Atlas
Project Cedar

NEGOTIATION · 2

Project Aurora
Project Northstar
```

Groups should be collapsible.

Grouping must remain a view preference and should not alter data.

---

# 21. Deal creation entry point

The primary **New deal** action should open the dedicated New Deal Setup flow.

It should not create a blank deal immediately.

The portfolio may also support:

* Duplicate setup from template;
* import historical deal;
* create from organization;
* create from approved mandate.

These are later-stage enhancements.

## Permission behavior

Users without creation authority should see either:

* No action; or
* **Request new deal**, depending on institution policy.

---

# 22. Bulk selection and actions

Bulk actions are useful for administrators but should remain tightly controlled.

## Appropriate bulk actions

* Assign deal lead;
* add team member;
* apply tag;
* export authorized summary;
* change saved-view classification;
* archive completed deals;
* request access review.

## Inappropriate bulk actions

* Change transaction stage;
* approve findings;
* approve valuations;
* terminate deals;
* delete deals;
* alter permissions across restricted deals without confirmation.

## Interaction

When rows are selected, display a contextual action bar:

> **3 deals selected**

Actions:

* Assign;
* tag;
* export;
* archive;
* more.

The bar should disappear when selection clears.

---

# 23. Tags and classifications

Tags may be useful for institution-specific portfolio organization.

Examples:

* Strategic account;
* founder-owned;
* cross-border;
* confidential;
* priority mandate;
* regulated;
* sponsor-backed;
* design-partner POC.

## Rules

Tags should not duplicate structured fields.

Avoid using tags for:

* Stage;
* status;
* currency;
* transaction side;
* deal lead.

Those belong in normalized fields.

Institution administrators should be able to manage permitted tags.

---

# 24. Attention and risk representation

The portfolio should show enough attention context to support navigation, but not attempt to replace the Command Center.

## Recommended attention states

### On track

No material blocker or overdue decision.

### Attention required

A user review or near-term issue exists.

### At risk

A material issue threatens schedule, valuation, access or execution.

### Blocked

A required dependency prevents progression.

### Stale

No meaningful update has occurred within a configured period.

## Explainability

Every state should expose its reasons.

Example:

> **At risk**
> 1 high-severity finding
> 2 overdue information requests
> Diligence committee in 2 days

Avoid a decorative red status with no explanation.

---

# 25. Stage changes

Stage changes should occur from:

* Deal Overview;
* Deal Settings;
* authorized portfolio action;
* confirmed board movement.

## Confirmation content

Example:

> **Move Project Horizon to Negotiation?**

This will:

* Mark Due Diligence as completed;
* activate the Negotiation workspace;
* create the negotiation-readiness checklist;
* notify the deal team;
* record Marina Alves as the user making the change.

Actions:

* Move to Negotiation;
* cancel.

## Required controls

Depending on institution policy, stage change may require:

* Checklist completion;
* partner approval;
* required deliverable;
* explanation;
* effective date.

M&A transactions do not always move linearly, so authorized users should be able to reopen prior stages without deleting history.

---

# 26. Pause, terminate, complete and archive

These actions must have distinct semantics.

## Pause deal

Required fields:

* Reason;
* review date;
* whether document synchronization continues;
* whether automated analyses continue;
* who is notified.

## Terminate deal

Required fields:

* Termination reason;
* effective date;
* retention behavior;
* final notes;
* approval authority.

## Complete deal

Required conditions may include:

* Closing confirmed;
* final deliverables generated;
* outstanding approvals resolved;
* success-linked commercial record captured;
* post-closing tasks identified.

## Archive deal

Archive should:

* make the workspace read-only by default;
* preserve audit history;
* preserve evidence links;
* preserve versions;
* remove it from active views;
* retain controlled restoration capability.

Delete should remain a separate, highly restricted governance operation.

---

# 27. Access and confidentiality

The portfolio may contain deals with different confidentiality levels.

## Recommended access labels

* Standard;
* restricted;
* highly restricted;
* read-only;
* external collaboration enabled.

## Visibility rules

A user may be able to know that a deal exists without seeing:

* Target identity;
* valuation;
* client;
* team;
* transaction rationale.

Example restricted row:

> **Project Obsidian**
> Restricted transaction
> Negotiation · Active
> Contact institution administrator

## Side-channel protection

Restricted information must not leak through:

* Search suggestions;
* result counts;
* sort order;
* export files;
* attention summaries;
* Copilot answers;
* notifications;
* recently opened lists.

---

# 28. Portfolio exports

## Appropriate exports

* Current filtered view;
* authorized deal registry;
* partner-review list;
* closing pipeline;
* archived-deal register;
* data-source exception report.

## Export metadata

Every export should state:

* Institution;
* user;
* timestamp;
* applied filters;
* visible columns;
* currency basis;
* confidentiality classification.

## File behavior

Sensitive fields should remain permission-aware.

An exported file should never contain data the user could not see in the interface.

---

# 29. Ask M&Ai in the portfolio

The contextual Copilot may support institution-level deal queries.

Suggested prompts:

* Which active deals have unresolved blockers?
* Show sell-side deals entering negotiation this month.
* Which deals have not had a meaningful update in 14 days?
* Compare upcoming milestones across my deals.
* Which transactions have valuation approvals pending?
* Summarize why Project Atlas is at risk.

## Response behavior

Responses should:

* Respect deal permissions;
* link to each deal;
* distinguish facts from inference;
* explain filtering criteria;
* avoid aggregating incompatible currencies;
* cite supporting workflow objects.

The Copilot should not become the only method of locating deals.

---

# 30. Recommended desktop layout

For a **1440 × 900** canvas with the expanded global shell:

| Region                  |   Approximate allocation |
| ----------------------- | -----------------------: |
| Global sidebar          |               240–256 px |
| Page header             |                 72–96 px |
| Scope and saved views   |                 48–56 px |
| State summary           |                 72–96 px |
| Search and filters      |                 56–72 px |
| Registry                | Remaining vertical space |
| Optional preview drawer |               360–440 px |

## Recommended composition

```text
┌───────────────┬─────────────────────────────────────────────────────┐
│ Global shell  │ Deals                                  [ New deal ] │
│               │ Browse and manage institution transactions          │
│               ├─────────────────────────────────────────────────────┤
│               │ My deals · All accessible · Recent · Archived       │
│               ├────────┬────────┬────────┬──────────┬───────────────┤
│               │Active  │At risk │Paused  │Completed │Archived       │
│               │14      │3       │2       │4         │11             │
│               ├─────────────────────────────────────────────────────┤
│               │ Search deals…   Status  Stage  Side  Lead  Filters │
│               ├─────────────────────────────────────────────────────┤
│               │ Deal          Stage       Attention     Lead        │
│               │                                                     │
│               │ Horizon       Diligence   2 decisions   Marina      │
│               │ Aurora        Universe    On track      Ana         │
│               │ Atlas         Closing     2 blockers    Rafael      │
│               │ Northstar     Valuation   Review due    Daniel      │
│               │                                                     │
└───────────────┴─────────────────────────────────────────────────────┘
```

## With preview

```text
┌──────────────────────────────────────────────┬──────────────────────┐
│ Deal registry                                │ Project Horizon      │
│                                              │                      │
│ Selected row                                 │ Due Diligence        │
│                                              │ 2 decisions required │
│ Other rows                                   │ 1 material change    │
│                                              │                      │
│                                              │ Next milestone       │
│                                              │ 30 July              │
│                                              │                      │
│                                              │ [ Open deal ]        │
└──────────────────────────────────────────────┴──────────────────────┘
```

---

# 31. Table density

The default desktop row height should be approximately:

> **56–68 px**

This allows:

* Deal codename;
* organization;
* badges;
* monetary range;
* next milestone;
* last update.

Avoid:

* 100+ px rows;
* oversized avatars;
* large company logos;
* multiline descriptions in every row.

The portfolio should support a compact-density preference for users managing many transactions.

---

# 32. UI design direction

## 32.1 Overall visual character

Aim for:

> **A controlled transaction registry with high scanning efficiency**

The screen should feel:

* Precise;
* institutional;
* confidential;
* calm;
* searchable;
* operational;
* structured.

It should not feel:

* Promotional;
* playful;
* visual-first at the expense of comparison;
* like a sales CRM;
* like a project-management board;
* like a card gallery.

## 32.2 Visual hierarchy

The hierarchy should prioritize:

1. Deal codename;
2. stage and status;
3. attention condition;
4. milestone;
5. ownership;
6. value and metadata.

The target company logo should not be the first thing the user sees.

## 32.3 Color

Use:

* Canvas Cream for the page;
* Lifted Cream or white for the registry surface;
* Ink Black for selected navigation and primary actions;
* Signal Orange sparingly for attention;
* semantic colors for risk and status;
* Dust Taupe for borders;
* Slate Gray for metadata.

### Selected row

Use:

* Subtle lifted background;
* left marker or border;
* clear keyboard focus;
* optional restrained orange accent.

Do not use a saturated full-row orange background.

## 32.4 Typography

Use **Sofia Sans** as the canonical product font.

Recommended hierarchy:

| Element          |     Size |  Weight |
| ---------------- | -------: | ------: |
| Page title       | 26–30 px | 500–600 |
| Deal codename    | 14–16 px | 650–700 |
| Organization     | 12–14 px | 450–550 |
| Column header    | 11–12 px | 650–700 |
| Stage and status | 12–13 px |     600 |
| Monetary value   | 13–15 px | 550–650 |
| Metadata         | 12–13 px | 450–550 |
| Preview title    | 20–24 px | 550–650 |

Use tabular numerals for:

* Monetary values;
* dates;
* counts;
* percentages.

## 32.5 Geometry

Recommended:

* Main registry: 8–12 px radius;
* Search and filters: 10–16 px;
* status tags: pill;
* row action buttons: 8–12 px;
* preview drawer: flush to viewport edge.

Avoid placing each row in an individual floating card.

---

# 33. UX design principles

## 33.1 Comprehensive, not noisy

The portfolio should expose every accessible deal while allowing users to reduce the view rapidly.

It should not display every available property simultaneously.

## 33.2 Stage is not progress percentage

Do not show:

> Deal 72% complete

M&A stages can reopen, overlap or stop unexpectedly.

Show:

* Current stage;
* completed milestones;
* open blockers;
* next milestone.

## 33.3 Status must be explainable

“At risk” and “blocked” require visible reasons.

## 33.4 Native currency by default

Every deal should display value in its native currency.

Do not silently convert or aggregate.

## 33.5 Preserve filter context

Opening a deal and returning should preserve:

* Scope;
* filters;
* sort;
* grouping;
* page;
* selected columns;
* scroll position.

## 33.6 Use exact-context deep links

A standard row click opens Deal Overview.

An attention link may open the exact relevant workspace.

Example:

> **2 decisions**

opens deal-scoped Tasks & Approvals or the first material decision.

## 33.7 Avoid accidental administrative changes

Stage, archive, termination and ownership changes should never occur through an unconfirmed single click.

## 33.8 Permission-aware comparison

Restricted rows should not reveal hidden values or conditions through visual width, sorting or tooltips.

## 33.9 Support keyboard-heavy operation

Users should be able to:

* focus search;
* move through rows;
* open preview;
* open deal;
* select rows;
* open row actions;
* change filters.

## 33.10 Distinguish no data from zero

Examples:

* **0 blockers** means blockers were assessed and none exist.
* **Not assessed** means M&Ai does not yet have enough information.
* **Restricted** means the user cannot view the result.

These states must not collapse into an empty cell.

---

# 34. System states

## 34.1 First-use state

When no deals exist:

> **No transaction workspaces yet**
> Create the institution’s first deal, assign its team and connect an initial document source.

Primary action:

> New deal

Secondary:

> Explore sample deal

The sample must be clearly fictional.

## 34.2 No results

> **No deals match these filters**

Actions:

* Clear filters;
* search all accessible deals;
* open archived deals.

Do not imply that no deals exist.

## 34.3 Loading

Render:

* Stable page header;
* saved-view skeleton;
* filter skeleton;
* table-row skeletons.

Do not use a full-screen spinner.

## 34.4 Partial data

Example:

> Some attention indicators could not be loaded.

The core registry should remain available.

## 34.5 Permission-limited state

Example:

> 3 restricted transactions are hidden from this view.

Only show this count when institution policy permits users to know that restricted deals exist.

## 34.6 Archived view

Display a persistent explanation:

> **Archived deals are read-only by default.**

Actions may include:

* Open;
* export;
* restore, when authorized.

## 34.7 Sync warning

Example:

> Project Atlas document source has not synchronized since 26 July at 18:32.

The deal remains accessible.

## 34.8 Error state

The table should fail independently from summary components where possible.

Example:

> **Deals unavailable**
> We could not load the portfolio registry. Retry.

## 34.9 Offline state

> **Connection interrupted**
> Displayed deal information may be outdated. Administrative changes are unavailable.

---

# 35. Responsive behavior

## Desktop — 1280 px and above

* Expanded sidebar;
* full table;
* visible primary filters;
* optional preview drawer;
* configurable columns.

## Tablet — 768–1279 px

* Compact sidebar;
* fewer default columns;
* filters move into drawer;
* organization may sit beneath codename;
* milestone and last-update columns may collapse;
* preview becomes overlay drawer.

Recommended visible columns:

* Deal;
* stage;
* attention;
* lead;
* milestone.

## Mobile — below 768 px

Use structured deal cards rather than a horizontally compressed table.

Each card should contain:

* Codename;
* organization;
* stage;
* status;
* attention;
* next milestone;
* deal lead;
* open action.

Recommended order:

1. Scope;
2. search;
3. key filters;
4. deal list;
5. pagination or incremental loading.

Bulk administration should remain desktop-first.

---

# 36. Accessibility requirements

The Deals Portfolio should support:

* Semantic table markup in table view;
* row headers using deal codename;
* sortable-column announcements;
* accessible filter labels;
* visible keyboard focus;
* no color-only state;
* screen-reader descriptions of stage and status;
* explicit currency identification;
* accessible overflow menus;
* touch targets of at least 44 × 44 px;
* descriptive open links;
* announced result counts;
* announced filter changes;
* reduced-motion preference;
* accessible drag alternatives in board view.

Avoid links labeled only:

> Open

Prefer:

> Open Project Horizon

---

# 37. Component architecture for Figma

## `DealsPortfolioHeader`

Properties:

* Can create deal;
* cannot create deal;
* export available;
* loading;
* mobile.

## `PortfolioScopeTabs`

Variants:

* My deals;
* all accessible;
* team;
* recent;
* archived;
* custom saved view.

## `PortfolioStateSummary`

Properties:

* Active;
* at risk;
* paused;
* completed;
* archived;
* selected;
* zero;
* restricted.

## `DealSearch`

States:

* Empty;
* typing;
* result count;
* no result;
* loading;
* error.

## `DealFilterBar`

Properties:

* Compact;
* expanded;
* active filters;
* overflow;
* mobile drawer.

## `SavedViewSelector`

States:

* Personal;
* shared;
* modified;
* unsaved;
* read-only.

## `ViewSwitcher`

Variants:

* Table;
* cards;
* stage board.

## `DealRegistryTable`

States:

* Populated;
* empty;
* no results;
* loading;
* error;
* partial data;
* selection mode.

## `DealRow`

Properties:

* Sell-side;
* buy-side;
* merger;
* draft;
* active;
* at risk;
* paused;
* completed;
* archived;
* restricted;
* selected;
* keyboard focus;
* attention state;
* monetary value visible or hidden.

## `DealCard`

Use equivalent properties for tablet and mobile.

## `DealPreviewDrawer`

States:

* Closed;
* loading;
* populated;
* restricted;
* archived;
* error.

## `BulkActionBar`

States:

* One selected;
* multiple selected;
* mixed permissions;
* export;
* archive;
* assign;
* error.

## `StageBoard`

Properties:

* Sell-side;
* buy-side;
* read-only;
* draggable;
* stage-change confirmation;
* restricted card.

---

# 38. Production object model

## `DealPortfolioItem`

```text
id
codename
organizationId
organizationName
transactionType
transactionSide
stage
status
attentionState
attentionReasons
indicativeValueLow
indicativeValueHigh
currency
dealLeadId
dealLeadName
teamMemberIds
nextMilestoneId
nextMilestoneTitle
nextMilestoneAt
pendingDecisionCount
overdueTaskCount
blockerCount
openFindingCount
lastMeaningfulEvent
lastMeaningfulEventAt
lastAccessedAt
accessLevel
confidentialityLevel
dataSourceState
createdAt
updatedAt
archivedAt
```

## `DealStageHistory`

```text
id
dealId
fromStage
toStage
effectiveAt
changedBy
reason
approvalId
createdAt
```

## `DealStatusHistory`

```text
id
dealId
fromStatus
toStatus
reason
reviewAt
changedBy
createdAt
```

## `SavedDealView`

```text
id
name
ownerId
institutionId
shared
scope
filters
sort
grouping
visibleColumns
layout
createdAt
updatedAt
```

## `DealAttentionSummary`

```text
dealId
state
reasons
blocking
highestMateriality
pendingDecisionCount
overdueCount
nextExternalDeadline
lastCalculatedAt
```

The interface should consume explicit workflow states rather than infer deal condition from raw document or agent-run counts.

---

# 39. Suggested route and URL state

Primary route:

```text
/deals
```

Filtered example:

```text
/deals?scope=mine&status=active&stage=diligence,valuation&sort=attention
```

Archived:

```text
/deals?scope=archived
```

Saved view:

```text
/deals?view=closing-committee
```

Selected preview:

```text
/deals?selectedDealId=:dealId
```

Display codenames and slugs may appear in the preview UI, but URL ownership uses
the stable `dealId` so restricted or renamed codenames do not become route
authority.

A direct deal route remains:

```text
/deals/:dealId/overview
```

URLs should preserve meaningful portfolio context without encoding temporary hover or menu states.

---

# 40. Repository direction

The existing pipeline-board concept can provide useful visual components, but it should not remain the default expression of the Deals Portfolio.

## Keep

* Existing deal fixture infrastructure;
* reusable deal-card primitives;
* stage labels;
* responsive application shell;
* routing foundation;
* status-badge components;
* current list and card utilities;
* tenant-aware access patterns.

## Reposition

* Existing pipeline board as optional **Stage Board**;
* summary cards as filters rather than vanity metrics;
* deal cards as compact browse alternatives;
* role context as permission-aware scope.

## Add

* Canonical table view;
* normalized stage and status fields;
* attention-state reasons;
* advanced filters;
* saved views;
* configurable columns;
* native-currency handling;
* restricted-deal state;
* archived and terminated states;
* recent meaningful event;
* next milestone;
* preview drawer;
* bulk selection;
* exact-context deep links;
* stage-change audit record.

## Remove or avoid

* Technical engine states;
* generic agent-run counts;
* country selector in the main portfolio;
* client-view switching;
* custom-dashboard controls;
* unsupported health percentages;
* unconfirmed drag-and-drop stage mutation.

The global shell already defines Deals as one of five primary institution-level destinations and places the portfolio in global workspace mode with expanded navigation and institution-scoped search. 

---

# 41. What not to include

Avoid the following in the Deals Portfolio:

* Kanban as the only view;
* giant cards;
* large target logos;
* total agent runs;
* document-processing volume as a primary KPI;
* average AI confidence;
* infrastructure-health badges;
* generic activity feed;
* one-click stage changes;
* one-click archive or termination;
* a single combined stage/status field;
* unexplained deal-health scores;
* unrestricted monetary values;
* currency aggregation without methodology;
* role impersonation;
* client-view toggles;
* technical model names;
* real customer names in the mocked version;
* real integration logos for simulated sources;
* unsupported historical transaction data;
* a complete Deal Overview inside each row;
* hidden administrative changes;
* deletion as a common row action.

---

# 42. MOCKED — Pitch and demo specification

## 42.1 Purpose of the mocked Deals Portfolio

The mocked portfolio should demonstrate:

* Multiple parallel transactions;
* different transaction sides and stages;
* controlled attention states;
* consistent institutional ownership;
* rapid entry into a specific deal.

Its pitch narrative is:

> **M&Ai gives each advisory team one controlled operating layer across every active transaction.**

However, the screen is visually familiar and therefore not strongly differentiated.

The information architecture explicitly categorizes the Deals Portfolio as useful but insufficiently distinctive for the primary deck image. 

### Recommended use

Use it for:

* Live-demo navigation;
* product-overview appendix;
* architecture walkthrough;
* showing multi-deal scale;
* transition into Project Horizon.

Do not use it as the primary hero screen.

---

# 43. Mocked institution and user

Institution:

> **Atlas M&A Advisory**

User:

> **Ana Costa**
> Vice President

Active scope:

> **My deals**

Global shell:

* Deals active;
* Tasks & Approvals: **3**;
* Notifications: **2**;
* Ask M&Ai;
* expanded sidebar.

---

# 44. Mocked page header

Title:

> **Deals**

Description:

> Browse and manage your active transaction workspaces.

Primary action:

> **New deal**

Secondary:

> Export

Count:

> **12 accessible deals**

---

# 45. Mocked portfolio summary

Use:

| State     | Count |
| --------- | ----: |
| Active    | **8** |
| At risk   | **2** |
| Paused    | **1** |
| Completed | **3** |
| Archived  | **7** |

Selected:

> **Active**

Do not present a total transaction value.

---

# 46. Mocked filters

Visible filters:

* Active;
* all stages;
* all transaction types;
* my deals;
* attention.

Search placeholder:

> Search deals or organizations

Active filter chips:

> Active

> My deals

Sort:

> Recommended

View:

> Table

---

# 47. Mocked deal rows

Show five or six rows in a live demo.

For a static pitch image, show four.

## Row 1 — selected

### Project Horizon

> Atlas Industrial
> Sell-side
> **Due Diligence**
> **Attention required · 2 decisions**
> R$ 480 mi–R$ 520 mi
> Marina Alves
> Diligence committee · 30 jul.
> Valuation scenario v4 generated · 18 min ago

## Row 2

### Project Aurora

> Nova Health
> Sell-side
> **Buyer Universe**
> On track · Shortlist review pending
> R$ 210 mi–R$ 245 mi
> Ana Costa
> Client shortlist review · Tomorrow
> 3 buyers added to approved threshold · 1 h ago

## Row 3

### Project Atlas

> Boreal Logistics
> Buy-side
> **Closing**
> **Blocked · 2 conditions overdue**
> R$ 315 mi
> Rafael Mendes
> Closing-condition review · Friday
> Tax evidence marked incomplete · 3 h ago

## Row 4

### Project Northstar

> Vértice Software
> Buy-side
> **Valuation**
> Attention required · Scenario approval pending
> R$ 160 mi–R$ 185 mi
> Daniel Ribeiro
> Valuation committee · Thursday
> EBITDA adjustment proposed · Yesterday

## Row 5

### Project Meridian

> Serra Consumer
> Sell-side
> **Negotiation**
> On track · Counterproposal received
> R$ 390 mi–R$ 430 mi
> Marina Alves
> Term-sheet review · 2 ago.
> Latest offer terms reconciled · Yesterday

## Row 6

### Project Cedar

> Confidential target
> Buy-side
> **Diligence**
> Restricted
> Value restricted
> Deal lead restricted
> Milestone restricted
> Updated 2 days ago

This final row demonstrates permission boundaries without revealing sensitive content.

---

# 48. Mocked preview drawer

Selecting Project Horizon opens:

## Header

> **Project Horizon**
> Atlas Industrial · Sell-side

Tags:

* Active;
* Due Diligence;
* Restricted workspace.

## Attention

> **2 decisions required**

* Approve customer-concentration adjustment;
* review EBITDA normalization.

## Material change

> Risk-adjusted valuation midpoint decreased by **R$ 42 mi** after customer-revenue reconciliation.

## Next milestone

> Diligence committee
> 30 July · 14:00

## Team

> Marina Alves · Deal Lead
> Ana Costa · Vice President
> Felipe Rocha · Associate

## Quick destinations

* Open Overview;
* open Diligence;
* open Valuation.

Primary action:

> **Open deal**

---

# 49. Mocked stage board

The interactive prototype may include a secondary Stage Board.

Columns:

* Preparation;
* Buyer Universe;
* Due Diligence;
* Valuation;
* Negotiation;
* Closing.

Use the same mocked deals.

Do not present card movement as an effortless visual interaction. Dragging Project Horizon from Diligence to Negotiation should open a confirmation rather than immediately mutating the stage.

---

# 50. Pitch-specific simplification

## Keep visible

* Deals title;
* New deal;
* state summary;
* search;
* three filters;
* four deal rows;
* stage;
* attention;
* deal lead;
* next milestone.

## Hide

* Advanced filters;
* saved-view management;
* configurable columns;
* bulk selection;
* exports;
* archived deals;
* row overflow actions;
* full organization metadata;
* complete monetary history;
* stage board;
* preview drawer, unless used in a demo step.

## Readability requirement

At deck scale, the following must remain readable:

* **Project Horizon**
* **Due Diligence**
* **2 decisions**
* **Project Atlas**
* **Blocked**
* **Closing**
* **R$ 480 mi–R$ 520 mi**

If they are not readable, remove columns rather than shrinking type.

---

# 51. Recommended demo flow

## Flow A — Portfolio to decision

```text
Deals Portfolio
  ↓
Filter: Attention required
  ↓
Select Project Horizon
  ↓
Preview shows −R$ 42 mi material change
  ↓
Open Diligence
  ↓
Diligence Decision Room
  ↓
Review evidence and valuation impact
```

This is the strongest use of the portfolio in a live demo.

## Flow B — Search by target

```text
Deals Portfolio
  ↓
Search “Atlas Industrial”
  ↓
Project Horizon returned
  ↓
Open Deal Overview
```

## Flow C — Filter closing transactions

```text
Deals Portfolio
  ↓
Stage: Closing
  ↓
Project Atlas
  ↓
Blocked · 2 overdue conditions
  ↓
Open Closing Control Room
```

## Flow D — Restricted deal

```text
Deals Portfolio
  ↓
Open Project Cedar preview
  ↓
Restricted details remain hidden
  ↓
Request access or contact administrator
```

## Flow E — Saved view

```text
Deals Portfolio
  ↓
Apply “My active sell-side deals”
  ↓
Adjust stage to Diligence and Negotiation
  ↓
Save as personal view
```

---

# 52. UX prototype tasks to validate

Test with bankers using tasks such as:

1. Find Project Horizon.
2. Identify every active buy-side transaction.
3. Find deals currently in Closing.
4. Identify which deal is blocked.
5. Find the next deal milestone.
6. Determine who leads Project Aurora.
7. Locate deals with approval decisions pending.
8. Open the exact Diligence workspace for Project Horizon.
9. Find a completed transaction from 2025.
10. Distinguish a paused deal from a terminated deal.
11. Explain why Project Atlas is at risk.
12. Save a view for active sell-side transactions.
13. identify a restricted deal without exposing its target.
14. return to the same filtered portfolio after reviewing a deal.
15. archive a completed test deal.

## Measures

Record:

* Time to locate a known deal;
* number of filter errors;
* whether stage and status are confused;
* whether attention states are understood;
* whether users prefer table or board;
* whether users notice native currency;
* whether permission states are clear;
* whether preview reduces unnecessary navigation;
* whether users can return without losing context;
* whether row density feels excessive.

---

# 53. Design validation criteria

The Deals Portfolio is ready for approval when:

1. Users can locate a known deal within five seconds.
2. Stage and workspace status are visibly distinct.
3. The default table supports rapid comparison.
4. The Command Center remains necessary for priority work.
5. Deal Overview remains necessary for transaction detail.
6. Attention states expose their reasons.
7. Native currency is preserved.
8. Restricted monetary values cannot leak through the interface.
9. Filters combine predictably.
10. Saved views preserve relevant portfolio state.
11. Opening and returning preserves filters and scroll.
12. Board view is secondary, not mandatory.
13. Stage movement requires confirmation.
14. Archived and terminated are separate concepts.
15. Administrative actions respect authority.
16. Restricted deals remain confidential in search and export.
17. The first viewport shows enough rows to feel like a portfolio.
18. The screen remains useful without Copilot.
19. Partial service failures do not block deal access.
20. Mocked data remains fictional.
21. The pitch version does not compete with the Decision Room.
22. Every row has a clear open destination.
23. “No data,” “zero” and “restricted” are distinct.
24. Keyboard users can search, filter and open a deal.
25. Mobile cards preserve the essential transaction hierarchy.

---

# 54. Final design target

The correct design target is not:

> “A visually impressive pipeline.”

It is:

> **A reliable institutional registry that lets bankers find, compare and enter any authorized transaction while preserving deal isolation, lifecycle context and operational accountability.**

The screen should make parallel execution feel controlled.

Its defining interaction is:

> **Locate the deal → understand its state → identify its attention condition → enter the correct workspace**

**Next iteration: New Deal Setup.**
