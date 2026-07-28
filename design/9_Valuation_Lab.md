---
canonical_name: "Valuation Lab"
definition_id: "BD-09"
definition_status: "Governed for MAI-90"
screen_family: "deal-execution"
owning_task: "MAI-92"
canonical_routes:
  - "/deals/:dealId/valuation"
figma_file_key: "otMJE31OKIxdXogV4RNbGQ"
figma_status: "Ready for owner review in MAI-92"
figma_area: "MAI Banker Workspace — Design System & Product UI / 06 Application Shell"
figma_nodes:
  - "https://www.figma.com/design/otMJE31OKIxdXogV4RNbGQ?node-id=205-4234"
  - "https://www.figma.com/design/otMJE31OKIxdXogV4RNbGQ?node-id=205-4318"
  - "https://www.figma.com/design/otMJE31OKIxdXogV4RNbGQ?node-id=205-4382"
related_definitions:
  - "design/26_Cross_Screen_Interaction_Map.md"
  - "design/27_Shared_State_Model.md"
  - "design/0_Implementaion_Roadmap.md"
last_reviewed_task: "MAI-90"
implementation_capability_boundary: "Product definition only; no frontend, backend, Storybook, token export, or runtime behavior implemented by this file."
mock_demo_data_boundary: "Use fictional/demo transaction data only; do not encode real client, counterparty, credential, or confidential deal data."
---
# Valuation Lab

## 1. Recommended product naming

Use:

* **Deal navigation:** `Valuation`
* **Page title:** `Valuation Lab`
* **Generated artifact:** `Valuation Report`
* **Engine provenance:** `Deterministic Valuation Engine`

“Valuation Lab” is appropriate because the workspace supports controlled modeling, comparison and review. The navigation label should remain simply **Valuation** because bankers should navigate through business workflows rather than technical engine names.

The product architecture already separates Diligence from Valuation and defines this screen as the workspace for DCF, comparable-company analysis, precedent transactions, EBITDA normalization, net debt, assumptions, scenarios, sensitivities, findings, versions and approvals. 

---

# 2. Screen definition

The **Valuation Lab** is the deal-level workspace where approved transaction facts, explicit assumptions and deterministic calculations are converted into reviewable valuation scenarios.

It should answer:

1. **What is the current approved valuation?**
2. **Which methods support that conclusion?**
3. **Which inputs and assumptions were used?**
4. **Where did each input come from?**
5. **Which diligence findings affect the valuation?**
6. **How does the result change under alternative scenarios?**
7. **Which version is approved, proposed, stale or superseded?**
8. **Who reviewed and approved the conclusion?**
9. **Can every material calculation be reproduced?**

Its central operating sequence is:

> **Approved facts → Explicit assumptions → Deterministic methods → Reconciliation → Scenario range → Human approval**

M&Ai’s product thesis is not that AI should announce a company’s value. It is that M&Ai should produce traceable DCF, comparable-company and scenario calculations and route material outputs for human approval. 

---

# 3. Primary intention

## Operational intention

Allow bankers to build, review and approve valuation conclusions without losing the connection between:

* Source documents;
* Dossier facts;
* diligence adjustments;
* model assumptions;
* valuation methods;
* scenario versions;
* human decisions.

## User intention

A banker should be able to say:

> “I understand how the valuation was calculated, which assumptions drive it, what changed from the previous version and whether the current range is approved.”

## Product intention

The screen should turn valuation from a disconnected spreadsheet artifact into a controlled transaction workflow.

The key product distinction is:

> **M&Ai assists with evidence, reconciliation, deterministic calculations and workflow—but the banker remains responsible for the valuation judgment.**

---

# 4. Why this screen matters

The Valuation Lab is one of M&Ai’s strongest differentiating surfaces.

Many transaction tools can:

* Store financial models;
* summarize documents;
* retrieve financial data;
* generate narrative outputs.

The Valuation Lab should visibly connect:

> **Evidence → Financial normalization → Calculation → Risk adjustment → Approval**

This is what makes the result auditable.

The screen should make the phrase:

> **Auditable valuations**

concrete rather than promotional.

---

# 5. What the Valuation Lab is not

The screen should not become:

* A black-box company-value generator;
* A generic financial dashboard;
* A simplified online DCF calculator;
* A replacement for Excel in every modeling context;
* A collection of decorative valuation charts;
* An AI recommendation presented as a final answer;
* A single blended valuation number;
* A complete financial-model spreadsheet;
* A market-data terminal;
* A full accounting-reconciliation application;
* A diligence findings screen;
* A permanent chat interface;
* A technical optimization-engine console.

The primary question is not:

> “What value did the model produce?”

It is:

> **“Which evidence, assumptions, methods and decisions justify this valuation conclusion?”**

---

# 6. Relationship to adjacent screens

| Screen                      | Primary responsibility                                               |
| --------------------------- | -------------------------------------------------------------------- |
| **Target Dossier**          | Maintains approved financial and operational facts                   |
| **Documents & Evidence**    | Maintains the original financial sources and citations               |
| **Diligence Decision Room** | Identifies risks and proposed financial consequences                 |
| **Valuation Lab**           | Calculates, compares, reconciles and approves valuation scenarios    |
| **Deal Overview**           | Summarizes the current approved and proposed valuation               |
| **Negotiation Room**        | Compares valuation conclusions with offers and commercial structures |
| **Deliverables & Exports**  | Produces valuation reports and committee materials                   |
| **Activity & Audit**        | Records runs, changes, approvals and superseded versions             |

## Valuation versus Target Dossier

The Target Dossier establishes:

> Adjusted EBITDA is R$ 57,8 mi.

The Valuation Lab determines:

> Which EBITDA basis, multiple, cash-flow forecast and adjustments should be used to estimate value.

## Valuation versus Diligence

Diligence establishes:

> Customer concentration exceeds the review threshold.

The Valuation Lab determines:

> How that risk affects revenue forecasts, discount rate, multiple, scenario weights or explicit deductions.

## Valuation versus Negotiation

Valuation defines an internal conclusion.

Negotiation compares that conclusion with:

* Buyer proposals;
* seller expectations;
* consideration structure;
* earn-outs;
* escrow;
* timing;
* execution certainty.

A negotiated price is not automatically the same as intrinsic or risk-adjusted valuation.

---

# 7. Primary users

## 7.1 Analyst

Needs to:

* Prepare financial inputs;
* reconcile values;
* maintain assumptions;
* run scenarios;
* inspect calculation flags;
* prepare review materials.

## 7.2 Associate

Needs to:

* Validate normalizations;
* review source provenance;
* compare methods;
* explain movements;
* submit scenarios for approval;
* prepare valuation outputs.

## 7.3 Vice President

Needs to:

* Challenge assumptions;
* review sensitivity;
* understand diligence adjustments;
* compare scenarios;
* approve material changes within authority.

## 7.4 Managing Director or Partner

Needs:

* Current approved range;
* key drivers;
* downside and upside;
* comparison with market evidence;
* deal implications;
* clear explanation of changes;
* approval authority.

## 7.5 Specialist reviewer

A tax, legal or accounting specialist may need to review:

* Contingencies;
* net debt;
* debt-like items;
* tax shields;
* working-capital adjustments;
* accounting normalization.

## 7.6 Client participant

A restricted client may be permitted to review:

* Selected assumptions;
* financial inputs;
* approved outputs;
* exported valuation materials.

They should not automatically see:

* Internal negotiation limits;
* buyer-specific strategy;
* restricted diligence deductions;
* internal scenario preferences.

---

# 8. Primary job to be done

> When the deal team needs to establish or update valuation, combine approved evidence and explicit assumptions into reproducible scenarios that can be challenged, compared and formally approved.

## Secondary jobs

The user should also be able to:

* Build the first valuation scenario;
* import approved financial facts;
* normalize EBITDA;
* construct the EV-to-equity bridge;
* review net debt and debt-like items;
* maintain forecast assumptions;
* calculate DCF;
* review trading comparables;
* review precedent transactions;
* compare scenarios;
* inspect sensitivities;
* apply diligence-driven adjustments;
* reconcile valuation methods;
* explain movements between versions;
* submit a scenario for approval;
* generate a report;
* export controlled model data.

---

# 9. Core conceptual model

The Valuation Lab should distinguish six layers.

## Layer 1 — Evidence

Original documents, approved facts and reviewed findings.

## Layer 2 — Assumptions

Explicit banker judgments that are not direct facts.

Examples:

* Revenue growth;
* EBITDA margin;
* WACC;
* terminal-growth rate;
* selected comparable multiple;
* DLOM;
* forecast period.

## Layer 3 — Calculation

Deterministic valuation methods.

## Layer 4 — Adjustments

Diligence, transaction-specific and jurisdiction-specific consequences.

## Layer 5 — Reconciliation

How methods and adjustments combine into a conclusion.

## Layer 6 — Decision

Scenario review, approval and downstream authorization.

These layers should never be visually collapsed into one output.

---

# 10. Valuation lifecycle

Each valuation scenario should have an explicit lifecycle.

## Draft

Editable scenario under preparation.

## In review

Submitted to a reviewer.

## Changes requested

Reviewer returned the scenario with required changes.

## Approved

Authorized as the current deal valuation.

## Rejected

Reviewed but not accepted.

## Superseded

Replaced by a newer approved version.

## Stale

Underlying evidence or assumptions changed after approval.

## Archived

Retained for historical review.

## Restricted

Exists, but the user lacks permission.

The Deal Overview and Negotiation Room should use the **approved** valuation by default—not the latest draft.

---

# 11. Scenario model

A scenario should be more than a label attached to a result.

It should contain:

* Scenario name;
* version;
* purpose;
* forecast assumptions;
* method configuration;
* selected comparables;
* adjustments;
* source versions;
* calculation-engine version;
* creator;
* reviewer;
* approval state;
* effective date.

## Recommended standard scenarios

* Management case;
* banker base case;
* downside case;
* upside case;
* diligence-adjusted case;
* negotiation case;
* buyer-specific case;
* lender case, where applicable.

## Naming guidance

Use business-readable names:

> **Risk-adjusted case**

Avoid technical names:

> `scenario_fin_v4_prod_final_2`

---

# 12. Recommended workspace structure

The Valuation Lab should contain seven principal subviews:

1. **Summary**
2. **Assumptions**
3. **Financial Adjustments**
4. **Methods**
5. **Scenarios**
6. **Sensitivity**
7. **Versions & Approvals**

Optional later view:

8. **Calculation Audit**

## Summary

Current valuation conclusion and primary drivers.

## Assumptions

Complete assumption register and provenance.

## Financial Adjustments

EBITDA normalization, net debt, working capital, contingencies and other bridges.

## Methods

DCF, trading comparables, precedent transactions and relevant secondary methods.

## Scenarios

Scenario construction and side-by-side comparison.

## Sensitivity

Controlled sensitivity tables and driver analysis.

## Versions & Approvals

Version history, review and decision audit.

---

# 13. Page header

## Recommended title

> **Valuation Lab**

Supporting description:

> Build, compare and approve traceable valuation scenarios for Project Horizon.

## Header status

Example:

* **Approved scenario v3**
* **Proposed scenario v4**
* **2 assumptions require review**
* **1 diligence adjustment pending approval**

## Primary action

Adapt to the current state:

* **Create scenario**
* **Run valuation**
* **Review scenario v4**
* **Submit for approval**
* **Approve scenario**
* **Resolve stale inputs**

## Secondary actions

* Generate report;
* compare versions;
* export model;
* more actions.

---

# 14. Valuation summary

## Purpose

Present the current conclusion without hiding its status or methodology.

## Recommended hierarchy

### Current approved valuation

> **R$ 480 mi–R$ 520 mi**
> Enterprise value · Base scenario v3

### Proposed valuation

> **R$ 438 mi–R$ 478 mi**
> Risk-adjusted scenario v4

### Difference

> **−R$ 42 mi midpoint · −8,4%**

### Review state

> Human approval required

## Supporting information

* Value basis;
* currency;
* effective date;
* latest approved version;
* latest proposed version;
* methods used;
* scenario owner;
* source freshness.

## UX rule

Approved and proposed values must never appear with equal visual authority.

Recommended:

* Approved value: stable neutral treatment;
* proposed value: attention treatment;
* movement: explicit directional explanation.

---

# 15. Enterprise value versus equity value

The screen must clearly distinguish:

* Enterprise value;
* equity value;
* purchase price;
* investment amount;
* consideration payable;
* per-share value, when applicable.

## Recommended bridge

```text
Enterprise value
− Net debt
− Debt-like items
− Expected contingencies
+ Cash-like items
± Working-capital adjustment
= Equity value
```

## Example

> **Enterprise value midpoint**
> R$ 458,0 mi

> Less: Net debt
> R$ 58,6 mi

> Less: Debt-like items
> R$ 8,4 mi

> Add: Surplus cash-like items
> R$ 2,1 mi

> **Illustrative equity value midpoint**
> R$ 393,1 mi

The bridge should specify whether the amounts are:

* Approved;
* proposed;
* estimated;
* unresolved;
* restricted.

---

# 16. Valuation-range model

A valuation range should explain how it was constructed.

Possible range sources:

* Scenario boundaries;
* sensitivity results;
* selected multiple range;
* forecast variation;
* WACC and terminal-growth range;
* method reconciliation;
* professional judgment.

## Required metadata

* Low;
* midpoint;
* high;
* basis;
* currency;
* scenario;
* version;
* approval state.

## UX rule

Do not display a range without explaining:

> Why these boundaries were selected.

Example:

> Low and high values reflect the approved WACC and terminal-growth sensitivity bounds, reconciled with selected market multiples.

---

# 17. Financial-input readiness

## Purpose

Show whether valuation inputs are sufficiently complete and reviewed.

## Recommended dimensions

* Historical financials;
* forecast;
* adjusted EBITDA;
* net debt;
* working capital;
* capex;
* tax assumptions;
* comparable dataset;
* diligence adjustments.

## Example

> **Input readiness: Attention required**

Reasons:

* EBITDA normalization awaiting VP review;
* debt-like items incomplete;
* FY2023 customer detail missing;
* one tax contingency updated after scenario v3 approval.

## State vocabulary

* Ready;
* in review;
* incomplete;
* stale;
* contradictory;
* restricted;
* not applicable.

---

# 18. Assumption register

## Purpose

Maintain every subjective or scenario-specific input in one controlled location.

## Recommended fields

* Assumption;
* value;
* unit;
* period;
* source or rationale;
* scenario;
* owner;
* state;
* materiality;
* last changed;
* downstream methods.

## Example

| Assumption            |     Value | State     | Used by             |
| --------------------- | --------: | --------- | ------------------- |
| Revenue growth FY2027 |     12,0% | Approved  | DCF                 |
| EBITDA margin FY2027  |     19,2% | In review | DCF, multiples      |
| WACC                  |     14,0% | Approved  | DCF                 |
| Terminal growth       |      4,5% | Approved  | DCF                 |
| Selected EV/EBITDA    | 8,0x–8,5x | Proposed  | Trading comparables |
| DLOM                  |      7,5% | Proposed  | Reconciliation      |

## UX rule

The register should distinguish:

* Facts imported from the Target Dossier;
* calculations derived from facts;
* banker assumptions;
* market observations;
* diligence adjustments;
* engine defaults.

---

# 19. Assumption provenance

Every material assumption should answer:

1. Who proposed it?
2. Why was it selected?
3. What evidence supports it?
4. Which methods use it?
5. What happens if it changes?
6. Who approved it?

## Example

> **WACC · 14,0%**

Components:

* Risk-free rate: 10,8%;
* beta: 1,12;
* equity-risk premium: 5,5%;
* country-risk adjustment: 1,8%;
* cost of debt: 12,4%;
* target debt weight: 20%;
* tax rate: 34%.

Rationale:

> Approved institutional methodology for a private Brazilian industrial-technology company.

State:

> Approved by Marina Alves · Scenario v3

The user should be able to inspect the methodology rather than see only `14,0%`.

---

# 20. Assumption states

Recommended:

* Imported fact;
* derived;
* proposed;
* reviewed;
* approved;
* disputed;
* stale;
* superseded;
* missing;
* restricted;
* default.

## Default-state warning

A default assumption should be explicitly visible.

Example:

> **Terminal growth: 4,0%**
> Institution default · Not yet reviewed for this transaction

Default must not be visually equivalent to approved.

---

# 21. Financial Adjustments workspace

This subview should contain the primary bridges between reported financials and valuation-ready inputs.

Recommended modules:

1. EBITDA normalization;
2. Net debt;
3. Debt-like and cash-like items;
4. Working capital;
5. Contingencies;
6. Tax adjustments;
7. Non-operating assets and liabilities;
8. Transaction perimeter.

---

# 22. EBITDA normalization

## Purpose

Create an auditable bridge from reported EBITDA to adjusted or maintainable EBITDA.

## Recommended table

| Adjustment                  |         Amount | Direction    | State         | Evidence            |
| --------------------------- | -------------: | ------------ | ------------- | ------------------- |
| Reported LTM EBITDA         |     R$ 51,0 mi | Base         | Approved      | Management accounts |
| Owner-related expenses      |      R$ 2,1 mi | Add-back     | Approved      | 3 sources           |
| One-time ERP implementation |      R$ 1,8 mi | Add-back     | In review     | 2 sources           |
| Litigation settlement       |      R$ 1,2 mi | Add-back     | Proposed      | Legal finding       |
| Run-rate hiring cost        |      R$ 1,5 mi | Deduction    | Approved      | Payroll             |
| Other adjustments           |      R$ 3,2 mi | Net add-back | Review        | Multiple            |
| **Adjusted EBITDA**         | **R$ 57,8 mi** |              | **In review** |                     |

## Required metadata

* Recurring or non-recurring;
* historical or run-rate;
* cash or non-cash;
* tax treatment;
* source;
* reviewer;
* accepted by seller, buyer or internal only.

## UX rule

The screen must not imply that every proposed adjustment is valid.

Use states:

* Accepted;
* proposed;
* challenged;
* rejected;
* pending evidence.

---

# 23. EBITDA adjustment detail

Selecting an adjustment should show:

* Description;
* amount;
* period;
* accounting classification;
* rationale;
* source documents;
* related diligence finding;
* tax effect;
* recurring assessment;
* reviewer comments;
* history.

## Example

> **One-time ERP implementation · +R$ 1,8 mi**

Rationale:

> External implementation costs incurred during FY2025 and not expected to recur.

Evidence:

* Vendor invoices;
* general-ledger detail;
* management representation.

Reviewer question:

> Does the company require continuing implementation support in FY2027?

---

# 24. Net debt and debt-like items

## Recommended categories

### Financial debt

* Bank loans;
* notes;
* shareholder loans;
* leasing;
* accrued interest;
* overdrafts.

### Cash and cash equivalents

* Unrestricted cash;
* short-term liquid investments;
* restricted cash;
* trapped cash.

### Debt-like items

* Overdue taxes;
* unpaid bonuses;
* pension deficits;
* deferred capex;
* unpaid dividends;
* supplier financing;
* transaction expenses;
* lease obligations, depending on methodology.

### Cash-like items

* Excess working capital;
* recoverable tax credits;
* non-operating investments;
* surplus assets.

## Example bridge

| Item                                 |         Amount | Classification | State     |
| ------------------------------------ | -------------: | -------------- | --------- |
| Gross financial debt                 |     R$ 74,2 mi | Debt           | Approved  |
| Cash and equivalents                 |    −R$ 15,6 mi | Cash           | Approved  |
| **Net debt**                         | **R$ 58,6 mi** |                | Approved  |
| Unpaid employee bonuses              |      R$ 3,2 mi | Debt-like      | Proposed  |
| Deferred maintenance capex           |      R$ 5,2 mi | Debt-like      | In review |
| Recoverable non-operating tax credit |     −R$ 2,1 mi | Cash-like      | Proposed  |

---

# 25. Working-capital adjustment

## Purpose

Calculate the completion or purchase-price adjustment against a normalized working-capital target.

## Required information

* Actual working capital;
* normalized target;
* reference period;
* seasonality treatment;
* excluded items;
* adjustment mechanism;
* scenario impact.

## Example

> Actual working capital: R$ 42,7 mi
> Normalized target: R$ 45,0 mi
> Proposed adjustment: **−R$ 2,3 mi**

## UX rule

Working capital should not be hidden inside net debt.

It should remain a separately reviewable bridge.

---

# 26. Contingencies

## Recommended categories

* Tax;
* labor;
* civil;
* environmental;
* regulatory;
* contractual;
* other.

## Required inputs

* Gross exposure;
* probability classification;
* probability weight;
* expected deduction;
* source finding;
* legal reviewer;
* treatment in valuation;
* treatment in negotiation.

## Example

| Contingency          | Gross exposure | Probability | Expected deduction |
| -------------------- | -------------: | ----------- | -----------------: |
| Labor claims         |     R$ 11,4 mi | Possible    |          R$ 5,7 mi |
| PIS/COFINS dispute   |      R$ 6,0 mi | Possible    |          R$ 3,0 mi |
| Environmental notice |      R$ 1,8 mi | Remote      |               R$ 0 |

## UX principle

The deterministic expected-value calculation should remain visible.

The professional judgment is:

* Probability classification;
* inclusion;
* treatment;
* recoverability.

---

# 27. Brazilian valuation adjustments

The screen should leave room for jurisdiction-specific treatment without making every deal use it.

Examples:

* JCP tax-shield effects;
* DLOM for private-company liquidity;
* tax contingencies;
* labor contingencies;
* restricted cash;
* recoverable tax credits;
* lease treatment;
* Brazilian corporate tax rates.

The current repository already contains deterministic support for DLOM, JCP tax-shield benefits and probability-weighted tax and labor contingencies. Those should appear as explicit adjustment modules—not as hidden corrections inside a final result.

## UX rule

Each adjustment should state:

* Jurisdictional basis;
* methodology;
* value;
* scenario;
* source;
* approval state.

---

# 28. Methods workspace

Recommended primary methods:

1. Discounted Cash Flow;
2. Trading Comparables;
3. Precedent Transactions;
4. EBITDA Multiple / Selected Multiple;
5. Asset or Book Value, where relevant;
6. Market Capitalization, for public companies;
7. Other institution-approved methods.

Methods should adapt to the company profile and transaction.

A private middle-market company should not display Market Capitalization as a prominent method when it is inapplicable.

---

# 29. Method-state model

Each method should be:

* Not configured;
* in preparation;
* ready to calculate;
* calculated;
* flagged;
* in review;
* approved;
* excluded;
* not applicable;
* stale;
* restricted.

## Excluded method

A method may be excluded from reconciliation, but the reason must remain visible.

Example:

> **Book Value excluded**
> The target’s value is primarily derived from recurring software and service cash flows rather than net tangible assets.

---

# 30. Discounted Cash Flow

## Recommended structure

### Forecast

* Revenue;
* EBITDA;
* EBIT;
* tax;
* depreciation and amortization;
* capex;
* working-capital movement;
* unlevered free cash flow.

### Discounting

* WACC;
* mid-year or year-end convention;
* forecast horizon;
* discount factors.

### Terminal value

* Perpetuity-growth method;
* exit-multiple method;
* selected method;
* cross-check.

### Output

* Present value of forecast cash flows;
* present value of terminal value;
* enterprise value;
* terminal-value contribution;
* flags.

---

# 31. DCF forecast table

Example:

| R$ mi         | FY2026E | FY2027E | FY2028E | FY2029E | FY2030E |
| ------------- | ------: | ------: | ------: | ------: | ------: |
| Revenue       |   326,0 |   365,1 |   405,3 |   445,8 |   485,9 |
| Growth        |   10,8% |   12,0% |   11,0% |   10,0% |    9,0% |
| EBITDA        |    61,7 |    70,1 |    79,0 |    87,8 |    96,2 |
| EBITDA margin |   18,9% |   19,2% |   19,5% |   19,7% |   19,8% |
| Unlevered FCF |    42,0 |    48,7 |    55,3 |    61,4 |    67,5 |

## Cell states

Each forecast line may be:

* Imported;
* formula-derived;
* manually assumed;
* approved;
* proposed;
* changed.

## UX direction

Allow spreadsheet-like editing while preserving controlled formulas and version history.

---

# 32. DCF calculation trace

The user should be able to inspect:

* Formula;
* input values;
* units;
* period;
* output;
* rounding;
* engine version;
* flags.

Example:

> FY2027 discount factor
> `1 / (1 + WACC)^2`

Inputs:

* WACC: 14,0%;
* period: 2.

Output:

> 0,7695

## UX principle

Do not expose every formula by default.

Use progressive disclosure:

> Summary → calculation trace → full formula detail

---

# 33. Terminal value

## Supported approaches

* Perpetuity growth;
* exit multiple;
* selected cross-check.

## Required warnings

The engine should flag conditions such as:

* Terminal growth equal to or above WACC;
* unrealistic growth;
* terminal value dominating total EV;
* negative terminal cash flow;
* multiple outside approved range.

## Example

> **Terminal value contributes 67% of enterprise value**

State:

> Attention required

Supporting explanation:

> The model is highly sensitive to WACC and terminal growth.

---

# 34. WACC analysis

## Recommended components

* Risk-free rate;
* beta;
* equity-risk premium;
* country-risk premium;
* size premium;
* company-specific premium;
* cost of debt;
* tax rate;
* target capital structure.

## Output

> Cost of equity: 15,6%
> After-tax cost of debt: 8,2%
> Equity weight: 80%
> Debt weight: 20%
> **WACC: 14,0%**

## UX rule

Any company-specific premium should require explicit rationale.

It should not be used as an unexplained plug to reach a preferred value.

---

# 35. Trading comparables

## Recommended workflow

1. Define screening criteria;
2. assemble candidate universe;
3. review comparability;
4. approve selected set;
5. normalize financial metrics;
6. calculate multiples;
7. select applicable range;
8. apply to target metrics.

## Comparable fields

* Company;
* market;
* geography;
* sector;
* business model;
* revenue;
* EBITDA;
* growth;
* margin;
* EV/Revenue;
* EV/EBITDA;
* data date;
* source;
* inclusion state;
* comparability rationale.

## Inclusion states

* Selected;
* candidate;
* excluded;
* outlier;
* insufficient data;
* restricted.

---

# 36. Comparable selection

Each exclusion or inclusion should have a reason.

Example:

> **Selected · Industek Systems**

Reasons:

* Similar recurring-service exposure;
* comparable industrial customer base;
* similar EBITDA margin;
* Brazilian market exposure.

Example:

> **Excluded · Global Automation Corp.**

Reason:

* Significantly larger scale;
* diversified global footprint;
* materially higher software mix.

## UX rule

Do not allow the engine to silently choose the peer set.

M&Ai may suggest peers, but the selected group remains a banker decision.

---

# 37. Comparable range

Example:

| Multiple   |  Low | Median | High |  Selected |
| ---------- | ---: | -----: | ---: | --------: |
| EV/Revenue | 1,3x |   1,6x | 2,0x | 1,5x–1,7x |
| EV/EBITDA  | 7,4x |   8,2x | 9,1x | 8,0x–8,5x |

Applied to:

> Adjusted EBITDA: R$ 57,8 mi

Implied EV:

> **R$ 462 mi–R$ 491 mi**

The selected multiple range should require rationale and approval.

---

# 38. Precedent transactions

## Recommended information

* Acquirer;
* target;
* announcement date;
* closing date;
* sector;
* geography;
* transaction type;
* enterprise value;
* target revenue;
* target EBITDA;
* EV/Revenue;
* EV/EBITDA;
* strategic rationale;
* source quality;
* inclusion state.

## Normalization

The interface should identify:

* Currency conversion basis;
* announcement-date metrics;
* accounting-period differences;
* minority versus control transactions;
* earn-outs;
* undisclosed consideration;
* distressed transactions;
* unusual synergies.

## UX rule

Do not place incomparable transactions into a median without review.

---

# 39. Secondary methods

The current deterministic engine includes methods such as:

* Book value;
* market capitalization;
* enterprise-value calculation;
* EBITDA multiple;
* DCF;
* terminal value.

The product should use these appropriately:

## Book value

Relevant for:

* Asset-heavy;
* financial;
* distressed;
* liquidation or floor-value contexts.

## Market capitalization

Relevant primarily for:

* Public targets;
* unaffected price;
* premium analysis.

## Enterprise-value bridge

A calculation basis, not necessarily an independent valuation method.

## Terminal value

A component of DCF, not normally a standalone banker-facing method.

This is an important product refinement: the UI should organize calculations according to M&A valuation practice rather than mirroring the engine’s current internal function boundaries.

---

# 40. Method flags

Examples:

* Negative cash flow detected;
* non-positive EBITDA;
* growth exceeds WACC;
* unrealistic growth rate;
* negative enterprise value;
* negative book value;
* insufficient comparables;
* stale market data;
* terminal value concentration;
* missing forecast period;
* unresolved source contradiction.

## Flag anatomy

* Flag;
* affected method;
* consequence;
* severity;
* recommended resolution;
* reviewer;
* state.

Example:

> **Non-positive EBITDA**

Consequence:

> EBITDA-multiple valuation cannot be applied reliably.

Action:

> Exclude method or select an alternative metric.

---

# 41. Reconciliation

## Purpose

Combine applicable valuation methods into a reviewable conclusion.

Reconciliation should expose:

* Included methods;
* raw implied values;
* selected weights;
* weight constraints;
* weighted contribution;
* adjustments;
* final value;
* optimization state.

## Example

| Method                       | Implied midpoint | Weight |    Contribution |
| ---------------------------- | ---------------: | -----: | --------------: |
| DCF                          |      R$ 458,0 mi |    45% |     R$ 206,1 mi |
| Trading comparables          |      R$ 472,0 mi |    25% |     R$ 118,0 mi |
| Precedent transactions       |      R$ 480,0 mi |    10% |      R$ 48,0 mi |
| EBITDA multiple              |      R$ 448,0 mi |    20% |      R$ 89,6 mi |
| **Base reconciled midpoint** |                  |        | **R$ 461,7 mi** |

Adjustments:

> Net scenario adjustments: −R$ 3,7 mi

Final:

> **R$ 458,0 mi midpoint**

---

# 42. Method weighting

Weights may be influenced by:

* Company stage;
* listing status;
* sector;
* financial stability;
* source reliability;
* method applicability;
* institution policy.

However, the user must see:

* Default weight;
* permitted range;
* selected weight;
* reason;
* who approved it.

## Example

> **DCF weight: 45%**

Institution policy:

> 30%–70% for private growth companies.

Rationale:

> Reliable five-year forecast and high recurring-revenue visibility.

## UX rule

Do not present optimized weights as objective truth.

They are constrained methodological choices.

---

# 43. Reconciliation status

Recommended:

* Optimal;
* manual;
* constrained;
* fallback;
* invalid;
* in review.

## Fallback

If the constrained reconciliation cannot be solved, display:

> **Fallback reconciliation used**

Explanation:

> The selected method-weight constraints were infeasible.

Actions:

* Review weight bounds;
* reset to institution defaults;
* calculate manually;
* exclude incompatible method.

Do not hide fallback behavior inside a final valuation.

---

# 44. Adjustments bridge

After method reconciliation, show every adjustment separately.

Potential adjustments:

* DLOM;
* tax shield;
* contingencies;
* customer-concentration impact;
* key-person risk;
* non-operating assets;
* synergies;
* control premium;
* minority discount;
* transaction expenses;
* debt-like items.

## Example

```text
Base reconciled enterprise value        R$ 461,7 mi
Customer-concentration adjustment       −R$ 42,0 mi
Tax and labor contingency adjustment     −R$ 8,7 mi
JCP tax-shield benefit                    +R$ 3,4 mi
Other approved adjustments              +R$ 43,6 mi
Final midpoint                          R$ 458,0 mi
```

For the normal product view, only applicable adjustments should appear.

## UX rule

Avoid a single opaque line:

> Risk adjustment: −8,4%

The individual drivers should be inspectable.

---

# 45. Findings affecting valuation

## Purpose

Connect Diligence directly to the valuation model.

## Finding anatomy

* Finding;
* severity;
* proposed financial treatment;
* affected assumptions;
* scenario impact;
* approval state;
* source evidence.

## Example

> **Customer concentration increased to 41,2%**

Proposed treatment:

* Revenue downside: −5,0%;
* WACC adjustment: +0,75 p.p.;
* scenario midpoint impact: −R$ 42 mi.

State:

> Diligence finding approved
> Valuation treatment awaiting approval

## Important distinction

Approving a diligence finding does not necessarily approve its valuation treatment.

These are separate decisions:

1. Is the finding valid?
2. How should it affect valuation?

---

# 46. Finding-to-assumption mapping

A single finding may affect multiple assumptions.

Example:

> Customer concentration

May affect:

* Revenue churn;
* growth rate;
* margin;
* working-capital risk;
* WACC;
* selected multiple;
* scenario weighting.

The mapping should show the exact treatment selected.

Avoid automatically applying every possible adjustment and thereby double-counting risk.

---

# 47. Double-counting controls

## Purpose

Prevent the same risk from being reflected in several methods or adjustments unintentionally.

Example:

Customer concentration may already be reflected in:

* Lower revenue forecast;
* higher WACC;
* lower selected multiple;
* direct valuation deduction.

The system should flag:

> **Potential double counting**

Supporting explanation:

> Customer-concentration risk is currently reflected in revenue growth, WACC and a direct deduction.

Actions:

* Keep all with rationale;
* remove one treatment;
* assign review;
* compare alternatives.

This is a critical decision-grade capability.

---

# 48. Scenario builder

## Required sections

* Scenario identity;
* base source version;
* forecast assumptions;
* financial adjustments;
* methods;
* method weights;
* diligence treatments;
* output basis;
* reviewer.

## Creation options

* Start from approved scenario;
* duplicate another scenario;
* use institution template;
* create blank scenario.

## UX rule

Do not modify an approved scenario directly.

Create a new draft version.

---

# 49. Scenario comparison

The comparison view should show:

* Approved base;
* proposed risk-adjusted;
* downside;
* upside;
* buyer case, when applicable.

## Recommended comparison table

| Driver                |   Base v3 | Risk-adjusted v4 |  Downside | Difference v3→v4 |
| --------------------- | --------: | ---------------: | --------: | ---------------: |
| Revenue growth FY2027 |     14,0% |            12,0% |      8,0% |        −2,0 p.p. |
| EBITDA margin FY2027  |     19,5% |            19,2% |     18,0% |        −0,3 p.p. |
| WACC                  |    13,25% |            14,0% |     15,0% |       +0,75 p.p. |
| Terminal growth       |      4,5% |             4,5% |      4,0% |                — |
| EV/EBITDA             |      8,5x |             8,0x |      7,3x |            −0,5x |
| EV midpoint           | R$ 500 mi |        R$ 458 mi | R$ 420 mi |    **−R$ 42 mi** |

## UX direction

Highlight changed drivers—not every unchanged row.

---

# 50. Scenario movement explanation

Every version change should generate a deterministic movement bridge.

Example:

```text
Approved midpoint v3                       R$ 500 mi
Revenue-growth revision                    −R$ 16 mi
Customer-retention downside                −R$ 11 mi
WACC increase                              −R$ 13 mi
Comparable-multiple revision                −R$ 5 mi
Updated EBITDA                              +R$ 3 mi
Other                                       ±R$ 0 mi
Proposed midpoint v4                       R$ 458 mi
```

The bridge should reconcile exactly.

No unexplained residual should be hidden.

---

# 51. Sensitivity analysis

## Recommended sensitivities

### DCF

* WACC versus terminal growth;
* WACC versus exit multiple;
* revenue growth versus margin;
* margin versus capex;
* customer loss versus retention.

### Multiples

* Target metric versus multiple;
* adjusted EBITDA versus EV/EBITDA;
* selected range versus net debt.

### Equity value

* EV versus net debt;
* working-capital target versus actual;
* contingency treatment.

## UX rule

Sensitivity analysis should answer a specific decision question.

Avoid showing ten heatmaps simply because the engine can generate them.

---

# 52. Sensitivity table

Example:

### Enterprise value — WACC versus terminal growth

| Terminal growth | 13,0% WACC |    14,0% WACC | 15,0% WACC |
| --------------- | ---------: | ------------: | ---------: |
| 4,0%            |  R$ 481 mi |     R$ 452 mi |  R$ 427 mi |
| 4,5%            |  R$ 496 mi | **R$ 466 mi** |  R$ 439 mi |
| 5,0%            |  R$ 514 mi |     R$ 481 mi |  R$ 452 mi |

Selected case:

> WACC 14,0% · Terminal growth 4,5%

## Accessibility

The selected cell cannot be indicated only by color.

Use:

* Border;
* label;
* icon;
* text annotation.

---

# 53. Driver analysis

The screen should identify which assumptions have the largest effect on value.

Example:

> **Largest valuation drivers**

1. WACC;
2. FY2027–FY2029 revenue growth;
3. selected EV/EBITDA multiple;
4. adjusted EBITDA;
5. customer retention.

This should be calculated from explicit sensitivities—not generated as vague AI commentary.

---

# 54. Evidence inspector

Selecting an input should open its supporting evidence.

## Example

> **Adjusted EBITDA · R$ 57,8 mi**

Sources:

* Informações_Financeiras_Jun-2026.xlsx;
* EBITDA_Normalization_v3.xlsx;
* payroll detail;
* diligence findings.

Exact locations:

* Sheet;
* cell range;
* page;
* clause.

## Evidence states

* Primary;
* supporting;
* contradictory;
* stale;
* management representation;
* user-entered assumption.

## UX rule

The Valuation Lab should not duplicate the full Documents workspace.

It should provide evidence inspection and exact deep links.

---

# 55. Input lineage

Each input should show:

```text
Source document
  ↓
Dossier fact
  ↓
Valuation assumption
  ↓
Calculation
  ↓
Scenario output
```

Example:

```text
Receita_por_Cliente_2025.xlsx
  ↓
Top-three concentration · 41,2%
  ↓
Customer-retention downside · −5,0%
  ↓
Risk-adjusted DCF
  ↓
−R$ 42 mi midpoint impact
```

This lineage is one of the screen’s most important differentiators.

---

# 56. Change propagation

When an approved dossier fact or source changes, M&Ai should:

1. Detect the changed dependency;
2. mark affected assumptions stale;
3. identify affected scenarios;
4. preserve prior approved results;
5. create review tasks;
6. rerun only when authorized or configured;
7. require approval for material changes.

## Example

> **Adjusted EBITDA changed from R$ 56,9 mi to R$ 57,8 mi**

Affected:

* DCF base case;
* trading-comparable range;
* precedent-transaction range;
* negotiation floor;
* valuation report v3.

State:

> Scenario v3 remains historically approved but is now stale.

---

# 57. Calculation runs

A valuation run should record:

* Scenario;
* input snapshot;
* engine version;
* start and completion;
* status;
* outputs;
* flags;
* initiated by;
* deterministic checksum or reproducibility identifier.

## Run states

* Queued;
* running;
* completed;
* completed with flags;
* failed;
* cancelled;
* superseded.

## UX rule

The most recent run is not automatically the approved scenario.

---

# 58. Reproducibility

A reviewer should be able to reproduce a valuation from:

* Scenario version;
* fact versions;
* source versions;
* assumptions;
* method configuration;
* engine version;
* calculation order.

## Reproducibility state

* Reproducible;
* source unavailable but historical copy preserved;
* engine version archived;
* incomplete historical dependency;
* manual external calculation.

---

# 59. External model interoperability

The product should recognize that bankers will continue using Excel.

Appropriate capabilities:

* Export approved assumptions;
* export calculation tables;
* import reviewed financial schedules;
* compare imported workbook values;
* attach external model;
* record external model version;
* reconcile M&Ai output with external model.

## UX principle

M&Ai should not pretend to eliminate spreadsheets immediately.

It should make their relationship to evidence and approvals more controlled.

---

# 60. Manual calculation overrides

Certain adjustments may be calculated externally or manually.

Required fields:

* Override value;
* reason;
* calculation attachment;
* author;
* reviewer;
* affected methods;
* effective scenario;
* approval state.

## Warning

> **Manual override**

This value was not generated by the deterministic engine.

Do not hide manual values inside engine output.

---

# 61. Review and approval

## Review sequence

```text
Analyst prepares scenario
  ↓
Associate reviews inputs
  ↓
Vice President reviews methods and adjustments
  ↓
Deal Lead or Partner approves
  ↓
Approved valuation becomes current
```

The actual sequence should follow institution policy.

## Review actions

* Submit for review;
* request changes;
* approve;
* reject;
* withdraw;
* supersede;
* mark stale;
* assign reviewer.

---

# 62. Approval gate

Before approval, show:

* Scenario;
* valuation range;
* movement from current approved version;
* material assumption changes;
* unresolved flags;
* diligence adjustments;
* source freshness;
* affected downstream workflows;
* approval consequence.

## Example

> **Approve risk-adjusted scenario v4?**

Valuation:

> R$ 438 mi–R$ 478 mi

Movement:

> −R$ 42 mi midpoint · −8,4%

Material changes:

* WACC: +0,75 p.p.;
* revenue downside: −5,0%;
* EV/EBITDA range: −0,5x.

Consequence:

* Scenario v3 becomes superseded;
* Deal Overview updates;
* valuation report v4 becomes current;
* Negotiation Room receives updated reference range;
* audit record is created.

---

# 63. Approval authority

Approval may depend on:

* Monetary movement;
* percentage movement;
* scenario type;
* transaction phase;
* method;
* manual override;
* unresolved flags;
* institution policy.

## Example

> A valuation change above R$ 10 mi requires Deal Lead approval.

An analyst may:

* Prepare;
* run;
* compare;
* comment.

But may not approve.

---

# 64. Unresolved flags

A scenario with unresolved calculation flags may be:

* Blocked from approval;
* approvable with documented exception;
* routed to specialist review.

## Example

> **Approval exception required**

Terminal value contributes 79% of DCF enterprise value.

Required:

* Reviewer rationale;
* Deal Lead approval;
* sensitivity attachment.

---

# 65. Version history

## Recommended version list

| Version | Scenario      |      EV range | Status     | Change | Owner        |
| ------- | ------------- | ------------: | ---------- | -----: | ------------ |
| v4      | Risk-adjusted | R$ 438–478 mi | In review  |  −8,4% | Ana Costa    |
| v3      | Base          | R$ 480–520 mi | Approved   |      — | Marina Alves |
| v2      | Initial base  | R$ 470–510 mi | Superseded |  +2,0% | Felipe Rocha |
| v1      | Preliminary   | R$ 450–500 mi | Superseded |      — | Felipe Rocha |

## Version detail

Should expose:

* Input snapshot;
* changed assumptions;
* method changes;
* output movement;
* approval comments;
* source state;
* engine version.

---

# 66. Approval history

Example:

> **10:18 · Marina Alves**
> Approved base scenario v3.

> **09:58 · Ana Costa**
> Completed VP review.

> **09:44 · Deterministic Valuation Engine**
> Calculated scenario v3 with no blocking flags.

> **09:32 · Felipe Rocha**
> Updated adjusted EBITDA to R$ 57,8 mi.

The interface should distinguish:

* Human;
* deterministic engine;
* agent;
* document source.

---

# 67. Comments and collaboration

Recommended:

* Comment on assumption;
* comment on adjustment;
* comment on method;
* comment on scenario;
* mention team member;
* request specialist review;
* resolve thread.

Comments should remain secondary to structured decisions.

Avoid conducting the entire valuation process through a chat transcript.

---

# 68. Valuation deliverables

Appropriate outputs:

* Valuation summary;
* valuation report;
* committee memorandum;
* DCF appendix;
* comparable-company table;
* precedent-transaction table;
* EBITDA normalization bridge;
* EV-to-equity bridge;
* sensitivity appendix;
* scenario comparison;
* audit package.

Each should show:

* Scenario version;
* approval state;
* evidence current through;
* generated time;
* included methods;
* confidentiality.

---

# 69. Export behavior

Users may export:

* Approved scenario;
* draft scenario;
* assumptions;
* calculations;
* sensitivities;
* source references;
* Excel-compatible model tables;
* PDF report.

## Export warning

Draft exports should be clearly marked:

> **Draft · Not approved for external use**

Approved exports should identify:

* Approved by;
* approved at;
* valuation version;
* engine version;
* source date.

---

# 70. Contextual Copilot

Suggested prompts:

* Explain the difference between scenarios v3 and v4.
* Which assumptions drive the valuation most?
* Show every finding affecting the downside case.
* Why did WACC increase?
* Which inputs remain unapproved?
* Compare DCF with trading comparables.
* Show the evidence behind adjusted EBITDA.
* Identify potential double counting.
* Prepare a valuation-committee summary.
* Which outputs became stale after the latest documents?

## Response requirements

The Copilot should:

* Use explicit scenario and version context;
* cite assumptions and evidence;
* distinguish approved from proposed;
* show deterministic calculation results;
* identify flags;
* avoid announcing a preferred value without rationale;
* respect restricted valuation access.

---

# 71. Recommended desktop layout

For a **1440 × 900** canvas:

| Region                    | Approximate allocation |
| ------------------------- | ---------------------: |
| Compact global sidebar    |               72–80 px |
| Valuation navigator       |             200–240 px |
| Main analysis workspace   |             650–780 px |
| Assumption/evidence panel |             340–420 px |
| Page padding              |               24–32 px |

## Recommended composition

```text
┌────────┬─────────────────────────────────────────────────────────────┐
│ Global │ Valuation Lab · Approved v3 · Proposed v4                  │
│ shell  ├─────────────────────────────────────────────────────────────┤
│        │ Summary Assumptions Adjustments Methods Scenarios ...      │
│        ├───────────────┬────────────────────────────┬────────────────┤
│        │ Scenario nav  │ Valuation workspace        │ Evidence       │
│        │               │                            │                │
│        │ Approved v3   │ Approved R$ 480–520 mi    │ Selected input │
│        │ Proposed v4   │ Proposed R$ 438–478 mi    │                │
│        │ Downside      │ −R$ 42 mi · −8,4%         │ Revenue file   │
│        │ Upside        │                            │ Dossier fact   │
│        │               │ Method reconciliation      │ DD finding     │
│        │               │ DCF · Comps · Precedents  │                │
│        │               │                            │ Downstream use │
│        │               │ [ Review scenario ]        │                │
└────────┴───────────────┴────────────────────────────┴────────────────┘
```

---

# 72. Summary-view composition

```text
┌──────────────────────────────────────┬──────────────────────────────┐
│ Current valuation                    │ Review state                 │
│                                      │                              │
│ Approved v3                          │ Scenario v4                  │
│ R$ 480 mi–R$ 520 mi                 │ Human approval required      │
│                                      │ 2 assumptions pending       │
│ Proposed v4                          │ 1 finding treatment pending  │
│ R$ 438 mi–R$ 478 mi                 │                              │
│ −R$ 42 mi · −8,4%                   │ [ Open review ]              │
├──────────────────────────────────────┼──────────────────────────────┤
│ Method reconciliation                │ Largest drivers              │
│ DCF                  45%              │ WACC                         │
│ Trading comps        25%              │ Customer retention           │
│ Precedents           10%              │ Selected multiple            │
│ EBITDA multiple      20%              │ Adjusted EBITDA              │
├──────────────────────────────────────┴──────────────────────────────┤
│ Approved → proposed movement bridge                                │
├──────────────────────────────────────┬──────────────────────────────┤
│ Assumptions requiring review          │ Findings affecting value     │
└──────────────────────────────────────┴──────────────────────────────┘
```

---

# 73. UI design direction

## Overall character

Aim for:

> **An institutional valuation workbook with explicit evidence, method and approval states**

The screen should feel:

* Financial;
* controlled;
* precise;
* reproducible;
* analytical;
* restrained;
* professionally dense.

It should not feel:

* Like a consumer calculator;
* like a trading terminal;
* like a generic BI dashboard;
* like an AI price-prediction product;
* like a wall of charts.

---

# 74. Visual hierarchy

Prioritize:

1. Approved valuation;
2. proposed movement;
3. review state;
4. key assumptions;
5. methods;
6. diligence adjustments;
7. evidence;
8. technical calculation details.

Do not make the engine name or run identifier visually dominant.

---

# 75. Charts

Appropriate:

* Football-field valuation range;
* valuation movement bridge;
* scenario comparison;
* sensitivity heatmap;
* revenue and EBITDA forecast;
* method contribution;
* EV-to-equity bridge.

Use charts only where they improve comparison.

## Avoid

* Gauge charts;
* decorative doughnuts;
* “valuation confidence” meters;
* unexplained risk scores;
* animated price predictions;
* market-terminal candlesticks.

Every chart should have an accessible tabular equivalent.

---

# 76. Football-field chart

A football-field chart may show:

* DCF range;
* trading-comparable range;
* precedent range;
* selected multiple range;
* approved range;
* proposed range.

## UX rules

* Preserve common axis;
* label every range;
* identify approved and proposed;
* provide exact values;
* avoid decorative gradients;
* support hiding inapplicable methods.

The selected conclusion should not appear as if statistically certain simply because the ranges overlap.

---

# 77. Color application

Use the M&Ai palette:

* Canvas Cream: `#F3F0EE`;
* Lifted Cream: `#FCFBFA`;
* Ink Black: `#141413`;
* Signal Orange: `#CF4500`;
* Light Signal Orange: `#F37338`;
* Dust Taupe: `#D1CDC7`;
* Slate Gray: `#696969`.

## Semantic application

* Approved: green;
* proposed: Signal Orange;
* draft: blue or neutral outline;
* stale: gray;
* rejected: red;
* calculation flag: red-orange;
* default assumption: muted amber;
* selected scenario: restrained Ink Black or orange marker.

Do not use green merely because a valuation increased or red because it decreased.

Value movement is not inherently good or bad.

---

# 78. Typography

Use **Sofia Sans**.

| Element         |     Size |  Weight |
| --------------- | -------: | ------: |
| Page title      | 26–30 px | 500–600 |
| Approved range  | 28–36 px | 500–600 |
| Proposed range  | 24–32 px | 500–600 |
| Movement        | 18–24 px |     600 |
| Section title   | 15–17 px | 650–700 |
| Financial input | 14–16 px | 550–650 |
| Table header    | 11–12 px | 650–700 |
| Body            | 13–15 px | 450–500 |
| Metadata        | 12–13 px | 450–550 |
| Status          | 11–12 px | 650–700 |

Use tabular figures for all financial values.

---

# 79. Geometry and density

Recommended:

* Main analytical surfaces: 6–10 px radius;
* table rows: 40–52 px;
* assumption rows: 44–56 px;
* status badges: compact pills;
* scenario cards: 8–12 px radius;
* evidence drawer: flush to viewport;
* chart surfaces: minimal framing.

Avoid:

* One card per financial metric;
* excessive empty space;
* giant rounded scenario panels;
* heavy shadows;
* large gradients.

---

# 80. UX design principles

## 80.1 Approved before latest

Use the latest approved scenario as the default transaction reference.

## 80.2 Assumptions remain explicit

No material input should disappear inside a black-box engine.

## 80.3 Facts differ from assumptions

Imported EBITDA and assumed growth must not look equivalent.

## 80.4 Deterministic does not mean objective

Calculations may be deterministic while their assumptions remain professional judgments.

## 80.5 Preserve source lineage

Every evidence-derived input should resolve to its source.

## 80.6 Preserve versions

Approved scenarios are immutable historical records.

## 80.7 Explain movement

Every material difference between scenarios should reconcile.

## 80.8 Flag double counting

Diligence risk should not be reflected several times unintentionally.

## 80.9 Separate EV and equity value

Do not mix valuation bases.

## 80.10 Materiality before detail

The default screen should surface the assumptions and findings that change the conclusion most.

## 80.11 Human approval remains mandatory

M&Ai calculates and explains. Authorized bankers approve.

## 80.12 Avoid false precision

Support ranges, sensitivities and incomplete evidence.

---

# 81. System states

## 81.1 Valuation not started

> **Build the first valuation scenario**

Required setup:

* Financial profile;
* adjusted EBITDA;
* net debt;
* forecast;
* selected methods.

Primary action:

> Create base scenario

## 81.2 Financial inputs incomplete

> **Valuation inputs incomplete**

Show exact missing items.

Do not calculate a misleading value from partial inputs without explicit treatment.

## 81.3 Calculation running

Keep prior approved valuation visible.

Show progress on the draft scenario only.

## 81.4 Calculation completed with flags

> **Valuation calculated with 2 review flags**

Do not present it as ready for approval.

## 81.5 Calculation failed

Preserve inputs and prior successful runs.

Show:

* Affected method;
* user consequence;
* retry;
* diagnostic reference.

## 81.6 Stale scenario

> **Approved scenario v3 is stale**

Reason:

> Adjusted EBITDA changed after the scenario was approved.

The historical approval remains valid for its original source snapshot.

## 81.7 No applicable comparables

> No reviewed comparable set is available.

The method may be excluded rather than populated with weak data.

## 81.8 Non-positive EBITDA

Disable the EBITDA-multiple result or mark it not meaningful.

## 81.9 WACC and growth invalid

Block approval when terminal growth equals or exceeds WACC.

## 81.10 Reconciliation fallback

Explain why fallback occurred.

## 81.11 Restricted valuation

> **Valuation restricted**

Do not reveal values through charts, ranges, sorting or Copilot.

## 81.12 Archived deal

Read-only access to:

* Approved scenarios;
* assumptions;
* calculations;
* reports;
* approval history.

## 81.13 Offline

Allow review of safely cached approved outputs.

Disable:

* Run;
* approve;
* edit;
* export requiring server generation.

---

# 82. Responsive behavior

## Desktop — 1280 px and above

* Compact global sidebar;
* persistent scenario navigation;
* analytical workspace;
* persistent assumption/evidence inspector;
* side-by-side scenarios.

## Tablet — 768–1279 px

* Scenario navigation collapses;
* evidence opens in drawer;
* method cards stack;
* tables retain horizontal scrolling;
* football field remains visible.

## Mobile — below 768 px

Recommended order:

1. Approved valuation;
2. proposed valuation;
3. movement;
4. review state;
5. primary assumptions;
6. findings affecting value;
7. scenario comparison;
8. method summary;
9. approval action.

Mobile should support:

* Review;
* comment;
* approval;
* scenario summary.

Complex model editing remains desktop-first.

---

# 83. Accessibility requirements

The Valuation Lab should support:

* Accessible tables;
* text alternatives for charts;
* keyboard navigation;
* visible focus;
* explicit currency and value basis;
* no color-only approval states;
* screen-reader announcement of scenario changes;
* descriptive assumption labels;
* accessible sensitivity tables;
* minimum 44 × 44 px controls;
* correct reading of negative amounts;
* correct distinction between percentage and percentage points;
* announced calculation flags;
* accessible chart range labels;
* clear identification of approved and proposed;
* keyboard-operable formula disclosure;
* reduced-motion preference.

Avoid links labeled:

> Inspect

Prefer:

> Inspect WACC calculation for scenario v4

---

# 84. Figma component architecture

## `ValuationHeader`

Properties:

* Not started;
* draft;
* in review;
* approved;
* stale;
* restricted.

## `ValuationSummary`

Properties:

* Approved;
* proposed;
* movement;
* range;
* point value;
* EV;
* equity value.

## `ScenarioNavigator`

Properties:

* Base;
* downside;
* upside;
* risk-adjusted;
* approved;
* draft;
* stale;
* superseded.

## `AssumptionRegister`

States:

* Populated;
* filtered;
* missing;
* stale;
* loading;
* restricted.

## `AssumptionRow`

Properties:

* Fact;
* derived;
* proposed;
* reviewed;
* approved;
* default;
* disputed;
* stale;
* restricted.

## `FinancialAdjustmentBridge`

Variants:

* EBITDA;
* net debt;
* working capital;
* contingencies;
* tax;
* transaction perimeter.

## `ValuationMethodCard`

Properties:

* DCF;
* trading comparables;
* precedents;
* EBITDA multiple;
* book value;
* market capitalization;
* ready;
* flagged;
* excluded;
* not applicable.

## `MethodBreakdownTable`

Properties:

* Weighted;
* unweighted;
* approved;
* proposed;
* fallback.

## `FootballFieldChart`

Properties:

* Approved range;
* proposed range;
* method ranges;
* selected method;
* restricted.

## `ScenarioComparison`

Properties:

* Two scenarios;
* three scenarios;
* changed drivers only;
* all assumptions;
* movement.

## `ValuationMovementBridge`

Properties:

* Positive;
* negative;
* reconciled;
* unexplained residual;
* restricted.

## `SensitivityTable`

Properties:

* DCF;
* multiple;
* EV-to-equity;
* selected cell;
* invalid combination.

## `FindingImpactCard`

Properties:

* Proposed;
* approved finding;
* treatment pending;
* double-count warning;
* excluded.

## `CalculationTrace`

Properties:

* Summary;
* inputs;
* formula;
* result;
* flags;
* engine version.

## `ScenarioApprovalPanel`

States:

* Submit;
* review;
* changes requested;
* approve;
* reject;
* insufficient authority;
* approved.

## `ValuationVersionHistory`

States:

* Current;
* draft;
* stale;
* superseded;
* rejected;
* archived.

---

# 85. Production object model

## `ValuationScenario`

```text
id
dealId
name
description
scenarioType
version
baseScenarioId
status
currency
valueBasis
effectiveAt
createdBy
submittedBy
approvedBy
approvedAt
engineVersion
sourceSnapshotId
createdAt
updatedAt
```

## `ValuationAssumption`

```text
id
scenarioId
category
name
value
valueType
unit
currency
periodStart
periodEnd
state
sourceType
sourceFactId
sourceDocumentIds
rationale
materiality
ownerId
reviewedBy
approvedBy
approvedAt
createdAt
updatedAt
```

## `ValuationMethodConfiguration`

```text
id
scenarioId
methodType
enabled
status
weightMinimum
weightMaximum
priorWeight
selectedWeight
configuration
exclusionReason
approvedBy
updatedAt
```

## `ValuationMethodResult`

```text
id
scenarioId
methodType
valueLow
valueMidpoint
valueHigh
currency
flags
calculationRunId
contribution
status
createdAt
```

## `ValuationAdjustment`

```text
id
scenarioId
adjustmentType
title
amount
rate
direction
sourceFindingId
sourceFactIds
rationale
state
possibleDoubleCountIds
reviewedBy
approvedBy
createdAt
updatedAt
```

## `ValuationReconciliation`

```text
id
scenarioId
baseValue
methodWeights
methodContributions
adjustments
finalValueLow
finalValueMidpoint
finalValueHigh
optimizationStatus
optimizationMessage
createdAt
```

## `ValuationCalculationRun`

```text
id
scenarioId
status
engineVersion
inputSnapshot
outputSnapshot
flags
reproducibilityId
startedAt
completedAt
initiatedBy
error
createdAt
```

## `ValuationApproval`

```text
id
scenarioId
approvalType
requiredAuthority
assignedTo
status
comments
submittedAt
reviewedAt
decidedBy
decidedAt
createdAt
```

## `ValuationDependency`

```text
id
scenarioId
dependencyType
dependencyId
dependencyVersion
state
lastValidatedAt
markedStaleAt
```

---

# 86. Suggested routes

Primary:

```text
/deals/:dealId/valuation
```

Scenario:

```text
/deals/:dealId/valuation?scenario=:scenarioId
```

Assumptions:

```text
/deals/:dealId/valuation?view=assumptions
```

Adjustments:

```text
/deals/:dealId/valuation?view=adjustments
```

Methods:

```text
/deals/:dealId/valuation?view=methods&method=dcf
```

Scenario comparison:

```text
/deals/:dealId/valuation?view=scenarios&compare=v3,v4
```

Sensitivity:

```text
/deals/:dealId/valuation?view=sensitivity&type=wacc-growth
```

Versions:

```text
/deals/:dealId/valuation?view=versions
```

Approval deep link:

```text
/deals/:dealId/valuation?scenario=:scenarioId&panel=approval
```

Finding impact:

```text
/deals/:dealId/valuation?scenario=:scenarioId&finding=:findingId
```

---

# 87. Repository direction

The current repository provides a useful deterministic foundation.

It already includes:

* DCF;
* terminal-value calculation;
* EBITDA-multiple valuation;
* enterprise-value calculation;
* book value;
* market capitalization;
* deterministic calculation flags;
* constrained method-weight reconciliation;
* profile-dependent valuation weights;
* DLOM;
* JCP tax-shield treatment;
* probability-weighted contingencies;
* engine-version reporting.

However, the current engine contracts and API representation remain too generic for the final banker-facing product.

## Keep

* Pure deterministic calculations;
* calculation flags;
* engine versioning;
* constrained reconciliation;
* Brazil-specific adjustments;
* test coverage;
* explicit failure states.

## Add

* Valuation-scenario domain;
* assumption register;
* source provenance;
* scenario lifecycle;
* method applicability;
* trading-comparable dataset;
* precedent-transaction dataset;
* normalized EBITDA bridge;
* EV-to-equity bridge;
* working-capital module;
* finding-to-assumption mapping;
* double-count detection;
* movement bridge;
* sensitivity outputs;
* approval workflow;
* stale dependency tracking;
* reproducibility snapshot;
* controlled Excel interoperability.

## Reframe

The existing low-level methods should not map one-to-one to top-level UI tabs.

For example:

* Terminal value belongs inside DCF;
* enterprise value is an output basis and bridge;
* market capitalization is relevant only for public-company contexts;
* book value should be secondary for most private growth transactions.

## Avoid

* Rendering the generic `Record<string, unknown>` engine result directly;
* exposing raw engine names;
* exposing method functions as product architecture;
* treating optimization weights as unquestionable;
* showing calculation completion as approval;
* allowing stale inputs to update approved valuation silently.

---

# 88. What not to include

Avoid the following in Valuation Lab:

* One AI-generated target price;
* generic confidence score;
* decorative valuation gauge;
* hidden assumptions;
* one combined enterprise/equity value;
* terminal value as an independent hero method;
* every internal engine function as a tab;
* automatically selected comparable companies;
* unexplained method weights;
* unexplained company-specific premium;
* unsupported market data;
* silent manual overrides;
* hidden fallback reconciliation;
* one-click approval from summary;
* edited approved scenarios;
* double-counted diligence risks;
* latest run treated as current approved valuation;
* uncited financial inputs;
* proposed adjustments shown as accepted;
* raw optimization logs;
* ONNX or model-health badges;
* permanent AI chat;
* real customer or data-provider names in mocked fixtures;
* performance claims that have not been benchmarked.

---

# 89. MOCKED — Pitch and demo specification

## 89.1 Purpose of the mocked Valuation Lab

The mocked screen should demonstrate that M&Ai produces a traceable valuation conclusion rather than an AI estimate.

Its pitch narrative is:

> **M&Ai links approved financial evidence, deterministic methods, diligence adjustments and human approval in one valuation workflow.**

This is one of the strongest supporting pitch screens.

It should be used for:

* Product-depth slide;
* live demo;
* diligence-to-valuation transition;
* decision-grade engine explanation;
* auditable-valuation claim.

The Diligence Decision Room remains the strongest primary hero because it combines evidence, valuation impact and approval in one frame. The Valuation Lab is the best screen for demonstrating the depth behind that impact. 

---

# 90. Mocked shell state

Institution:

> **Atlas M&A Advisory**

User:

> **Ana Costa · Vice President**

Deal:

> **Project Horizon**
> Atlas Industrial · Sell-side
> Due Diligence · Restricted workspace

Breadcrumb:

> Deals / Project Horizon / Valuation

Deal navigation:

* Overview;
* Dossier;
* Documents;
* Diligence;
* **Valuation**;
* Buyer Universe;
* Negotiation;
* Closing.

---

# 91. Mocked page header

Title:

> **Valuation Lab**

Description:

> Traceable valuation scenarios for Project Horizon.

Status:

* **Approved base scenario v3**
* **Risk-adjusted scenario v4 in review**
* **2 assumptions require review**

Primary action:

> **Review scenario v4**

Secondary:

> Generate report

---

# 92. Mocked valuation summary

## Approved

> **Base scenario v3**
> Enterprise value
> **R$ 480 mi–R$ 520 mi**
> Midpoint: R$ 500 mi
> Approved by Marina Alves

## Proposed

> **Risk-adjusted scenario v4**
> Enterprise value
> **R$ 438 mi–R$ 478 mi**
> Midpoint: R$ 458 mi
> Human approval required

## Movement

> **−R$ 42 mi midpoint · −8,4%**

---

# 93. Mocked primary drivers

Show:

| Driver                |         v3 |         v4 |     Change |
| --------------------- | ---------: | ---------: | ---------: |
| Revenue growth FY2027 |      14,0% |      12,0% |  −2,0 p.p. |
| WACC                  |     13,25% |      14,0% | +0,75 p.p. |
| EV/EBITDA range       |  8,5x–9,0x |  8,0x–8,5x |      −0,5x |
| Customer downside     |         0% |      −5,0% |        New |
| Adjusted EBITDA       | R$ 56,9 mi | R$ 57,8 mi | +R$ 0,9 mi |

---

# 94. Mocked method reconciliation

| Method                 | Implied midpoint | Weight |
| ---------------------- | ---------------: | -----: |
| DCF                    |        R$ 458 mi |    45% |
| Trading comparables    |        R$ 472 mi |    25% |
| Precedent transactions |        R$ 480 mi |    10% |
| EBITDA multiple        |        R$ 448 mi |    20% |

Supporting:

> Base reconciled midpoint: R$ 461,7 mi
> Final risk-adjusted midpoint: **R$ 458,0 mi**

---

# 95. Mocked EBITDA normalization

> **Reported LTM EBITDA**
> R$ 51,0 mi

Adjustments:

* Owner-related expenses: +R$ 2,1 mi;
* one-time ERP implementation: +R$ 1,8 mi;
* litigation settlement: +R$ 1,2 mi;
* run-rate hiring: −R$ 1,5 mi;
* other approved adjustments: +R$ 3,2 mi.

> **Adjusted EBITDA**
> **R$ 57,8 mi**

Status:

> 5 approved · 1 in review

---

# 96. Mocked EV-to-equity bridge

> Enterprise-value midpoint: R$ 458,0 mi
> Net debt: −R$ 58,6 mi
> Debt-like items: −R$ 8,4 mi
> Cash-like items: +R$ 2,1 mi
>
> **Equity-value midpoint: R$ 393,1 mi**

State:

> Illustrative · Debt-like items awaiting approval

---

# 97. Mocked finding impact

> **Customer concentration**

Evidence:

> Top three customers represent 41,2% of LTM revenue.

Applied treatment:

* Revenue downside: −5,0%;
* WACC: +0,75 p.p.;
* selected multiple: −0,5x.

Impact:

> **−R$ 42 mi midpoint**

Status:

> Finding approved · Valuation treatment awaiting approval

Primary action:

> Open finding

---

# 98. Mocked sensitivity

Use a compact WACC-versus-terminal-growth table.

Selected case:

> **14,0% WACC · 4,5% terminal growth**

Selected value:

> **R$ 466 mi**

Visible range:

> R$ 427 mi–R$ 514 mi

Supporting note:

> WACC is the largest valuation driver.

---

# 99. Mocked approval panel

Title:

> **Human review required**

Summary:

> Scenario v4 decreases enterprise-value midpoint by R$ 42 mi.

Material changes:

* WACC +0,75 p.p.;
* revenue downside −5,0%;
* selected multiple −0,5x.

Assigned to:

> Marina Alves · Deal Lead

Actions:

* **Approve scenario**
* Request changes
* Reject scenario

Secondary:

> Inspect calculation

---

# 100. Recommended static pitch composition

```text
┌──────────────────────────────────────────────────────────────────┐
│ Valuation Lab · Base v3 approved · Scenario v4 in review        │
├─────────────────────────────────┬────────────────────────────────┤
│ Approved                        │ Proposed                       │
│ R$ 480 mi–R$ 520 mi            │ R$ 438 mi–R$ 478 mi           │
│ Base scenario v3                │ Risk-adjusted v4               │
│                                 │ −R$ 42 mi · −8,4%              │
├─────────────────────────────────┼────────────────────────────────┤
│ Method reconciliation           │ Primary adjustment             │
│ DCF                 45%          │ Customer concentration         │
│ Trading comparables 25%          │ 41,2% of revenue               │
│ Precedents          10%          │ Revenue downside −5,0%         │
│ EBITDA multiple     20%          │ WACC +0,75 p.p.                │
├─────────────────────────────────┴────────────────────────────────┤
│ Human review required                            [ Review v4 ]   │
└──────────────────────────────────────────────────────────────────┘
```

This communicates:

* Approved versus proposed;
* deterministic methods;
* risk treatment;
* financial impact;
* human approval.

---

# 101. Pitch-specific simplification

## Keep visible

* Valuation Lab;
* approved range;
* proposed range;
* −R$ 42 mi;
* −8,4%;
* four methods;
* customer concentration;
* WACC;
* review state;
* Review scenario action.

## Hide

* Complete forecast table;
* all assumptions;
* EV-to-equity details;
* full sensitivity table;
* comments;
* technical flags;
* engine version;
* complete approval history;
* source document list;
* formula trace;
* manual overrides.

## Readability requirement

At deck scale, the following must remain readable:

* **R$ 480 mi–R$ 520 mi**
* **R$ 438 mi–R$ 478 mi**
* **−R$ 42 mi**
* **DCF**
* **Trading comparables**
* **Customer concentration**
* **Human review required**

---

# 102. Recommended demo flows

## Flow A — Diligence to valuation

```text
Diligence Decision Room
  ↓
Customer-concentration finding
  ↓
Open valuation impact
  ↓
Valuation Lab · Scenario v4
  ↓
Review changed assumptions
  ↓
Compare v3 and v4
  ↓
Approve or request changes
```

## Flow B — Evidence to EBITDA

```text
Valuation Lab
  ↓
EBITDA normalization
  ↓
Select ERP adjustment
  ↓
Inspect source invoices
  ↓
Review recurrence rationale
  ↓
Approve adjustment
```

## Flow C — Scenario comparison

```text
Approved v3
  ↓
Compare with proposed v4
  ↓
Changed drivers highlighted
  ↓
Movement bridge reconciles −R$ 42 mi
  ↓
Open sensitivity
```

## Flow D — Source change

```text
New management accounts synchronized
  ↓
Adjusted EBITDA changes
  ↓
Scenario v3 marked stale
  ↓
Create scenario v5 from v4
  ↓
Rerun valuation
  ↓
Submit for review
```

## Flow E — Double-count warning

```text
Customer-concentration finding
  ↓
Risk reflected in revenue, WACC and direct deduction
  ↓
Potential double counting detected
  ↓
Reviewer removes direct deduction
  ↓
Scenario recalculated
```

## Flow F — Approval

```text
Scenario v4 in review
  ↓
Review methods and assumptions
  ↓
Inspect unresolved flags
  ↓
Approve scenario
  ↓
Deal Overview updates
  ↓
Negotiation reference range updates
```

---

# 103. UX prototype tasks to validate

Test with bankers using tasks such as:

1. Find the current approved valuation.
2. Identify the proposed valuation.
3. Explain why they differ.
4. Determine which scenario is current.
5. Find the adjusted EBITDA.
6. Inspect the evidence behind one adjustment.
7. Find the approved net-debt value.
8. Distinguish enterprise value from equity value.
9. Identify every unapproved assumption.
10. Compare scenarios v3 and v4.
11. Identify the largest valuation driver.
12. Find the diligence finding affecting valuation.
13. Determine whether a risk is double counted.
14. Review the selected comparable-company set.
15. Explain why one comparable was excluded.
16. Inspect the WACC calculation.
17. Identify a calculation flag.
18. Determine whether the reconciliation used fallback.
19. Submit a scenario for approval.
20. Approve the scenario with sufficient authority.
21. Find the previous approved version.
22. Identify which scenario became stale.
23. Generate an approved valuation report.
24. Return to the same scenario after opening evidence.

## Measures

Record:

* Time to find approved valuation;
* whether approved and proposed are confused;
* whether EV and equity value are confused;
* whether method weighting is understood;
* whether evidence is discoverable;
* whether users notice assumption state;
* whether movement bridge improves explanation;
* whether double counting is understood;
* whether sensitivity feels useful;
* whether the interface feels too much like a black box;
* whether bankers still require Excel;
* which exports they consider necessary.

---

# 104. Design validation criteria

The Valuation Lab is ready for approval when:

1. Approved and proposed valuations are immediately distinguishable.
2. Enterprise value and equity value remain separate.
3. Every material input has a state and provenance.
4. Facts and assumptions are visually distinct.
5. Every method explains its applicability.
6. Inapplicable methods can be excluded with rationale.
7. Terminal value is treated as part of DCF.
8. Comparable selection remains human-controlled.
9. Method weights are visible and constrained.
10. Reconciliation fallback is explicit.
11. Scenario movement reconciles without hidden residuals.
12. Diligence findings map to explicit valuation treatments.
13. Potential double counting is detectable.
14. Approved scenarios cannot be edited directly.
15. Source changes mark affected scenarios stale.
16. Historical approvals remain reproducible.
17. Calculation completion does not imply approval.
18. Manual overrides remain explicit.
19. Flags can block or condition approval.
20. Approval authority is enforced.
21. Native currency is preserved.
22. Range construction is explainable.
23. Sensitivities answer specific decisions.
24. The screen remains useful without Copilot.
25. Restricted valuation data does not leak.
26. Partial calculation failures do not hide approved results.
27. Exports identify scenario and approval state.
28. Mobile supports review and approval.
29. Charts have accessible table equivalents.
30. The mocked screen remains fictional and readable.
31. The pitch screen demonstrates traceability, not merely financial sophistication.
32. The final UI reflects M&A valuation practice rather than internal engine structure.

---

# 105. Final design target

The correct design target is not:

> “An AI-powered valuation calculator.”

It is:

> **A controlled valuation workspace where bankers can trace every conclusion from evidence through assumptions, deterministic methods, scenario adjustments and accountable human approval.**

The defining interaction is:

> **Establish the inputs → inspect the assumptions → run the methods → reconcile the scenarios → explain the movement → approve the valuation**

**Next iteration: Matching & Counterparty Universe.**
