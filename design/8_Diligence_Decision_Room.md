---
canonical_name: "Diligence Decision Room"
definition_id: "BD-08"
definition_status: "Governed for MAI-90"
screen_family: "deal-execution"
owning_task: "MAI-92"
canonical_routes:
  - "/deals/:dealId/diligence"
figma_file_key: "otMJE31OKIxdXogV4RNbGQ"
figma_status: "Existing approved evidence"
figma_area: "MAI Banker Workspace — Design System & Product UI / 07 Decision Room Validation"
figma_nodes:
  - "https://www.figma.com/design/otMJE31OKIxdXogV4RNbGQ?node-id=52-21"
  - "https://www.figma.com/design/otMJE31OKIxdXogV4RNbGQ?node-id=56-39"
  - "https://www.figma.com/design/otMJE31OKIxdXogV4RNbGQ?node-id=57-87"
  - "https://www.figma.com/design/otMJE31OKIxdXogV4RNbGQ?node-id=58-97"
  - "https://www.figma.com/design/otMJE31OKIxdXogV4RNbGQ?node-id=58-139"
  - "https://www.figma.com/design/otMJE31OKIxdXogV4RNbGQ?node-id=59-115"
  - "https://www.figma.com/design/otMJE31OKIxdXogV4RNbGQ?node-id=59-144"
related_definitions:
  - "design/26_Cross_Screen_Interaction_Map.md"
  - "design/27_Shared_State_Model.md"
  - "design/0_Implementaion_Roadmap.md"
last_reviewed_task: "MAI-90"
implementation_capability_boundary: "Product definition only; no frontend, backend, Storybook, token export, or runtime behavior implemented by this file."
mock_demo_data_boundary: "Use fictional/demo transaction data only; do not encode real client, counterparty, credential, or confidential deal data."
---
# Diligence Decision Room

## 1. Screen definition

The **Diligence Decision Room** is the deal-level workspace where M&Ai converts document analysis into a reviewable transaction decision.

It is not primarily:

* A dashboard of general deal metrics;
* A document browser;
* A valuation calculator;
* An AI chat interface;
* A list of agent activity.

It is the point where those systems converge into one auditable workflow:

> **Finding → Evidence → Financial impact → Human decision**

The screen should allow a banker to answer four questions in approximately ten seconds:

1. **What material issue has M&Ai found?**
2. **What transaction evidence supports it?**
3. **How does it affect risk, valuation or execution?**
4. **What decision or review is required next?**

This is the product surface that makes M&Ai’s positioning as an **auditable AI execution layer** concrete. The current product thesis explicitly links document evidence, deterministic engines and human approvals rather than stopping at search or summarization.

---

## 2. Intention of the screen

### Primary intention

The screen should help an M&A professional review material diligence exceptions without manually moving between:

* The VDR;
* Spreadsheets;
* Valuation models;
* Internal messages;
* AI outputs;
* Approval logs.

M&Ai should assemble those inputs around a specific decision while preserving the banker’s authority.

### User outcome

After using the screen, the banker should be able to say:

> “I understand the issue, I can verify the source, I know how the financial conclusion was calculated, and I know whether it has been accepted.”

### Product outcome

The screen should prove that M&Ai offers more than document intelligence. It should visibly connect the three product modules described in the deck:

| Product module                     | What the screen must demonstrate                               |
| ---------------------------------- | -------------------------------------------------------------- |
| **Diligence Copilot**              | Identifies a finding and links it to source evidence           |
| **Deterministic Valuation Engine** | Calculates its traceable financial consequence                 |
| **Deal Workflow Orchestrator**     | Routes the result to the correct person for review or approval |

The original product-screen recommendation was based on capabilities already represented in the banker workspace, agentic workspace, engine contracts and VDR-related backlog.

---

## 3. Primary user and task

### Primary user

The primary user is an **M&A associate, vice president or deal lead** reviewing due-diligence outputs for a specific transaction.

Other users may include:

* Analysts investigating the underlying evidence;
* Managing directors approving material conclusions;
* Financial or legal diligence specialists;
* Client-side participants with restricted visibility.

### Primary job to be done

> When a material exception is detected during diligence, help me understand and verify it, quantify its effect on the transaction, and record the appropriate human decision.

### Secondary jobs

The user should also be able to:

* Assign an issue for additional investigation;
* Compare contradictory sources;
* Request missing information;
* Review previous decisions;
* See which agent or engine produced an output;
* Reopen a previously approved issue when new evidence appears.

---

## 4. Conceptual model

The screen should be designed around an **auditable decision chain**, not around the underlying technical architecture.

### Layer 1 — Observation

What did M&Ai detect?

Examples:

* Customer concentration increased;
* Reported EBITDA includes non-recurring revenue;
* A material contract contains a change-of-control clause;
* A tax credit lacks sufficient supporting documentation.

### Layer 2 — Evidence

What proves or contradicts the observation?

Examples:

* Spreadsheet cells;
* Contract clauses;
* Financial-statement notes;
* VDR documents;
* Structured values extracted from multiple sources.

### Layer 3 — Interpretation

Why does the issue matter to the transaction?

Examples:

* Revenue quality risk;
* Normalized EBITDA adjustment;
* Closing condition;
* Purchase-price adjustment;
* Additional representation or indemnity requirement.

### Layer 4 — Deterministic impact

What calculated consequence follows from the evidence?

Examples:

* Change in normalized EBITDA;
* Revised enterprise-value range;
* Updated WACC or scenario assumptions;
* Contingency deduction;
* Risk-score change.

### Layer 5 — Human decision

What action was taken?

Examples:

* Approved;
* Rejected;
* Sent for analyst review;
* Requested additional evidence;
* Escalated to the deal lead.

This sequence should be visible in the information architecture even when the technical systems operate asynchronously behind it.

---

# 5. Screen architecture

## 5.1 Application shell

The Decision Room belongs inside the workspace for a single deal.

Recommended location:

> **Deals → Project Horizon → Diligence**

A route such as `/deals/[id]/diligence` is more understandable to bankers than presenting the screen as a generic “engines” page.

The global shell should contain:

* Compact M&Ai logo;
* Primary workspace navigation;
* Deal breadcrumb;
* User and role;
* Deal-isolation status;
* Notification access.

The shell should remain visually subordinate. The product slide must focus on the decision, not on navigation.

---

## 5.2 Deal context header

The header establishes what transaction and diligence scope the user is reviewing.

### Required information

* Deal codename;
* Current transaction phase;
* Diligence scope;
* Last VDR synchronization;
* Number of documents reviewed;
* Open findings;
* Findings requiring approval.

Example:

> **Project Horizon**
> Sell-side · Due Diligence
> 127 documents synchronized · 18 open findings · 6 require review

### Recommended actions

* Sync VDR;
* Export review;
* Open deal overview;
* View audit history.

### UX direction

Do not use the header as a large marketing hero. It should be compact and operational, occupying approximately 72–96 pixels of vertical space.

---

## 5.3 Findings navigator

The left panel is the queue of issues requiring attention.

### Purpose

It lets the banker identify the most material unresolved issues and move between them without losing the surrounding deal context.

### Each finding should display

* Severity;
* Category;
* Concise title;
* Material value or metric;
* Review status;
* Evidence completeness;
* Assigned reviewer, where relevant.

Example:

> **High · Financial**
> Customer concentration
> Top three customers: 41,2%
> Awaiting approval

### Categories

* Financial;
* Legal;
* Commercial;
* Tax;
* Operational;
* Compliance.

### Filtering

The production version should support filtering by:

* Severity;
* Category;
* Status;
* Assignee;
* Evidence state;
* Materiality.

### UX direction

This is a **decision queue**, not a notification feed. Findings should be ordered primarily by materiality and required action, not simply by creation time.

The selected item must be unmistakable through background, border and position—not color alone.

---

## 5.4 Selected finding workspace

The central panel is the main analytical surface.

### Purpose

It explains the selected issue in a form that a banker can understand without reading an agent transcript.

### Recommended structure

#### Finding statement

A clear factual conclusion:

> **Customer concentration increased from 31,8% to 41,2% of LTM revenue.**

#### Why it matters

A concise transaction interpretation:

> The concentration exceeds the deal’s 35% review threshold and increases exposure to customer-specific churn and renegotiation risk.

#### Materiality

Show the rule or threshold that caused the issue to be surfaced:

> **Review threshold:** 35% of revenue
> **Observed value:** 41,2%
> **Difference:** +6,2 p.p.

#### Analysis provenance

Indicate how the conclusion was produced:

* Financial Risk Agent;
* Structured extraction;
* Cross-document reconciliation;
* Deterministic valuation run.

This information should be available but visually secondary. Users care first about the conclusion and evidence—not the internal agent name.

#### Review state

Examples:

* New;
* Under review;
* Additional evidence required;
* Approved;
* Rejected;
* Superseded by new evidence.

---

## 5.5 Evidence inspector

The right panel proves that the finding is auditable.

### Purpose

It lets the user verify the finding against the source material without leaving the workspace.

### Required information

* Document name;
* Document type;
* VDR folder or source;
* Page, sheet, clause or cell location;
* Relevant excerpt;
* Extraction timestamp;
* Whether the source is primary or supporting evidence.

Example:

> **Receita_por_Cliente_2025.xlsx**
> Sheet: Receita Mensal
> Cells: B12:M14

The evidence preview should visibly highlight the values used in the finding.

### Multiple-source handling

A finding may rely on more than one source. The panel should distinguish:

* **Primary evidence** — directly supports the conclusion;
* **Supporting evidence** — provides context;
* **Contradictory evidence** — conflicts with another source;
* **Missing evidence** — expected but not available.

### Evidence completeness

Prefer a concrete measure:

> **Evidence coverage: 3 of 3 required sources**

This is more decision-useful than displaying a vague “AI confidence: 94%.”

When probabilistic confidence is shown, it must not be confused with evidence completeness or factual certainty.

---

## 5.6 Deterministic impact panel

This component explains what changes financially or operationally because of the selected finding.

### Purpose

It connects diligence evidence to the transaction model.

### Required information

* Impacted valuation method or scenario;
* Previous value or range;
* Revised value or range;
* Absolute impact;
* Percentage impact;
* Assumptions changed;
* Calculation version;
* Ability to inspect the calculation.

Example:

> **Valuation impact**
> Base enterprise value: R$ 480 mi–R$ 520 mi
> Risk-adjusted value: R$ 438 mi–R$ 478 mi
> Midpoint impact: **−R$ 42 mi · −8,4%**

### Calculation explanation

The user should be able to expand the result and see:

* Revenue adjustment;
* Margin adjustment;
* Discount-rate change;
* Contingency;
* Scenario weights;
* Formula or engine version.

The output should communicate:

> “This conclusion was calculated from explicit assumptions.”

It should not communicate:

> “The AI guessed a new valuation.”

---

## 5.7 Human approval gate

The approval component is the final step in the decision chain.

### Primary actions

* **Approve adjustment**
* **Request analyst review**
* **Reject finding**

### Supporting controls

* Add comment;
* Assign reviewer;
* Set due date;
* Mark as dependent on additional evidence;
* Escalate to deal lead.

### Approval behavior

Material actions should require:

* A clear description of what will change;
* Optional or required review notes;
* User identity;
* Timestamp;
* Resulting model version;
* Reversible history.

Example confirmation:

> Approving this finding will replace valuation scenario v3 with risk-adjusted scenario v4 and record you as the approving reviewer.

The screen should not treat approval as a lightweight “like” or generic checkmark. It is a controlled transaction action.

---

## 5.8 Audit trail

A compact activity strip should record how the conclusion evolved.

Example:

> 09:42 — Financial Risk Agent reconciled revenue by customer
> 09:44 — Valuation Engine generated scenario v4
> 10:03 — Assigned to Ana Costa for review
> Awaiting decision

The audit trail should make three actors visually distinct:

* AI agent;
* Deterministic engine;
* Human user.

This distinction is central to the product’s accountability model.

---

## 5.9 Contextual copilot

Chat should be available, but it should not dominate the screen.

Recommended treatment:

* Collapsible side drawer;
* “Ask about this finding” action;
* Suggested questions tied to the selected evidence;
* Responses with citations;
* No permanent large empty chat panel.

Examples:

* “Explain the valuation assumptions changed by this finding.”
* “Show contradictory revenue figures.”
* “Draft an information request for the seller.”
* “Compare this concentration with the deal threshold.”

The Decision Room should remain useful even when the user never opens chat.

---

# 6. Recommended desktop layout

For a 1440 × 900 design canvas:

| Region                 | Approximate width |
| ---------------------- | ----------------: |
| Global navigation rail |          64–80 px |
| Findings navigator     |        260–300 px |
| Selected finding       |        480–560 px |
| Evidence and impact    |        360–420 px |

Recommended hierarchy:

```text
┌─────────────────────────────────────────────────────────────────┐
│ Deal context · Diligence status · Review summary                │
├──────────────┬──────────────────────────┬───────────────────────┤
│ Findings     │ Selected finding         │ Source evidence       │
│ queue        │                          │                       │
│              │ Observation              │ Document preview      │
│ High         │ Why it matters           │ Sheet / page / cells  │
│ Medium       │ Materiality              │ Evidence coverage     │
│ Reviewed     │ Analysis provenance      │                       │
│              ├──────────────────────────┼───────────────────────┤
│              │ Audit trail              │ Valuation impact      │
│              │                          │ Approval actions      │
└──────────────┴──────────────────────────┴───────────────────────┘
```

The user’s eye should move naturally from left to right:

> **Choose issue → understand issue → verify evidence → review consequence → decide**

---

# 7. UI design direction

## 7.1 Overall visual character

Aim for:

> **Institutional financial software with editorial restraint**

The product should feel:

* Credible;
* Controlled;
* Precise;
* Calm;
* Modern;
* Suitable for confidential financial work.

It should not feel:

* Futuristic for its own sake;
* Like a crypto terminal;
* Like a generic AI assistant;
* Like a consumer analytics app;
* Like a marketing landing page placed inside a dashboard.

---

## 7.2 Brand-system adaptation

The repository defines a warm Mastercard-inspired editorial system:

* Canvas Cream: `#F3F0EE`;
* Lifted Cream: `#FCFBFA`;
* Ink Black: `#141413`;
* Signal Orange: `#CF4500`;
* Light Signal Orange: `#F37338`.

For an operational financial workspace, use this language with more restrained geometry than the marketing deck.

### Recommended application

* Canvas Cream for the application background;
* Lifted Cream or white for working surfaces;
* Ink Black for primary actions and typography;
* Signal Orange for attention, selected states and material exceptions;
* Thin neutral borders for structure;
* Diffused, minimal shadows.

### Radius

Use:

* **6–12 px** for dense functional cards and panels;
* **20 px** for primary buttons;
* **999 px** for statuses, tags and filters.

Do not give every data panel a 40 px or pill-shaped radius. That treatment reduces usable space and makes operational information appear decorative.

---

## 7.3 Severity colors

The brand orange should not be forced to represent every status.

Recommended semantic system:

* Critical: deep red;
* High: red-orange;
* Medium: amber;
* Low: neutral blue or gray;
* Approved: green;
* Information: link blue;
* Incomplete evidence: gray or outlined amber.

Always combine color with text and iconography.

Do not rely on a red, yellow or green dot without a visible label.

---

## 7.4 Typography

The repository contains three different typography signals:

1. The formal design-system specification defines **Sofia Sans** as the open-source substitute for MarkForMC.
2. The current application imports **Plus Jakarta Sans** and **Public Sans**.
3. The bundled Nunito Sans files belong to Storybook’s generated interface rather than the M&Ai product typography.

### Recommendation

Use **Sofia Sans as the canonical product font** for this screen and eventually consolidate the application around it.

Suggested hierarchy:

* Screen title: Sofia Sans 24–28 px, 500;
* Finding title: 22–24 px, 500;
* Panel title: 14–16 px, 700;
* Body: 14–16 px, 450;
* Numeric impact: 24–32 px, 500;
* Eyebrow/status label: 12–14 px, 700, modest tracking;
* Table metadata: 12–14 px, 450.

Avoid using separate fonts for labels and body copy. The product’s hierarchy should come from weight, size and spacing.

---

## 7.5 Information density

The screen should be denser than the marketing deck but less dense than a trading terminal.

A useful rule:

> Each panel should answer one clear question.

* Findings panel: “What requires attention?”
* Main panel: “What is the issue?”
* Evidence panel: “What proves it?”
* Impact panel: “What changes?”
* Approval controls: “What should happen next?”

Avoid putting unrelated charts, pipeline KPIs or agent logs into these regions.

---

# 8. UX design principles

## 8.1 Materiality first

Default ordering should prioritize issues that can affect:

* Valuation;
* Deal structure;
* Closing conditions;
* Representations and warranties;
* Indemnities;
* Go/no-go decisions.

Do not prioritize findings based only on when the AI generated them.

---

## 8.2 Evidence before action

Users should be able to inspect source evidence before approving a material output.

The approval control should remain close to the evidence and impact, but it should not visually appear before them.

---

## 8.3 Separate facts, interpretation and calculation

The UI should visibly distinguish:

* **Extracted fact:** Top three customers represent 41,2% of revenue.
* **Interpretation:** This creates elevated concentration risk.
* **Calculation:** The downside scenario reduces the valuation midpoint by 8,4%.
* **Decision:** Ana Costa approved the adjustment.

Combining all four into one paragraph would make the system harder to audit.

---

## 8.4 Preserve professional judgment

Use language such as:

* Recommended adjustment;
* Requires review;
* Proposed scenario;
* Evidence supports;
* Analyst confirmation required.

Avoid language such as:

* AI decision;
* Final answer;
* Guaranteed risk;
* Automatically approved;
* Zero uncertainty.

---

## 8.5 Make uncertainty explicit

The screen should clearly expose:

* Missing documents;
* Contradictory values;
* Partial evidence;
* Stale VDR synchronization;
* Unresolved assumptions;
* Engine failure;
* Required specialist review.

An honest incomplete state builds more trust than a polished but unsupported conclusion.

---

## 8.6 Progressive disclosure

Show the material conclusion first. Put detailed formulas, extraction logs, tool calls and complete audit history behind expandable controls.

The initial viewport should not resemble an engineering observability console.

---

## 8.7 Reversibility

Approval and rejection should create versions rather than permanently overwriting prior analysis.

The user should be able to understand:

* What changed;
* Who changed it;
* Which evidence was available;
* Which valuation version resulted;
* Whether the decision was later superseded.

---

## 8.8 Accessibility

Maintain:

* Minimum 44 × 44 px interactive targets;
* Visible keyboard focus;
* Text labels for severity;
* High-contrast body text;
* Keyboard navigation through findings;
* Accessible document-preview controls;
* Screen-reader descriptions for calculation changes.

---

# 9. Responsive behavior

The production screen should be desktop-first because evidence comparison and valuation review require horizontal space.

### Desktop

Use the complete three-panel arrangement.

### Tablet

* Findings remain in a narrower left column;
* Evidence becomes a right-side drawer;
* Impact and approval remain visible beneath the finding.

### Mobile

Use a sequential review flow:

1. Finding;
2. Explanation;
3. Evidence;
4. Impact;
5. Decision.

Do not attempt to preserve all three columns on a narrow viewport.

The pitch mock should use the desktop composition exclusively.

---

# 10. What not to include

Avoid the following in the primary Decision Room viewport:

* Large generic chat history;
* Decorative gauges without decision value;
* Multiple unrelated charts;
* Agent avatars for every automated step;
* Terminal logs;
* Technical model names as main headings;
* A generic “AI confidence” score without explanation;
* A full VDR directory tree;
* Pipeline-stage cards;
* Fake customer or VDR-provider logos;
* Claims of live integrations that the prototype does not currently support;
* Unsupported performance claims.

The repository explicitly distinguishes prototype fixtures from verified integrations. The pitch screen should therefore use a fictional deal and generic synchronization language rather than implying that a real provider or customer is already live.

---

# 11. MOCKED — Pitch screen specification

## 11.1 Purpose of the pitch mock

The pitch mock is not intended to demonstrate every function of the future product.

It has one communication objective:

> **Show that M&Ai finds a material issue, proves it from source documents, quantifies its valuation effect and places the final decision under human control.**

The screenshot should communicate that sequence in three to five seconds.

---

## 11.2 Pitch narrative

The selected example should tell one coherent story:

1. M&Ai reconciles customer-revenue data;
2. It detects material customer concentration;
3. It links the conclusion to spreadsheet and contract evidence;
4. The deterministic engine creates a risk-adjusted valuation;
5. A banker is asked to approve or reject the adjustment.

Do not use three unrelated findings to demonstrate three modules. One strong finding can demonstrate the complete system.

---

## 11.3 Mocked deal context

### Header

**Project Horizon**

> Sell-side · Due Diligence

Status strip:

* **127 documents synchronized**
* **18 findings**
* **6 high-risk**
* **Last synchronized 4 min ago**
* **Deal-isolated workspace**

Use a fictional deal codename. Do not add a large “Prototype” banner. A small muted “Sample deal” indicator may be used only when necessary for disclosure.

---

## 11.4 Mocked findings navigator

Show no more than five visible findings.

### Selected

> **High · Financial**
> Customer concentration
> Top three customers: 41,2%
> **Awaiting approval**

### Other visible findings

> **High · Legal**
> Change-of-control clause
> 2 material contracts

> **Medium · Financial**
> EBITDA normalization
> R$ 6,8 mi adjustment

> **High · Legal**
> Labor contingencies
> R$ 11,4 mi exposure

> **Medium · Tax**
> Tax-credit recoverability
> Evidence incomplete

The selected customer-concentration issue should be visually dominant.

---

## 11.5 Mocked selected finding

### Title

> **Customer concentration increased from 31,8% to 41,2% of LTM revenue**

### Explanation

> The top three customers now exceed the transaction’s 35% review threshold. Two of the related contracts permit termination with 90 days’ notice, increasing downside exposure.

### Materiality block

| Metric                |     Value |
| --------------------- | --------: |
| Review threshold      |     35,0% |
| Current concentration |     41,2% |
| Previous period       |     31,8% |
| Difference            | +9,4 p.p. |

### Provenance

> Financial Risk Agent · Revenue reconciliation
> Deterministic Valuation Engine · Scenario v4

Keep these labels small. They provide provenance but should not compete with the conclusion.

---

## 11.6 Mocked evidence inspector

### Primary source

> **Receita_por_Cliente_2025.xlsx**
> Sheet: Receita Mensal
> Cells: B12:M14

Display a small spreadsheet preview with:

* Three highlighted customer rows;
* A highlighted total;
* A visible **41,2%** calculation;
* Neutral surrounding cells to make the source feel credible.

### Supporting source

> **Contrato_Cliente_Atlas.pdf**
> Clause 8.2 · Page 14

Highlighted excerpt:

> Termination permitted with 90 days’ written notice.

### Evidence coverage

> **3 of 3 required sources reviewed**

Use tabs or small source chips to move between the spreadsheet and contract.

---

## 11.7 Mocked deterministic impact

### Card title

**Valuation impact**

### Values

> Base enterprise value
> **R$ 480 mi–R$ 520 mi**

> Risk-adjusted enterprise value
> **R$ 438 mi–R$ 478 mi**

> Midpoint impact
> **−R$ 42 mi · −8,4%**

### Adjustment explanation

> Downside revenue scenario: −5,0%
> Discount-rate adjustment: +0,75 p.p.
> Scenario version: v4

Include an **Inspect calculation** text action, but do not open the formula detail in the pitch screenshot.

---

## 11.8 Mocked approval gate

Status:

> **Human review required**

Primary action:

> **Approve adjustment**

Secondary actions:

> Request analyst review
> Reject finding

Reviewer:

> Assigned to **Ana Costa · Vice President**

The approve action should be the strongest visual control, using Ink Black rather than orange.

---

## 11.9 Mocked audit trail

Display a compact three-step trail:

> **09:42** · Revenue data reconciled from three sources
> **09:44** · Risk-adjusted scenario v4 generated
> **10:03** · Sent to Ana Costa for approval

Use distinct icons for agent, engine and human workflow.

---

# 12. Pitch-specific visual simplification

Because the product screenshot occupies only part of the slide, the pitch version should be intentionally less dense than the full production design.

### Keep visible

* Deal context;
* Five or fewer findings;
* One selected finding;
* One source preview;
* One valuation-impact card;
* One approval state.

### Hide or collapse

* Full application navigation;
* Chat history;
* Complete document tree;
* Calculation formulas;
* Long audit logs;
* Filters;
* Settings;
* Secondary KPIs;
* More than three actions.

### Readability requirement

The following elements must remain readable when the screen is placed inside the laptop frame on the deck:

* “Customer concentration”;
* “41,2%”;
* Source-document name;
* “−8,4%”;
* “Approve adjustment.”

If these are unreadable at slide scale, the screen contains too much information.

---

# 13. Final design target

The correct design target is not “an impressive AI dashboard.”

It is:

> **A controlled decision surface where a banker can move from material exception to verified evidence, calculated impact and accountable approval without leaving the deal workspace.**

The ideal visual impression is:

> “This system has already done the repetitive work, but it has not hidden the evidence or removed the professional from the decision.”

That is the clearest product expression of M&Ai’s differentiation.

---

# 14. Figma component architecture

The approved Figma evidence for this screen lives in the governed file
`otMJE31OKIxdXogV4RNbGQ` on page `07 Decision Room Validation`.

Authoritative existing nodes:

* Desktop Decision Room: `52:21`;
* system states: `56:39`;
* Approval Dialog: `57:87`;
* Tablet Decision Room: `58:97`;
* Tablet evidence Drawer: `58:139`;
* Mobile Decision Room: `59:115`;
* Mobile evidence inspection: `59:144`.

The implementation should reuse the approved MAI-89 component families for
navigation, buttons, status indicators, evidence references, provenance labels,
financial values, tables, dialog and drawer behavior. MAI-90 does not create
new screen frames or alter Figma components.

---

# 15. Production object model

The Diligence Decision Room should consume normalized deal-scoped objects rather
than AI narrative blobs.

## `DiligenceFinding`

```text
id
dealId
findingType
title
severity
materiality
evidenceFactIds
interpretationId
calculationRunId
financialImpactId
decisionId
sourceVersionIds
assignedReviewerId
status
createdAt
updatedAt
```

## `EvidenceFact`

```text
id
dealId
documentId
documentVersionId
sourceLocation
extractedValue
extractionMethod
confidence
verificationState
supersededByFactId
```

## `DiligenceDecision`

```text
id
dealId
findingId
decisionType
decisionAuthorityId
acknowledgementText
approvalState
approvedBy
approvedAt
auditEventId
```

The preserved decision chain remains:

> finding → extracted fact → interpretation → deterministic calculation →
> financial impact → evidence → human decision → audit record

---

# 16. Suggested routes

Primary:

```text
/deals/:dealId/diligence
```

Selected finding:

```text
/deals/:dealId/diligence?findingId=:findingId
```

Evidence inspection:

```text
/deals/:dealId/diligence?findingId=:findingId&evidenceId=:evidenceFactId
```

Approval confirmation:

```text
/deals/:dealId/diligence?findingId=:findingId&dialog=approval
```

The route is deal-scoped. Documents owns source files, Target Dossier owns
canonical facts, Valuation owns standalone valuation scenarios, and Activity &
Audit owns the immutable event record.
