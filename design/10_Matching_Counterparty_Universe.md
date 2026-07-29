---
canonical_name: "Matching & Counterparty Universe"
definition_id: "BD-10"
definition_status: "Governed for MAI-90"
screen_family: "deal-execution"
owning_task: "MAI-92"
canonical_routes:
  - "/deals/:dealId/matching"
figma_file_key: "otMJE31OKIxdXogV4RNbGQ"
figma_status: "Approved for desktop MVP in MAI-92; tablet and mobile deferred"
figma_area: "MAI Banker Workspace — Design System & Product UI / 06 Application Shell"
figma_nodes:
  - "https://www.figma.com/design/otMJE31OKIxdXogV4RNbGQ?node-id=205-4436"
figma_non_authoritative_responsive_drafts:
  - "https://www.figma.com/design/otMJE31OKIxdXogV4RNbGQ?node-id=205-4520"
  - "https://www.figma.com/design/otMJE31OKIxdXogV4RNbGQ?node-id=205-4584"
related_definitions:
  - "design/26_Cross_Screen_Interaction_Map.md"
  - "design/27_Shared_State_Model.md"
  - "design/0_Implementaion_Roadmap.md"
last_reviewed_task: "MAI-90"
implementation_capability_boundary: "Product definition only; no frontend, backend, Storybook, token export, or runtime behavior implemented by this file."
mock_demo_data_boundary: "Use fictional/demo transaction data only; do not encode real client, counterparty, credential, or confidential deal data."
---
# Matching & Counterparty Universe

## 1. Recommended product naming

The route should remain technically stable:

```text
/deals/:dealId/matching
```

The banker-facing label should adapt to the transaction:

| Transaction structure | Navigation label      | Page title                       |
| --------------------- | --------------------- | -------------------------------- |
| Sell-side             | **Buyer Universe**    | **Buyer Universe & Outreach**    |
| Buy-side              | **Target Universe**   | **Target Universe & Screening**  |
| Bilateral merger      | **Counterparties**    | **Counterparty Assessment**      |
| Capital raise         | **Investor Universe** | **Investor Universe & Outreach** |
| Joint venture         | **Partner Universe**  | **Strategic Partner Universe**   |

The underlying product domain can remain **Matching & Counterparty Universe**, but users should encounter transaction-native terminology.

The established information architecture already places Matching inside the deal workspace and requires the label to adapt between Buyer Universe, Target Universe and Counterparties according to transaction side.  

---

# 2. Screen definition

The **Matching & Counterparty Universe** is the deal-level workspace where bankers define transaction criteria, assemble a relevant market universe, evaluate candidates, manage exclusions and approve the parties that may proceed into outreach or further review.

For a sell-side transaction, it answers:

1. Which buyers or investors may be relevant?
2. Why might each party pursue this target?
3. Does each candidate have sufficient strategic and financial capacity?
4. Which candidates present conflicts or confidentiality risk?
5. Which parties should enter the approved shortlist?
6. Who may be contacted, by whom and when?
7. What evidence supports each recommendation?

For a buy-side transaction, it answers:

1. Which targets fit the acquisition thesis?
2. Which targets are financially, strategically and operationally compatible?
3. Which candidates are realistically actionable?
4. Which targets should be investigated further?
5. Which parties are excluded, and why?
6. Which shortlist has been approved for outreach or screening?

Its central operating sequence is:

> **Transaction thesis → Universe construction → Evidence-backed screening → Human judgment → Approved shortlist → Controlled outreach**

The product architecture defines this as a conditional workspace: sell-side mode focuses on buyer rationale, capacity, outreach and shortlist approval; buy-side mode focuses on investment criteria, compatibility, acquisition capacity and target selection. 

---

# 3. Primary intention

## Operational intention

Help deal teams move from an unstructured list of company names to a controlled, reviewable and actionable counterparty universe.

## User intention

A banker should be able to say:

> “I understand why each candidate is relevant, which evidence supports that view, what concerns remain and which counterparties have been approved for the next step.”

## Product intention

The screen should reduce repetitive research and screening work without pretending that strategic fit can be decided autonomously.

M&Ai should:

* Organize the universe;
* structure evaluation criteria;
* reconcile available evidence;
* identify missing information;
* surface conflicts and exclusions;
* propose comparable candidates;
* explain screening results;
* route shortlist decisions for approval.

The banker remains responsible for:

* Strategic judgment;
* relationship context;
* market credibility;
* approach sequencing;
* confidentiality;
* final outreach authorization.

---

# 4. Strategic product role

Matching is not one of the three initial core product modules currently emphasized in the deck.

The existing product proposition focuses on:

* Diligence Copilot;
* Deterministic Valuation Engine;
* Deal Workflow Orchestrator.

Those modules connect source evidence, traceable calculations and human approval. 

Matching should therefore be positioned as:

> **A transaction-lifecycle extension built on M&Ai’s approved target facts, private deal intelligence and workflow controls.**

It should not currently be presented as the product’s primary differentiator unless real market data, candidate-generation quality and banker acceptance have been validated.

The architecture appropriately places this screen in the **POC expansion**, rather than the essential MVP boundary. 

---

# 5. What the screen is not

The workspace should not become:

* A generic company-search database;
* A CRM pipeline;
* An automated buyer list generator;
* A lead-generation product;
* A social network;
* A market-intelligence terminal;
* A list of scraped company names;
* A black-box compatibility score;
* A single ranking from “best” to “worst”;
* An autonomous outreach system;
* A mass-email tool;
* A substitute for banker relationships;
* A generic recommendation feed;
* A complete Negotiation Room;
* A complete Organization Detail page;
* A permanent AI chat interface.

The primary question is not:

> “Which companies did the AI rank highest?”

It is:

> **“Which counterparties are relevant, why are they relevant, what remains uncertain and which parties may the team advance?”**

---

# 6. Relationship to adjacent screens

| Screen                               | Primary responsibility                                             |
| ------------------------------------ | ------------------------------------------------------------------ |
| **Target Dossier**                   | Supplies approved company facts and transaction characteristics    |
| **Organizations**                    | Maintains reusable company and relationship records                |
| **Organization Detail**              | Provides institution-level company and contact history             |
| **Matching & Counterparty Universe** | Evaluates organizations for one specific transaction               |
| **Deal Overview**                    | Summarizes universe state and shortlist decisions                  |
| **Tasks & Approvals**                | Routes shortlist and outreach authorizations                       |
| **Diligence**                        | Evaluates transaction risks after sufficient access exists         |
| **Valuation**                        | Provides internal valuation context for target or buyer assessment |
| **Negotiation Room**                 | Compares proposals and commercial terms after engagement           |
| **Activity & Audit**                 | Records scoring, exclusions, approvals and outreach events         |

## Universe versus Organizations

An organization is reusable institution data.

A counterparty candidate is deal-specific.

Example:

> Northbridge Automation

may exist as one organization but have different candidate records across different transactions:

* Strong strategic buyer in Project Horizon;
* Excluded competitor in Project Meridian;
* Prior client relationship in Project Aurora;
* Restricted party in another sell-side mandate.

The deal-specific candidate record should contain:

* Role;
* fit assessment;
* strategic rationale;
* screening state;
* conflict state;
* outreach state;
* internal notes;
* evidence;
* shortlist decision.

## Universe versus Negotiation

The Universe screen manages:

* Identification;
* screening;
* shortlist;
* outreach;
* preliminary interest.

The Negotiation Room manages:

* Offers;
* valuation;
* consideration;
* terms;
* concessions;
* alternatives;
* approvals.

Once a party submits a material proposal, the commercial comparison should primarily move to Negotiation.

---

# 7. Primary users

## 7.1 Analyst

Needs to:

* Build the initial universe;
* research candidates;
* populate evaluation criteria;
* reconcile company information;
* identify missing data;
* prepare candidate summaries.

## 7.2 Associate

Needs to:

* Review candidates;
* challenge fit assessments;
* maintain shortlist states;
* identify conflicts;
* prepare outreach recommendations;
* coordinate research work.

## 7.3 Vice President

Needs to:

* Evaluate strategic rationale;
* assess execution probability;
* approve candidate progression;
* review outreach sequencing;
* manage confidentiality;
* prepare client shortlist discussion.

## 7.4 Managing Director or Partner

Needs:

* A concise universe;
* relationship context;
* buyer or target rationale;
* likely ability to transact;
* conflict and reputational concerns;
* approved outreach priorities;
* client-decision support.

## 7.5 Client participant

A restricted client user may be allowed to:

* Review shortlisted candidates;
* comment;
* approve or reject a shortlist;
* identify known relationships;
* flag conflicts;
* approve outreach.

They should not automatically see:

* Internal relationship assessments;
* banker-only comments;
* negotiation limits;
* unapproved candidates;
* other clients’ relationship history;
* restricted conflict details.

---

# 8. Primary job to be done

> When a deal requires the team to identify buyers, targets, investors or partners, build a traceable universe that combines transaction criteria, company evidence, relationship knowledge and human approval.

## Secondary jobs

The user should also be able to:

* Define screening criteria;
* import a candidate list;
* add organizations manually;
* identify similar companies;
* group candidates;
* compare candidates;
* review evidence coverage;
* flag conflicts;
* record exclusions;
* prepare a shortlist;
* obtain client approval;
* authorize outreach;
* assign relationship owners;
* track contact state;
* preserve outreach history;
* explain why a party was included or excluded;
* export an approved universe.

---

# 9. Core conceptual layers

The screen should separate six layers.

## Layer 1 — Deal thesis

What type of counterparty is relevant?

## Layer 2 — Universe

Which organizations may satisfy that thesis?

## Layer 3 — Evaluation

How does each candidate perform against explicit criteria?

## Layer 4 — Constraints

Which conflicts, exclusions, access restrictions or practical limitations apply?

## Layer 5 — Human decision

Which candidates are approved for the shortlist or outreach?

## Layer 6 — Engagement

What contact or response state has been recorded?

These layers should not be collapsed into one generic “match score.”

---

# 10. Candidate lifecycle

Each candidate should have a controlled lifecycle.

## Discovered

Potentially relevant but not yet reviewed.

## Researching

Information is being collected.

## Screened

The initial criteria have been assessed.

## Qualified

Meets the minimum approved requirements.

## Shortlist proposed

Recommended for human review.

## Shortlist approved

Authorized as part of the transaction shortlist.

## Outreach approved

Authorized for contact.

## Contacted

Initial outreach occurred.

## Engaged

The party has responded or entered active discussion.

## NDA

Confidentiality agreement is being negotiated or executed.

## VDR access

The party has received controlled diligence access.

## Indication received

Initial expression or indication of interest received.

## Declined

The party declined participation.

## Excluded

Removed for a documented reason.

## Withdrawn

Previously active but no longer participating.

## On hold

Temporarily paused.

## Restricted

Candidate exists, but details are permission-limited.

These states should be versioned and auditable.

---

# 11. Fit is not engagement probability

The screen must distinguish several different concepts.

## Strategic fit

Would the combination make strategic sense?

## Financial capacity

Can the counterparty plausibly finance the transaction?

## Transaction appetite

Is there evidence that the party may pursue this type of transaction?

## Execution feasibility

Can the transaction reasonably progress given geography, regulation, timing and structure?

## Relationship strength

Does the institution or client have a relevant relationship?

## Likelihood to engage

How plausible is a positive response?

## Competitive sensitivity

Could inclusion or outreach create confidentiality or commercial risk?

A company may have:

* Strong strategic fit;
* high financial capacity;
* low likelihood to engage;
* high confidentiality risk.

A single composite score would obscure that distinction.

---

# 12. Recommended workspace structure

The workspace should contain six principal subviews:

1. **Universe**
2. **Criteria**
3. **Shortlist**
4. **Outreach**
5. **Decisions**
6. **Changes & History**

Optional later view:

7. **Market Map**

## Universe

Canonical candidate registry and screening.

## Criteria

Deal thesis, dimensions, weights and exclusions.

## Shortlist

Candidates proposed or approved for progression.

## Outreach

Contact authorization, sequencing and response state.

## Decisions

Formal shortlist, exclusion and outreach approvals.

## Changes & History

Version changes, scoring movements and audit context.

---

# 13. Page header

The header should adapt by transaction type.

## Sell-side

> **Buyer Universe & Outreach**

Description:

> Identify, evaluate and approve potential buyers for Project Horizon.

## Buy-side

> **Target Universe & Screening**

Description:

> Screen acquisition targets against the approved investment thesis.

## Capital raise

> **Investor Universe & Outreach**

Description:

> Evaluate and prioritize relevant institutional and strategic investors.

## Header status

Sell-side example:

* **38 candidates reviewed**
* **12 qualified**
* **8 shortlisted**
* **5 contacted**
* **2 active**

## Primary action

Adapt to state:

* **Add candidates**
* **Review 4 recommendations**
* **Approve shortlist**
* **Authorize outreach**
* **Review responses**

## Secondary actions

* Import universe;
* export shortlist;
* edit criteria;
* more actions.

---

# 14. Universe readiness

## Purpose

Explain whether the universe is sufficiently developed for the next decision.

## Readiness dimensions

1. Screening criteria approved;
2. candidate coverage;
3. evidence coverage;
4. conflict review;
5. financial-capacity review;
6. strategic-rationale review;
7. relationship ownership;
8. client review;
9. outreach authorization.

## Example

> **Universe readiness: Attention required**

Reasons:

* Four qualified buyers lack financial-capacity evidence;
* two candidates require conflict review;
* the client has not approved the proposed shortlist;
* three candidates have no relationship owner.

## UX rule

Do not reduce readiness to an unexplained percentage.

---

# 15. Transaction criteria

The criteria view defines how candidates are assessed.

## Sell-side criteria

Potential dimensions:

* Strategic rationale;
* sector fit;
* product fit;
* customer overlap;
* geographic fit;
* financial capacity;
* acquisition history;
* ownership appetite;
* integration capacity;
* transaction-size fit;
* regulatory feasibility;
* relationship strength;
* execution probability;
* confidentiality risk.

## Buy-side criteria

Potential dimensions:

* Investment thesis;
* sector;
* revenue range;
* EBITDA range;
* growth;
* margin;
* recurring revenue;
* geography;
* ownership;
* technology;
* product adjacency;
* customer exposure;
* integration potential;
* valuation;
* control availability;
* transaction readiness.

## Capital-raise criteria

Potential dimensions:

* Investment mandate;
* ticket size;
* stage;
* geography;
* sector;
* ownership preference;
* governance expectations;
* hold period;
* strategic contribution.

---

# 16. Criteria architecture

Each criterion should contain:

* Name;
* definition;
* evaluation type;
* required or optional;
* weight;
* minimum condition;
* evidence requirement;
* owner;
* approval state;
* version.

## Evaluation types

* Boolean;
* category;
* range;
* ordinal scale;
* calculated value;
* qualitative assessment;
* exclusion rule.

## Example

> **Transaction-size capacity**

Definition:

> Demonstrated ability to execute an acquisition with enterprise value between R$ 400 mi and R$ 550 mi.

Evidence requirement:

* Relevant prior transaction;
* public financial capacity;
* approved banker assessment.

Weight:

> High

State:

> Approved criterion

---

# 17. Hard constraints versus preferences

The system must distinguish:

## Hard constraint

Candidate cannot progress unless the condition is met or waived.

Examples:

* Prohibited jurisdiction;
* insufficient minimum ticket size;
* direct conflict;
* client exclusion;
* regulatory restriction;
* prohibited competitor;
* target outside approved sector.

## Preference

Influences prioritization but does not automatically exclude.

Examples:

* Geographic adjacency;
* portfolio synergy;
* existing relationship;
* similar business model;
* prior acquisition activity.

## UX rule

A low score on a preference should not be treated as a failed hard constraint.

---

# 18. Criterion weighting

Weights should remain understandable.

Recommended levels:

* Critical;
* high;
* medium;
* low;
* informational.

A numeric weight may exist internally, but the UI should emphasize business meaning.

Example:

| Criterion              | Importance |
| ---------------------- | ---------- |
| Strategic rationale    | Critical   |
| Financial capacity     | Critical   |
| Regulatory feasibility | High       |
| Relationship strength  | Medium     |
| Geographic adjacency   | Medium     |
| Brand familiarity      | Low        |

## UX rule

Avoid displaying arbitrary weights such as:

> Strategic fit: 17,3%

unless the methodology requires that precision.

---

# 19. Criteria approval

Material changes to approved criteria may alter:

* Candidate qualification;
* shortlist composition;
* client expectations;
* outreach strategy.

Therefore criteria should have states:

* Draft;
* in review;
* approved;
* superseded;
* restricted.

## Change warning

> **Changing financial-capacity threshold will affect 11 candidate assessments**

Actions:

* Review affected candidates;
* create new criteria version;
* continue;
* cancel.

Approved shortlist decisions should preserve the criteria version under which they were made.

---

# 20. Universe construction

Candidates may enter the universe through:

* Existing organization database;
* banker addition;
* client suggestion;
* external research;
* previous transaction universe;
* industry mapping;
* company-comparison workflow;
* approved M&Ai recommendation;
* uploaded spreadsheet;
* CRM integration, later.

## Source labeling

Each candidate should show its origin:

* Banker added;
* client suggested;
* relationship database;
* prior deal;
* public research;
* M&Ai suggested;
* imported list.

## UX principle

“M&Ai suggested” is not evidence of relevance.

The recommendation must show its rationale and supporting data.

---

# 21. Candidate record

The deal-specific candidate record should contain:

* Organization;
* candidate type;
* deal role;
* screening state;
* fit dimensions;
* strategic rationale;
* financial capacity;
* relationship context;
* conflict state;
* outreach state;
* owner;
* evidence coverage;
* notes;
* approval history.

## Candidate types

Sell-side examples:

* Strategic acquirer;
* private-equity sponsor;
* portfolio company;
* family office;
* infrastructure fund;
* institutional investor;
* management team;
* competitor;
* adjacent-sector buyer.

Buy-side examples:

* Platform target;
* add-on target;
* capability target;
* geographic expansion target;
* distressed opportunity;
* carve-out;
* public-to-private candidate.

---

# 22. Candidate registry

## Recommended default columns

1. Candidate;
2. candidate type;
3. fit assessment;
4. strategic rationale;
5. financial capacity;
6. relationship;
7. conflict;
8. screening state;
9. shortlist;
10. outreach state;
11. owner;
12. actions.

## Optional columns

* Geography;
* sector;
* revenue;
* EBITDA;
* enterprise value;
* acquisition history;
* portfolio overlap;
* evidence coverage;
* last review;
* criteria version;
* source;
* client comment;
* response date;
* NDA state.

---

# 23. Candidate-row anatomy

## Candidate identity

> **Northbridge Automation**

Supporting:

> Strategic buyer · Industrial technology · United States

## Fit assessment

> **Strong fit**

Supporting:

* Strong product adjacency;
* sufficient capacity;
* active acquisition strategy.

## Strategic rationale

> Expands recurring monitoring software and Brazilian industrial-market access.

## Financial capacity

> **Supported**

Evidence:

* Prior acquisitions;
* available liquidity;
* transaction-size history.

## Relationship

> Existing senior relationship
> Owner: Marina Alves

## Conflict

> No identified conflict

## Shortlist

> Proposed

## Outreach

> Not authorized

---

# 24. View modes

The Universe should support three views.

## Table — default

Best for:

* Comparison;
* screening;
* filtering;
* operational work;
* accessibility.

## Candidate cards — secondary

Useful for:

* Executive review;
* client discussion;
* shortlist presentation.

## Market map — later

May visualize:

* Strategic versus financial buyers;
* geography;
* size;
* product adjacency;
* candidate segments.

The market map should not become the only evaluation interface.

---

# 25. Candidate fit model

The recommended model uses explicit dimensions rather than a single opaque score.

Example:

| Dimension              | Assessment | Evidence                |
| ---------------------- | ---------- | ----------------------- |
| Strategic rationale    | Strong     | 4 sources               |
| Product adjacency      | Strong     | Reviewed                |
| Geographic fit         | Strong     | Approved                |
| Financial capacity     | Moderate   | Partial                 |
| Acquisition appetite   | Strong     | 3 relevant transactions |
| Relationship strength  | Moderate   | Institution history     |
| Regulatory feasibility | Strong     | Initial review          |
| Confidentiality risk   | Low        | Approved                |

## Overall assessment

> **Strong fit · Capacity review required**

This is more useful than:

> 87/100 match score

---

# 26. Composite score

A composite score may exist as a secondary sorting mechanism.

Requirements:

* Every dimension visible;
* weighting visible;
* missing evidence penalized or marked;
* hard constraints treated separately;
* methodology versioned;
* score not presented as objective truth.

## Recommended display

> **Fit band: Strong**

Secondary:

> Weighted assessment: 82/100

Supporting:

> Based on criteria version 3 · 88% evidence coverage

## UX rule

The fit band should dominate, not the precise number.

---

# 27. Evidence coverage

Evidence coverage should answer:

> How much of this assessment is supported by reviewed information?

Recommended states:

* Complete;
* sufficient;
* partial;
* weak;
* missing;
* stale;
* restricted.

## Example

> **Evidence coverage: Partial**

Missing:

* Current acquisition budget;
* Latin America integration capability;
* latest leverage position.

Do not use generic “AI confidence.”

---

# 28. Strategic rationale

The rationale should be structured rather than one generated paragraph.

## Recommended sections

* Why this counterparty may care;
* what the target provides;
* likely value-creation thesis;
* relevant precedent;
* potential barriers;
* open questions.

## Example

> **Why Northbridge may pursue Atlas Industrial**

1. Adds recurring industrial-monitoring software;
2. expands presence into Brazil;
3. increases service revenue;
4. creates cross-selling opportunities across the installed base;
5. aligns with three prior automation acquisitions.

Potential barriers:

* Limited current Latin America operations;
* integration capacity unclear;
* potential product overlap.

---

# 29. Rationale states

* M&Ai proposed;
* analyst reviewed;
* banker approved;
* client confirmed;
* disputed;
* stale.

## UX principle

The screen should never present an AI-generated rationale as an established counterparty intention.

Use:

> **Potential strategic rationale**

not:

> Northbridge wants to acquire Atlas Industrial.

---

# 30. Financial capacity

## Sell-side

Potential evidence:

* Market capitalization;
* revenue;
* EBITDA;
* cash;
* leverage;
* fund size;
* dry powder;
* prior transaction size;
* financing access;
* sponsor support.

## Buy-side

For a target, assess:

* Scale compatibility;
* purchase-price range;
* expected valuation;
* financing requirement;
* capital intensity;
* debt capacity.

## Capacity state

* Verified;
* supported;
* estimated;
* uncertain;
* insufficient;
* restricted.

## UX rule

A company’s reported size does not automatically prove acquisition capacity.

Show the basis.

---

# 31. Acquisition or investment history

Relevant fields:

* Prior transaction;
* date;
* target;
* sector;
* geography;
* estimated size;
* rationale;
* source;
* relevance.

## Example

> **Three relevant acquisitions since 2022**

* Industrial software platform;
* predictive-maintenance company;
* Latin American automation distributor.

Relevance:

> Supports acquisition appetite and product adjacency.

The user should be able to exclude irrelevant historical transactions from the assessment.

---

# 32. Portfolio compatibility

For private-equity or strategic portfolio buyers, show:

* Related portfolio companies;
* competitive overlap;
* cross-selling opportunity;
* geographic overlap;
* shared customer segments;
* potential conflicts;
* integration risk.

## Example

> **Portfolio overlap**

Vector Industrial Systems:

* Adjacent product portfolio;
* complementary customer base;
* limited direct overlap;
* potential Brazilian distribution channel.

State:

> Analyst reviewed

---

# 33. Buy-side target profile

In buy-side mode, each target should summarize:

* Company;
* ownership;
* scale;
* growth;
* EBITDA margin;
* recurring revenue;
* geography;
* strategic fit;
* estimated valuation;
* transaction readiness;
* accessibility;
* relationship;
* evidence coverage.

## Example

> **Vértice Controls**

* Revenue: R$ 180 mi–R$ 220 mi;
* EBITDA margin: estimated 16%–19%;
* recurring revenue: approximately 54%;
* founder-owned;
* strong product adjacency;
* no known sale process;
* existing relationship: weak.

State:

> Screening · Evidence partial

---

# 34. Transaction readiness

A strategically attractive target may not be actionable.

Recommended states:

* Active sale process;
* potentially receptive;
* relationship-led opportunity;
* no known process;
* recently financed;
* ownership transition possible;
* unlikely to transact;
* inaccessible;
* restricted.

## UX principle

Do not infer willingness to sell from financial or ownership data alone.

Clearly label:

> Banker hypothesis

or:

> Client-provided intelligence.

---

# 35. Relationship context

The workspace should surface institution-relevant relationship data without becoming a CRM.

Recommended:

* Relationship owner;
* relationship strength;
* last meaningful interaction;
* current client relationship;
* prior deal participation;
* known advisor;
* contact availability;
* restricted relationship note.

## Relationship states

* Strong;
* established;
* limited;
* historical;
* no known relationship;
* restricted;
* conflict.

## UX rule

Do not show raw email activity or surveillance-style engagement metrics.

Only meaningful relationship context should appear.

---

# 36. Conflicts and restrictions

Potential conflict types:

* Current client conflict;
* former-client restriction;
* competing mandate;
* confidentiality restriction;
* legal conflict;
* internal exclusion;
* client exclusion;
* restricted relationship;
* regulatory concern;
* antitrust sensitivity;
* reputational concern.

## Conflict states

* Not reviewed;
* no identified conflict;
* potential conflict;
* review required;
* cleared;
* restricted;
* excluded.

## Example

> **Potential conflict**

Atlas M&A Advisory currently advises a subsidiary of the candidate in an unrelated transaction.

Action:

> Request conflict review

---

# 37. Exclusions

Every exclusion should have:

* Reason;
* category;
* effective date;
* source;
* user;
* criteria version;
* visibility;
* reversible state.

## Exclusion categories

* Client excluded;
* strategic mismatch;
* insufficient capacity;
* regulatory;
* confidentiality;
* conflict;
* reputational;
* direct competitor;
* not actionable;
* duplicate;
* already declined;
* outside mandate;
* other.

## UX rule

Do not simply delete excluded candidates.

Preserve them so the team can understand why they were not advanced.

---

# 38. Do-not-contact state

Certain candidates may remain relevant but cannot be contacted.

Reasons:

* Client restriction;
* timing;
* existing relationship protocol;
* conflict review;
* regulatory limitation;
* confidentiality concern;
* contact only through named senior banker.

Display:

> **Do not contact**

Supporting:

> Outreach requires Marina Alves and client approval.

This state should be visually stronger than a normal outreach status.

---

# 39. Candidate detail workspace

Selecting a candidate should open a right-side panel or dedicated detail view.

## Recommended sections

1. Candidate summary;
2. fit dimensions;
3. strategic rationale;
4. financial capacity;
5. relevant transactions;
6. relationship context;
7. conflicts;
8. outreach;
9. evidence;
10. history.

## Primary actions

Adapt to state:

* Complete screening;
* propose for shortlist;
* approve shortlist;
* authorize outreach;
* record response;
* exclude candidate.

---

# 40. Candidate evidence inspector

The evidence inspector should show:

* Organization record;
* Target Dossier facts;
* public-source references;
* institution relationship record;
* prior-deal history;
* banker-entered assessment;
* client-provided information.

## Evidence classification

* Primary public filing;
* reviewed company disclosure;
* institution record;
* prior transaction;
* management representation;
* banker judgment;
* client intelligence;
* M&Ai inference.

## UX principle

Facts and judgments must remain distinct.

---

# 41. Candidate comparison

Users should be able to compare two to six candidates.

## Recommended comparison dimensions

* Strategic rationale;
* financial capacity;
* acquisition appetite;
* geography;
* relationship;
* conflict;
* execution feasibility;
* confidentiality risk;
* evidence coverage;
* shortlist state.

## Example

| Dimension            | Northbridge | Meridian | Polaris  |
| -------------------- | ----------- | -------- | -------- |
| Strategic fit        | Strong      | Strong   | Moderate |
| Capacity             | Supported   | Verified | Verified |
| Relationship         | Established | Limited  | Strong   |
| Regulatory risk      | Low         | Moderate | Low      |
| Confidentiality risk | Medium      | Low      | High     |
| Evidence coverage    | 88%         | 92%      | 81%      |
| Shortlist            | Proposed    | Approved | Hold     |

## UX rule

Comparison should expose trade-offs rather than force a winner.

---

# 42. Candidate grouping

Recommended groups:

* Strategic buyers;
* financial sponsors;
* portfolio companies;
* family offices;
* domestic candidates;
* international candidates;
* priority targets;
* relationship-led;
* client suggested;
* excluded;
* reserve list.

Groups may be:

* System-defined;
* institution-defined;
* deal-specific.

## UX rule

A candidate may belong to several analytical groups but should have one clear lifecycle state.

---

# 43. Shortlist workspace

## Purpose

Provide a controlled surface for deciding which candidates advance.

## Shortlist states

* Longlist;
* proposed shortlist;
* internal shortlist;
* client shortlist;
* approved outreach list;
* reserve;
* excluded.

## Shortlist candidate anatomy

* Candidate;
* rationale;
* fit;
* capacity;
* conflict;
* relationship;
* evidence coverage;
* reviewer;
* decision.

## Recommended visible distinction

> **Proposed shortlist: 11**
> **Approved shortlist: 8**
> **Outreach authorized: 5**

These are not interchangeable.

---

# 44. Shortlist approval gate

Before approval, show:

* Criteria version;
* candidate count;
* additions;
* removals;
* unresolved conflicts;
* evidence gaps;
* client exclusions;
* outreach consequence;
* approval authority.

## Example

> **Approve Buyer Shortlist v2?**

Changes from v1:

* Northbridge Automation added;
* Serra Capital moved to reserve;
* Vector Systems removed due to confidentiality risk.

Result:

* 8 approved buyers;
* 3 reserve candidates;
* 5 candidates proposed for first-wave outreach.

Consequences:

* Shortlist v1 becomes superseded;
* outreach planning becomes available;
* client review record is created;
* candidate changes are audited.

---

# 45. Shortlist decision actions

* Approve shortlist;
* request changes;
* reject;
* approve with exclusions;
* move candidate to reserve;
* add candidate;
* remove candidate;
* assign further research;
* request conflict review.

## UX rule

Do not allow a bulk “approve all recommendations” action without showing unresolved issues.

---

# 46. Outreach planning

The Outreach view should begin only after appropriate authorization.

## Recommended stages

1. Outreach planning;
2. authorization;
3. initial contact;
4. teaser or summary;
5. NDA;
6. information access;
7. management interaction;
8. indication of interest;
9. active process;
10. declined or withdrawn.

## Outreach sequencing

Support:

* Wave 1;
* Wave 2;
* reserve;
* relationship-led;
* client-led;
* direct;
* advisor-mediated.

## Example

> **Wave 1 · 5 candidates**

* Northbridge Automation;
* Meridian Industrial Group;
* Polaris Technologies;
* Serra Capital Partners;
* Vector Systems.

---

# 47. Outreach authorization

Before contact, show:

* Candidate;
* relationship owner;
* approved channel;
* approved message;
* confidentiality state;
* conflict clearance;
* client approval;
* intended timing;
* materials permitted.

## Example

> **Authorize outreach to Northbridge Automation?**

Owner:

> Marina Alves

Channel:

> Existing senior relationship

Material:

> Approved anonymized teaser v2

Restrictions:

* Do not identify Atlas Industrial before NDA;
* no financial model;
* no customer-level information.

Actions:

* Authorize outreach;
* request changes;
* hold;
* reject candidate.

---

# 48. Autonomous outreach boundary

M&Ai should not independently contact counterparties.

It may:

* Draft outreach language;
* prepare candidate briefs;
* recommend sequencing;
* identify missing approvals;
* create tasks;
* record approved contact state.

It should not:

* Send messages without explicit user authorization;
* reveal target identity;
* invite VDR access;
* disclose valuation;
* contact restricted parties;
* bypass relationship owners.

## Product language

Use:

> **Draft outreach**

not:

> AI outreach agent launched.

---

# 49. Outreach communication

Recommended content:

* Subject;
* approved message;
* recipient;
* sender;
* relationship owner;
* teaser version;
* confidentiality level;
* send state.

States:

* Draft;
* internal review;
* client approved;
* authorized;
* sent;
* delivered;
* response received;
* no response;
* withdrawn.

The actual sending capability may initially remain outside M&Ai, with the user recording the interaction.

---

# 50. Response tracking

Response states:

* No response;
* interested;
* requires more information;
* NDA requested;
* not interested;
* timing issue;
* mandate conflict;
* declined;
* referred to another team;
* active.

## Response detail

Record:

* Date;
* contact;
* summary;
* next action;
* owner;
* source;
* supporting communication;
* confidentiality state.

## UX principle

Avoid generic CRM metrics such as:

> Email-open rate

unless the system genuinely supports and needs them.

---

# 51. NDA and access state

Recommended states:

* Not required;
* not started;
* draft;
* sent;
* redlines;
* signed;
* rejected;
* expired.

VDR access states:

* Not invited;
* pending approval;
* invited;
* access active;
* access suspended;
* access revoked.

## Boundary

Detailed document permission belongs in Documents & Evidence.

The Universe should show only the current engagement state and route to the controlled access workflow.

---

# 52. Preliminary indications

Once a candidate submits a meaningful valuation or structural indication, show:

* Date;
* value;
* basis;
* currency;
* consideration structure;
* conditions;
* confidence;
* next step.

However, full proposal comparison should route to Negotiation.

Example:

> **Indicative interest received**

Enterprise-value indication:

> R$ 455 mi–R$ 475 mi

State:

> Preliminary · Non-binding

Action:

> Open in Negotiation Room

---

# 53. Deal-specific confidentiality

Buyer and target universes can be highly sensitive.

Potentially restricted information:

* Candidate identity;
* shortlist;
* client exclusions;
* relationship notes;
* outreach plan;
* responses;
* valuations;
* internal ranking;
* conflict details.

## Access levels

* Full universe;
* approved shortlist only;
* outreach team;
* relationship owner;
* client-review view;
* read-only;
* identity restricted.

## Example

A specialist may see:

> 8 approved buyers

without seeing their identities.

---

# 54. Client-review mode

The client-review view should be deliberately restricted.

Recommended visible content:

* Candidate name;
* candidate type;
* concise strategic rationale;
* fit assessment;
* relevant acquisition history;
* open question;
* client decision.

Hidden by default:

* Internal ranking;
* banker relationship commentary;
* conflicts involving other clients;
* internal likelihood estimate;
* restricted notes;
* unapproved outreach draft.

## Client actions

* Approve;
* reject;
* reserve;
* comment;
* identify relationship;
* add candidate;
* apply do-not-contact restriction.

---

# 55. Evidence freshness

Candidate assessments may become stale.

Examples:

* New acquisition announced;
* financing capacity changed;
* company was acquired;
* management changed;
* fund closed;
* investment mandate changed;
* target entered a sale process;
* relationship status changed.

## Stale state

> **Review required**

Financial-capacity evidence is older than the approved freshness threshold.

## UX principle

Do not present old candidate research as current without its date.

---

# 56. Candidate-change detection

The system should detect meaningful updates where supported.

Change types:

* Organization acquired;
* acquisition announced;
* new financing;
* divestiture;
* leadership change;
* fund close;
* geographic expansion;
* regulatory issue;
* relationship update;
* transaction-status change.

## Consequence

A change may:

* alter fit;
* alter capacity;
* create conflict;
* trigger rescreening;
* move candidate to hold;
* require shortlist review.

The system should not silently change an approved shortlist.

---

# 57. Criteria-driven recommendations

M&Ai may propose candidates based on:

* Target Dossier characteristics;
* approved deal criteria;
* organization data;
* related industries;
* prior transactions;
* existing institution relationships;
* comparable-company sets;
* relevant acquisition behavior.

## Recommendation anatomy

* Candidate;
* rationale;
* matched criteria;
* unmet criteria;
* missing evidence;
* source basis;
* review state.

## Example

> **Suggested candidate · Northbridge Automation**

Matched:

* Industrial automation;
* recurring software;
* transaction-size history;
* Latin America expansion objective.

Missing:

* Confirmed current acquisition budget.

Action:

> Review candidate

---

# 58. Recommendation limitations

The UI should disclose when recommendations are limited by:

* Incomplete market coverage;
* stale public information;
* missing financial capacity;
* restricted relationship records;
* incomplete Target Dossier;
* limited geographic data;
* unvalidated external source.

## Example

> **Universe coverage may be incomplete**

The target’s approved industry classification and international revenue data are incomplete.

This should create a dossier task rather than hidden uncertainty.

---

# 59. Explainable ranking

Sorting may use:

* Strategic fit;
* capacity;
* relationship;
* engagement likelihood;
* execution feasibility;
* evidence coverage;
* shortlist state.

“Recommended” sort should explain:

> Prioritizes candidates meeting all hard constraints, then considers approved strategic fit, capacity, relationship and execution feasibility.

Do not sort by an unexplained proprietary score.

---

# 60. Search and filters

## Search

Searchable:

* Candidate;
* parent company;
* portfolio company;
* sector;
* geography;
* rationale;
* relationship owner;
* prior acquisition;
* exclusion reason.

Placeholder:

> Search candidates, sectors or strategic rationale

## Primary filters

* Candidate type;
* fit band;
* qualification state;
* shortlist state;
* outreach state;
* conflict;
* relationship.

## Advanced filters

* Geography;
* sector;
* revenue;
* EBITDA;
* transaction capacity;
* acquisition activity;
* ownership;
* portfolio overlap;
* evidence coverage;
* source;
* reviewer;
* client decision;
* freshness;
* regulatory risk;
* confidentiality.

---

# 61. Saved views

Examples:

* Approved shortlist;
* first-wave outreach;
* strategic buyers;
* financial sponsors;
* candidates needing capacity review;
* client exclusions;
* conflict review;
* international buyers;
* no relationship owner;
* active parties;
* declined candidates.

Saved views should preserve:

* Filters;
* sort;
* visible columns;
* grouping;
* candidate display mode.

---

# 62. Bulk actions

Appropriate:

* Assign analyst;
* assign relationship owner;
* request research;
* move to proposed shortlist;
* move to reserve;
* export authorized list;
* apply group;
* request conflict review.

Controlled:

* Approve shortlist;
* authorize outreach;
* exclude;
* disclose target identity;
* grant VDR access.

Inappropriate:

* Mass-contact all selected candidates;
* auto-approve all;
* delete candidate history;
* overwrite conflict decisions.

---

# 63. Candidate export

Appropriate outputs:

* Longlist;
* approved shortlist;
* client-review book;
* candidate profiles;
* market map;
* outreach tracker;
* conflict review list;
* screening audit package.

## Export metadata

* Deal;
* universe version;
* criteria version;
* candidate state;
* generated by;
* generated at;
* confidentiality;
* included fields;
* source freshness.

## Draft marking

> **Draft universe · Not approved for external distribution**

---

# 64. Contextual Copilot

Suggested sell-side prompts:

* Which buyers have the strongest product adjacency?
* Which candidates have sufficient transaction capacity?
* Explain why Northbridge is recommended.
* Which candidates remain unreviewed?
* Show conflicts affecting the shortlist.
* Compare strategic and financial buyers.
* Draft a client shortlist summary.
* Which candidates should remain in reserve?
* Prepare an outreach brief for Northbridge.
* What changed since shortlist v1?

Suggested buy-side prompts:

* Which targets meet every hard constraint?
* Show founder-owned targets in Brazil.
* Which candidates have recurring revenue above 50%?
* Compare Vértice Controls and Nova Automation.
* Which targets lack reliable EBITDA evidence?
* Draft an initial screening memorandum.

## Response requirements

The Copilot should:

* Cite the candidate evidence;
* distinguish fact from inference;
* use the approved criteria version;
* identify missing evidence;
* respect restricted relationships;
* avoid claiming counterparty intent;
* never initiate outreach autonomously.

---

# 65. Recommended desktop layout

For a **1440 × 900** canvas:

| Region                  | Approximate width |
| ----------------------- | ----------------: |
| Compact global sidebar  |          72–80 px |
| Universe filters/groups |        220–260 px |
| Candidate registry      |        480–600 px |
| Candidate detail        |        400–480 px |
| Page padding            |          24–32 px |

## Recommended composition

```text
┌────────┬──────────────────────────────────────────────────────────────┐
│ Global │ Buyer Universe · 38 reviewed · 8 shortlisted · 5 contacted │
│ shell  ├──────────────────────────────────────────────────────────────┤
│        │ Universe Criteria Shortlist Outreach Decisions History      │
│        ├──────────────┬─────────────────────────┬─────────────────────┤
│        │ Groups       │ Candidate registry      │ Selected candidate  │
│        │              │                         │                     │
│        │ Strategic    │ Northbridge Automation  │ Strong fit          │
│        │ Sponsors     │ Strong · Proposed       │                     │
│        │ Domestic     │                         │ Strategic rationale │
│        │ International│ Meridian Industrial     │ Product adjacency   │
│        │ Client added │ Strong · Approved       │ Brazil expansion    │
│        │ Reserve      │                         │                     │
│        │ Excluded     │ Serra Capital Partners  │ Capacity            │
│        │              │ Moderate · Reserve      │ Supported           │
│        │              │                         │                     │
│        │              │                         │ [ Propose shortlist ]│
└────────┴──────────────┴─────────────────────────┴─────────────────────┘
```

---

# 66. Shortlist layout

```text
┌────────────────────────────────────────┬─────────────────────────────┐
│ Proposed shortlist                     │ Decision summary            │
│                                        │                             │
│ Northbridge Automation     Proposed    │ 11 proposed                 │
│ Meridian Industrial        Approved    │ 8 currently approved        │
│ Polaris Technologies       Approved    │ 3 reserve                   │
│ Vector Systems             Hold        │ 2 conflicts unresolved      │
│ Serra Capital Partners     Reserve     │                             │
│                                        │ Client review due tomorrow  │
│                                        │                             │
│                                        │ [ Review shortlist ]        │
└────────────────────────────────────────┴─────────────────────────────┘
```

---

# 67. Outreach layout

```text
┌────────────────────────────────────────┬─────────────────────────────┐
│ Outreach sequence                      │ Candidate engagement        │
│                                        │                             │
│ WAVE 1                                 │ Northbridge Automation      │
│ Northbridge       Outreach authorized  │ Existing senior relation    │
│ Meridian          Contacted            │                             │
│ Polaris           NDA review           │ Approved teaser v2          │
│ Vector            Hold                 │ Do not identify target      │
│ Serra             Not authorized       │ before signed NDA           │
│                                        │                             │
│ WAVE 2                                 │ Owner: Marina Alves         │
│ Three reserve candidates               │                             │
│                                        │ [ Record outreach ]         │
└────────────────────────────────────────┴─────────────────────────────┘
```

---

# 68. UI design direction

## Overall character

Aim for:

> **An institutional market-screening workspace combining structured research, relationship judgment and controlled progression**

The screen should feel:

* Strategic;
* selective;
* evidence-aware;
* confidential;
* precise;
* comparative;
* operational.

It should not feel:

* Like a sales CRM;
* like a prospecting database;
* like an automated lead list;
* like a social network;
* like a generic recommendation app;
* like a decorative market map.

---

# 69. Visual hierarchy

Prioritize:

1. Candidate identity;
2. fit and qualification state;
3. strategic rationale;
4. capacity;
5. constraints;
6. shortlist decision;
7. outreach state;
8. supporting evidence.

Do not prioritize:

* Generic company logos;
* arbitrary match score;
* number of employees;
* number of web sources;
* AI-generated narrative length.

---

# 70. Color application

Use the M&Ai palette:

* Canvas Cream: `#F3F0EE`;
* Lifted Cream: `#FCFBFA`;
* Ink Black: `#141413`;
* Signal Orange: `#CF4500`;
* Light Signal Orange: `#F37338`;
* Dust Taupe: `#D1CDC7`;
* Slate Gray: `#696969`.

## Semantic application

* Qualified: green;
* proposed shortlist: Signal Orange;
* approved shortlist: dark neutral with approved label;
* reserve: gray-blue;
* conflict: red-orange;
* excluded: muted red;
* outreach active: blue;
* engaged: green;
* hold: amber;
* restricted: dark neutral.

Do not use green simply because a candidate ranks highly.

---

# 71. Typography

Use **Sofia Sans**.

| Element                   |     Size |  Weight |
| ------------------------- | -------: | ------: |
| Page title                | 26–30 px | 500–600 |
| Candidate name            | 15–18 px | 650–700 |
| Candidate-detail title    | 20–24 px | 550–650 |
| Fit assessment            | 16–20 px | 600–700 |
| Section title             | 15–17 px | 650–700 |
| Rationale title           | 13–15 px | 600–700 |
| Body                      | 13–15 px | 450–500 |
| Metadata                  | 12–13 px | 450–550 |
| Status                    | 11–12 px | 650–700 |
| Financial capacity values | 14–17 px | 550–650 |

Use tabular numerals for financial values, counts and dates.

---

# 72. Geometry and density

Recommended:

* Candidate registry row: 56–72 px;
* primary surfaces: 6–12 px radius;
* candidate detail sections: separated by dividers;
* badges: compact pills;
* comparison table: dense and aligned;
* client cards: 8–12 px radius.

Avoid:

* One oversized card per candidate;
* large circular scores;
* logo-dominated layouts;
* heavy shadows;
* excessive empty space;
* gradient fit meters.

---

# 73. UX design principles

## 73.1 Criteria before candidates

The team should define what “relevant” means before accepting recommendations.

## 73.2 Constraints before ranking

Hard exclusions must be resolved before fit ordering.

## 73.3 Fit before score

Strategic explanation is more important than a composite number.

## 73.4 Facts before inference

Separate known company facts from banker hypotheses.

## 73.5 Capacity before outreach

A strategically attractive candidate may not be financially actionable.

## 73.6 Relationship ownership remains explicit

The system should not bypass institutional relationship protocols.

## 73.7 Shortlist before outreach

Candidate screening does not authorize contact.

## 73.8 Client approval remains distinct

Internal approval and client approval are separate states.

## 73.9 Do not infer intent

Potential fit does not prove interest.

## 73.10 Preserve exclusions

Removed candidates remain auditable.

## 73.11 Explain changes

Criteria or evidence changes should identify affected candidates.

## 73.12 Preserve confidentiality

Candidate identity and target identity may have different disclosure rules.

---

# 74. System states

## 74.1 No criteria

> **Define the transaction criteria**

Candidate recommendations remain unavailable until minimum screening criteria are approved.

Primary action:

> Configure criteria

## 74.2 No candidates

> **Build the initial universe**

Options:

* Add organizations;
* import list;
* review M&Ai suggestions;
* reuse an approved template.

## 74.3 Universe incomplete

> **Universe coverage may be incomplete**

Reasons:

* Geography not defined;
* transaction-size range missing;
* target sector classification under review.

## 74.4 Research in progress

Show candidate-level state.

Do not block reviewed candidates.

## 74.5 Evidence partial

Explain missing assessment inputs.

## 74.6 Conflict unresolved

Block shortlist or outreach according to policy.

## 74.7 No financial-capacity evidence

Use:

> Capacity not established

not:

> Capacity: 0

## 74.8 Shortlist not approved

> **Proposed shortlist**

Outreach controls remain disabled.

## 74.9 Client review pending

Internal shortlist remains visible, but outreach is blocked where client authorization is required.

## 74.10 Outreach prohibited

Show reason and required authority.

## 74.11 Candidate acquired

> **Candidate no longer actionable**

Retain historical assessment.

## 74.12 Restricted candidate

> **Candidate identity restricted**

Do not leak identity through search, counts, export or Copilot.

## 74.13 Partial service failure

Existing approved candidate data remains accessible.

## 74.14 Archived deal

Read-only universe, shortlist, outreach and decision history.

## 74.15 Offline

Allow review of cached approved data where policy permits.

Disable:

* Candidate creation;
* research updates;
* approvals;
* outreach authorization;
* exports requiring server generation.

---

# 75. Responsive behavior

## Desktop — 1280 px and above

* Compact global sidebar;
* persistent group and filter rail;
* candidate registry;
* candidate detail panel;
* comparison and shortlist controls.

## Tablet — 768–1279 px

* Filter rail collapses;
* detail opens as drawer;
* fewer registry columns;
* cards available;
* comparison horizontally scrolls.

## Mobile — below 768 px

Recommended order:

1. Universe state;
2. shortlist approval;
3. search;
4. candidate cards;
5. selected candidate detail;
6. fit dimensions;
7. conflict;
8. action.

Mobile should support:

* Candidate review;
* comments;
* shortlist decisions;
* outreach authorization.

Dense universe construction and comparison remain desktop-first.

---

# 76. Accessibility requirements

The screen should support:

* Semantic candidate tables;
* accessible fit labels;
* no color-only qualification state;
* keyboard candidate navigation;
* visible focus;
* accessible comparison tables;
* announced filter changes;
* descriptive shortlist actions;
* minimum 44 × 44 px targets;
* screen-reader descriptions of conflict states;
* explicit distinction between fact and inference;
* accessible group navigation;
* announced approval changes;
* accessible market-map data table;
* correct reading of financial ranges;
* clear labels for restricted candidates.

Avoid generic actions such as:

> Review

Prefer:

> Review Northbridge Automation for the Project Horizon shortlist

---

# 77. Figma component architecture

## `CounterpartyUniverseHeader`

Properties:

* Buyer;
* target;
* investor;
* partner;
* criteria missing;
* shortlist review;
* outreach active.

## `UniverseReadiness`

Variants:

* Ready;
* attention;
* incomplete;
* conflict;
* client review pending.

## `UniverseTabs`

* Universe;
* criteria;
* shortlist;
* outreach;
* decisions;
* history.

## `CandidateRegistry`

States:

* Populated;
* filtered;
* empty;
* loading;
* error;
* restricted;
* selection mode.

## `CandidateRow`

Properties:

* Discovered;
* researching;
* qualified;
* proposed;
* approved;
* reserve;
* excluded;
* contacted;
* engaged;
* restricted.

## `CandidateType`

* Strategic;
* sponsor;
* portfolio company;
* family office;
* investor;
* platform target;
* add-on target.

## `FitBand`

* Strong;
* moderate;
* weak;
* insufficient evidence;
* failed constraint.

## `FitDimension`

Properties:

* Strong;
* moderate;
* weak;
* missing;
* stale;
* restricted.

## `CandidateDetailPanel`

States:

* Summary;
* fit;
* capacity;
* relationship;
* conflict;
* outreach;
* evidence;
* history.

## `StrategicRationale`

Properties:

* M&Ai proposed;
* analyst reviewed;
* approved;
* disputed;
* stale.

## `CapacityAssessment`

Properties:

* Verified;
* supported;
* estimated;
* uncertain;
* insufficient;
* restricted.

## `ConflictState`

Properties:

* Not reviewed;
* clear;
* potential;
* review required;
* cleared;
* excluded;
* restricted.

## `CriteriaEditor`

States:

* Draft;
* approved;
* changed;
* invalid;
* restricted.

## `CriterionRow`

Properties:

* Hard constraint;
* preference;
* range;
* Boolean;
* qualitative;
* weighted;
* missing evidence.

## `CandidateComparison`

Properties:

* Two;
* three;
* four-plus;
* differences only;
* restricted.

## `ShortlistWorkspace`

States:

* Longlist;
* proposed;
* internal approved;
* client review;
* approved;
* superseded.

## `ShortlistApprovalPanel`

States:

* Submit;
* review;
* approve;
* changes requested;
* reject;
* insufficient authority.

## `OutreachSequence`

Properties:

* Wave 1;
* wave 2;
* reserve;
* hold;
* restricted.

## `OutreachAuthorization`

States:

* Not authorized;
* pending;
* authorized;
* sent;
* responded;
* prohibited.

## `CandidateChangeItem`

Properties:

* Evidence;
* fit;
* capacity;
* conflict;
* relationship;
* transaction status.

---

# 78. Production object model

## `CounterpartyUniverse`

```text
id
dealId
universeType
name
status
criteriaVersionId
currentShortlistVersionId
candidateCount
qualifiedCount
shortlistedCount
outreachAuthorizedCount
activeCount
createdAt
updatedAt
```

## `CounterpartyCriteriaVersion`

```text
id
universeId
version
status
transactionThesis
hardConstraints
preferences
scoringMethod
createdBy
submittedBy
approvedBy
approvedAt
createdAt
```

## `CounterpartyCriterion`

```text
id
criteriaVersionId
name
description
criterionType
evaluationType
importance
numericWeight
minimumValue
maximumValue
allowedValues
evidenceRequirement
approvalState
createdAt
```

## `DealCounterpartyCandidate`

```text
id
universeId
organizationId
candidateType
lifecycleState
qualificationState
fitBand
compositeScore
evidenceCoverage
strategicRationale
capacityState
relationshipState
conflictState
shortlistState
outreachState
relationshipOwnerId
researchOwnerId
sourceType
confidentialityLevel
createdAt
updatedAt
```

## `CandidateCriterionAssessment`

```text
id
candidateId
criterionId
assessment
numericValue
assessmentState
rationale
evidenceIds
reviewedBy
reviewedAt
createdAt
updatedAt
```

## `CandidateEvidence`

```text
id
candidateId
evidenceType
sourceType
sourceReference
title
summary
effectiveAt
freshnessState
accessLevel
createdAt
```

## `CandidateConflict`

```text
id
candidateId
conflictType
description
state
restricted
reviewOwnerId
reviewedBy
reviewedAt
resolution
createdAt
```

## `ShortlistVersion`

```text
id
universeId
version
status
criteriaVersionId
candidateIds
reserveCandidateIds
excludedCandidateIds
summary
submittedBy
approvedBy
clientApprovedBy
approvedAt
createdAt
```

## `ShortlistDecision`

```text
id
shortlistVersionId
candidateId
decision
reason
decidedBy
authorityType
decidedAt
createdAt
```

## `OutreachAuthorization`

```text
id
candidateId
shortlistVersionId
state
relationshipOwnerId
approvedChannel
approvedMaterialId
restrictions
authorizedBy
authorizedAt
expiresAt
createdAt
```

## `CounterpartyEngagement`

```text
id
candidateId
engagementType
state
contactId
ownerId
occurredAt
summary
nextAction
nextActionDueAt
sourceReference
confidentialityLevel
createdAt
```

## `CandidateChange`

```text
id
candidateId
changeType
before
after
impact
affectedAssessmentIds
reviewState
assignedTo
reviewedBy
reviewedAt
createdAt
```

---

# 79. Suggested routes

Primary:

```text
/deals/:dealId/matching
```

Sell-side alias:

```text
/deals/:dealId/buyers
```

Buy-side alias:

```text
/deals/:dealId/targets
```

Selected candidate:

```text
/deals/:dealId/matching?candidate=:candidateId
```

Criteria:

```text
/deals/:dealId/matching?view=criteria
```

Shortlist:

```text
/deals/:dealId/matching?view=shortlist
```

Outreach:

```text
/deals/:dealId/matching?view=outreach
```

Comparison:

```text
/deals/:dealId/matching?compare=:candidateId1,:candidateId2
```

Conflict review:

```text
/deals/:dealId/matching?filter=conflict-review
```

Approval:

```text
/deals/:dealId/matching?view=shortlist&panel=approval
```

---

# 80. Repository direction

This screen should be treated as a new deal-domain capability rather than a thin UI over a generic recommendation model.

## Reuse

* Deal-scoped application shell;
* Organization records;
* Contact and relationship records;
* Target Dossier facts;
* approval infrastructure;
* tasks;
* activity history;
* contextual Copilot;
* valuation references;
* permission model.

## Add

* Counterparty-universe domain;
* criteria versions;
* hard constraints;
* fit dimensions;
* candidate lifecycle;
* evidence coverage;
* strategic rationale;
* capacity assessment;
* conflict review;
* shortlist versions;
* client decisions;
* outreach authorization;
* engagement events;
* candidate-change detection;
* restricted candidate identities.

## Do not assume

* Complete external-market coverage;
* production-grade candidate recommendation;
* current financial-capacity data;
* CRM integration;
* autonomous outreach;
* validated intent prediction;
* reliable global company database.

## Product sequencing

Because the architecture places Matching in POC expansion, the initial implementation should prioritize:

1. Manual and imported candidate universe;
2. explicit criteria;
3. structured screening;
4. shortlist approval;
5. outreach state;
6. auditability.

Automated candidate discovery should follow only after the core workflow is useful without it.

---

# 81. What not to include

Avoid:

* A single magic match score;
* AI confidence as primary evidence;
* autonomous contact;
* mass outreach;
* unapproved target disclosure;
* inferred willingness to transact presented as fact;
* public-data claims without dates;
* candidate deletion;
* hidden exclusions;
* client comments exposed internally without controls;
* relationship notes exposed to clients;
* a CRM sales funnel as the complete screen;
* decorative market maps;
* company logos as the main hierarchy;
* automatically selected shortlist;
* automatically approved outreach;
* hidden criteria changes;
* hidden scoring weights;
* silent conflict resolution;
* real companies in the pitch mock;
* claims of live market-data integrations;
* unsupported financial-capacity estimates;
* generic recommendation language such as “perfect match.”

---

# 82. MOCKED — Pitch and demo specification

## 82.1 Purpose of the mocked screen

The mocked Buyer Universe should demonstrate:

* Transaction-specific market screening;
* strategic rationale;
* explainable candidate evaluation;
* conflict control;
* shortlist approval;
* controlled outreach.

Its pitch narrative is:

> **M&Ai turns a manually assembled buyer list into an evidence-backed, reviewable and permission-controlled transaction universe.**

This screen is useful for:

* Demonstrating lifecycle breadth;
* showing sell-side workflow;
* explaining human-controlled matching;
* live-demo transitions into outreach and negotiation;
* product-roadmap depth.

It should not be presented as a current core-product hero unless the matching capability has been validated in real workflows.

---

# 83. Mocked shell state

Institution:

> **Atlas M&A Advisory**

User:

> **Ana Costa · Vice President**

Deal:

> **Project Horizon**
> Atlas Industrial · Sell-side
> Buyer Universe · Restricted workspace

Breadcrumb:

> Deals / Project Horizon / Buyer Universe

Deal navigation:

* Overview;
* Dossier;
* Documents;
* Diligence;
* Valuation;
* **Buyer Universe**;
* Negotiation;
* Closing.

---

# 84. Mocked page header

Title:

> **Buyer Universe & Outreach**

Description:

> Evaluate and approve potential buyers for Project Horizon.

Summary:

* **38 reviewed**
* **12 qualified**
* **8 shortlisted**
* **5 contacted**
* **2 active**

Primary action:

> **Review 3 recommendations**

Secondary:

> Add candidates

---

# 85. Mocked criteria

Approved criteria version:

> **Buyer Criteria v3**

Critical:

* Strategic rationale;
* transaction-size capacity;
* regulatory feasibility.

High:

* Product adjacency;
* acquisition appetite;
* integration capability.

Medium:

* Existing relationship;
* geographic expansion value.

Restrictions:

* Two client exclusions;
* one active conflict;
* no target identification before NDA.

---

# 86. Mocked candidate registry

Show six fictional candidates.

## Candidate 1 — selected

> **Northbridge Automation**
> Strategic buyer · United States
> **Strong fit · Proposed shortlist**
> Capacity supported · Existing relationship
> Conflict clear

## Candidate 2

> **Meridian Industrial Group**
> Strategic buyer · Germany
> **Strong fit · Approved shortlist**
> Capacity verified · Relationship limited
> Regulatory review complete

## Candidate 3

> **Polaris Technologies**
> Strategic buyer · Brazil
> **Strong fit · Approved shortlist**
> Capacity verified · Strong relationship
> Confidentiality risk: high

## Candidate 4

> **Serra Capital Partners**
> Financial sponsor · Brazil
> **Moderate fit · Reserve**
> Capacity verified · Portfolio synergy partial

## Candidate 5

> **Vector Systems**
> Strategic buyer · United Kingdom
> **Moderate fit · Hold**
> Potential client conflict

## Candidate 6

> **Aurora Growth Fund**
> Financial sponsor · United States
> **Weak fit · Excluded**
> Transaction size below mandate

---

# 87. Mocked selected-candidate detail

## Identity

> **Northbridge Automation**

Type:

> Strategic acquirer

Headquarters:

> United States

Fit:

> **Strong**

Evidence coverage:

> **88% · Capacity evidence incomplete**

## Strategic rationale

> Atlas Industrial would expand Northbridge’s industrial-monitoring software, recurring service revenue and Brazilian customer access.

Supporting factors:

* Product adjacency: Strong;
* recurring-revenue fit: Strong;
* geography: Strong;
* customer overlap: Moderate;
* integration capability: Moderate.

## Financial capacity

> **Supported**

Evidence:

* Three relevant acquisitions since 2022;
* comparable transaction size;
* current liquidity not independently verified.

## Relationship

> Established senior relationship
> Owner: Marina Alves

## Conflict

> No identified conflict

## Recommendation

> **Propose for approved shortlist**

---

# 88. Mocked fit dimensions

| Dimension              | Assessment   |
| ---------------------- | ------------ |
| Strategic rationale    | **Strong**   |
| Product adjacency      | **Strong**   |
| Geographic fit         | **Strong**   |
| Financial capacity     | **Moderate** |
| Acquisition appetite   | **Strong**   |
| Relationship strength  | **Moderate** |
| Regulatory feasibility | **Strong**   |
| Confidentiality risk   | **Medium**   |

Overall:

> **Strong fit · Capacity review required**

---

# 89. Mocked evidence

Show:

### Target Dossier

* 68,0% recurring revenue;
* Brazil-focused installed base;
* R$ 310,4 mi LTM revenue;
* proprietary industrial-monitoring software.

### Candidate evidence

* Three automation acquisitions since 2022;
* one Latin America expansion initiative;
* industrial-software portfolio;
* existing relationship record.

Classification:

* 5 reviewed facts;
* 2 public-source observations;
* 1 banker hypothesis;
* 1 missing capacity item.

---

# 90. Mocked shortlist

Proposed shortlist:

1. Northbridge Automation;
2. Meridian Industrial Group;
3. Polaris Technologies;
4. Serra Capital Partners;
5. Vector Systems;
6. Helix Industrial Software;
7. Delta Automation Holdings;
8. Boreal Growth Partners.

State:

> **8 candidates proposed**

Issues:

* One conflict unresolved;
* two capacity reviews incomplete;
* one client exclusion added since v1.

Primary action:

> **Review shortlist**

---

# 91. Mocked outreach state

## Wave 1

* Meridian Industrial Group — Contacted;
* Polaris Technologies — NDA review;
* Northbridge Automation — Awaiting authorization;
* Serra Capital Partners — Outreach authorized;
* Helix Industrial Software — Contacted.

## Wave 2

* Three reserve candidates;
* not yet authorized.

Restriction:

> Target identity may be disclosed only after signed NDA.

---

# 92. Mocked shortlist approval panel

Title:

> **Buyer Shortlist v2**

Changes:

* Northbridge Automation added;
* Vector Systems moved to hold;
* Aurora Growth Fund excluded;
* Serra Capital Partners moved to reserve.

Result:

* 8 shortlisted;
* 3 reserve;
* 5 proposed for Wave 1.

Assigned to:

> Marina Alves · Deal Lead

Actions:

* **Approve shortlist**
* Request changes
* Reject version

---

# 93. Recommended static pitch composition

```text
┌──────────────────────────────────────────────────────────────────┐
│ Buyer Universe · 38 reviewed · 12 qualified · 8 shortlisted     │
├───────────────────────────────┬──────────────────────────────────┤
│ Candidate universe            │ Northbridge Automation           │
│                               │                                  │
│ Northbridge     Strong        │ Strong strategic fit             │
│ Proposed shortlist            │                                  │
│                               │ Product adjacency       Strong    │
│ Meridian        Strong        │ Geographic fit          Strong    │
│ Approved                      │ Financial capacity      Moderate  │
│                               │ Relationship            Moderate  │
│ Polaris         Strong        │                                  │
│ Approved                      │ Potential rationale              │
│                               │ Brazilian expansion and recurring│
│ Serra Capital   Moderate      │ software revenue                 │
│ Reserve                       │                                  │
│                               │ [ Propose shortlist ]            │
└───────────────────────────────┴──────────────────────────────────┘
```

This communicates:

* Structured universe;
* differentiated candidates;
* strategic rationale;
* evidence-aware evaluation;
* human progression.

---

# 94. Pitch-specific simplification

## Keep visible

* Buyer Universe;
* 38 reviewed;
* 8 shortlisted;
* four candidates;
* selected candidate;
* Strong strategic fit;
* product adjacency;
* financial capacity;
* strategic rationale;
* Propose shortlist.

## Hide

* Complete criteria editor;
* advanced filters;
* outreach tracker;
* conflict details;
* complete evidence list;
* scoring methodology;
* client comments;
* full shortlist approval history;
* source URLs;
* company logos.

## Readability requirement

At deck scale, these must remain readable:

* **Buyer Universe**
* **38 reviewed**
* **8 shortlisted**
* **Northbridge Automation**
* **Strong strategic fit**
* **Financial capacity**
* **Brazilian expansion**
* **Propose shortlist**

---

# 95. Recommended demo flows

## Flow A — Target facts to buyer rationale

```text
Target Dossier
  ↓
Approved business profile
  ↓
Open Buyer Universe
  ↓
Northbridge recommendation
  ↓
Inspect matched target facts
  ↓
Review strategic rationale
  ↓
Propose for shortlist
```

## Flow B — Universe to shortlist

```text
Buyer Universe
  ↓
Filter: Qualified
  ↓
Compare Northbridge, Meridian and Polaris
  ↓
Review trade-offs
  ↓
Build shortlist v2
  ↓
Submit for approval
```

## Flow C — Conflict review

```text
Candidate universe
  ↓
Vector Systems · Potential conflict
  ↓
Open conflict detail
  ↓
Assign compliance review
  ↓
Move candidate to Hold
```

## Flow D — Client shortlist review

```text
Internal shortlist approved
  ↓
Generate client-review view
  ↓
Client rejects one candidate
  ↓
Candidate marked Client excluded
  ↓
Shortlist v2 created
```

## Flow E — Outreach authorization

```text
Approved shortlist
  ↓
Select Northbridge
  ↓
Review relationship and restrictions
  ↓
Approve teaser v2
  ↓
Authorize Marina Alves to contact
  ↓
Record outreach
```

## Flow F — Engagement to negotiation

```text
Candidate contacted
  ↓
NDA signed
  ↓
VDR access approved
  ↓
Indicative interest received
  ↓
Create proposal in Negotiation Room
```

---

# 96. UX prototype tasks to validate

Test with bankers using tasks such as:

1. Identify the strongest buyer candidate.
2. Explain why the candidate is considered strong.
3. Find which criterion remains incomplete.
4. Distinguish strategic fit from financial capacity.
5. Find every candidate with a conflict.
6. Determine which candidates are approved for outreach.
7. Add a client-suggested candidate.
8. Exclude a candidate with a documented reason.
9. Move a candidate to reserve.
10. Compare three strategic buyers.
11. Identify which candidate has the strongest relationship.
12. Find all candidates lacking financial-capacity evidence.
13. Review shortlist changes between v1 and v2.
14. Approve the shortlist.
15. Determine whether outreach is authorized.
16. Find the approved relationship owner.
17. Record a candidate response.
18. Open the preliminary indication in Negotiation.
19. Identify restricted candidate information.
20. Return to the same filtered universe after reviewing a candidate.

## Measures

Record:

* Time to identify a priority candidate;
* whether fit dimensions are understood;
* whether users rely excessively on the composite score;
* whether fact and inference are distinguished;
* whether qualification and shortlist are confused;
* whether shortlist and outreach authorization are confused;
* whether conflict states are noticed;
* whether relationship ownership is clear;
* whether candidate comparison supports judgment;
* whether the screen feels like a CRM;
* whether bankers trust the recommendations;
* which evidence they require before outreach.

---

# 97. Design validation criteria

The workspace is ready for approval when:

1. The label adapts to transaction type.
2. Users understand that candidate records are deal-specific.
3. Criteria exist before recommendations are accepted.
4. Hard constraints and preferences remain separate.
5. Fit dimensions are visible.
6. A composite score is never the sole rationale.
7. Candidate intent is not inferred as fact.
8. Financial capacity has explicit evidence.
9. Strategic rationale identifies supporting target facts.
10. Evidence coverage is visible.
11. Missing evidence has a clear next action.
12. Relationship context is permission-aware.
13. Conflict review can block progression.
14. Excluded candidates remain auditable.
15. Qualification does not imply shortlist approval.
16. Shortlist approval does not imply outreach authorization.
17. Client approval remains distinct from internal approval.
18. M&Ai cannot autonomously contact candidates.
19. Target identity disclosure is controlled.
20. Criteria changes identify affected candidates.
21. Shortlist versions remain immutable.
22. Outreach materials are versioned.
23. Preliminary indications route into Negotiation.
24. Restricted candidate data does not leak through search or exports.
25. The screen remains useful without automated discovery.
26. The screen remains useful without Copilot.
27. Mobile supports review and approval.
28. Market maps have structured alternatives.
29. The pitch mock remains fictional.
30. The static screen remains readable.
31. The product does not imply production-ready market coverage prematurely.
32. Every candidate state has a clear next action.

---

# 98. Final design target

The correct design target is not:

> “An AI-ranked list of buyers or targets.”

It is:

> **A controlled counterparty-screening workspace where bankers can define the transaction thesis, examine evidence-backed fit, preserve conflicts and exclusions, approve the shortlist and authorize engagement without surrendering professional judgment or confidentiality.**

Its defining interaction is:

> **Define the thesis → construct the universe → evaluate the evidence → compare trade-offs → approve the shortlist → control outreach**

**Next iteration: Negotiation Room.**
