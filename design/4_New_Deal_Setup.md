---
canonical_name: "New Deal Setup"
definition_id: "BD-04"
definition_status: "Governed for MAI-90"
screen_family: "global-foundation"
owning_task: "MAI-91"
canonical_routes:
  - "/deals/new"
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
# New Deal Setup

## 1. Screen definition

The **New Deal Setup** is the controlled workflow used to create a transaction workspace in M&Ai.

It converts an initial mandate, acquisition thesis or transaction opportunity into a structured, permission-aware deal environment containing:

* Transaction identity;
* Deal strategy and side;
* Participating organizations;
* Internal team;
* Access rules;
* Initial workflow;
* Document source;
* Jurisdiction and currency;
* Review thresholds;
* Audit ownership.

It should not be implemented as one large form.

The product architecture already defines New Deal Setup as an MVP workflow and recommends seven stages:

1. Transaction identity;
2. Deal strategy and side;
3. Participating organizations;
4. Team and permissions;
5. Document source;
6. Workflow template;
7. Review and creation. 

Its primary interaction is:

> **Define transaction → Establish scope → Assign authority → Configure workflow → Create isolated workspace**

---

# 2. Intention of the workflow

## Primary intention

The setup flow should create enough structure for M&Ai to operate correctly from the beginning of a transaction without forcing the banker to complete every possible field.

The workflow should answer:

1. **What transaction is being created?**
2. **Which side and strategy does the institution represent?**
3. **Which organizations participate in the transaction?**
4. **Who can access the workspace?**
5. **Who has authority to review or approve material outputs?**
6. **Where will the initial evidence come from?**
7. **Which deal workflow should M&Ai activate?**
8. **What will happen when the workspace is created?**

## User outcome

After completing the flow, the user should be able to say:

> “The transaction has the correct identity, participants, permissions and initial workflow, and the deal team can begin work without additional administrative setup.”

## Product outcome

The flow should ensure that every newly created workspace starts with:

* Explicit deal ownership;
* Deal-isolated access;
* Correct transaction-side terminology;
* An auditable creator;
* Controlled defaults;
* A coherent lifecycle configuration;
* A clear next action.

This matters because M&Ai’s product thesis depends on parallel, isolated deal workflows with human approval gates—not generic AI sessions operating without transaction scope. 

---

# 3. What New Deal Setup is not

The screen should not become:

* A generic CRM “create opportunity” form;
* A complete Target Dossier;
* A full organization-registration flow;
* A VDR configuration console;
* A detailed legal-mandate form;
* A pricing checkout;
* An unrestricted permission matrix;
* A complete project plan;
* A diligence questionnaire;
* A valuation model setup;
* An AI prompt configuration screen;
* A mandatory thirty-field intake form.

The setup flow should collect only what is required to create a safe and useful transaction workspace.

Detailed transaction intelligence should be developed later through:

* Deal Overview;
* Target Dossier;
* Documents;
* Diligence;
* Valuation;
* Matching;
* Negotiation;
* Closing.

---

# 4. Relationship to adjacent screens

| Screen                    | Responsibility                                           |
| ------------------------- | -------------------------------------------------------- |
| **Deals Portfolio**       | Initiates setup and displays created transactions        |
| **New Deal Setup**        | Establishes identity, scope, access and initial workflow |
| **Deal Overview**         | Shows the operational state after creation               |
| **Target Dossier**        | Builds the structured transaction profile                |
| **Documents & VDR**       | Manages evidence ingestion and document control          |
| **Deal Team & Access**    | Supports detailed permission management after creation   |
| **Deal Settings**         | Changes configuration after the workspace exists         |
| **Organizations**         | Maintains reusable company and institutional records     |
| **Templates & Playbooks** | Defines reusable workflow configurations                 |

## Setup versus Target Dossier

Setup should collect:

* Target organization identity;
* Transaction side;
* Broad strategy;
* Basic mandate context.

The Target Dossier should later collect and maintain:

* Ownership;
* Business model;
* products;
* markets;
* financial history;
* management;
* evidence-linked facts;
* open questions.

## Setup versus Deal Settings

Setup establishes initial configuration.

Deal Settings later allows authorized users to modify:

* Currency;
* jurisdiction;
* thresholds;
* workflow template;
* connected sources;
* retention;
* archive behavior.

## Setup versus Data Source Connection

The initial source decision belongs in setup, but detailed source configuration may continue in a dedicated connection flow.

For example:

> Connect document source now

may open a provider-specific sequence after the core deal has been saved.

---

# 5. Primary users

## 5.1 Vice president or deal lead

The most likely creator for a live transaction.

They need to:

* Establish deal identity;
* Select transaction type and side;
* Assign the team;
* define initial access;
* select a workflow;
* approve creation.

## 5.2 Associate

May create a draft workspace but may require senior review before activation.

They need:

* A fast setup flow;
* clear defaults;
* ability to save draft;
* ability to request activation approval.

## 5.3 Managing director or partner

May initiate a mandate and delegate operational setup.

They need:

* Minimal initial capture;
* assignment to a deal lead;
* controlled authority;
* visibility into commercial and client ownership.

## 5.4 Institution administrator

May create workspaces, apply policies and configure access.

They need:

* Institution-standard defaults;
* templates;
* permission checks;
* auditability;
* duplicate detection.

---

# 6. Primary job to be done

> When a new mandate, acquisition process or transaction opportunity begins, create a correctly scoped and secured deal workspace without requiring the team to rebuild its workflow manually.

## Secondary jobs

The user should also be able to:

* Save a partially configured deal;
* create from a reusable template;
* associate an existing organization;
* create a provisional confidential organization;
* invite internal team members;
* request access for external specialists;
* choose whether to connect documents immediately;
* review all consequences before creation;
* duplicate non-sensitive configuration from a previous deal;
* return to the originating portfolio view after cancellation.

---

# 7. Setup model

The workflow should distinguish three levels of completeness.

## 7.1 Draft workspace

A deal exists but is not operational.

Minimum fields:

* Codename;
* transaction side or provisional type;
* creator;
* institution.

A draft may be used when:

* The mandate is not final;
* the target identity remains restricted;
* team composition is unresolved;
* document access is not yet available.

Draft limitations:

* No automated analysis;
* no external invitations;
* no approval workflow;
* no document-source synchronization;
* clearly marked incomplete.

## 7.2 Active workspace

The deal is ready for internal execution.

Required:

* Codename;
* transaction type and side;
* at least one organization or confidential placeholder;
* deal lead;
* internal team;
* access policy;
* workflow template;
* currency and jurisdiction;
* initial stage.

## 7.3 Fully connected workspace

The deal is active and has an evidence source.

Includes:

* VDR or storage connection;
* controlled upload source;
* processing rules;
* document synchronization;
* source administrator.

The user should not be forced to reach the fully connected state before creating the workspace.

---

# 8. Recommended setup sequence

```text
Start
  ↓
1. Deal identity
  ↓
2. Transaction strategy
  ↓
3. Organizations
  ↓
4. Team and access
  ↓
5. Workflow and governance
  ↓
6. Documents and sources
  ↓
7. Review and create
  ↓
Deal Overview
```

I recommend combining the original “workflow template” and selected governance defaults into one stage.

The final seven-step sequence becomes:

1. **Deal identity**
2. **Transaction strategy**
3. **Organizations**
4. **Team & access**
5. **Workflow & governance**
6. **Documents & sources**
7. **Review & create**

---

# 9. Setup shell

The setup should use a constrained global-workspace shell rather than the complete deal workspace shell.

## Recommended shell state

* Global sidebar visible;
* Deals active;
* page-scoped breadcrumb;
* no deal-level navigation yet;
* search minimized;
* Copilot optional;
* setup progress visible;
* cancel and save-draft controls persistent.

Breadcrumb:

> Deals / New deal

## Why no deal navigation yet

Before creation, there is no active deal workspace.

Showing tabs such as Diligence, Valuation or Closing would imply that the transaction already exists and may cause navigation ambiguity.

---

# 10. Progress model

## Recommended progress component

Use a vertical stepper on desktop and a compact horizontal progress indicator on smaller screens.

Desktop:

```text
1  Deal identity
2  Transaction strategy
3  Organizations
4  Team & access
5  Workflow & governance
6  Documents & sources
7  Review & create
```

## Step states

* Not started;
* current;
* complete;
* complete with warning;
* incomplete;
* blocked;
* optional skipped.

## UX rule

Progress should indicate **setup completion**, not transaction progress.

This is one of the few places in M&Ai where a linear step sequence is appropriate because it represents a controlled configuration workflow rather than the nonlinear lifecycle of an M&A transaction.

## Navigation behavior

Users should be able to return to completed steps.

They should not be allowed to proceed past a step containing unresolved blocking errors.

Optional steps may be skipped with visible consequences.

Example:

> Documents are not connected. The workspace will be created without automated evidence processing.

---

# 11. Step 1 — Deal identity

## Purpose

Establish the transaction’s internal identity and basic administrative context.

## Required fields

### Deal codename

Example:

> **Project Horizon**

Rules:

* Required;
* unique within the institution where practical;
* support letters, numbers, spaces and hyphens;
* warn on duplicates;
* avoid exposing target identity by default.

### Internal reference

Example:

> ATM-2026-014

May be:

* Generated automatically;
* editable by authorized users;
* based on institution conventions.

### Workspace confidentiality

Recommended options:

* Standard;
* restricted;
* highly restricted.

Default:

> Restricted

### Deal status

At creation:

* Draft;
* active.

Do not allow creation directly as completed, terminated or archived.

## Optional fields

* Working title;
* client-mandate reference;
* short description;
* expected start date;
* expected close period;
* source of mandate;
* internal tags.

## Codename guidance

Supporting copy:

> Use a confidential internal name. The target or client name can be associated separately.

## Duplicate detection

When the user enters:

> Project Horizon

M&Ai should detect:

* Exact codename matches;
* similar codenames;
* same organization in another active deal;
* same mandate reference.

Warning example:

> **A similar deal already exists**
> Project Horizon II · Active · Created 12 May 2026

Actions:

* Review existing deal;
* continue with this codename;
* change codename.

This should generally be a warning rather than an automatic block.

---

# 12. Step 2 — Transaction strategy

## Purpose

Define what kind of transaction M&Ai is supporting and which party the institution represents.

This step controls:

* Terminology;
* workflow defaults;
* matching behavior;
* initial navigation;
* diligence orientation;
* approval templates;
* expected artifacts.

## Transaction side

Recommended primary options:

### Sell-side

> The institution advises a seller or target seeking a buyer or investor.

### Buy-side

> The institution advises a buyer or investor evaluating acquisition targets.

### Bilateral or merger

> The institution supports a negotiated combination involving identified counterparties.

### Capital transaction

> The institution supports an equity investment, minority transaction, recapitalization or financing-related process.

### Other

> Use a configurable transaction structure.

## Transaction type

Options may include:

* Full acquisition;
* majority investment;
* minority investment;
* merger;
* carve-out;
* divestiture;
* recapitalization;
* management buyout;
* joint venture;
* asset purchase;
* strategic partnership;
* other.

## Representation

Explicitly identify the institution’s client role:

* Seller advisor;
* buyer advisor;
* target advisor;
* shareholder advisor;
* independent advisor;
* internal corporate-development team;
* investment team.

## Initial transaction stage

Recommended options should adapt to the selected side.

### Sell-side examples

* Mandate / Setup;
* Preparation;
* Buyer Universe;
* Outreach;
* Due Diligence;
* Negotiation;
* Closing.

### Buy-side examples

* Thesis / Setup;
* Target Universe;
* Screening;
* Due Diligence;
* Valuation;
* Offer;
* Negotiation;
* Closing.

## Strategic objective

Use structured options plus a concise free-text field.

Examples:

* Maximize valuation;
* maximize certainty of closing;
* accelerate execution;
* identify strategic buyer;
* secure growth capital;
* acquire specific capability;
* consolidate sector position;
* enable shareholder liquidity.

Free text:

> Describe the transaction’s principal objective.

Limit this field to a concise statement, not a complete investment memorandum.

## Expected transaction value

Optional at setup.

Fields:

* Lower estimate;
* upper estimate;
* currency;
* basis.

Example:

> R$ 480 mi–R$ 520 mi
> Indicative enterprise value

Basis options:

* Enterprise value;
* equity value;
* purchase price;
* investment amount;
* unknown.

Do not force a valuation before sufficient information exists.

## Geography and jurisdiction

* Primary country;
* transaction jurisdiction;
* additional relevant jurisdictions;
* default time zone.

For the mocked Brazilian transaction:

> Brazil
> São Paulo
> America/Sao_Paulo

---

# 13. Dynamic configuration by transaction side

The selected side should alter labels and defaults throughout the product.

| Concept              | Sell-side                            | Buy-side                                 |
| -------------------- | ------------------------------------ | ---------------------------------------- |
| Matching workspace   | Buyer Universe                       | Target Universe                          |
| Primary organization | Target / Seller                      | Buyer / Acquirer                         |
| Counterparty search  | Potential buyers                     | Potential targets                        |
| Initial objective    | Maximize value and certainty         | Strategic and financial fit              |
| Outreach workflow    | Buyer outreach                       | Target engagement                        |
| Approval emphasis    | Buyer shortlist and offer comparison | Target shortlist and investment approval |
| Dossier orientation  | Target business profile              | Target screening and acquisition thesis  |

The product architecture already calls for the same underlying capabilities to adapt labels and phase emphasis based on transaction side. 

## UX rule

Changing transaction side after later steps have been completed should trigger a consequence warning.

Example:

> **Change transaction side to Buy-side?**

This will:

* Replace Buyer Universe with Target Universe;
* reset matching criteria;
* update the default workflow;
* remove incompatible role assignments;
* preserve deal identity and organizations.

---

# 14. Step 3 — Organizations

## Purpose

Associate reusable organizations with transaction-specific roles.

## Core principle

An organization is reusable across the institution.

Its role in a deal is transaction-specific.

For example:

> Atlas Industrial

may be:

* Target in Project Horizon;
* buyer candidate in another process;
* portfolio company of a sponsor;
* former client.

The architecture explicitly distinguishes reusable organization records from the deal-specific Target Dossier. 

## Organization roles

Recommended roles:

* Client;
* target;
* seller;
* buyer;
* acquirer;
* investor;
* parent company;
* shareholder;
* sponsor;
* lender;
* legal advisor;
* financial advisor;
* accounting advisor;
* regulatory advisor;
* other counterparty.

## Sell-side setup example

Required:

* Client or seller;
* target organization.

Optional:

* Shareholders;
* parent company;
* existing advisors.

## Buy-side setup example

Required:

* Client or buyer.

Optional:

* Known target;
* investment vehicle;
* financing provider;
* sponsor.

A buy-side deal may begin without a known target, in which case the Target Universe becomes the initial discovery workspace.

## Organization search

The user should be able to search existing records by:

* Legal name;
* trading name;
* tax identifier;
* domain;
* internal alias;
* prior deal.

Example:

> Search organizations

Result:

> **Atlas Industrial S.A.**
> Industrial technology · Brazil
> 2 related deals

## Creating an organization inline

When no record exists, provide:

> Create organization

Minimum fields:

* Display name;
* legal name, if known;
* organization type;
* country;
* optional domain.

Do not open the complete Organization Detail form inside setup.

## Confidential placeholder

For highly sensitive or unidentified organizations, allow:

> Create confidential placeholder

Example:

> Confidential Target A

Placeholder fields:

* Internal alias;
* role;
* confidentiality level;
* optional limited administrators.

The placeholder can later be resolved to a full organization without breaking deal history.

## Duplicate organization warning

Example:

> **Possible duplicate organization**
> Atlas Industrial S.A. and Atlas Indústria Ltda. share the same domain.

Actions:

* Use existing;
* review organization;
* create separate record.

---

# 15. Transaction roles

Each associated organization should receive an explicit role.

Example:

| Organization       | Deal role      |
| ------------------ | -------------- |
| Atlas Industrial   | Target         |
| Horizon Holdings   | Seller         |
| Atlas M&A Advisory | Seller advisor |
| Vieira & Lopes     | Legal advisor  |

## Role constraints

The system should warn when:

* No client is defined;
* no primary target exists for a sell-side deal;
* the same organization is assigned conflicting roles;
* a restricted organization is visible to an unauthorized user;
* an advisor is incorrectly assigned as a principal party.

## Multi-party transactions

Support:

* Multiple sellers;
* consortium buyers;
* co-investors;
* multiple targets;
* carve-out parent and business unit;
* joint-venture participants.

The setup UI should handle this through repeatable rows rather than fixed “Buyer” and “Seller” fields.

---

# 16. Step 4 — Team & access

## Purpose

Determine who can see, operate and approve work inside the transaction.

This is one of the most consequential setup steps.

## Required role

Every active workspace must have a:

> **Deal lead**

The deal lead owns:

* Workspace configuration;
* operational escalation;
* team assignment;
* milestone oversight;
* default approval routing.

## Internal team roles

Recommended roles:

* Managing Director / Partner;
* deal lead;
* Vice President;
* Associate;
* Analyst;
* specialist reviewer;
* administrator;
* observer;
* auditor.

Role names may be customized by institution, but approval authority should be separately modeled.

## Assignment interface

Provide:

* Search institution members;
* role selection;
* workstream assignment;
* access level;
* approval authority.

Example:

| Team member    | Role           | Workstream           | Access                |
| -------------- | -------------- | -------------------- | --------------------- |
| Marina Alves   | Deal Lead      | All                  | Full                  |
| Ana Costa      | Vice President | Diligence, Valuation | Full                  |
| Felipe Rocha   | Associate      | Financial            | Edit                  |
| Daniel Ribeiro | Specialist     | Tax                  | Restricted workstream |

## Access levels

Recommended:

* Full access;
* edit assigned workstreams;
* review;
* read-only;
* restricted section access;
* audit-only.

## Approval authority

Do not infer approval authority only from job title.

Explicit capabilities may include:

* Approve material findings;
* approve valuation changes;
* approve buyer or target shortlist;
* approve negotiation positions;
* approve closing readiness;
* manage access;
* archive deal.

## Default inheritance

Institution templates may propose:

> Vice Presidents can approve diligence findings up to configured materiality thresholds.

But setup should show the effective result.

---

# 17. Confidentiality segmentation

Some transactions require restricted workstreams within an already restricted deal.

Examples:

* Executive compensation;
* employee matters;
* antitrust;
* financing;
* litigation;
* negotiation strategy;
* bidder identity;
* valuation.

## Setup-level behavior

Allow the creator to select:

* Standard deal access;
* restricted deal;
* highly restricted deal;
* custom access configuration.

### Standard

Institution members assigned to the deal receive normal access based on role.

### Restricted

Only explicitly assigned users can discover and access the deal.

### Highly restricted

The deal may be hidden from:

* Portfolio search;
* global results;
* notifications;
* general administrators without explicit authority.

### Custom

Allows initial workstream-level restrictions.

## UX direction

Do not expose a complete access-control matrix by default.

Use a progressive sequence:

1. Select confidentiality model;
2. assign core team;
3. review effective access;
4. open advanced permissions only when needed.

---

# 18. External participants

External users should generally not be invited during initial MVP setup unless the external portal is available.

Potential participants:

* Client executives;
* legal counsel;
* accounting advisors;
* consultants;
* external approvers;
* management team.

## Recommended initial behavior

Provide a disabled or deferred option:

> Add external participants after workspace creation

Supporting explanation:

> External users receive restricted portal access and do not automatically see internal findings, valuation or negotiation strategy.

This preserves a clear distinction between banker workspace and external participation.

---

# 19. Step 5 — Workflow & governance

## Purpose

Choose which transaction playbook M&Ai activates and define its initial approval behavior.

## Workflow template

Templates may include:

* Sell-side standard;
* sell-side accelerated;
* buy-side screening;
* buy-side full diligence;
* minority investment;
* merger;
* carve-out;
* closing-only;
* historical deal review;
* institution custom.

## Template preview

Each template should show:

* Intended use;
* enabled workspaces;
* initial stage;
* default workstreams;
* milestone structure;
* approval gates;
* required dossier fields;
* expected deliverables.

Example:

> **Sell-side Standard**
> Preparation → Buyer Universe → Due Diligence → Valuation → Negotiation → Closing
> Includes financial, legal, tax, commercial and operational diligence workstreams.

## Template selection effect

The selected template may configure:

* Deal tabs;
* Target Dossier structure;
* diligence categories;
* severity thresholds;
* valuation methods;
* buyer or target matching;
* negotiation term schema;
* closing checklist;
* approval chain;
* deliverables.

## UX rule

The user should choose a business workflow—not technical agent or engine configurations.

Do not ask:

* Which RAG pipeline?
* Which embedding model?
* Which ONNX engine?
* Which agent graph?
* Which memory configuration?

M&Ai’s product navigation should expose banker workflow concepts rather than technical subsystems. 

---

# 20. Governance defaults

## Materiality threshold

The institution template may define initial thresholds.

Example:

> Diligence review threshold
> R$ 5 mi financial exposure or 5% of LTM EBITDA

The setup screen should allow authorized users to:

* Accept institution defaults;
* choose a different approved policy;
* defer detailed thresholds to Deal Settings.

## Approval model

Recommended options:

### Standard approval

* Analyst or associate prepares;
* VP reviews;
* partner approves high-materiality items.

### Lean team

* Associate prepares;
* deal lead approves.

### Committee model

* Workstream reviewer;
* deal lead;
* committee approval.

### Custom

* Configurable after creation.

## Human approval principles

Templates should ensure that material outputs such as:

* Valuation changes;
* high-risk findings;
* shortlist approval;
* negotiation positions;
* closing readiness;

remain subject to explicit human review.

This is consistent with M&Ai’s decision-grade layer, which connects evidence, deterministic calculations and human approval. 

---

# 21. Initial workstreams

Recommended workstreams:

* Financial;
* legal;
* tax;
* commercial;
* operational;
* technology;
* human resources;
* environmental;
* regulatory;
* cybersecurity;
* integration planning.

The workflow template should preselect common workstreams.

The user may:

* Enable;
* disable;
* assign lead;
* mark not applicable;
* add institution-defined workstream.

Example:

| Workstream    | Enabled | Lead                   |
| ------------- | ------- | ---------------------- |
| Financial     | Yes     | Ana Costa              |
| Legal         | Yes     | External counsel later |
| Tax           | Yes     | Daniel Ribeiro         |
| Commercial    | Yes     | Felipe Rocha           |
| Environmental | No      | Not applicable         |

Avoid forcing all categories on every deal.

---

# 22. Initial milestones

The template may generate initial milestone placeholders.

Examples:

* Mandate confirmed;
* VDR ready;
* information memorandum draft;
* buyer shortlist approval;
* management presentation;
* initial bid deadline;
* diligence committee;
* valuation committee;
* binding offers;
* term-sheet approval;
* signing;
* closing.

At setup, the user should only be required to provide:

* Known external deadline;
* expected closing period;
* immediate next milestone.

The complete timeline belongs in Deal Overview and downstream workspaces.

---

# 23. Step 6 — Documents & sources

## Purpose

Determine how the workspace will receive its initial evidence.

## Recommended options

### Connect a document source

For future supported integrations:

* VDR;
* cloud storage;
* secure institutional repository.

### Upload initial documents

Allow controlled manual upload.

### Create without documents

The workspace is created and sources are connected later.

### Historical-deal import

A later workflow for structured evaluation or retrospective testing.

## Source status language

Use business-relevant language:

* Not connected;
* connection required;
* awaiting authorization;
* connected;
* synchronization pending;
* synchronization active;
* error.

Avoid infrastructure language such as:

* Connector daemon active;
* queue worker online;
* RAG ingestion ready.

---

# 24. Document-source connection

## Initial source fields

* Source type;
* source name;
* authorization owner;
* root folder or data room;
* synchronization mode;
* access scope;
* initial import behavior.

## Synchronization mode

Recommended options:

### Continuous synchronization

New and changed documents are detected automatically.

### Manual synchronization

An authorized user triggers imports.

### One-time import

Documents are copied once for historical or controlled review.

## Initial import behavior

Options:

* Import all accessible documents;
* choose folders;
* connect without importing;
* upload selected documents only.

## Permission review

Before connection, display:

> M&Ai will only access folders authorized through this connection.

Avoid claiming absolute security properties that are not technically verified.

Use explicit architectural language such as:

* Deal-scoped access;
* no cross-deal retrieval;
* source permissions preserved where supported;
* connector authorization recorded.

---

# 25. Manual upload

When the user selects manual upload, show a compact drop zone.

Accepted examples:

* PDF;
* XLSX;
* DOCX;
* PPTX;
* CSV;
* supported image formats.

## Upload state

Each file should show:

* Filename;
* size;
* type;
* upload status;
* duplicate warning;
* permission classification;
* remove action.

## Classification

The user may optionally classify initial files:

* Financial;
* legal;
* tax;
* commercial;
* corporate;
* operational;
* unknown.

Automatic classification can occur later.

## UX rule

Document upload should not dominate the setup experience.

The full Documents & VDR screen is designed for ongoing document control.

---

# 26. Create without documents

This should remain a first-class option.

Supporting copy:

> Create the workspace now and connect evidence later.

Consequences:

* Dossier begins with user-entered facts only;
* automated diligence remains unavailable;
* evidence coverage is empty;
* document-dependent agents do not run;
* a setup task is created.

Review warning:

> No document source is connected. M&Ai will create a task for the deal lead to complete evidence setup.

---

# 27. Step 7 — Review & create

## Purpose

Show exactly what will be created and expose any unresolved risks before activation.

## Review structure

### Deal identity

* Project Horizon;
* internal reference;
* confidentiality;
* start date.

### Transaction strategy

* Sell-side;
* full acquisition;
* seller advisor;
* preparation stage;
* Brazil;
* R$.

### Organizations

* Atlas Industrial · Target;
* Horizon Holdings · Seller;
* Atlas M&A Advisory · Advisor.

### Team and access

* Marina Alves · Deal Lead;
* Ana Costa · VP approver;
* Felipe Rocha · Associate;
* Restricted workspace.

### Workflow

* Sell-side Standard;
* financial, legal, tax, commercial and operational workstreams;
* standard approval model.

### Documents

* Manual upload;
* 6 files ready;
* continuous source not connected.

### Governance

* High-severity findings require VP approval;
* valuation changes require deal-lead approval;
* closing readiness requires partner approval.

---

# 28. Readiness status

The review screen should separate blockers, warnings and recommendations.

## Blocker

Prevents active creation.

Example:

> **Deal lead required**
> Assign one internal user as deal lead.

## Warning

Allows creation with an acknowledged limitation.

Example:

> **No document source connected**
> Automated evidence analysis will remain unavailable.

## Recommendation

Improves configuration but is optional.

Example:

> **Expected closing period not set**
> Add a date range to improve milestone planning.

## Readiness summary

Example:

> **Ready to create**
> 6 sections complete · 1 warning

Or:

> **Setup incomplete**
> Resolve 2 required items before activation.

---

# 29. Final creation action

Primary action:

> **Create deal workspace**

Secondary:

* Save as draft;
* back;
* cancel.

## Consequence explanation

Immediately above the primary action:

> Creating this workspace will activate the selected workflow, apply the reviewed access rules and record you as the creator.

## Confirmation behavior

For a normal setup, do not add a redundant confirmation modal after the complete review step.

Use a confirmation modal only when:

* Highly restricted confidentiality is selected;
* external users will be invited;
* a live source will begin synchronization immediately;
* non-standard governance is configured;
* a duplicate deal warning remains unresolved.

---

# 30. Post-creation behavior

After successful creation, the user should land on **Deal Overview**, not return automatically to the Deals Portfolio.

## Success state

> **Project Horizon created**

Supporting summary:

* Workspace active;
* 4 internal members added;
* workflow initialized;
* 6 documents queued for processing;
* 2 setup tasks created.

Primary action:

> **Open Deal Overview**

Secondary actions:

* Continue to Target Dossier;
* review documents;
* invite team member.

## Automatic records

Creation should generate:

* Deal audit record;
* stage history;
* status history;
* effective permission snapshot;
* workflow-template version;
* creator identity;
* source-connection record;
* setup warnings;
* initial tasks.

---

# 31. Suggested automatic tasks

Depending on configuration, M&Ai may create tasks such as:

* Complete Target Dossier;
* connect document source;
* review imported documents;
* confirm diligence workstreams;
* set transaction milestones;
* assign legal reviewer;
* approve workspace activation.

These tasks should appear in:

* Deal Overview;
* Tasks & Approvals;
* Command Center, when material.

Do not create dozens of low-value setup tasks automatically.

---

# 32. Save as draft

## Purpose

Allow incomplete setup without forcing unsafe defaults.

## Behavior

Draft should preserve:

* All entered fields;
* current step;
* setup warnings;
* selected template;
* provisional organizations;
* team assignments;
* uploaded files not yet committed, subject to storage policy.

## Draft visibility

In Deals Portfolio:

> **Project Horizon**
> Draft · Setup 4 of 7 sections complete

## Resume behavior

The user should return to:

* The first incomplete blocking section; or
* The most recently edited section.

## Draft permissions

By default, a draft should be visible only to:

* Creator;
* assigned deal lead;
* institution administrators with appropriate authority.

---

# 33. Cancel behavior

Cancel should not silently discard substantial work.

## When no meaningful data has been entered

Return directly to Deals Portfolio.

## When data exists

Prompt:

> **Discard new deal setup?**

Options:

* Save as draft;
* discard setup;
* continue editing.

Uploaded files that have not been committed should be handled explicitly.

---

# 34. Validation behavior

## Inline validation

Use for:

* Required fields;
* format errors;
* invalid date ranges;
* duplicate role assignments;
* conflicting permissions.

## Step-level validation

Display a concise issue summary at the top of the step.

Example:

> Resolve 2 items before continuing.

## Cross-step validation

Use when a later choice conflicts with earlier information.

Examples:

* Sell-side selected but no target organization assigned;
* buy-side target-universe workflow selected while a bilateral target is fixed;
* deal lead removed from team;
* valuation approval configured with no authorized approver;
* restricted source assigned to unauthorized users.

## UX rule

Do not wait until the final review to expose basic errors.

---

# 35. Progressive disclosure

The setup should show simple defaults first and advanced controls only when required.

## Default path

A normal user should be able to create a deal using:

* Codename;
* transaction side;
* organizations;
* team;
* standard workflow;
* source choice;
* review.

## Advanced controls

Place behind expandable sections:

* Custom jurisdiction;
* custom workflow;
* workstream-level permissions;
* complex approval chain;
* data retention;
* specialized transaction type;
* multiple source connections;
* custom materiality thresholds.

This keeps the common path efficient without removing enterprise control.

---

# 36. Recommended desktop layout

For a **1440 × 900** canvas:

| Region             | Approximate width |
| ------------------ | ----------------: |
| Global sidebar     |        240–256 px |
| Setup stepper      |        220–260 px |
| Form canvas        |        640–760 px |
| Context/help panel |        260–320 px |
| Sticky footer      |     64–72 px high |

## Recommended composition

```text
┌───────────────┬──────────────┬──────────────────────┬───────────────┐
│ Global shell  │ Setup steps  │ Current step         │ Context       │
│               │              │                      │               │
│ Deals         │ 1 Identity   │ Transaction strategy │ What changes  │
│               │ 2 Strategy   │                      │ in M&Ai       │
│               │ 3 Org.       │ [ Sell-side ]        │               │
│               │ 4 Team       │ [ Buy-side  ]        │ Workflow      │
│               │ 5 Workflow   │                      │ preview       │
│               │ 6 Sources    │ Transaction type     │               │
│               │ 7 Review     │ [ Full acquisition ] │ Warnings      │
│               │              │                      │               │
├───────────────┴──────────────┴──────────────────────┴───────────────┤
│ Cancel             Save draft             Back          Continue   │
└─────────────────────────────────────────────────────────────────────┘
```

## Context panel

The right panel may show:

* Explanation of the current step;
* effects of the selected option;
* template preview;
* permission summary;
* unresolved warnings.

It should not contain promotional copy.

---

# 37. Form width

Use a constrained reading width.

Recommended:

> 640–760 px for primary input content.

Do not stretch text inputs across the complete viewport.

Exceptions:

* Team table;
* permission matrix;
* organization-role table;
* document upload list.

These may expand to approximately 900–1.000 px.

---

# 38. Sticky footer

The setup action footer should remain visible.

## Left

* Cancel;
* save draft status.

## Right

* Back;
* continue;
* create workspace on final step.

## Autosave status

Examples:

* Saved;
* saving;
* changes not saved;
* offline;
* draft saved 10:42.

Do not use only a spinner to communicate saving.

---

# 39. UI design direction

## 39.1 Overall visual character

Aim for:

> **A controlled transaction-intake workflow with institutional clarity**

The screen should feel:

* Deliberate;
* secure;
* calm;
* guided;
* precise;
* reversible;
* professionally administrative.

It should not feel:

* Like consumer onboarding;
* celebratory;
* playful;
* like a marketing questionnaire;
* like a complex ERP configuration;
* like a technical deployment wizard.

## 39.2 Visual hierarchy

Prioritize:

1. Current step;
2. required decisions;
3. selected transaction structure;
4. configuration consequences;
5. warnings;
6. secondary metadata.

## 39.3 Color

Use:

* Canvas Cream for background;
* Lifted Cream for the form surface;
* Ink Black for primary actions;
* Signal Orange for current-step emphasis and warnings;
* semantic red for blockers;
* green for complete;
* Dust Taupe for dividers;
* Slate Gray for supporting copy.

Avoid a bright orange progress bar spanning the full interface.

## 39.4 Typography

Use Sofia Sans.

Recommended hierarchy:

| Element            |     Size |  Weight |
| ------------------ | -------: | ------: |
| Screen title       | 26–30 px | 500–600 |
| Step title         | 22–26 px | 550–650 |
| Section title      | 15–17 px | 650–700 |
| Field label        | 13–14 px | 600–700 |
| Field text         | 14–16 px | 450–550 |
| Supporting copy    | 12–14 px | 450–500 |
| Step label         | 13–14 px | 550–650 |
| Validation message | 12–14 px | 550–650 |

## 39.5 Controls

Use:

* Cards for transaction-side choices;
* searchable comboboxes for organizations and users;
* structured rows for roles;
* radio controls for exclusive choices;
* checkboxes for workstreams;
* drawers for advanced permissions;
* date pickers with typed input support.

Avoid excessive use of pill selectors for complex choices.

---

# 40. UX design principles

## 40.1 Minimum viable configuration

Ask only for what is needed to create a safe, useful workspace.

Detailed diligence and target information belong downstream.

## 40.2 Explain consequences

When a choice changes the product workflow, explain the effect immediately.

Example:

> Selecting Buy-side will activate Target Universe and acquisition-screening workflows.

## 40.3 Preserve control

Users should be able to:

* move backward;
* save a draft;
* revise organizations;
* review effective permissions;
* change templates before creation.

## 40.4 Security before convenience

Do not automatically grant institution-wide access to a new deal.

Use explicit team assignment and confidentiality defaults.

## 40.5 Avoid false completeness

A created deal without documents should clearly indicate that evidence-driven analysis is unavailable.

## 40.6 Separate roles from authority

A Vice President title may suggest authority, but approval permissions should remain explicit.

## 40.7 Make defaults visible

Do not silently apply:

* Materiality thresholds;
* approval chains;
* document access;
* retention;
* workflow templates.

Show which defaults come from the institution.

## 40.8 Do not configure technical internals

The user should select business workflows, not models or agent architectures.

## 40.9 Preserve auditability

Material setup changes should record:

* Who;
* what;
* when;
* prior value;
* new value;
* reason, when required.

## 40.10 Support uncertainty

Allow:

* Unknown target;
* unknown value;
* approximate closing period;
* provisional team;
* no source yet.

Do not force users to invent false precision.

---

# 41. System states

## 41.1 Loading templates

> Loading institution workflows…

The rest of the form should remain stable.

## 41.2 No templates available

> **No workflow templates are available**
> Use the M&Ai standard workflow or contact an institution administrator.

## 41.3 Organization service unavailable

Allow the user to:

* Retry;
* save draft;
* create a confidential placeholder.

Do not allow uncontrolled duplicate creation without warning.

## 41.4 User directory unavailable

Allow save as draft, but block active creation if no deal lead can be assigned.

## 41.5 Source connection failure

> **Document source could not be connected**
> Create the workspace without documents or retry authorization.

## 41.6 Partial upload failure

Show file-level errors.

Do not discard successfully uploaded files.

## 41.7 Permission conflict

> Daniel Ribeiro cannot access the selected Tax workstream because the deal is highly restricted.

Actions:

* Grant restricted access;
* remove assignment;
* change confidentiality model.

## 41.8 Duplicate deal

Show candidate matches without revealing restricted deal details.

Example:

> A similar restricted transaction may already exist. Contact an institution administrator.

## 41.9 Offline

Allow local draft editing where safely supported, but disable:

* Source authorization;
* user invitation;
* final active creation.

## 41.10 Creation error

Preserve all setup data.

> **Workspace not created**
> Your setup remains saved. Review the highlighted issue and retry.

---

# 42. Responsive behavior

## Desktop — 1280 px and above

* Expanded global sidebar;
* vertical setup stepper;
* centered form;
* right context panel;
* sticky action footer.

## Tablet — 768–1279 px

* Compact global sidebar;
* narrower vertical stepper or top progress indicator;
* context panel becomes expandable;
* team tables use stacked rows;
* footer remains sticky.

## Mobile — below 768 px

Recommended structure:

1. Compact step number;
2. current-step title;
3. form content;
4. warning summary;
5. sticky Back and Continue controls.

The step list should open as a progress drawer.

Complex permission and source configuration should be simplified or deferred to desktop where necessary.

---

# 43. Accessibility requirements

The setup should support:

* Semantic form structure;
* proper field labels;
* grouped radio controls;
* announced validation errors;
* error-summary links to fields;
* keyboard-accessible stepper;
* visible focus;
* minimum 44 × 44 px targets;
* screen-reader announcement when step changes;
* no color-only completion state;
* explicit required-field indicators;
* accessible comboboxes;
* keyboard-operable date pickers;
* accessible upload controls;
* clear description of destructive cancel behavior;
* focus moved to the first error after failed validation.

## Error summary example

> **Review 2 fields**

* Deal lead is required;
* Transaction jurisdiction is required.

Each item should link to the relevant control.

---

# 44. Component architecture for Figma

## `NewDealSetupShell`

Variants:

* Desktop;
* tablet;
* mobile;
* draft;
* read-only review.

## `SetupStepper`

Properties:

* Seven steps;
* current;
* complete;
* warning;
* blocked;
* skipped;
* mobile collapsed.

## `SetupHeader`

Properties:

* New;
* draft;
* autosaving;
* offline;
* permission-limited.

## `TransactionSideCard`

Variants:

* Sell-side;
* buy-side;
* bilateral;
* capital transaction;
* other;
* selected;
* disabled.

## `OrganizationRoleRow`

Properties:

* Existing organization;
* placeholder;
* duplicate warning;
* restricted;
* primary;
* removable.

## `OrganizationSearch`

States:

* Initial;
* searching;
* results;
* no results;
* duplicate candidates;
* error.

## `TeamAssignmentTable`

Properties:

* Internal;
* external;
* full access;
* restricted;
* approver;
* read-only;
* conflict;
* empty.

## `ConfidentialitySelector`

Variants:

* Standard;
* restricted;
* highly restricted;
* custom.

## `WorkflowTemplateCard`

Properties:

* Standard;
* institution custom;
* selected;
* incompatible;
* deprecated;
* preview open.

## `WorkstreamSelector`

Properties:

* Enabled;
* disabled;
* not applicable;
* lead assigned;
* no lead;
* restricted.

## `ApprovalModel`

Variants:

* Standard;
* lean;
* committee;
* custom.

## `SourceChoice`

Variants:

* Connect;
* upload;
* create without source;
* historical import;
* selected;
* unavailable.

## `UploadQueue`

States:

* Empty;
* uploading;
* complete;
* partial error;
* duplicate;
* restricted file.

## `SetupReviewSection`

Properties:

* Complete;
* warning;
* blocker;
* editable;
* collapsed.

## `SetupFooter`

States:

* Saved;
* saving;
* unsaved;
* offline;
* final step;
* creation in progress.

## `CreationSuccess`

States:

* Active;
* draft;
* source processing;
* setup tasks created;
* partial source warning.

---

# 45. Production object model

## `DealSetupDraft`

```text
id
institutionId
createdBy
currentStep
status
codename
internalReference
confidentialityLevel
transactionSide
transactionType
representationRole
initialStage
strategicObjective
indicativeValueLow
indicativeValueHigh
currency
valueBasis
primaryJurisdiction
additionalJurisdictions
expectedStartAt
expectedCloseFrom
expectedCloseTo
workflowTemplateId
workflowTemplateVersion
approvalModelId
sourceConfiguration
warnings
createdAt
updatedAt
```

## `DealPartyAssignment`

```text
id
dealSetupId
organizationId
placeholderName
dealRole
primary
confidentialityLevel
createdAt
```

## `DealTeamAssignment`

```text
id
dealSetupId
userId
dealRole
workstreams
accessLevel
approvalCapabilities
invitationState
createdAt
```

## `DealWorkstreamConfiguration`

```text
id
dealSetupId
workstreamType
enabled
leadUserId
materialityPolicyId
approvalPolicyId
restricted
createdAt
```

## `DealSourceConfiguration`

```text
id
dealSetupId
sourceType
connectionId
sourceName
rootReference
syncMode
importMode
authorizationOwnerId
status
createdAt
```

## `DealCreationRecord`

```text
id
dealId
setupDraftId
createdBy
effectiveConfiguration
templateVersion
permissionSnapshot
warningsAcknowledged
createdAt
```

The final deal should be created from a versioned configuration snapshot so that future template changes do not silently alter historical setup.

---

# 46. Suggested routes

Start:

```text
/deals/new
```

Step-specific route:

```text
/deals/new?step=strategy
```

Draft:

```text
/deals/new/:draftId
```

Review:

```text
/deals/new/:draftId/review
```

Post-creation:

```text
/deals/:dealId/overview
```

Meaningful setup state should survive page refresh and browser navigation.

Temporary menu and hover states should not be encoded in the URL.

---

# 47. Repository direction

The setup workflow should reuse the repository’s existing foundations:

* Shared application shell;
* form primitives;
* responsive layout;
* organization data structures;
* role and permission concepts;
* fixture infrastructure;
* document-upload components;
* workspace routing.

## Keep

* Existing design tokens;
* Sofia Sans target;
* institution-scoped application shell;
* responsive navigation;
* reusable fields and dialogs;
* deal fixtures where structurally useful.

## Add

* Setup draft model;
* seven-step workflow;
* transaction-side configuration;
* dynamic sell-side and buy-side terminology;
* organization-role assignment;
* confidential placeholders;
* deal-lead requirement;
* explicit approval capabilities;
* workflow-template preview;
* source-choice step;
* setup review;
* creation audit snapshot;
* post-creation task generation.

## Avoid

* One large creation form;
* technical engine settings;
* automatic institution-wide access;
* direct creation without a deal owner;
* forced valuation entry;
* forced target identity;
* real VDR claims in mocked fixtures;
* implicit approval authority;
* silent workflow defaults.

---

# 48. What not to include

Avoid the following in New Deal Setup:

* A complete diligence checklist;
* full Target Dossier fields;
* valuation formulas;
* buyer scoring criteria;
* negotiation preferences;
* complete closing checklist;
* engine or model selection;
* RAG configuration;
* token limits;
* infrastructure status;
* one hundred permission toggles in the default path;
* all possible transaction types displayed equally;
* required exact valuation;
* required exact closing date;
* automatic external invitations;
* unreviewed source synchronization;
* automatic stage progression;
* unexplained template names;
* unrestricted duplicate creation;
* generic AI-generated deal codenames without user review;
* live customer or VDR names in the pitch mock.

---

# 49. MOCKED — Pitch and demo specification

## 49.1 Purpose of the mocked setup

The mocked New Deal Setup should demonstrate:

* Transaction-aware onboarding;
* automatic workflow adaptation;
* deal isolation;
* team and approval configuration;
* controlled evidence connection.

Its pitch narrative is:

> **A banker can turn a new mandate into a structured, secure and execution-ready transaction workspace in minutes.**

This is useful in:

* A live product demo;
* onboarding explanation;
* workflow architecture appendix;
* product-depth discussion.

It should not replace the Diligence Decision Room as the hero image.

---

# 50. Mocked shell state

Institution:

> **Atlas M&A Advisory**

User:

> **Ana Costa**
> Vice President

Breadcrumb:

> Deals / New deal

Sidebar:

* Deals active;
* Home;
* Organizations;
* Tasks & Approvals: 3;
* Team;
* Settings.

Header:

> **Create new deal**

Description:

> Configure the transaction, team and initial workflow.

Persistent actions:

* Cancel;
* save draft;
* back;
* continue.

---

# 51. Mocked setup progress

Show:

1. Deal identity — Complete
2. Transaction strategy — Complete
3. Organizations — Complete
4. **Team & access — Current**
5. Workflow & governance
6. Documents & sources
7. Review & create

This step is visually stronger than Deal Identity because it demonstrates deal isolation and human authority.

---

# 52. Mocked deal identity

Use:

> **Project Horizon**

Internal reference:

> AMA-2026-014

Confidentiality:

> **Restricted**

Status:

> Active after creation

Description:

> Sell-side transaction involving a Brazilian industrial-technology company.

Do not use real companies.

---

# 53. Mocked transaction strategy

Use:

* **Sell-side**
* Full acquisition;
* seller advisor;
* initial stage: Preparation;
* jurisdiction: Brazil;
* currency: R$;
* objective: Maximize valuation while preserving certainty of closing;
* indicative enterprise value: **R$ 480 mi–R$ 520 mi**.

Workflow preview:

> Dossier → Documents → Buyer Universe → Diligence → Valuation → Negotiation → Closing

---

# 54. Mocked organizations

| Organization       | Role           |
| ------------------ | -------------- |
| Atlas Industrial   | Target         |
| Horizon Holdings   | Seller         |
| Atlas M&A Advisory | Seller advisor |
| Vieira & Lopes     | Legal advisor  |

Use fictional names.

Mark Atlas Industrial as:

> Primary target

Mark Horizon Holdings as:

> Client

---

# 55. Mocked Team & Access screen

## Confidentiality

Selected:

> **Restricted workspace**

Supporting text:

> Only explicitly assigned users can discover and access this deal.

## Team

| User           | Deal role      | Workstream            | Access                |
| -------------- | -------------- | --------------------- | --------------------- |
| Marina Alves   | Deal Lead      | All                   | Full                  |
| Ana Costa      | Vice President | Diligence, Valuation  | Full + approvals      |
| Felipe Rocha   | Associate      | Financial, Commercial | Edit                  |
| Daniel Ribeiro | Specialist     | Tax                   | Restricted workstream |

## Approval summary

> **Ana Costa** can approve material diligence findings and valuation adjustments.

> **Marina Alves** can approve shortlist, negotiation and closing-readiness decisions.

## Attention note

> No external participants will be invited during setup.

This is the recommended static mock state for the screen.

---

# 56. Mocked workflow and governance

Template:

> **Sell-side Standard**

Enabled workstreams:

* Financial;
* legal;
* tax;
* commercial;
* operational.

Approval model:

> Standard deal team

Rules:

* High-severity finding → Vice President approval;
* valuation change above R$ 10 mi → Deal Lead approval;
* buyer shortlist → Deal Lead approval;
* closing readiness → Partner approval.

Materiality:

> Institution default
> R$ 5 mi exposure or 5% of LTM EBITDA

---

# 57. Mocked documents and sources

Selected option:

> **Upload initial documents**

Files:

* Informações_Financeiras_2025.xlsx;
* Receita_por_Cliente_2025.xlsx;
* Organograma_Societário.pdf;
* Contratos_Materiais.zip;
* Dívida_Líquida_2025.xlsx;
* Apresentação_Institucional.pdf.

Status:

> **6 files ready**

Supporting note:

> A continuous document source can be connected after workspace creation.

Do not show a real VDR provider logo.

---

# 58. Mocked review screen

## Readiness

> **Ready to create**

Status:

* 7 sections complete;
* 1 warning;
* no blockers.

Warning:

> Continuous document synchronization is not connected.

## Review summary

> Project Horizon
> Sell-side · Full acquisition
> Restricted workspace
> 4 internal users
> Sell-side Standard workflow
> 5 workstreams
> 6 initial documents
> R$ 480 mi–R$ 520 mi indicative enterprise value

Primary action:

> **Create deal workspace**

Secondary:

> Save as draft

---

# 59. Pitch-specific simplification

For a static screenshot, use either:

### Option A — Team & Access

Best for communicating:

* Deal isolation;
* human approvals;
* controlled permissions.

### Option B — Review & Create

Best for communicating:

* Complete transaction setup;
* workflow breadth;
* creation readiness.

I recommend **Team & Access** for product differentiation.

## Keep visible

* Project Horizon;
* Sell-side;
* Restricted workspace;
* four users;
* roles;
* workstreams;
* approval authority;
* seven-step progress;
* Continue action.

## Hide

* Advanced permissions;
* external invitation flow;
* source authorization;
* custom materiality editor;
* detailed tags;
* internal reference metadata;
* long descriptions;
* all optional transaction types.

## Readability requirement

At slide scale, the following must remain readable:

* **Project Horizon**
* **Restricted workspace**
* **Deal Lead**
* **Full + approvals**
* **Diligence, Valuation**
* **Continue**

---

# 60. Recommended demo flow

## Flow A — Create a sell-side deal

```text
Deals Portfolio
  ↓
New deal
  ↓
Project Horizon
  ↓
Select Sell-side
  ↓
Associate Atlas Industrial
  ↓
Assign team and authority
  ↓
Select Sell-side Standard
  ↓
Upload documents
  ↓
Review and create
  ↓
Deal Overview
```

## Flow B — Show transaction-side adaptation

```text
Transaction Strategy
  ↓
Select Sell-side
  ↓
Workflow shows Buyer Universe
  ↓
Switch to Buy-side
  ↓
Workflow changes to Target Universe
  ↓
Review consequence warning
  ↓
Return to Sell-side
```

## Flow C — Demonstrate access control

```text
Team & Access
  ↓
Select Restricted workspace
  ↓
Add Daniel Ribeiro
  ↓
Limit to Tax workstream
  ↓
Review effective permissions
```

## Flow D — Create without documents

```text
Documents & Sources
  ↓
Select Create without documents
  ↓
Warning displayed
  ↓
Create workspace
  ↓
Deal Overview shows evidence-setup task
```

## Flow E — Save draft

```text
Complete first three steps
  ↓
Save as draft
  ↓
Return to Deals Portfolio
  ↓
Project Horizon shown as Draft
  ↓
Resume setup
```

---

# 61. UX prototype tasks to validate

Test with bankers using tasks such as:

1. Create a sell-side transaction.
2. Define a confidential codename.
3. Associate an existing target.
4. Create a confidential target placeholder.
5. Assign a deal lead.
6. Give a specialist access only to Tax.
7. Identify who can approve valuation changes.
8. Select a workflow suitable for a sell-side mandate.
9. Create the deal without a VDR connection.
10. Explain what will happen after creation.
11. Save the setup as a draft.
12. Find and resolve a duplicate-deal warning.
13. Change the transaction from sell-side to buy-side.
14. Identify which configuration will be reset.
15. Review all warnings before creation.

## Measures

Record:

* Time to create a basic deal;
* completion rate;
* fields that cause hesitation;
* whether side and type are confused;
* whether role and permission are confused;
* whether users understand restricted workspaces;
* whether template consequences are understood;
* whether users attempt to enter dossier details prematurely;
* whether warnings are noticed;
* whether users trust the review summary;
* whether save-draft behavior is clear.

---

# 62. Design validation criteria

The New Deal Setup is ready for approval when:

1. A basic deal can be configured without training.
2. The workflow does not resemble one large CRUD form.
3. Transaction side clearly affects labels and defaults.
4. Users distinguish transaction type from representation.
5. An organization can be reused or created as a placeholder.
6. A deal lead is always defined before activation.
7. Access and approval authority are separate concepts.
8. Restricted-workspace behavior is understandable.
9. Default permissions are not institution-wide.
10. Workflow templates explain their consequences.
11. Users are not asked to configure technical engines.
12. A deal can be created without documents.
13. The absence of documents is explicitly visible.
14. Setup can be saved as a draft.
15. Duplicate warnings do not expose restricted information.
16. The final review distinguishes blockers and warnings.
17. Creation records the effective configuration.
18. The user lands on Deal Overview after creation.
19. Setup choices generate only useful initial tasks.
20. Mobile users can complete the standard path.
21. All validation errors are accessible.
22. The pitch mock remains fictional.
23. The screen does not imply live VDR integrations.
24. Material workflow defaults remain visible.
25. Users understand what will happen when they select Create.

---

# 63. Final design target

The correct design target is not:

> “A polished form for adding a deal.”

It is:

> **A controlled transaction-initialization workflow that establishes the deal’s identity, operating model, evidence boundary and human authority before execution begins.**

The screen should make the transition from mandate to workspace feel structured without becoming bureaucratic.

Its defining interaction is:

> **Describe the transaction → assign its parties and authority → choose the operating workflow → review the consequences → create the isolated deal workspace**

**Next iteration: Deal Overview.**
