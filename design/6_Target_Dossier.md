# Target Dossier

## 1. Screen definition

The **Target Dossier** is the structured, evolving and evidence-backed profile of the target company within a specific transaction.

It converts fragmented information from:

* Virtual data-room documents;
* Management materials;
* Financial statements;
* Contracts;
* Organization records;
* Banker inputs;
* External research;
* Diligence work;
* Approved transaction decisions;

into a controlled body of deal knowledge.

The dossier should answer:

1. **What do we currently know about the target?**
2. **Which facts have been verified?**
3. **Which documents support each fact?**
4. **Where do sources conflict?**
5. **What information is missing or stale?**
6. **Which facts are being used by diligence, valuation and transaction workflows?**
7. **Who reviewed or approved each material fact?**

The Target Dossier is not merely a company profile. It is the transaction’s **evidence-backed fact layer**.

Its central operating sequence is:

> **Source → Extracted fact → Reconciliation → Human review → Approved transaction fact → Downstream use**

The product architecture already defines the dossier as a deal-specific workspace containing company identity, ownership, business model, financial profile, management, counterparties, open questions, approved facts and source provenance. It must remain distinct from the reusable institution-level Organization record. 

---

# 2. Intention of the screen

## Primary intention

The Target Dossier should establish a reliable, shared understanding of the target before and throughout execution.

It should reduce the recurring M&A problem in which different members of the deal team maintain different versions of the same company facts across:

* Spreadsheets;
* Presentations;
* financial models;
* diligence reports;
* emails;
* handwritten notes;
* VDR documents;
* client-provided summaries.

The dossier should allow every authorized participant to work from the same approved transaction context.

## User outcome

After reviewing the screen, the banker should be able to say:

> “I understand the target’s business, ownership, operating profile and financial context, and I can verify every material fact against its source.”

## Product outcome

The screen should demonstrate that M&Ai creates more than summaries.

It should visibly create a structured transaction knowledge layer that can support:

* Diligence analysis;
* Valuation assumptions;
* Buyer or target matching;
* Information memorandum preparation;
* Management presentation preparation;
* Negotiation strategy;
* Closing documentation;
* Deliverable generation;
* Audit history.

## Strategic product role

The Target Dossier should become the transaction’s **single controlled source of approved facts**.

That does not mean every statement is unquestionably true.

It means every statement has an explicit state:

* Proposed;
* extracted;
* reconciled;
* reviewed;
* approved;
* disputed;
* stale;
* missing;
* restricted;
* superseded.

---

# 3. What the Target Dossier is not

The screen should not become:

* A generic CRM company profile;
* A static Wikipedia-style article;
* A long AI-generated company summary;
* A document folder;
* A complete diligence report;
* A list of every extracted sentence;
* A data-entry form containing hundreds of fields;
* An unstructured notes page;
* A valuation model;
* A buyer-scoring screen;
* A duplicate of Organization Detail;
* A place for every diligence finding;
* A knowledge graph visualization with no practical task;
* A permanent AI chat window.

The central question is not:

> “Can M&Ai summarize this company?”

It is:

> **“Can the deal team establish, verify and reuse the material facts that define this transaction?”**

---

# 4. Relationship to adjacent screens

| Screen                       | Primary responsibility                                                     |
| ---------------------------- | -------------------------------------------------------------------------- |
| **Organization Detail**      | Maintains reusable institution-level information about a company           |
| **Target Dossier**           | Maintains deal-specific facts, interpretations, evidence and review states |
| **Documents & VDR**          | Controls the source documents and their processing                         |
| **Diligence Decision Room**  | Evaluates material exceptions, risks and transaction consequences          |
| **Valuation Lab**            | Uses approved facts and assumptions in deterministic valuation             |
| **Deal Overview**            | Summarizes the dossier’s readiness and latest material changes             |
| **Buyer or Target Universe** | Uses dossier attributes to assess strategic fit                            |
| **Deliverables & Exports**   | Uses approved dossier facts to generate transaction artifacts              |

## Target Dossier versus Organization Detail

An organization record is reusable.

Example:

> **Atlas Industrial S.A.**

It may appear in several contexts:

* Target in Project Horizon;
* former buyer candidate in another transaction;
* subsidiary of Horizon Holdings;
* previous client of the institution.

The organization record may contain:

* Legal identity;
* addresses;
* general contacts;
* sector;
* website;
* relationship history;
* related transactions.

The Target Dossier contains facts specific to **Project Horizon**, including:

* Transaction-specific financial periods;
* management representations;
* seller-provided materials;
* approved valuation inputs;
* restricted ownership information;
* source-level evidence;
* deal-team interpretations;
* unresolved questions.

## Target Dossier versus Diligence

The dossier manages **facts and context**.

Diligence evaluates **exceptions and consequences**.

Example:

### Dossier fact

> The top three customers represent 41,2% of LTM revenue.

### Diligence interpretation

> Customer concentration is elevated.

### Diligence finding

> Concentration exceeds the transaction’s 35% review threshold and requires a downside adjustment.

### Valuation consequence

> Risk-adjusted valuation midpoint decreases by R$ 42 mi.

These states should remain linked but not merged.

## Target Dossier versus Documents

The Documents workspace answers:

> Which files exist, where are they, and what is their processing state?

The Target Dossier answers:

> What facts have been established from those files?

---

# 5. Primary users

## 5.1 Analyst

The analyst needs to:

* Review extracted facts;
* resolve document conflicts;
* complete missing fields;
* associate evidence;
* propose normalized values;
* create information requests;
* prepare sections for review.

## 5.2 Associate

The associate needs to:

* Validate the target profile;
* reconcile financial and commercial facts;
* monitor dossier completeness;
* assign unanswered questions;
* prepare transaction materials;
* submit facts for approval.

## 5.3 Vice President

The vice president needs to:

* Review material facts;
* approve deal-level interpretations;
* understand source quality;
* identify contradictions;
* confirm downstream use;
* prepare for internal and client review.

## 5.4 Managing Director or Partner

The partner needs:

* Executive business profile;
* ownership;
* financial trajectory;
* key commercial characteristics;
* strategic rationale;
* major uncertainties;
* source-backed confidence in important statements.

## 5.5 Specialist reviewer

A legal, tax, operational or technical reviewer needs:

* Their relevant sections;
* assigned facts;
* conflicting evidence;
* open questions;
* restricted access;
* review status.

## 5.6 Client or external participant

A restricted external participant may:

* Submit evidence;
* answer information requests;
* propose corrections;
* confirm selected facts.

They should not automatically be able to:

* Approve internal conclusions;
* view internal annotations;
* view valuation;
* view buyer strategy;
* see unrestricted diligence findings.

---

# 6. Primary job to be done

> When transaction information is fragmented across documents and participants, create one evidence-backed profile where the deal team can establish which target facts are known, verified, disputed or missing.

## Secondary jobs

The user should also be able to:

* Review what changed after a document synchronization;
* distinguish approved facts from extracted suggestions;
* identify incomplete sections;
* inspect every source behind a material value;
* resolve contradictory documents;
* request missing information;
* compare historical periods;
* see where a fact is being used downstream;
* restrict sensitive information;
* export an approved profile;
* generate transaction materials from approved facts;
* ask M&Ai questions about the target.

---

# 7. Conceptual model

The dossier should be designed around **facts**, not documents.

## 7.1 Source

The original evidence.

Examples:

* Audited financial statement;
* management account;
* customer-revenue spreadsheet;
* organizational chart;
* contract;
* management presentation;
* user-entered note;
* external database result.

## 7.2 Extracted value

What M&Ai identified in the source.

Example:

> FY2025 revenue: R$ 286,4 mi

## 7.3 Normalized fact

The standardized deal-level representation.

Example:

> Revenue · FY2025 · BRL · R$ 286,4 mi

## 7.4 Reconciliation

How multiple sources were compared.

Example:

| Source                       |       Value |
| ---------------------------- | ----------: |
| Audited statements           | R$ 284,9 mi |
| Management accounts          | R$ 286,4 mi |
| Information memorandum draft | R$ 286,4 mi |

## 7.5 Review

A human determines whether the normalized fact is acceptable.

## 7.6 Approved fact

The value that can be used in:

* Diligence;
* valuation;
* matching;
* negotiation;
* deliverables.

## 7.7 Downstream dependency

The system records where the fact is being used.

Example:

> Used by valuation scenario v4
> Used by customer-concentration finding
> Used by information memorandum v2

---

# 8. Fact-state model

Every material fact should have an explicit lifecycle.

## Proposed

Entered by a user or generated by M&Ai but not yet verified.

## Extracted

Derived directly from a source.

## Reconciled

Compared against available sources with no unresolved material conflict.

## Reviewed

A user has examined the fact and supporting evidence.

## Approved

Authorized for downstream use.

## Disputed

A reviewer or source conflicts with the current value.

## Missing

A required fact has no sufficient evidence.

## Stale

The fact may no longer reflect the latest source or period.

## Superseded

A newer approved fact replaces it.

## Restricted

The fact exists but the user lacks access.

## Not applicable

The field does not apply to this target or transaction.

These states must not be represented only by color.

---

# 9. Screen architecture

The recommended Target Dossier consists of nine principal regions:

1. Page header and dossier readiness;
2. Section navigator;
3. Executive target snapshot;
4. Structured fact workspace;
5. Evidence and provenance inspector;
6. Review and approval controls;
7. Open questions and missing information;
8. Dossier changes and downstream dependencies;
9. Contextual Copilot.

---

# 10. Page header

## Recommended title

> **Target Dossier**

Supporting description:

> Build and verify the evidence-backed profile used throughout the transaction.

## Primary action

The primary action should adapt to current work.

Examples:

* **Review 7 facts**
* **Resolve contradictions**
* **Request missing information**
* **Approve section**
* **Generate target profile**

## Secondary actions

* Export dossier;
* view changes;
* configure sections;
* more actions.

## Header status

Recommended summary:

> **46 approved facts · 7 need review · 5 missing · 3 contradictions**

Supporting:

> Evidence current through 27 July 2026 · Last source synchronization 4 min ago

This is more meaningful than a generic:

> Dossier 82% complete

A completeness percentage may appear secondarily, but only when its calculation is explainable.

---

# 11. Dossier readiness

## Purpose

Readiness communicates whether the dossier contains sufficient, current and reviewed information for the next transaction workflow.

## Recommended dimensions

Readiness should consider:

1. Required facts present;
2. source evidence available;
3. contradictions resolved;
4. human review complete;
5. information current;
6. approval state;
7. downstream requirements.

## Example

> **Dossier readiness: Attention required**

Reasons:

* Financial profile: 2 facts awaiting review;
* ownership: one unresolved contradiction;
* management: CFO biography missing;
* commercial profile: current customer segmentation unavailable.

## Readiness by section

| Section           | Approved | Review | Missing | State      |
| ----------------- | -------: | -----: | ------: | ---------- |
| Company identity  |       12 |      0 |       0 | Ready      |
| Ownership         |        8 |      1 |       0 | Attention  |
| Business model    |        9 |      2 |       1 | In review  |
| Financial profile |       14 |      3 |       1 | Attention  |
| Management        |        6 |      1 |       2 | Incomplete |

## UX rule

Do not compress all of this into one unexplained score.

---

# 12. Section navigator

## Purpose

The navigator lets users move through the structured profile while retaining section state.

## Recommended sections

1. **Executive Profile**
2. **Company Identity**
3. **Ownership & Structure**
4. **Business Model**
5. **Products & Services**
6. **Markets & Geography**
7. **Customers & Revenue**
8. **Suppliers & Partners**
9. **Financial Profile**
10. **Management & Organization**
11. **People & Culture**
12. **Operations**
13. **Technology & Intellectual Property**
14. **Legal, Tax & Regulatory**
15. **Strategic Context**
16. **Open Questions**
17. **Change History**

The visible section list should adapt to:

* Transaction type;
* workflow template;
* enabled workstreams;
* user permissions.

## Section state indicators

Each section should display:

* Ready;
* in review;
* incomplete;
* contradiction;
* stale;
* restricted;
* not applicable.

Example:

```text
Executive Profile                 Ready
Company Identity                  Ready
Ownership & Structure             1 conflict
Business Model                    2 reviews
Customers & Revenue               1 missing
Financial Profile                 3 reviews
Management & Organization         Incomplete
Legal, Tax & Regulatory           Restricted
```

## Navigation treatment

Desktop:

* Persistent left rail;
* section search;
* collapse support.

Tablet:

* Collapsible outline.

Mobile:

* Section selector or drawer.

---

# 13. Executive Profile

## Purpose

The Executive Profile gives senior users a concise, evidence-backed summary of the target.

It should answer:

* What does the company do?
* How does it make money?
* Where does it operate?
* Who owns it?
* How large is it?
* What is strategically material?
* Which important facts remain uncertain?

## Recommended composition

### Identity

> **Atlas Industrial S.A.**
> Industrial automation and maintenance software
> São Paulo, Brazil

### Business description

> Provides automation equipment, monitoring software and recurring maintenance services to industrial customers in Brazil and neighboring markets.

### Key approved facts

* LTM revenue: R$ 310,4 mi;
* adjusted EBITDA: R$ 57,8 mi;
* recurring revenue: 68%;
* employees: 426;
* operating locations: 4;
* top three customers: 41,2% of revenue;
* founder ownership: 72%.

### Important uncertainties

* FY2023 monthly revenue detail missing;
* beneficial ownership of one minority vehicle under review;
* customer segmentation awaiting management confirmation.

### Strategic context

> Potential platform acquisition for industrial technology buyers seeking recurring service revenue and installed-base access.

## UX direction

The Executive Profile must be assembled from approved facts.

It should not be a free-standing AI narrative disconnected from the underlying dossier.

Every statement should be selectable and traceable.

---

# 14. Company Identity

## Recommended fields

* Legal name;
* trading name;
* registration number;
* tax identifier;
* incorporation date;
* legal form;
* headquarters;
* operating addresses;
* website;
* primary sector;
* sub-sector;
* industry classifications;
* jurisdictions;
* primary currency;
* fiscal year-end;
* current operating status.

## Fact provenance

Example:

> **Legal name**
> Atlas Industrial S.A.
> Approved
> Source: Estatuto_Social_Atualizado.pdf · Page 1

## Duplicate and mismatch behavior

The system should surface conflicts such as:

* Different legal names;
* outdated addresses;
* multiple tax identifiers;
* old corporate forms;
* inconsistent incorporation dates.

---

# 15. Ownership & Structure

## Purpose

Represent the legal and economic structure of the target.

## Recommended components

* Shareholder table;
* ownership percentages;
* voting rights;
* beneficial owners;
* legal entities;
* subsidiaries;
* minority interests;
* investment vehicles;
* options or convertible instruments;
* intra-group relationships;
* recent ownership changes.

## Preferred visual

Use a controlled ownership diagram supported by a structured table.

Example:

```text
Horizon Holdings Ltda.        72%
Founders and Management       18%
Minority Investors            10%
            │
            ▼
Atlas Industrial S.A.
            │
       ┌────┴────┐
       ▼         ▼
Atlas Serviços  Atlas Software
100%            85%
```

## Table example

| Shareholder           | Economic interest | Voting rights | Status    |
| --------------------- | ----------------: | ------------: | --------- |
| Horizon Holdings      |             72,0% |         72,0% | Approved  |
| Founders & management |             18,0% |         18,0% | In review |
| Minority investors    |             10,0% |         10,0% | Approved  |

## Contradiction example

> Corporate chart reports 18,0% management ownership, while the shareholder register reports 16,5%.

Actions:

* Review sources;
* select approved value;
* request clarification;
* mark temporal difference;
* create diligence finding.

## UX rule

The diagram is a navigation aid.

The structured table remains the authoritative representation.

---

# 16. Business Model

## Purpose

Explain how the target creates, delivers and captures value.

## Recommended fields

* Primary activities;
* customer problem;
* value proposition;
* revenue streams;
* contract model;
* sales model;
* service delivery;
* recurring versus non-recurring revenue;
* pricing model;
* distribution;
* key cost drivers;
* capital intensity;
* seasonality;
* working-capital model;
* strategic dependencies.

## Revenue-model representation

Example:

| Revenue stream         | LTM revenue | Share | Model         |
| ---------------------- | ----------: | ----: | ------------- |
| Equipment              |  R$ 99,3 mi | 32,0% | Project-based |
| Software subscriptions |  R$ 89,1 mi | 28,7% | Recurring     |
| Maintenance services   | R$ 121,9 mi | 39,3% | Recurring     |

## Interpretation boundary

The dossier may state:

> 68,0% of revenue is contractually recurring.

Diligence should determine:

> Whether that recurrence is sufficiently durable and transferable.

---

# 17. Products & Services

## Recommended information

* Product or service lines;
* revenue contribution;
* margin contribution;
* lifecycle stage;
* customer segment;
* geography;
* intellectual-property dependence;
* service dependencies;
* pricing model;
* growth trajectory;
* discontinued offerings.

## Product table

| Product line         | Revenue share | Growth | Gross margin | State     |
| -------------------- | ------------: | -----: | -----------: | --------- |
| Automation equipment |         32,0% |   6,2% |        28,4% | Approved  |
| Monitoring software  |         28,7% |  21,6% |        72,1% | Approved  |
| Maintenance services |         39,3% |  14,2% |        48,7% | In review |

## UX direction

Charts should support comparison, but the approved values and their sources must remain accessible.

---

# 18. Markets & Geography

## Recommended information

* Addressable markets;
* served markets;
* industry segments;
* customer industries;
* geographic revenue;
* operating footprint;
* regulatory markets;
* expansion plans;
* country concentration;
* market position;
* market-share claims;
* macroeconomic exposures.

## Evidence caution

Market-size and market-share statements often come from management presentations or external research.

The system should distinguish:

* Management claim;
* external estimate;
* independently verified fact;
* internal assumption.

Example:

> **Brazilian market share: 8%–11%**
> External estimate · Not independently verified

Do not present such figures as approved facts without their evidence state.

---

# 19. Customers & Revenue

## Purpose

Create the commercial evidence layer used by diligence and valuation.

## Recommended information

* Customer list;
* revenue by customer;
* concentration;
* segment;
* geography;
* contract type;
* tenure;
* retention;
* churn;
* renewal;
* pricing;
* payment terms;
* sales pipeline;
* backlog;
* customer dependencies.

## Confidentiality

Customer-level details may require restricted access.

The screen should support:

* Named customers;
* anonymized customers;
* restricted identifiers;
* aggregated views.

## Example summary

> **Revenue concentration**

* Top customer: 17,6%;
* top three: 41,2%;
* top ten: 67,8%;
* recurring contract revenue: 68,0%;
* weighted customer tenure: 6,4 years.

## Selected fact

> **Top three customers: 41,2% of LTM revenue**

Evidence:

* Receita_por_Cliente_2025.xlsx;
* management accounts;
* customer-contract register.

Downstream use:

* Customer-concentration diligence finding;
* downside valuation scenario v4;
* buyer-risk summary.

---

# 20. Suppliers & Partners

## Recommended information

* Material suppliers;
* outsourced services;
* technology vendors;
* distributors;
* logistics providers;
* financing partners;
* concentration;
* payment terms;
* dependency;
* substitution difficulty;
* contract duration;
* exclusivity.

## Example

> Top five suppliers represent 53,7% of direct-material expenditure.

Fact status:

> Reviewed · Evidence current through June 2026

Potential diligence link:

> Supplier concentration finding

The dossier should preserve the fact while diligence evaluates the risk.

---

# 21. Financial Profile

## Purpose

Maintain the approved financial facts used throughout the transaction.

## Recommended sections

### Historical performance

* Revenue;
* gross profit;
* EBITDA;
* adjusted EBITDA;
* EBIT;
* net income;
* capex;
* cash flow;
* working capital;
* debt;
* net debt.

### Revenue bridge

* Organic growth;
* pricing;
* volume;
* acquisitions;
* foreign exchange;
* discontinued operations.

### EBITDA normalization

* Reported EBITDA;
* non-recurring items;
* owner-related adjustments;
* run-rate adjustments;
* approved adjusted EBITDA.

### Balance-sheet profile

* Cash;
* debt;
* lease liabilities;
* debt-like items;
* contingent liabilities;
* normalized working capital.

### Forecasts

* Management plan;
* base case;
* downside case;
* approved forecast;
* assumptions.

## Recommended financial table

| Metric          |      FY2023 |      FY2024 |      FY2025 |  LTM Jun-26 |
| --------------- | ----------: | ----------: | ----------: | ----------: |
| Revenue         | R$ 221,8 mi | R$ 252,6 mi | R$ 286,4 mi | R$ 310,4 mi |
| Adjusted EBITDA |  R$ 36,9 mi |  R$ 43,7 mi |  R$ 51,4 mi |  R$ 57,8 mi |
| EBITDA margin   |       16,6% |       17,3% |       17,9% |       18,6% |
| Capex           |  R$ 12,1 mi |  R$ 13,8 mi |  R$ 15,2 mi |  R$ 16,4 mi |
| Net debt        |  R$ 72,4 mi |  R$ 68,9 mi |  R$ 61,3 mi |  R$ 58,6 mi |

## Value states

Each cell may have its own:

* Source;
* review state;
* normalization;
* period;
* currency;
* unit;
* historical version.

## UX rule

The financial section should resemble a controlled deal workbook, not a generic BI dashboard.

---

# 22. Financial reconciliation

## Purpose

Help users resolve differences between:

* Audited financial statements;
* management accounts;
* seller materials;
* tax returns;
* valuation models;
* lender reports.

## Example reconciliation

### LTM revenue

| Source                 |       Value | Period        | State            |
| ---------------------- | ----------: | ------------- | ---------------- |
| Management accounts    | R$ 310,4 mi | Jul-25–Jun-26 | Primary          |
| Information memorandum | R$ 310,4 mi | Jul-25–Jun-26 | Supporting       |
| Audited statements     | R$ 286,4 mi | FY2025        | Different period |

Approved fact:

> **R$ 310,4 mi**

Rationale:

> Management accounts and information memorandum reconcile for the LTM period. Audited statements cover FY2025 and are not directly contradictory.

## UX direction

Do not label every difference as a contradiction.

The system should distinguish:

* Different periods;
* different currencies;
* different accounting bases;
* rounding;
* classification differences;
* genuine conflicts.

---

# 23. Management & Organization

## Recommended information

* Executive team;
* board;
* founders;
* reporting lines;
* tenure;
* responsibilities;
* prior experience;
* ownership;
* compensation relevance;
* succession;
* key-person dependency;
* retention arrangements;
* open positions.

## Organization chart

Use a navigable chart supported by a structured table.

Example:

```text
CEO · Ricardo Nunes
├── CFO · Helena Martins
├── COO · André Campos
├── CRO · Luciana Prado
└── CTO · Gustavo Leal
```

## Executive detail

> **Helena Martins · CFO**

* Joined: 2019;
* prior role: Finance Director;
* shareholder: 2,0%;
* transaction role: primary financial contact;
* retention arrangement: under review.

## Privacy

Personal and compensation information should support restricted visibility.

---

# 24. People & Culture

## Recommended information

* Employee count;
* location;
* function;
* tenure;
* turnover;
* union representation;
* contractor population;
* compensation structure;
* key talent;
* employee engagement;
* management practices;
* culture observations;
* retention risk;
* succession.

## Evidence-state caution

Culture observations may be interpretive.

Distinguish:

### Fact

> Annualized employee turnover was 14,8% in FY2025.

### Management representation

> Leadership describes the organization as decentralized.

### Team observation

> Decision-making appears concentrated among the founders.

### Diligence finding

> Founder dependency may create post-closing integration risk.

The dossier should not present subjective assessments as verified facts.

---

# 25. Operations

## Recommended information

* Facilities;
* production capacity;
* utilization;
* service delivery;
* logistics;
* inventory;
* quality;
* procurement;
* maintenance;
* business continuity;
* operational KPIs;
* environmental permits;
* expansion capex;
* key dependencies.

## Facility representation

| Location  | Function                  | Ownership |        Capacity | Utilization |
| --------- | ------------------------- | --------- | --------------: | ----------: |
| São Paulo | Headquarters and software | Leased    |               — |           — |
| Campinas  | Equipment assembly        | Owned     |     1.500 units |         78% |
| Curitiba  | Service hub               | Leased    | 420 calls/month |         84% |
| Recife    | Service hub               | Leased    | 260 calls/month |         69% |

---

# 26. Technology & Intellectual Property

## Recommended information

* Core technology;
* software architecture;
* intellectual-property ownership;
* patents;
* trademarks;
* licenses;
* third-party dependencies;
* cybersecurity profile;
* product development;
* technical debt;
* hosting;
* data practices;
* technology team;
* roadmap.

## Evidence states

The dossier should distinguish:

* Registered IP;
* claimed proprietary technology;
* licensed technology;
* open-source dependency;
* unverified management statement.

## Restricted information

Detailed technology and cybersecurity facts may be restricted to specific workstreams.

---

# 27. Legal, Tax & Regulatory

## Recommended information

* Corporate structure;
* licenses;
* permits;
* regulatory status;
* material litigation;
* tax profile;
* material contracts;
* compliance programs;
* data protection;
* environmental status;
* labor exposure;
* related-party agreements;
* change-of-control provisions.

## Boundary with diligence

The dossier can state:

> Two material customer contracts contain change-of-control clauses.

Diligence determines:

> Whether those clauses threaten transaction certainty or require consent.

---

# 28. Strategic Context

## Purpose

Capture the transaction-specific rationale and strategic characteristics of the target.

## Recommended information

* Seller rationale;
* buyer thesis;
* strategic strengths;
* strategic gaps;
* potential synergies;
* market positioning;
* likely buyer categories;
* acquisition rationale;
* integration considerations;
* transaction constraints;
* preferred outcomes.

## Evidence distinction

Strategic context may combine:

* Approved fact;
* client objective;
* banker hypothesis;
* external market observation;
* buyer-specific inference.

Each should be labeled.

Example:

> **Potential strategic rationale**
> Acquirers with an installed industrial customer base may value Atlas Industrial’s recurring maintenance contracts.

State:

> Banker hypothesis · Not an approved target fact

---

# 29. Open Questions

## Purpose

Maintain a controlled queue of unresolved dossier information.

## Question types

* Missing fact;
* source conflict;
* management clarification;
* specialist review;
* stale information;
* incomplete document;
* restricted access;
* unexplained variance.

## Required anatomy

Each question should show:

* Question;
* related dossier fact;
* reason;
* owner;
* requested from;
* due date;
* materiality;
* downstream impact;
* state.

Example:

> **What explains the R$ 4,7 mi difference between the debt schedule and management accounts?**

Related:

> Net debt · LTM Jun-26

Owner:

> Felipe Rocha

Requested from:

> Target CFO

Due:

> 30 July

Impact:

> Blocks valuation scenario v4

## Actions

* Assign;
* create information request;
* attach response;
* resolve;
* mark not applicable;
* escalate;
* create diligence finding.

---

# 30. Missing-information requests

The dossier should connect to a structured information-request workflow.

## Request anatomy

* Request title;
* requested fact or document;
* rationale;
* target recipient;
* due date;
* materiality;
* related section;
* status;
* submitted evidence;
* reviewer.

## Statuses

* Draft;
* internal review;
* sent;
* response received;
* partial response;
* resolved;
* overdue;
* withdrawn.

## UX rule

Do not make users rewrite the context manually.

A request created from a missing fact should inherit:

* Deal;
* section;
* fact;
* current evidence;
* reason;
* downstream impact.

---

# 31. Fact workspace

## Purpose

The central content region should present structured facts for the selected section.

## Recommended fact-row anatomy

### Label

> LTM revenue

### Approved value

> R$ 310,4 mi

### Period and basis

> Jul-25–Jun-26 · Management accounts

### State

> Approved

### Evidence

> 2 primary sources · 1 supporting source

### Reviewer

> Ana Costa · 27 July 2026

### Downstream use

> Valuation v4 · Diligence report · Information memorandum

### Actions

* Inspect evidence;
* edit proposal;
* request review;
* view history;
* restrict;
* create question.

## Density

The default section should show a structured list or table.

Avoid placing every fact in an oversized card.

---

# 32. Fact detail panel

Selecting a fact should open a right-side detail panel.

## Recommended content

### Current fact

* Label;
* value;
* unit;
* period;
* state;
* effective date.

### Evidence

* Sources;
* exact page, sheet, cell or clause;
* evidence classification;
* source freshness.

### Reconciliation

* Alternative values;
* differences;
* normalization rationale.

### Review

* Proposed by;
* reviewed by;
* approved by;
* timestamps;
* comments.

### Downstream use

* Findings;
* valuation assumptions;
* deliverables;
* matching criteria;
* negotiation terms.

### History

* Prior values;
* reason for change;
* source changes;
* superseded versions.

---

# 33. Evidence and provenance inspector

## Purpose

Allow the user to verify a dossier fact without leaving the screen.

## Required information

* Document name;
* document type;
* source location;
* page, sheet, clause or cells;
* relevant excerpt;
* extraction timestamp;
* source period;
* source classification;
* access state.

Example:

> **Informações_Financeiras_2025.xlsx**
> Sheet: Demonstrativo Consolidado
> Cells: B8:M8

Excerpt:

> LTM revenue: R$ 310.400.000

## Source classification

Recommended:

* Primary;
* supporting;
* contradictory;
* outdated;
* management representation;
* external;
* user-entered.

## Multiple sources

Users should be able to compare sources side by side.

## UX rule

The evidence preview should highlight the exact value used.

Do not force the user to search a 200-page document manually.

---

# 34. Contradiction resolution

## Purpose

Help the deal team resolve conflicting claims while preserving the original evidence.

## Example

> **Employee count**

| Source                  | Value | Date        |
| ----------------------- | ----: | ----------- |
| HR roster               |   426 | 30 Jun 2026 |
| Management presentation |   412 | May 2026    |
| Payroll report          |   423 | 30 Jun 2026 |

Recommended resolution:

> Approved headcount: 426

Rationale:

> HR roster is the most current primary source. Payroll excludes three employees on leave.

## Resolution actions

* Approve selected value;
* create normalized value;
* mark temporal difference;
* mark scope difference;
* request clarification;
* keep unresolved;
* create finding.

## Audit behavior

The system must preserve:

* Every original value;
* source;
* reviewer;
* selected resolution;
* rationale;
* time of decision.

---

# 35. Review and approval

## Material fact review

Certain dossier facts may require explicit human approval before downstream use.

Examples:

* Historical revenue;
* adjusted EBITDA;
* net debt;
* ownership;
* customer concentration;
* employee count;
* material liabilities;
* forecast values.

## Primary actions

* Approve fact;
* request changes;
* dispute;
* assign reviewer;
* mark insufficient evidence.

## Section approval

A reviewer may approve a section only when:

* Required facts are present;
* material contradictions are resolved;
* evidence requirements are met;
* no blocking questions remain.

## Approval consequence

Example:

> Approving Financial Profile will authorize 14 reviewed facts for use in Valuation and generated transaction materials.

## UX rule

Do not place a generic **Approve dossier** button over the entire profile.

Approval should be fact- and section-aware.

---

# 36. Downstream dependency map

## Purpose

Show where a fact is being used and what may be affected if it changes.

Example:

> **Adjusted EBITDA · R$ 57,8 mi**

Used by:

* DCF scenario v4;
* trading-comparable valuation;
* EBITDA normalization finding;
* information memorandum v2;
* buyer financial-summary export.

## Change warning

When a user edits an approved fact:

> **This fact is used in four active outputs**

Changing it may require review of:

* Valuation scenario v4;
* diligence report v3;
* information memorandum v2;
* buyer summary.

Actions:

* Continue and mark dependencies for review;
* cancel;
* view dependencies.

This is a core differentiating behavior.

---

# 37. Change detection

When new documents arrive, M&Ai should determine whether they affect dossier facts.

## Change types

* New fact;
* updated value;
* contradictory value;
* changed period;
* stale source replaced;
* source removed;
* previously missing evidence added;
* approved fact invalidated.

## Example

> **New management accounts detected**

Possible impact:

* LTM revenue updated from R$ 306,8 mi to R$ 310,4 mi;
* adjusted EBITDA updated from R$ 56,9 mi to R$ 57,8 mi;
* valuation scenario v3 may be stale.

Actions:

* Review changes;
* accept non-material updates;
* assign reviewer;
* defer.

## UX rule

The system should not silently overwrite approved facts.

---

# 38. Dossier change history

## Purpose

Provide a chronological record of meaningful knowledge changes.

## Event examples

* Fact extracted;
* fact reviewed;
* source added;
* contradiction detected;
* value approved;
* question created;
* fact superseded;
* access changed;
* section approved;
* downstream output marked stale.

## Example

> **10:18 · Ana Costa**
> Approved LTM revenue at R$ 310,4 mi.

> **10:06 · M&Ai**
> Reconciled management accounts and information memorandum.

> **09:42 · Document source**
> Added Informações_Financeiras_Jun-2026.xlsx.

## Actor distinction

Clearly identify:

* Human;
* AI workflow;
* document source;
* deterministic engine;
* external participant.

---

# 39. Editing model

The dossier should not behave like a free-form collaborative document.

## Structured edit

Users edit:

* Proposed value;
* period;
* unit;
* classification;
* rationale;
* source association;
* visibility.

## Narrative fields

Narrative sections may exist for:

* Business description;
* strategic context;
* management observations.

These should still support:

* Paragraph-level source citations;
* review state;
* change history;
* restricted annotations.

## Autosave

Edits should save as proposals.

Material approved facts should not be overwritten immediately.

---

# 40. Collaboration and annotations

## Recommended capabilities

* Comment on fact;
* mention teammate;
* assign review;
* create question;
* add internal note;
* propose correction;
* request evidence;
* resolve thread.

## Annotation categories

* Internal note;
* management representation;
* reviewer comment;
* source issue;
* restriction note.

## UX rule

Comments should remain secondary to the fact and evidence.

The dossier should not become a social discussion feed.

---

# 41. Search and filtering

## Dossier search

Users should be able to search:

* Fact label;
* value;
* section;
* source document;
* person;
* organization;
* question;
* comment;
* downstream output.

Placeholder:

> Search facts, sources or questions

## Filters

Recommended:

* State;
* section;
* reviewer;
* source type;
* missing;
* contradiction;
* stale;
* downstream use;
* restricted;
* changed since last review.

## Saved working views

Examples:

* Facts awaiting my review;
* financial contradictions;
* missing information;
* facts used by valuation;
* facts changed this week.

---

# 42. Contextual Copilot

The shell-level **Ask M&Ai** control should inherit the selected dossier section and fact.

## Suggested prompts

* Summarize the approved target profile.
* Which facts remain unverified?
* Show contradictions in the financial profile.
* What changed after the latest document synchronization?
* Which dossier facts affect valuation?
* Compare management claims with primary evidence.
* Draft an information request for missing ownership data.
* Prepare a target summary for the diligence committee.
* Show every source supporting adjusted EBITDA.

## Response behavior

The Copilot should:

* Use approved facts by default;
* clearly label proposed or disputed facts;
* cite every material statement;
* respect permissions;
* identify stale evidence;
* distinguish fact from interpretation;
* link to exact dossier entries.

The dossier should remain fully usable without Copilot.

---

# 43. Export and generated artifacts

## Appropriate outputs

* Approved target profile;
* company overview;
* financial summary;
* ownership chart;
* management profile;
* commercial overview;
* information memorandum inputs;
* diligence scoping pack;
* committee brief;
* audit package.

## Export controls

Users should select:

* Approved facts only;
* include reviewed but unapproved facts;
* include open questions;
* include source citations;
* include internal notes;
* confidentiality classification;
* period;
* language.

## Export metadata

Every export should show:

* Deal;
* dossier version;
* generated by;
* timestamp;
* included sections;
* evidence current through;
* approval state;
* confidentiality.

---

# 44. Permissions and confidentiality

## Fact-level access

Sensitive facts may require restricted access.

Examples:

* Compensation;
* beneficial ownership;
* litigation;
* tax;
* bidder-specific information;
* personal data;
* cybersecurity;
* negotiation-sensitive facts.

## Section-level access

A user may have:

* Full dossier access;
* financial only;
* legal only;
* read-only;
* approved facts only;
* external-response access.

## Restricted display

Use:

> **Restricted fact**
> You do not have permission to view this information.

Do not reveal the hidden value through:

* Search;
* result count;
* chart scale;
* sorting;
* export;
* Copilot;
* downstream summary.

---

# 45. Dossier readiness by transaction phase

The meaning of “ready” changes by workflow stage.

## Preparation

Ready when:

* Core identity established;
* ownership sufficiently known;
* business model documented;
* financial history available;
* management identified;
* initial documents linked.

## Buyer Universe

Ready when:

* Sector;
* geography;
* financial scale;
* strategic characteristics;
* ownership;
* transaction objective;
* buyer-relevant attributes are approved.

## Due Diligence

Ready when:

* Diligence workstreams have sufficient baseline facts;
* missing evidence is explicitly tracked;
* material facts are source-linked.

## Valuation

Ready when:

* Financial history;
* EBITDA;
* net debt;
* working capital;
* forecasts;
* key assumptions are reviewed and approved.

## Negotiation

Ready when:

* Approved valuation;
* ownership;
* transaction perimeter;
* material liabilities;
* strategic constraints are current.

## Closing

Ready when:

* Legal identity;
* ownership;
* transaction perimeter;
* authorized signatories;
* required corporate facts are final.

---

# 46. Recommended desktop layout

For a **1440 × 900** design canvas:

| Region                    | Approximate width |
| ------------------------- | ----------------: |
| Compact global sidebar    |          72–80 px |
| Dossier section navigator |        220–260 px |
| Main fact workspace       |        600–720 px |
| Evidence inspector        |        340–420 px |
| Page padding              |          24–32 px |

## Recommended composition

```text
┌────────┬───────────────────────────────────────────────────────────┐
│ Global │ Project Horizon · Dossier                                │
│ shell  ├───────────────────────────────────────────────────────────┤
│        │ Target Dossier · 46 approved · 7 review · 5 missing      │
│        ├──────────────┬──────────────────────────┬─────────────────┤
│        │ Sections     │ Financial Profile        │ Evidence        │
│        │              │                          │                 │
│        │ Executive    │ LTM revenue              │ Financial.xlsx  │
│        │ Identity     │ R$ 310,4 mi              │ Sheet: Consol.  │
│        │ Ownership    │ Approved                 │ Cells: B8:M8    │
│        │ Business     │                          │                 │
│        │ Customers    │ Adjusted EBITDA          │ Supporting      │
│        │ Financial    │ R$ 57,8 mi               │ sources         │
│        │ Management   │ Review required          │                 │
│        │ Operations   │                          │ Downstream use  │
│        │ Legal        │ Net debt                 │ Valuation v4    │
│        │ Questions    │ R$ 58,6 mi               │ DD report v3    │
│        │ Changes      │ Approved                 │                 │
└────────┴──────────────┴──────────────────────────┴─────────────────┘
```

## Alternative executive-profile composition

```text
┌──────────────────┬──────────────────────────────────────────────┐
│ Dossier outline  │ Atlas Industrial                            │
│                  │ Industrial automation · Brazil              │
│                  ├───────────────────┬──────────────────────────┤
│                  │ Business profile  │ Ownership                │
│                  │                   │                          │
│                  │ Revenue streams   │ Horizon Holdings 72%     │
│                  │ Markets           │ Founders 18%             │
│                  │ Customers         │ Investors 10%            │
│                  ├───────────────────┼──────────────────────────┤
│                  │ Financial profile │ Evidence readiness       │
│                  │ R$ 310,4 mi rev.  │ 46 approved facts        │
│                  │ R$ 57,8 mi EBITDA │ 7 require review         │
│                  └───────────────────┴──────────────────────────┘
```

---

# 47. Information density

The dossier should be denser than the Deal Overview but less visually dense than a spreadsheet application.

## Recommended rule

> Each visible row should represent one reusable transaction fact.

Avoid:

* Excessive white space;
* one card per field;
* very large type for basic values;
* decorative charts without source access.

Support:

* Comfortable density;
* compact density;
* reviewer mode.

---

# 48. UI design direction

## 48.1 Overall visual character

Aim for:

> **A controlled transaction knowledge record with documentary credibility**

The screen should feel:

* Structured;
* factual;
* precise;
* auditable;
* calm;
* information-dense;
* professionally editable.

It should not feel:

* Like a wiki;
* like a CRM contact profile;
* like a marketing company page;
* like a generic AI report;
* like a dashboard of disconnected cards;
* like an engineering knowledge graph.

## 48.2 Visual hierarchy

Prioritize:

1. Approved fact;
2. fact state;
3. period and basis;
4. source evidence;
5. review status;
6. downstream use;
7. comments and technical provenance.

## 48.3 Color

Use the established M&Ai system:

* Canvas Cream: `#F3F0EE`;
* Lifted Cream: `#FCFBFA`;
* Ink Black: `#141413`;
* Signal Orange: `#CF4500`;
* Light Signal Orange: `#F37338`;
* Dust Taupe: `#D1CDC7`;
* Slate Gray: `#696969`.

Recommended semantic application:

* Approved: green;
* review required: orange;
* contradiction: red-orange;
* missing: neutral outlined amber;
* stale: gray;
* restricted: dark neutral;
* proposed: blue or outlined neutral;
* superseded: muted gray.

Signal Orange should highlight attention and current selection, not every data value.

## 48.4 Typography

Use **Sofia Sans** as the canonical product font.

| Element           |     Size |  Weight |
| ----------------- | -------: | ------: |
| Page title        | 26–30 px | 500–600 |
| Target name       | 22–26 px | 550–650 |
| Section title     | 17–20 px | 600–700 |
| Fact value        | 14–18 px | 550–650 |
| Fact label        | 13–14 px | 600–700 |
| Body              | 14–15 px | 450–500 |
| Metadata          | 12–13 px | 450–550 |
| Status            | 11–12 px | 650–700 |
| Financial summary | 22–30 px | 500–600 |

Use tabular figures for:

* Monetary values;
* percentages;
* dates;
* employee counts;
* ownership percentages.

## 48.5 Geometry

Recommended:

* Main surfaces: 6–12 px radius;
* fact rows: minimal or no individual radius;
* selected fact: restrained highlighted surface;
* evidence chips: pill;
* status tags: pill;
* source preview: rectangular document-like surface.

Avoid placing every fact inside a floating rounded card.

---

# 49. UX design principles

## 49.1 Facts before narrative

Structured facts should be primary.

Narrative summaries should be generated from or linked to those facts.

## 49.2 Evidence before trust

Every material fact should expose its evidence.

## 49.3 Preserve original sources

Reconciliation should never erase contradictory or historical evidence.

## 49.4 Distinguish fact from interpretation

The user must be able to tell whether an item is:

* Extracted fact;
* approved fact;
* management claim;
* banker hypothesis;
* diligence interpretation;
* valuation assumption.

## 49.5 Approved does not mean permanent

Approved facts may become stale or be superseded by new evidence.

## 49.6 Do not overwrite silently

New sources should create proposed changes and review tasks.

## 49.7 Show downstream impact

A changed material fact should reveal which active outputs require review.

## 49.8 Support uncertainty

Allow:

* Value ranges;
* approximations;
* unknown values;
* provisional classifications;
* incomplete evidence.

Do not force false precision.

## 49.9 Preserve deal specificity

The dossier may use organization data, but its approved transaction facts must remain isolated within the deal.

## 49.10 Use exact-context routing

Selecting a source opens the exact document location.

Selecting a finding opens the exact diligence context.

Selecting an affected valuation opens the exact scenario.

---

# 50. System states

## 50.1 Newly created dossier

> **Build the target profile**

Suggested initial actions:

* Review imported organization information;
* connect documents;
* approve company identity;
* complete ownership;
* add financial history.

Do not populate unsupported facts with invented values.

## 50.2 No document source

> **No evidence source connected**

User-entered facts may be added, but they should be labeled:

> User-provided · No supporting source

## 50.3 Extraction in progress

Show:

* Facts discovered;
* documents processed;
* current section;
* expected next state.

Do not block reviewed sections while other documents process.

## 50.4 No facts in section

> **No approved information in this section**

Actions:

* Add fact;
* connect source;
* create information request;
* mark not applicable.

## 50.5 Contradiction

> **Sources disagree**

The approved value should not be updated until review.

## 50.6 Stale fact

> **Review required**
> This fact was approved before the latest source synchronization.

## 50.7 Restricted section

> **Access restricted**
> You do not have permission to view Legal, Tax & Regulatory information.

## 50.8 Partial service failure

Example:

> Evidence preview unavailable. Approved facts remain accessible.

## 50.9 Archived deal

The dossier remains:

* Read-only;
* searchable;
* source-linked;
* exportable;
* historically versioned.

## 50.10 Offline

Allow reading cached approved facts where supported.

Disable:

* Approval;
* source attachment;
* information requests;
* edits requiring synchronization.

---

# 51. Responsive behavior

## Desktop — 1280 px and above

* Compact global sidebar;
* persistent dossier outline;
* main fact workspace;
* persistent evidence inspector;
* contextual review actions.

## Tablet — 768–1279 px

* Collapsible dossier outline;
* fact workspace full-width;
* evidence opens in right drawer;
* financial tables horizontally scroll when necessary.

## Mobile — below 768 px

Recommended sequence:

1. Target identity;
2. dossier state;
3. section selector;
4. key approved facts;
5. review items;
6. selected fact detail;
7. evidence;
8. open questions.

Mobile should support:

* Fact review;
* evidence inspection;
* comments;
* information requests.

Complex reconciliation is desktop-first.

---

# 52. Accessibility requirements

The Target Dossier should support:

* Semantic headings;
* accessible data tables;
* row headers for fact labels;
* keyboard section navigation;
* visible focus;
* text labels for all states;
* screen-reader announcement when a fact state changes;
* descriptive evidence links;
* accessible ownership diagrams with table alternatives;
* accessible charts with data tables;
* explicit currency and period descriptions;
* minimum 44 × 44 px touch targets;
* accessible expand and collapse controls;
* error-summary navigation;
* no color-only contradiction indication;
* keyboard-accessible document previews;
* distinction between unavailable, missing and restricted.

Avoid generic links labeled:

> Source

Prefer:

> Open LTM revenue source in Informações_Financeiras_2025.xlsx

---

# 53. Component architecture for Figma

## `TargetDossierHeader`

Properties:

* Ready;
* attention;
* incomplete;
* stale;
* restricted;
* extraction in progress.

## `DossierReadinessSummary`

Variants:

* Approved;
* review;
* missing;
* contradiction;
* selected filter;
* zero.

## `DossierSectionNavigator`

Properties:

* Ready;
* in review;
* incomplete;
* contradiction;
* restricted;
* not applicable;
* collapsed;
* mobile.

## `ExecutiveProfile`

States:

* Complete;
* incomplete;
* restricted;
* generated from approved facts;
* stale.

## `FactTable`

States:

* Populated;
* no facts;
* loading;
* restricted;
* filtered;
* editing.

## `FactRow`

Properties:

* Proposed;
* extracted;
* reconciled;
* reviewed;
* approved;
* disputed;
* missing;
* stale;
* superseded;
* restricted.

## `FactDetailPanel`

States:

* Fact;
* reconciliation;
* review;
* downstream use;
* history;
* restricted.

## `EvidenceInspector`

Properties:

* Spreadsheet;
* PDF;
* presentation;
* user-entered;
* external source;
* multiple sources;
* unavailable.

## `SourceChip`

Variants:

* Primary;
* supporting;
* contradictory;
* outdated;
* management representation;
* external.

## `ReconciliationTable`

States:

* Matched;
* period difference;
* scope difference;
* contradiction;
* unresolved;
* approved.

## `OwnershipStructure`

Properties:

* Simple;
* multi-level;
* minority interests;
* restricted owners;
* contradiction.

## `FinancialProfileTable`

Properties:

* Historical;
* LTM;
* forecast;
* reported;
* adjusted;
* approved;
* proposed.

## `OpenQuestionQueue`

States:

* Populated;
* overdue;
* blocked;
* resolved;
* empty;
* restricted.

## `FactApprovalBar`

States:

* Approve;
* request change;
* insufficient evidence;
* restricted authority;
* approved.

## `DownstreamDependencyList`

Properties:

* Diligence;
* valuation;
* matching;
* negotiation;
* deliverable;
* stale dependency.

## `DossierChangeReview`

States:

* New facts;
* updated;
* contradictory;
* source removed;
* accepted;
* deferred.

---

# 54. Production object model

## `TargetDossier`

```text
id
dealId
organizationId
templateId
templateVersion
status
evidenceCurrentThrough
lastSourceSyncAt
approvedFactCount
reviewFactCount
missingFactCount
contradictionCount
createdAt
updatedAt
```

## `DossierSection`

```text
id
dossierId
sectionType
title
order
state
required
restricted
approvalPolicyId
approvedBy
approvedAt
updatedAt
```

## `DossierFact`

```text
id
dossierId
sectionId
factType
label
value
valueType
unit
currency
periodStart
periodEnd
effectiveAt
state
materiality
sourceCoverage
proposedBy
reviewedBy
approvedBy
approvedAt
supersededBy
accessLevel
createdAt
updatedAt
```

## `DossierFactSource`

```text
id
factId
documentId
sourceType
sourceClassification
page
sheet
cellRange
clause
excerpt
sourcePeriod
extractedAt
extractionMethod
accessLevel
createdAt
```

## `DossierFactReconciliation`

```text
id
factId
candidateValue
candidateUnit
candidatePeriod
sourceId
differenceType
differenceAmount
resolutionState
resolutionRationale
resolvedBy
resolvedAt
```

## `DossierQuestion`

```text
id
dossierId
sectionId
factId
question
reason
materiality
assignedTo
requestedFrom
dueAt
status
blocking
downstreamImpact
resolvedBy
resolvedAt
createdAt
```

## `DossierDependency`

```text
id
factId
dependencyType
dependencyId
dependencyVersion
status
lastValidatedAt
markedStaleAt
```

## `DossierFactHistory`

```text
id
factId
previousValue
newValue
previousState
newState
changeReason
sourceChangeIds
changedBy
changedAt
```

The dossier should operate as a versioned fact ledger rather than a mutable summary document.

---

# 55. Suggested routes

Primary:

```text
/deals/:dealId/dossier
```

Section:

```text
/deals/:dealId/dossier?section=financial-profile
```

Selected fact:

```text
/deals/:dealId/dossier?section=financial-profile&fact=ltm-revenue
```

Contradictions:

```text
/deals/:dealId/dossier?filter=contradictions
```

My reviews:

```text
/deals/:dealId/dossier?filter=assigned-to-me
```

Open questions:

```text
/deals/:dealId/dossier?section=open-questions
```

Meaningful state should survive browser navigation and page refresh.

---

# 56. Repository direction

The Target Dossier should reuse M&Ai’s existing transaction, organization, document, citation and approval concepts while introducing a more explicit fact-layer model.

## Reuse

* Deal-scoped application shell;
* Organization references;
* Document references;
* source citations;
* VDR document objects;
* approval interactions;
* user and role permissions;
* activity history;
* contextual Copilot;
* existing financial and diligence outputs.

## Add

* Dossier template;
* structured section schema;
* versioned fact ledger;
* fact-state lifecycle;
* source classification;
* reconciliation workflow;
* contradiction resolution;
* section readiness;
* open-question queue;
* downstream dependency tracking;
* fact-level access;
* source-freshness state;
* change review after synchronization;
* approved-versus-proposed narrative generation.

## Avoid

* Treating the dossier as one large JSON blob;
* storing only a generated summary;
* overwriting approved facts on extraction;
* mixing findings with facts;
* using organization data as if it were automatically approved for every deal;
* hiding source conflicts;
* making chat the primary editing interface.

---

# 57. What not to include

Avoid the following in the Target Dossier:

* A single long company summary;
* generic AI confidence scores;
* every extracted sentence;
* complete document directory;
* full diligence findings queue;
* valuation formulas;
* buyer scoring;
* negotiation strategy;
* closing checklist;
* one global dossier-completion percentage;
* charts without source access;
* ownership diagram without a table;
* silent source reconciliation;
* automatic approval;
* silent overwriting of facts;
* unsupported market-share claims;
* user-entered opinions labeled as facts;
* unrestricted personal data;
* free-form editing of approved values;
* real customer names in the pitch mock;
* real VDR provider logos;
* claims of evidence coverage that have not been measured.

---

# 58. MOCKED — Pitch and demo specification

## 58.1 Purpose of the mocked Target Dossier

The mocked Target Dossier should demonstrate that M&Ai transforms fragmented deal materials into a structured, source-linked and reviewable target profile.

Its pitch narrative is:

> **M&Ai converts a data room into an auditable transaction knowledge layer—not merely a collection of documents or AI summaries.**

The Target Dossier is a strong supporting pitch screen because it demonstrates:

* Structured extraction;
* source provenance;
* approved facts;
* evidence gaps;
* reuse across diligence and valuation.

It should not replace the Diligence Decision Room as the primary hero screen, but it may be the strongest second product image.

---

# 59. Mocked shell state

Institution:

> **Atlas M&A Advisory**

User:

> **Ana Costa · Vice President**

Breadcrumb:

> Deals / Project Horizon / Dossier

Deal state:

* Project Horizon;
* Atlas Industrial;
* Sell-side;
* Due Diligence;
* Restricted workspace.

Deal navigation:

* Overview;
* **Dossier**;
* Documents;
* Diligence;
* Valuation;
* Buyer Universe;
* Negotiation;
* Closing.

---

# 60. Mocked page header

Title:

> **Target Dossier**

Description:

> Evidence-backed company profile used throughout Project Horizon.

Status:

* **46 approved facts**
* **7 need review**
* **5 missing**
* **3 contradictions**

Freshness:

> Evidence current through 27 July 2026
> Source synchronized 4 min ago

Primary action:

> **Review 7 facts**

Secondary:

> Export profile

---

# 61. Mocked section navigator

Display:

* **Executive Profile — Ready**
* Company Identity — Ready
* Ownership & Structure — 1 conflict
* Business Model — 2 reviews
* Products & Services — Ready
* Markets & Geography — 1 missing
* Customers & Revenue — 1 conflict
* Financial Profile — 3 reviews
* Management & Organization — Incomplete
* Operations — Ready
* Legal, Tax & Regulatory — Restricted
* Open Questions — 5

For the pitch screenshot, select:

> **Executive Profile**

For the live demo, select:

> **Financial Profile**

---

# 62. Mocked Executive Profile

## Target identity

> **Atlas Industrial S.A.**
> Industrial automation and monitoring software
> São Paulo, Brazil

## Business summary

> Provides automation equipment, industrial-monitoring software and recurring maintenance services to manufacturing customers across Brazil.

## Key approved facts

| Fact                |           Value |
| ------------------- | --------------: |
| LTM revenue         | **R$ 310,4 mi** |
| Adjusted EBITDA     |  **R$ 57,8 mi** |
| EBITDA margin       |       **18,6%** |
| Recurring revenue   |       **68,0%** |
| Employees           |         **426** |
| Operating locations |           **4** |
| Top three customers |       **41,2%** |
| Founder ownership   |       **72,0%** |

## Strategic profile

> Recurring service revenue, proprietary monitoring software and a large industrial installed base make the company relevant to strategic automation and industrial-technology buyers.

Label:

> Banker hypothesis · Based on approved target facts

---

# 63. Mocked ownership structure

Use:

> Horizon Holdings Ltda. — **72,0%**
> Founders and management — **18,0%**
> Minority investors — **10,0%**

Subsidiaries:

> Atlas Serviços Ltda. — 100%
> Atlas Software Ltda. — 85%

Conflict indicator:

> Management ownership differs by 1,5 p.p. between two corporate sources.

Action:

> Review conflict

---

# 64. Mocked business model

Revenue streams:

| Stream                 | LTM revenue | Share |
| ---------------------- | ----------: | ----: |
| Equipment              |  R$ 99,3 mi | 32,0% |
| Software subscriptions |  R$ 89,1 mi | 28,7% |
| Maintenance services   | R$ 121,9 mi | 39,3% |

Summary:

> **68,0% recurring revenue**

Supporting:

> 143 active subscription and maintenance contracts

State:

> Reviewed · 3 supporting sources

---

# 65. Mocked financial profile

Use:

| Metric          |      FY2023 |      FY2024 |      FY2025 |      LTM Jun-26 |
| --------------- | ----------: | ----------: | ----------: | --------------: |
| Revenue         | R$ 221,8 mi | R$ 252,6 mi | R$ 286,4 mi | **R$ 310,4 mi** |
| Adjusted EBITDA |  R$ 36,9 mi |  R$ 43,7 mi |  R$ 51,4 mi |  **R$ 57,8 mi** |
| EBITDA margin   |       16,6% |       17,3% |       17,9% |       **18,6%** |
| Net debt        |  R$ 72,4 mi |  R$ 68,9 mi |  R$ 61,3 mi |  **R$ 58,6 mi** |

Selected fact:

> **LTM revenue · R$ 310,4 mi**

State:

> Approved

Reviewer:

> Ana Costa · 27 July 2026

---

# 66. Mocked evidence inspector

For selected fact:

> **LTM revenue · R$ 310,4 mi**

Primary source:

> `Informações_Financeiras_Jun-2026.xlsx`
> Sheet: Demonstrativo Consolidado
> Cells: B8:M8

Supporting source:

> `Information_Memorandum_v2.pdf`
> Page 17

Evidence coverage:

> **2 primary sources · 1 supporting source**

Reconciliation:

> All sources reconcile after aligning the Jul-25–Jun-26 period.

Downstream use:

* Valuation scenario v4;
* financial diligence;
* information memorandum v2.

---

# 67. Mocked customers and revenue

Display:

> **Top three customers: 41,2% of LTM revenue**

Supporting:

* Top customer: 17,6%;
* top ten: 67,8%;
* weighted customer tenure: 6,4 years;
* recurring contract revenue: 68,0%.

State:

> Approved fact · Diligence review required

Linked consequence:

> Customer-concentration finding
> Proposed valuation impact: −R$ 42 mi midpoint

Action:

> Open finding

This visually connects the dossier to the Diligence Decision Room.

---

# 68. Mocked open questions

Show three visible questions.

## Question 1

> Explain the R$ 4,7 mi difference between debt schedule and management accounts.
> Blocks net-debt approval · Due 30 July

## Question 2

> Provide FY2023 monthly revenue by customer.
> Required for concentration trend · Due 1 August

## Question 3

> Confirm beneficial ownership of minority investment vehicle.
> Ownership section · Legal review

---

# 69. Recommended static pitch composition

The strongest static pitch version is:

```text
┌────────────────────────────────────────────────────────────────┐
│ Target Dossier · 46 approved · 7 review · 5 missing            │
├──────────────┬──────────────────────────────┬───────────────────┤
│ Sections     │ Atlas Industrial            │ Evidence           │
│              │                              │                    │
│ Executive    │ LTM revenue   R$ 310,4 mi   │ Financial.xlsx     │
│ Identity     │ EBITDA        R$ 57,8 mi    │ Sheet: Consol.     │
│ Ownership    │ Recurring rev. 68,0%         │ Cells: B8:M8       │
│ Business     │ Employees      426           │                    │
│ Customers    │ Top 3 clients  41,2%         │ 2 primary sources  │
│ Financial    │                              │                    │
│ Management   │ Ownership                    │ Downstream use     │
│ Questions    │ Horizon Holdings 72%         │ Valuation v4       │
│              │ Founders 18%                 │ DD finding         │
└──────────────┴──────────────────────────────┴───────────────────┘
```

This communicates:

* Structured company knowledge;
* approved facts;
* evidence;
* financial scale;
* ownership;
* downstream reuse.

---

# 70. Pitch-specific simplification

## Keep visible

* Target Dossier title;
* Atlas Industrial;
* approved-fact count;
* missing-information count;
* five to eight material facts;
* selected source;
* one ownership summary;
* one linked downstream use.

## Hide

* Complete section list;
* comments;
* advanced filters;
* long narratives;
* every financial period;
* full open-question queue;
* complete legal section;
* detailed change history;
* source-classification controls;
* administrative actions.

## Readability requirement

At deck scale, the following must remain readable:

* **Target Dossier**
* **46 approved facts**
* **Atlas Industrial**
* **R$ 310,4 mi**
* **R$ 57,8 mi**
* **68,0% recurring**
* **41,2% top three customers**
* **2 primary sources**
* **Valuation scenario v4**

If they are not readable, reduce sections rather than reducing typography.

---

# 71. Recommended demo flow

## Flow A — Documents to approved fact

```text
Target Dossier
  ↓
Financial Profile
  ↓
Select LTM revenue
  ↓
Inspect three sources
  ↓
Review reconciliation
  ↓
Approve R$ 310,4 mi
  ↓
Fact becomes available to Valuation
```

## Flow B — Contradiction resolution

```text
Ownership & Structure
  ↓
Open 1 conflict
  ↓
Compare shareholder register and corporate chart
  ↓
Request clarification
  ↓
Approve normalized ownership
  ↓
Section becomes Ready
```

## Flow C — Dossier to diligence

```text
Customers & Revenue
  ↓
Top three customers: 41,2%
  ↓
Open linked diligence finding
  ↓
Diligence Decision Room
  ↓
Review valuation impact
```

## Flow D — New source changes approved fact

```text
New management accounts synchronized
  ↓
Dossier change review
  ↓
Revenue increased from R$ 306,8 mi to R$ 310,4 mi
  ↓
Review sources
  ↓
Approve update
  ↓
Valuation scenario marked for review
```

## Flow E — Missing information request

```text
Open Questions
  ↓
FY2023 monthly revenue missing
  ↓
Create information request
  ↓
Assign target CFO
  ↓
Response received
  ↓
Attach evidence
  ↓
Resolve question
```

## Flow F — Ask M&Ai

```text
Target Dossier
  ↓
Ask M&Ai
  ↓
“Which facts affecting valuation remain unapproved?”
  ↓
Source-linked response
  ↓
Open adjusted EBITDA review
```

---

# 72. UX prototype tasks to validate

Test with bankers using tasks such as:

1. Find the target’s approved LTM revenue.
2. Identify the sources supporting that value.
3. Determine whether the value is approved or proposed.
4. Find every unresolved contradiction.
5. Explain the ownership structure.
6. Identify which dossier fact affects valuation.
7. Find missing information in Customers & Revenue.
8. Create an information request.
9. Compare two conflicting employee-count sources.
10. Approve a normalized fact.
11. Identify who approved adjusted EBITDA.
12. Find every fact changed after the last synchronization.
13. determine whether a market-share statement is verified.
14. distinguish a management claim from an approved fact.
15. open the diligence finding linked to customer concentration.
16. identify which output becomes stale when revenue changes.
17. find all facts assigned to the user for review.
18. export an approved target profile.
19. identify restricted information.
20. return to the same selected fact after inspecting a source.

## Measures

Record:

* Time to find a known fact;
* whether users understand the fact states;
* whether evidence is discoverable;
* whether fact and finding are confused;
* whether Organization Detail and Target Dossier are confused;
* whether users understand reconciliation;
* whether contradictions feel actionable;
* whether downstream dependencies are noticed;
* whether users trust approved facts;
* whether the interface feels too dense;
* whether missing information is easy to route.

---

# 73. Design validation criteria

The Target Dossier is ready for approval when:

1. Users understand that the dossier is deal-specific.
2. Users distinguish it from Organization Detail.
3. Users distinguish facts from diligence findings.
4. Every material fact can expose its evidence.
5. Proposed and approved values are visibly distinct.
6. New documents do not overwrite approved facts silently.
7. Contradictory sources remain preserved.
8. Reconciliation explains period, basis and scope differences.
9. Missing, zero, unavailable and restricted are distinct.
10. The dossier supports structured facts without becoming a giant form.
11. Executive summaries derive from approved facts.
12. Downstream dependencies are visible.
13. Changing a material fact marks affected outputs for review.
14. Section readiness is explainable.
15. Approval authority is explicit.
16. Sensitive facts respect section- and fact-level permissions.
17. Search returns facts, sources and questions.
18. Open questions connect directly to information requests.
19. Fact history remains auditable.
20. Ownership diagrams have structured table equivalents.
21. Financial values preserve period, currency and basis.
22. The screen remains useful without Copilot.
23. Mobile supports fact review and evidence inspection.
24. Partial system failures do not hide approved facts.
25. Archived dossiers remain source-linked and read-only.
26. The pitch mock remains fictional and readable.
27. The pitch screenshot demonstrates evidence, not just company data.
28. The dossier can support diligence and valuation without duplicating them.
29. Every fact state has a clear next action.
30. The product never presents unsupported narrative as verified truth.

---

# 74. Final design target

The correct design target is not:

> “A beautiful company profile generated from documents.”

It is:

> **A versioned, evidence-backed transaction fact layer where the deal team can establish what is known, what is disputed, what is missing and which approved facts may be used downstream.**

The screen should make the target understandable without hiding uncertainty.

Its defining interaction is:

> **Find the fact → verify the source → reconcile differences → approve the transaction truth → reuse it throughout the deal**

**Next iteration: Documents & VDR.**
