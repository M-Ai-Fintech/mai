# Negotiation Room

## 1. Recommended product naming

Use:

* **Deal navigation:** `Negotiation`
* **Page title:** `Negotiation Room`
* **Primary artifact:** `Term Sheet`
* **Analytical module:** `Negotiation Analysis`
* **Execution history:** `Negotiation Rounds`

The term **Negotiation Room** correctly communicates that this is a controlled transaction phase containing proposals, scenarios and approvals—not a generic document editor or an autonomous negotiating agent. 

---

# 2. Screen definition

The **Negotiation Room** is the deal-level workspace where bankers:

* Capture proposals;
* Normalize commercial terms;
* Compare counterparties and negotiation rounds;
* Analyze economic and execution trade-offs;
* Prepare counterproposals;
* Track concessions;
* Approve internal positions;
* Control external communication;
* Finalize the commercial basis for a term sheet;
* Transfer agreed terms into Closing.

It should answer:

1. **What is currently on the table?**
2. **Which proposal or round is authoritative?**
3. **How do the proposals differ economically and contractually?**
4. **What does each structure deliver at closing versus later?**
5. **Which risks are transferred, retained or contingent?**
6. **Which terms conflict with approved valuation, diligence or client instructions?**
7. **What has each party conceded?**
8. **What is the internally approved response?**
9. **Who may authorize or communicate that response?**
10. **Which terms have been agreed in principle?**

Its central operating sequence is:

> **Proposal → Normalized terms → Economic and risk analysis → Alternatives → Internal approval → Counterproposal → Agreed commercial position**

---

# 3. Primary intention

## Operational intention

Convert fragmented negotiation materials into one controlled and versioned transaction record.

These materials may include:

* Indications of interest;
* Non-binding offers;
* Letters of intent;
* Term sheets;
* Bidder emails;
* Call notes;
* Counsel markups;
* Buyer or seller counterproposals;
* Internal strategy documents;
* Client instructions;
* Valuation outputs;
* Diligence findings.

## User intention

A banker should be able to say:

> “I understand the true economics and risk allocation of every proposal, what changed in the latest round and which response has been authorized.”

## Product intention

The Negotiation Room should extend M&Ai’s central operating model:

> **Information → Analysis → Impact → Human decision → Audit record**

The screen should combine structured proposal analysis with explicit approval, while avoiding any suggestion that AI autonomously determines or accepts the final agreement. 

---

# 4. Strategic product role

The Negotiation Room is a strong lifecycle-expansion screen.

It demonstrates that M&Ai can continue beyond diligence and valuation into transaction execution:

* Diligence determines material risks;
* Valuation establishes internal value;
* Negotiation allocates price, timing, control and risk;
* Closing converts agreed terms into definitive documentation and execution.

The screen should make the following product claim concrete:

> **M&Ai links evidence, deterministic analysis and human approvals in one deal workflow.** 

It is not intended to replace bankers, counsel or client decision-makers.

---

# 5. What the Negotiation Room is not

The screen should not become:

* An autonomous negotiation bot;
* A generic CRM opportunity record;
* A term-sheet word processor;
* A legal drafting platform;
* An email inbox;
* A single “recommended deal” card;
* A black-box utility optimizer;
* A game-theory visualization with no practical workflow;
* A replacement for legal counsel;
* A complete closing checklist;
* A complete valuation model;
* A chat transcript;
* A bidder ranking screen;
* A document redlining system without structured terms;
* An automatic acceptance mechanism.

The central question is not:

> “What is the mathematically optimal proposal?”

It is:

> **“Which commercial structure best reflects the approved transaction objectives, risk constraints and available alternatives?”**

---

# 6. Advisory boundary

The Negotiation Room should maintain an explicit product boundary.

M&Ai may:

* Extract proposal terms;
* Normalize inconsistent terminology;
* Compare versions;
* calculate economic consequences;
* identify trade-offs;
* identify deviations from approved mandates;
* propose alternative structures;
* highlight structural risks;
* prepare draft responses;
* route decisions for approval.

M&Ai should not:

* Accept an offer;
* bind a client;
* send a counterproposal without authorization;
* make legal conclusions;
* replace counsel’s review;
* disclose confidential information automatically;
* represent an inferred negotiation position as confirmed;
* declare that one structure is the only acceptable outcome.

The current repository’s negotiation-agent rules already emphasize alternatives and advisory support rather than unilateral acceptance. That principle should be visible in the product experience.

---

# 7. Relationship to adjacent screens

| Screen                       | Primary responsibility                                     |
| ---------------------------- | ---------------------------------------------------------- |
| **Buyer or Target Universe** | Identifies and progresses potential counterparties         |
| **Valuation Lab**            | Establishes approved internal valuation scenarios          |
| **Diligence Decision Room**  | Establishes material risks and proposed treatments         |
| **Negotiation Room**         | Compares proposals and controls the commercial response    |
| **Documents & Evidence**     | Preserves the original proposal and exact clauses          |
| **Tasks & Approvals**        | Routes response and term approvals                         |
| **Closing Control Room**     | Converts agreed terms into signed documents and completion |
| **Deliverables & Exports**   | Produces term sheets and negotiation summaries             |
| **Activity & Audit**         | Records rounds, decisions, communications and changes      |
| **Deal Team & Access**       | Restricts sensitive negotiation positions                  |

## Negotiation versus Valuation

Valuation answers:

> What does the deal team believe the company is worth?

Negotiation answers:

> What economic and contractual structure is being proposed, and is it acceptable?

A proposal above the approved valuation range may still be weaker because of:

* Earn-out risk;
* deferred payment;
* rollover equity;
* escrow;
* financing conditions;
* working-capital mechanics;
* exclusivity;
* execution risk.

## Negotiation versus Closing

Negotiation establishes the agreed commercial position.

Closing determines whether the definitive documents faithfully implement it and whether all completion conditions are satisfied.

---

# 8. Transaction modes

The screen should adapt to the transaction structure.

## Sell-side mode

Focus on:

* Multiple bidder proposals;
* Seller proceeds;
* price certainty;
* consideration structure;
* conditionality;
* bidder credibility;
* execution certainty;
* exclusivity;
* client approval.

## Buy-side mode

Focus on:

* Internal offer strategy;
* approved valuation ceiling;
* risk protection;
* financing;
* purchase-price mechanics;
* diligence protections;
* counteroffers;
* investment-committee approval.

## Bilateral merger mode

Focus on:

* Relative ownership;
* governance;
* management roles;
* exchange ratio;
* control;
* board composition;
* integration;
* termination rights.

## Capital-raise mode

Focus on:

* Pre-money and post-money value;
* investment amount;
* dilution;
* investor rights;
* governance;
* liquidation preference;
* anti-dilution;
* use of proceeds;
* funding conditions.

The underlying term framework may be shared, but labels, default terms and approval rules should adapt.

---

# 9. Primary users

## 9.1 Analyst

Needs to:

* Enter proposals;
* validate extracted terms;
* maintain comparison matrices;
* calculate proceeds;
* record rounds;
* prepare draft alternatives;
* identify missing terms.

## 9.2 Associate

Needs to:

* Reconcile versions;
* challenge term interpretations;
* prepare negotiation briefs;
* quantify concessions;
* compare structures;
* submit internal positions for review.

## 9.3 Vice President

Needs to:

* Evaluate trade-offs;
* define counterproposal structure;
* test alternatives;
* monitor mandate constraints;
* approve within delegated authority;
* coordinate client decisions.

## 9.4 Managing Director or Partner

Needs:

* Current commercial position;
* headline value and risk-adjusted economics;
* key open terms;
* concession history;
* counterparty alternatives;
* client authority;
* walk-away conditions;
* execution risk.

## 9.5 Legal counsel

Needs to:

* Review normalized legal-commercial terms;
* inspect source clauses;
* identify drafting issues;
* confirm term-sheet language;
* prepare handoff into definitive documentation.

Counsel should not automatically see restricted internal economics or alternative strategy unless authorized.

## 9.6 Client participant

May be allowed to:

* Review selected proposals;
* compare key terms;
* approve an internal response;
* comment;
* define restrictions;
* approve exclusivity.

They should not automatically see:

* Internal utility models;
* banker-only strategy;
* counterparty relationship notes;
* unapproved draft positions;
* hidden reservation thresholds;
* other clients’ information.

---

# 10. Primary job to be done

> When transaction proposals evolve across counterparties and negotiation rounds, create one controlled workspace where the team can compare economics, understand risk, prepare alternatives and authorize the next response.

## Secondary jobs

The user should also be able to:

* Import an offer;
* validate extracted terms;
* compare bidders;
* compare rounds;
* calculate cash at closing;
* estimate contingent proceeds;
* assess escrow and holdback;
* map diligence risks to protections;
* model alternative structures;
* record concessions;
* track open asks;
* maintain internal reservation positions;
* prepare a counterproposal;
* route client approval;
* generate a term sheet;
* verify signed terms against the approved position;
* transfer agreed terms into Closing.

---

# 11. Core conceptual model

The screen should be built around seven layers.

## Layer 1 — Source proposal

The original offer, term sheet, email or call note.

## Layer 2 — Normalized terms

Structured fields that allow proposal comparison.

## Layer 3 — Economic consequences

Value, timing, probability and risk allocation.

## Layer 4 — Internal preferences and constraints

Approved transaction objectives and boundaries.

## Layer 5 — Alternatives

Possible responses and counterstructures.

## Layer 6 — Human authorization

Internal, client and legal approval.

## Layer 7 — External position

The response or agreement actually communicated.

These layers must remain separate.

---

# 12. Negotiation lifecycle

The transaction-level negotiation should have an explicit lifecycle.

## Not started

No active proposal or negotiation position exists.

## Preparing position

The team is defining an internal approach.

## Proposal received

An external proposal requires normalization and review.

## Internal review

The proposal is being analyzed.

## Counterproposal prepared

A response exists but has not been authorized.

## Awaiting approval

The response requires internal or client authorization.

## Counterproposal sent

The authorized position has been communicated.

## Active negotiation

Terms remain under discussion.

## Agreed in principle

Principal commercial terms are agreed but not yet definitive.

## Term sheet signed

A signed term sheet or letter of intent exists.

## Paused

Negotiation is intentionally suspended.

## Withdrawn

A party withdrew.

## Rejected

The proposal was formally rejected.

## Superseded

A later round replaced the prior position.

## Transferred to Closing

The agreed term baseline is now controlled through Closing.

---

# 13. Proposal lifecycle

Each proposal should have a separate state.

* Received;
* importing;
* extraction review;
* normalized;
* incomplete;
* under review;
* clarification requested;
* countered;
* accepted in principle;
* rejected;
* withdrawn;
* superseded;
* expired;
* restricted.

A proposal should not become “current” solely because it was received most recently.

The authoritative proposal is the most recent proposal explicitly selected for the active negotiation round.

---

# 14. Recommended workspace structure

The Negotiation Room should contain seven principal subviews:

1. **Overview**
2. **Proposals**
3. **Term Comparison**
4. **Alternatives**
5. **Concessions**
6. **Approvals**
7. **History**

Optional later view:

8. **Documents & Redlines**

## Overview

Current state, active proposal, open terms and next decision.

## Proposals

Complete proposal registry and versions.

## Term Comparison

Structured comparison across parties or rounds.

## Alternatives

Internal response structures and trade-off analysis.

## Concessions

Give/get history and open asks.

## Approvals

Internal, client and legal authorization.

## History

Negotiation rounds, communications and state changes.

---

# 15. Page header

## Recommended title

> **Negotiation Room**

Supporting description:

> Compare proposals, evaluate commercial trade-offs and approve transaction positions.

## Header status

Example:

* **3 active bidders**
* **2 proposals under review**
* **1 counterproposal awaiting approval**
* **7 open material terms**

## Primary action

Adapt to current state:

* **Import proposal**
* **Review latest offer**
* **Prepare counterproposal**
* **Approve response**
* **Review agreed terms**
* **Transfer to Closing**

## Secondary actions

* Generate negotiation brief;
* compare proposals;
* add round;
* more actions.

---

# 16. Negotiation summary

## Purpose

Give the user a concise view of the current commercial situation.

## Recommended information

* Active counterparty;
* latest proposal;
* proposal round;
* headline value;
* cash at closing;
* deferred and contingent value;
* risk-adjusted or certainty-adjusted proceeds;
* open material terms;
* response deadline;
* current approval state;
* internal preferred alternative.

## Example

> **Northbridge Automation · Round 3**

Headline enterprise value:

> **R$ 472,0 mi**

Consideration:

* 85% cash at closing;
* 10% earn-out;
* 5% escrow.

Internal assessment:

> **Balanced economics · Earn-out safeguards require revision**

Deadline:

> Counterproposal due tomorrow at 17:00

---

# 17. Headline value is not economic value

The screen must distinguish:

* Headline enterprise value;
* equity value;
* purchase price;
* cash at closing;
* deferred fixed consideration;
* contingent consideration;
* rollover equity;
* escrow or holdback;
* expected seller proceeds;
* present value;
* risk-adjusted value;
* tax-adjusted value, when explicitly modeled.

## Example

> Headline enterprise value
> R$ 472,0 mi

> Cash at closing
> R$ 401,2 mi

> Earn-out maximum
> R$ 47,2 mi

> Escrow
> R$ 23,6 mi

> Illustrative expected proceeds
> R$ 451,7 mi

## UX rule

Do not allow the headline value to dominate without displaying consideration timing and conditionality.

---

# 18. Economic-value basis

Each calculated value should state its basis.

## Potential bases

* Nominal;
* present value;
* probability-weighted;
* certainty-adjusted;
* post-escrow;
* pre-tax;
* after estimated transaction costs;
* equity holder proceeds;
* enterprise value.

## Example

> **Illustrative expected seller proceeds**

Basis:

* Earn-out probability: 65%;
* discount rate: 14%;
* escrow expected to be fully released;
* no tax adjustment included;
* no transaction-cost adjustment included.

State:

> Internal scenario · Not an approved accounting conclusion

---

# 19. Proposal registry

## Purpose

Provide the complete controlled record of proposals received or prepared.

## Recommended default columns

1. Counterparty;
2. round;
3. proposal date;
4. headline value;
5. cash at closing;
6. contingent value;
7. escrow;
8. major conditions;
9. status;
10. response deadline;
11. owner;
12. actions.

## Optional columns

* Currency;
* equity rollover;
* deferred fixed payment;
* financing condition;
* exclusivity;
* expected closing;
* approval state;
* source document;
* extraction state;
* legal review;
* version;
* certainty-adjusted proceeds.

---

# 20. Proposal-row anatomy

## Counterparty

> **Northbridge Automation**

Supporting:

> Strategic buyer · Round 3

## Headline economics

> **R$ 472,0 mi EV**

## Consideration

> 85% cash · 10% earn-out · 5% escrow

## Conditions

> Financing committed · Confirmatory diligence · 30-day exclusivity

## State

> Counterproposal under internal review

## Deadline

> Tomorrow · 17:00

## Owner

> Ana Costa

## Actions

* Open proposal;
* compare;
* create response;
* request clarification;
* reject;
* supersede;
* record communication.

---

# 21. Proposal source and provenance

Each proposal must link to its source.

Potential sources:

* Signed term sheet;
* non-binding offer;
* email;
* data-room document;
* counsel markup;
* banker call note;
* client instruction;
* manually entered terms.

## Required source metadata

* Document or communication;
* version;
* sender;
* recipient;
* date;
* page or clause;
* imported by;
* validated by.

## UX rule

A normalized term should always allow the reviewer to inspect the original language.

---

# 22. Proposal import

## Entry points

* Upload proposal document;
* select synchronized document;
* forward or connect communication, later;
* create from call note;
* enter manually;
* duplicate previous round.

## Import sequence

```text
Source proposal
  ↓
Term extraction
  ↓
Normalization
  ↓
Human validation
  ↓
Proposal version created
  ↓
Comparison updated
```

## UX principle

An imported proposal should begin as:

> **Extraction review required**

It should not immediately become an authoritative negotiation record.

---

# 23. Term extraction

M&Ai may extract:

* Value;
* consideration;
* payment timing;
* earn-out;
* escrow;
* rollover equity;
* net-debt mechanics;
* working capital;
* conditions;
* exclusivity;
* governance;
* employment;
* non-compete;
* indemnification;
* financing;
* timetable;
* dispute resolution;
* confidentiality;
* termination.

## Extraction state

* Extracted;
* validated;
* ambiguous;
* absent;
* contradictory;
* not applicable.

## Example

> **Escrow release period**

Extracted:

> “Eighteen months following completion”

State:

> Validated

Source:

> Northbridge_NBO_R3.pdf · Clause 7.2

---

# 24. Term normalization

Different counterparties may describe equivalent terms differently.

Examples:

* Holdback;
* retention;
* indemnity reserve;
* escrow account;
* deferred purchase-price protection.

The system should normalize these into a canonical term model while preserving original text.

## Normalized-term anatomy

* Canonical term;
* normalized value;
* original language;
* interpretation;
* reviewer;
* source;
* state.

## UX rule

Normalization must not erase drafting differences that may affect legal meaning.

Use:

> **Normalized for commercial comparison**

not:

> Legally equivalent.

---

# 25. Term taxonomy

Recommended principal categories:

1. Valuation and price;
2. consideration structure;
3. purchase-price mechanics;
4. deferred and contingent consideration;
5. risk allocation;
6. transaction perimeter;
7. governance and management;
8. financing;
9. conditions;
10. exclusivity and process;
11. timetable;
12. restrictive covenants;
13. documentation and dispute resolution.

---

# 26. Valuation and price terms

Recommended fields:

* Enterprise value;
* equity value;
* pre-money value;
* post-money value;
* purchase price;
* selected valuation date;
* currency;
* price per share or quota;
* control premium;
* minority discount;
* valuation adjustments;
* equity rollover valuation.

## UX rule

The proposal should specify its valuation basis.

Example:

> **R$ 472,0 mi enterprise value**

is not interchangeable with:

> **R$ 472,0 mi equity value**

---

# 27. Consideration structure

Recommended components:

* Cash at closing;
* fixed deferred cash;
* seller note;
* earn-out;
* escrow;
* holdback;
* rollover equity;
* buyer shares;
* assumption of debt;
* contingent-value rights;
* other non-cash consideration.

## Validation

The screen should verify that the complete structure reconciles to the proposal value.

Example:

```text
Cash at closing       85%
Earn-out              10%
Escrow                  5%
Total                 100%
```

A non-reconciling structure should be flagged.

---

# 28. Cash at closing

Recommended fields:

* Amount;
* percentage;
* funding source;
* payment date;
* currency;
* financing dependency;
* settlement mechanics;
* evidence of funds;
* state.

## Important distinction

Cash described as “at closing” may still depend on:

* Financing;
* regulatory approval;
* funds flow;
* debt repayment;
* purchase-price adjustment;
* escrow funding.

These dependencies should remain visible.

---

# 29. Deferred fixed consideration

Recommended fields:

* Amount;
* payment schedule;
* maturity;
* interest;
* security;
* acceleration;
* default;
* set-off rights;
* subordination.

## Economic analysis

Show:

* Nominal amount;
* present value;
* counterparty credit risk;
* security level;
* effective yield.

---

# 30. Rollover equity

Recommended fields:

* Percentage rolled;
* implied valuation;
* instrument;
* class;
* voting rights;
* liquidity;
* governance rights;
* dilution;
* transfer restrictions;
* exit rights;
* information rights;
* lock-up.

## UX rule

Do not value rollover equity as equivalent to cash.

Show:

* Nominal implied value;
* liquidity treatment;
* dilution assumptions;
* exit dependency;
* valuation uncertainty.

---

# 31. Earn-out

## Recommended fields

* Maximum amount;
* percentage of consideration;
* measurement period;
* metric;
* threshold;
* target;
* cap;
* formula;
* payment timing;
* accounting policy;
* audit rights;
* management-control protections;
* dispute mechanism;
* acceleration;
* change-of-control treatment.

## Suitable analytical questions

* Is the metric independently observable?
* Can the buyer materially influence it?
* Does the formula use consistent accounting policies?
* Are extraordinary items defined?
* Are audit and information rights sufficient?
* Are partial achievements recognized?
* Does the earn-out overlap with rollover incentives?

## UX principle

An earn-out should not be represented only as:

> 10%

Its probability, metric, period and governance are material.

---

# 32. Earn-out analysis

Example:

> **Earn-out maximum**
> R$ 47,2 mi · 10% of headline EV

Metric:

> Adjusted EBITDA

Period:

> 24 months

Illustrative probability:

> 65% · Internal scenario

Present value:

> R$ 25,8 mi

Open protections:

* Accounting-policy consistency;
* seller information rights;
* buyer-interference protection;
* independent expert mechanism.

State:

> Commercially acceptable · Legal protections incomplete

---

# 33. Escrow and holdback

Recommended fields:

* Amount;
* percentage;
* duration;
* purpose;
* custodian;
* release schedule;
* claim mechanics;
* minimum claim;
* aggregate threshold;
* cap;
* interest;
* dispute mechanism;
* set-off;
* surviving claims.

## UX rule

Escrow and holdback should remain distinct.

### Escrow

Funds held by an independent or designated third party.

### Holdback

Buyer retains payment directly.

The product may flag structural concerns based on configured playbooks, but counsel must review the final mechanism.

---

# 34. Escrow release schedule

Example:

> **R$ 23,6 mi escrow**

Release:

* 50% after 12 months;
* 50% after 24 months;
* unresolved claims retained separately.

Purpose:

* Tax;
* labor;
* identified legal contingencies.

Source dependencies:

* Tax finding TAX-014;
* Labor finding LAB-006;
* Legal finding LEG-019.

This creates a direct link between diligence and negotiation.

---

# 35. Purchase-price mechanics

Recommended terms:

* Cash-free/debt-free;
* normalized working capital;
* locked box;
* completion accounts;
* leakage;
* permitted leakage;
* debt definition;
* cash definition;
* working-capital target;
* adjustment process;
* dispute process;
* measurement date.

## UX principle

Do not treat purchase-price mechanics as secondary legal detail.

They can materially alter actual proceeds.

---

# 36. Net debt and debt-like items

The Negotiation Room should import the current approved Valuation bridge.

Show:

* Approved net debt;
* proposed buyer definition;
* seller exclusions;
* disputed items;
* financial impact.

## Example

> Approved internal net debt
> R$ 58,6 mi

> Buyer-proposed net debt
> R$ 67,0 mi

Difference:

> **R$ 8,4 mi**

Disputed items:

* Deferred maintenance capex;
* employee bonuses;
* lease liabilities.

Action:

> Open EV-to-equity bridge

---

# 37. Working-capital terms

Display:

* Internal normalized target;
* buyer target;
* proposed collar;
* measurement method;
* seasonality;
* true-up;
* accountant resolution;
* estimated value impact.

## Example

> Internal target
> R$ 45,0 mi

> Buyer target
> R$ 48,0 mi

Estimated seller impact:

> **−R$ 3,0 mi**

---

# 38. Indemnification and risk allocation

Recommended fields:

* De minimis;
* basket;
* tipping or deductible structure;
* general cap;
* specific caps;
* survival periods;
* fraud exception;
* fundamental warranties;
* tax indemnity;
* labor indemnity;
* environmental indemnity;
* third-party claims;
* set-off;
* exclusive remedy;
* insurance.

The screen should present a structured commercial summary.

It should not attempt to replace counsel’s clause analysis.

---

# 39. Diligence-to-protection mapping

Each material diligence finding may map to:

* Price deduction;
* escrow;
* specific indemnity;
* condition precedent;
* representation;
* covenant;
* earn-out adjustment;
* excluded liability;
* insurance requirement;
* no commercial adjustment.

## Example

> **Tax-credit recoverability · R$ 11,4 mi**

Proposed protection:

* R$ 6,0 mi specific escrow;
* 24-month release;
* seller indemnity;
* independent-expert mechanism.

State:

> Seller counterproposal under review

---

# 40. Conditions

Recommended categories:

* Financing;
* regulatory approval;
* antitrust;
* shareholder approval;
* board approval;
* third-party consent;
* contract renewal;
* management retention;
* financing release;
* restructuring;
* carve-out completion;
* material adverse change;
* confirmatory diligence;
* exclusivity;
* documentation.

## State

* Proposed;
* accepted;
* rejected;
* modified;
* satisfied;
* waived;
* open;
* restricted.

---

# 41. Financing certainty

For buyer proposals, show:

* Fully funded;
* committed financing;
* conditional commitment;
* best efforts;
* financing condition;
* sponsor equity;
* debt commitment;
* evidence state.

## UX rule

Do not treat a nominally higher proposal with uncertain financing as economically equivalent to a fully funded proposal.

---

# 42. Exclusivity

Recommended fields:

* Duration;
* start;
* extension;
* scope;
* permitted discussions;
* fiduciary exceptions;
* break rights;
* milestones;
* automatic termination;
* remedies.

## Example

> **30-day exclusivity**

Concern:

> No automatic expiry if draft documentation is not delivered within ten business days.

Internal position:

> Accept 21 days with milestone-based extension.

---

# 43. Timetable

Track:

* Response deadline;
* term-sheet signing;
* confirmatory diligence;
* SPA/QPA draft;
* regulatory filing;
* signing;
* closing;
* long-stop date.

The timetable should expose dependencies.

Example:

> Signing target: 30 September
> At risk because financing documentation remains conditional.

---

# 44. Governance and management

Relevant terms:

* Board composition;
* reserved matters;
* management retention;
* founder role;
* employment;
* compensation;
* information rights;
* minority protections;
* veto rights;
* integration rights;
* transition period;
* succession.

These are especially important where consideration includes:

* Rollover equity;
* earn-out;
* minority investment;
* merger.

---

# 45. Restrictive covenants

Recommended fields:

* Non-compete;
* non-solicitation;
* geography;
* duration;
* scope;
* restricted business;
* employee restrictions;
* customer restrictions;
* carve-outs.

The screen should flag missing or unusually broad parameters according to institution-configured playbooks.

Legal acceptability remains counsel’s decision.

---

# 46. Term comparison matrix

## Purpose

Create a normalized side-by-side view across counterparties or rounds.

## Comparison modes

* Multiple bidders;
* Current versus previous round;
* External proposal versus internal counterproposal;
* Proposed versus agreed term sheet;
* Term sheet versus draft definitive agreement.

## Recommended rows

* Headline EV;
* cash at closing;
* deferred fixed consideration;
* earn-out;
* escrow;
* rollover equity;
* equity value;
* net-debt treatment;
* working-capital mechanism;
* indemnity cap;
* exclusivity;
* financing condition;
* management retention;
* expected closing;
* material conditions.

---

# 47. Multiple-bidder comparison

Example:

| Term                 | Northbridge |  Meridian |   Polaris |
| -------------------- | ----------: | --------: | --------: |
| Headline EV          |   R$ 472 mi | R$ 485 mi | R$ 458 mi |
| Cash at closing      |         85% |       70% |       90% |
| Earn-out             |         10% |       10% |         — |
| Rollover equity      |           — |       20% |         — |
| Escrow               |          5% |         — |       10% |
| Financing condition  |          No |   Partial |        No |
| Exclusivity          |     30 days |   45 days |   21 days |
| Expected proceeds    |   R$ 452 mi | R$ 445 mi | R$ 454 mi |
| Execution assessment |      Strong |  Moderate |    Strong |

## UX rule

The screen should expose the trade-off rather than visually declare a winner.

---

# 48. Differences-only mode

Users should be able to hide identical terms and review only meaningful differences.

Example:

> **7 material differences**

* Headline EV;
* cash at closing;
* earn-out;
* rollover equity;
* financing;
* exclusivity;
* working-capital target.

This is especially useful in later negotiation rounds.

---

# 49. Round comparison

Example:

| Term            | Northbridge R2 | Northbridge R3 |     Change |
| --------------- | -------------: | -------------: | ---------: |
| EV              |      R$ 465 mi |      R$ 472 mi |   +R$ 7 mi |
| Cash at closing |            80% |            85% |    +5 p.p. |
| Earn-out        |            15% |            10% |    −5 p.p. |
| Escrow          |             5% |             5% |          — |
| Exclusivity     |        45 days |        30 days |   −15 days |
| Earn-out period |      36 months |      24 months | −12 months |

Summary:

> Improved price, liquidity and timing. Earn-out safeguards remain unresolved.

---

# 50. Proposal-change detection

When a new proposal arrives, M&Ai should detect:

* Added terms;
* removed terms;
* changed values;
* changed definitions;
* changed conditions;
* changed timelines;
* changed source language;
* previously agreed terms reopened.

## Example

> **Previously agreed term reopened**

Round 2:

> Escrow capped at 5%.

Round 3:

> Buyer draft permits an additional specific tax escrow.

State:

> Material deviation · Legal and commercial review required

---

# 51. Negotiation rounds

## Purpose

Preserve the chronological progression of commercial positions.

Each round should contain:

* Round number;
* date;
* initiating party;
* proposal;
* response;
* open terms;
* concessions;
* approvals;
* communication;
* outcome.

## Round states

* Prepared;
* sent;
* received;
* under review;
* complete;
* superseded;
* stalled.

---

# 52. Negotiation timeline

Example:

> **Round 1 · 14 July**
> Initial indication received at R$ 450 mi.

> **Round 2 · 20 July**
> Seller countered at R$ 480 mi with 90% cash.

> **Round 3 · 27 July**
> Buyer increased EV to R$ 472 mi and reduced earn-out.

> **Current**
> Internal response awaiting Deal Lead approval.

## UX direction

The timeline should highlight material movements.

It should not become a feed of every comment or document open.

---

# 53. Concession ledger

## Purpose

Track what each party gave, received and reserved.

## Required fields

* Term;
* prior position;
* new position;
* party;
* round;
* stated rationale;
* economic effect;
* risk effect;
* linked reciprocal concession;
* authority;
* state.

## Example

> **Seller concession**

EV:

> R$ 480 mi → R$ 472 mi

Received:

* Cash at closing increased from 80% to 85%;
* earn-out reduced from 15% to 10%;
* exclusivity reduced from 45 to 30 days.

Assessment:

> Economically balanced

---

# 54. Give/get analysis

A concession should not be evaluated in isolation.

Example:

| Seller gives               | Seller receives                   |
| -------------------------- | --------------------------------- |
| R$ 8 mi headline value     | +5 p.p. cash at closing           |
| Accepts 5% escrow          | Earn-out reduced by 5 p.p.        |
| Accepts 30-day exclusivity | Buyer removes financing condition |

## UX principle

M&Ai may calculate indicative trade-offs, but the banker determines whether they are strategically equivalent.

---

# 55. Open asks

Recommended queue:

* Increase cash at closing to 90%;
* reduce escrow to 5%;
* shorten earn-out to 18 months;
* remove financing condition;
* set working-capital target at R$ 45 mi;
* limit exclusivity to 21 days;
* confirm management autonomy;
* define independent-expert process.

Each ask should show:

* Owner;
* priority;
* current counterparty position;
* fallback position;
* status;
* next round.

---

# 56. Internal position

The internal negotiation position should be separate from external proposals.

Recommended elements:

* Preferred outcome;
* acceptable range;
* fallback;
* walk-away condition;
* non-negotiable terms;
* optional trade-offs;
* approval authority;
* disclosure restriction.

## Example

> **Internal position · Restricted**

Preferred:

* EV at or above R$ 472 mi;
* at least 90% cash at closing;
* maximum 5% escrow;
* earn-out no longer than 18 months;
* exclusivity no longer than 21 days.

Fallback:

* EV at or above R$ 465 mi;
* 85% cash;
* 10% earn-out;
* 5% escrow.

Walk-away:

> Restricted to Deal Lead and Client Principal.

---

# 57. Internal-position confidentiality

Potentially sensitive fields:

* Reservation value;
* walk-away value;
* preferred counterparty;
* client urgency;
* relationship pressure;
* negotiation leverage;
* undisclosed alternative proposal;
* concession capacity;
* internal utility assumptions.

These should support field-level restrictions.

A legal reviewer may need to see:

* Approved external term position;

without seeing:

* Seller’s minimum acceptable price.

---

# 58. Mandate and authority constraints

The screen should show whether a proposed response remains within authorized parameters.

Example policies:

* EV below R$ 465 mi requires client approval;
* escrow above 5% requires Deal Lead approval;
* exclusivity over 30 days requires Partner approval;
* rollover equity requires tax and legal review;
* earn-out above 10% requires client approval;
* financing condition is prohibited without Partner exception.

## UX rule

These constraints should be explicit and versioned.

---

# 59. BATNA and reservation positions

The Negotiation Room may support:

* Best alternative to negotiated agreement;
* reservation conditions;
* alternative bidder status;
* timing pressure;
* value range;
* execution probability.

## Recommended treatment

Use:

> **Internal alternatives**

rather than displaying game-theory jargon by default.

Advanced users may reveal:

* BATNA;
* reservation value;
* estimated negotiation zone.

## Critical warning

Counterparty reservation positions are estimates unless explicitly known.

Use:

> **Estimated buyer range**

not:

> Buyer walk-away price.

---

# 60. ZOPA representation

The Zone of Possible Agreement may be displayed as an internal scenario.

Example:

> Seller approved range
> R$ 465 mi–R$ 485 mi

> Estimated buyer range
> R$ 455 mi–R$ 478 mi

> Illustrative overlap
> **R$ 465 mi–R$ 478 mi**

Supporting:

> Based on approved seller position and inferred buyer behavior. Buyer range is not confirmed.

## UX rule

Do not present the overlap as a guaranteed agreement zone.

---

# 61. Preference model

The screen may model preferences such as:

## Seller

* Headline value;
* cash at closing;
* certainty;
* limited escrow;
* limited earn-out;
* short timetable;
* management autonomy;
* low conditionality.

## Buyer

* Lower price;
* deferred consideration;
* protection against contingencies;
* performance alignment;
* control;
* confirmatory diligence;
* financing flexibility.

## Requirement

Every preference should have:

* Source;
* owner;
* state;
* weight;
* confidentiality;
* last review.

---

# 62. Utility analysis

Utility analysis may help compare non-equivalent structures.

Example dimensions:

* Value;
* liquidity;
* certainty;
* timing;
* risk allocation;
* control;
* execution feasibility.

## Recommended display

> **Seller alignment: Strong**

Drivers:

* 85% cash at closing;
* limited escrow;
* acceptable headline value.

Concerns:

* Earn-out governance;
* 30-day exclusivity.

Secondary advanced value:

> Internal utility index: 0,78

## UX rule

The index must remain secondary.

Do not display:

> Best proposal: 0,81

without explaining the underlying trade-offs.

---

# 63. Deterministic economic analysis

The following calculations should be deterministic where inputs are explicit:

* Consideration reconciliation;
* cash-at-closing amount;
* deferred-payment present value;
* probability-weighted earn-out;
* escrow release schedule;
* expected proceeds;
* working-capital adjustment;
* net-debt adjustment;
* dilution;
* equity rollover;
* concession value bridge.

The professional judgments remain:

* Probability;
* discount rate;
* utility weights;
* risk preferences;
* strategic importance;
* counterparty credibility.

---

# 64. Recommended alternatives

M&Ai should present multiple response structures.

A default set of three is appropriate:

1. **Liquidity-focused**
2. **Value-preservation**
3. **Balanced**

This aligns with the current repository’s structured negotiation output, while the UI should remain capable of supporting more or fewer alternatives when required.

## UX language

Use:

> **Suggested alternatives**

not:

> Optimal answers.

---

# 65. Liquidity-focused alternative

Example:

> **R$ 465 mi headline EV**

* 90% cash at closing;
* 5% earn-out;
* 5% escrow;
* 18-month earn-out;
* 21-day exclusivity.

Trade-off:

> Lower headline value, higher immediate proceeds and lower contingent exposure.

---

# 66. Value-preservation alternative

Example:

> **R$ 480 mi headline EV**

* 75% cash at closing;
* 15% rollover equity;
* 10% earn-out;
* no general escrow;
* 30-day exclusivity.

Trade-off:

> Highest headline value, greater future-value and liquidity risk.

---

# 67. Balanced alternative

Example:

> **R$ 472 mi headline EV**

* 85% cash at closing;
* 10% earn-out;
* 5% escrow;
* 24-month earn-out;
* 21-day exclusivity.

Trade-off:

> Preserves current headline value while improving liquidity and limiting risk.

---

# 68. Alternative comparison

| Dimension         | Liquidity | Value preservation |  Balanced |
| ----------------- | --------: | -----------------: | --------: |
| Headline EV       | R$ 465 mi |          R$ 480 mi | R$ 472 mi |
| Cash at closing   |       90% |                75% |       85% |
| Earn-out          |        5% |                10% |       10% |
| Rollover          |         — |                15% |         — |
| Escrow            |        5% |                  — |        5% |
| Expected proceeds | R$ 455 mi |          R$ 449 mi | R$ 452 mi |
| Certainty         |      High |           Moderate |      High |
| Seller alignment  |    Strong |           Moderate |    Strong |

## UX rule

Do not automatically select the highest expected value.

The user should consider:

* Client objectives;
* liquidity;
* timing;
* risk;
* strategic partner;
* execution certainty.

---

# 69. Trade-off frontier

An advanced view may plot:

* Expected proceeds;
* cash certainty;
* execution risk;
* duration;
* control.

This should be presented as:

> **Trade-off frontier**

not:

> Optimal deal curve.

Every plotted structure should be selectable and explainable.

A structured table must remain available.

---

# 70. Nash or equilibrium analysis

The current repository includes Nash-style utility modeling and bilateral optimization.

This may be useful as an advanced analytical aid.

Recommended banker-facing treatment:

> **Balanced-interest analysis**

Display:

* Whether both parties’ configured minimum conditions are satisfied;
* which terms drive alignment;
* where the structure remains unstable;
* what assumptions produced the result.

## UX rule

Never state:

> Nash equilibrium achieved, therefore accept.

A mathematical equilibrium depends on modeled preferences and does not establish legal, commercial or strategic acceptability.

---

# 71. Alternative-generation safeguards

Every generated alternative should disclose:

* Input proposal;
* internal preferences;
* hard constraints;
* valuation version;
* diligence findings;
* probability assumptions;
* optimization method;
* unresolved terms;
* generation time.

Alternatives should be invalidated or marked stale when those inputs change.

---

# 72. Diligence integration

The Negotiation Room should import approved findings and their current treatment.

Example:

> **Customer concentration**

Approved finding:

> Top three customers represent 41,2% of revenue.

Current negotiation treatment:

* 5% earn-out;
* customer-retention metric;
* buyer information rights;
* no direct price reduction.

State:

> Treatment under review

## UX principle

The same risk should not be reflected unknowingly in:

* Lower price;
* earn-out;
* escrow;
* indemnity;
* valuation downside.

Potential duplication should be flagged.

---

# 73. Valuation integration

The screen should show the current approved valuation and proposed updates.

Example:

> **Approved internal valuation**

R$ 438 mi–R$ 478 mi
Risk-adjusted scenario v4

> **Northbridge proposal**

R$ 472 mi headline EV
R$ 452 mi expected seller proceeds

Assessment:

> Headline value is within the approved range. Expected proceeds are below the valuation midpoint because of contingent consideration.

---

# 74. Valuation-deviation warning

Example:

> **Internal threshold exceeded**

Proposed counteroffer:

> R$ 490 mi

Approved valuation high:

> R$ 478 mi

Explanation:

> The proposed position exceeds the approved valuation by R$ 12 mi.

This may be permissible as negotiation strategy, but it should require:

* Rationale;
* authority;
* disclosure state.

---

# 75. Double-counting controls

Potential duplicate treatment:

> Customer concentration currently affects:

* Valuation downside;
* earn-out metric;
* escrow;
* specific indemnity.

Alert:

> **Potential cumulative treatment**

Action:

* Review combined impact;
* retain with rationale;
* remove one protection;
* request specialist review.

---

# 76. Internal recommendation

The screen may provide a structured recommendation.

Example:

> **Recommended internal response**

Use the Balanced alternative, subject to:

1. Earn-out period reduced to 18 months;
2. metric changed to recurring revenue or adjusted EBITDA;
3. independent verification rights added;
4. exclusivity reduced to 21 days;
5. working-capital target fixed at R$ 45 mi.

Basis:

* Approved valuation;
* liquidity preference;
* client mandate;
* diligence risks;
* execution probability.

State:

> Analyst proposal · Not approved

---

# 77. Recommendation anatomy

Every recommendation should include:

* Proposed action;
* economic effect;
* risk effect;
* supporting evidence;
* unresolved assumptions;
* required approval;
* alternative options.

Avoid:

> Accept Northbridge.

Prefer:

> **Proceed with a counterproposal based on the Balanced structure, subject to five unresolved protections.**

---

# 78. Approval architecture

Negotiation requires several distinct approvals.

## Proposal review

Confirms the extracted terms are accurate.

## Internal position approval

Authorizes the team’s negotiation parameters.

## Counterproposal approval

Authorizes a specific response.

## Client approval

Confirms the client’s commercial instruction.

## Legal approval

Confirms the draft accurately implements the commercial intent and is suitable for circulation.

## Outreach or communication authorization

Allows the response to be transmitted.

## Term-sheet approval

Authorizes signature or agreement in principle.

These approvals should not be collapsed into one status.

---

# 79. Approval gate

Before a counterproposal is approved, show:

* Counterparty;
* proposal round;
* proposed response;
* value movement;
* cash movement;
* deferred and contingent consideration;
* concessions;
* unresolved risks;
* mandate deviations;
* legal-review state;
* client-review state;
* communication consequence.

## Example

> **Approve Northbridge counterproposal R4?**

Economic position:

* R$ 472 mi EV;
* 90% cash;
* 5% earn-out;
* 5% escrow.

Changes:

* Cash +5 p.p.;
* earn-out −5 p.p.;
* exclusivity 30 → 21 days;
* headline value unchanged.

Open issue:

> Earn-out audit rights require counsel review.

---

# 80. Approval actions

* Approve response;
* approve with conditions;
* request changes;
* reject;
* escalate;
* assign legal review;
* request client decision;
* withdraw response.

## Approve with conditions

Example:

> Approved subject to legal confirmation that the earn-out information-rights language is included.

The condition should create a blocking task.

---

# 81. Authority thresholds

Approval authority may depend on:

* Price;
* value deviation;
* cash percentage;
* earn-out percentage;
* escrow percentage;
* exclusivity period;
* financing condition;
* rollover equity;
* governance rights;
* material concession;
* manual override.

## Example

* Deal Lead may approve within approved value range;
* Partner approval required below R$ 465 mi;
* client approval required for earn-out above 10%;
* legal approval required before external term-sheet circulation.

---

# 82. Client approval

The client-facing approval view should show:

* Concise proposal summary;
* economics;
* key risks;
* recommendation;
* alternatives;
* explicit decision.

It should hide:

* Internal utility scores;
* banker strategy;
* confidential counterparty assessments;
* undisclosed reservation positions;
* privileged legal notes.

## Client actions

* Approve recommended response;
* select alternative;
* request changes;
* reject;
* schedule discussion;
* add restriction.

---

# 83. Communication control

No response should be treated as externally communicated until explicitly recorded or sent through an authorized integration.

## Communication states

* Draft;
* internal review;
* client approved;
* legal approved;
* authorized;
* sent;
* acknowledged;
* responded;
* withdrawn.

## Required metadata

* Sender;
* recipient;
* channel;
* message;
* attached proposal;
* approval;
* timestamp;
* confidentiality.

---

# 84. Draft response

M&Ai may prepare:

* Email response;
* counterproposal summary;
* term-sheet markup instructions;
* call brief;
* client-update note;
* counsel instruction.

## UX principle

Draft language should be generated from the approved structured position.

The structured terms remain authoritative.

---

# 85. External send boundary

In the initial product, it may be safer to support:

> **Mark as communicated**

after the banker sends the response through existing channels.

Later integrations may support actual transmission.

Even then, transmission must require:

* Final preview;
* explicit authorization;
* confirmed recipient;
* approved attachment;
* confidentiality check.

---

# 86. Call-note capture

After a negotiation call, the user may record:

* Participants;
* date;
* summary;
* positions communicated;
* verbal concessions;
* unresolved asks;
* next actions;
* follow-up date.

M&Ai may suggest term changes based on the note, but the user must validate them.

A verbal indication should not become an agreed term automatically.

---

# 87. Term-sheet generation

The Negotiation Room may generate a term-sheet preview from approved structured terms.

Appropriate outputs:

* Commercial summary;
* non-binding term sheet;
* letter of intent;
* counsel instruction sheet;
* term-sheet schedule;
* proposal comparison appendix.

## Required metadata

* Deal;
* counterparty;
* proposal version;
* approved terms version;
* generated by;
* approval state;
* confidentiality;
* legal-review status.

---

# 88. Term-sheet status

Recommended states:

* Not started;
* draft;
* internal review;
* client review;
* legal review;
* approved for circulation;
* sent;
* redlines;
* agreed in principle;
* signed;
* expired;
* terminated;
* superseded.

## UX rule

A generated PDF does not mean a term sheet is approved or signed.

---

# 89. Redline comparison

The screen should support structured comparison between:

* Approved commercial terms;
* Generated draft;
* Counterparty markup;
* Signed term sheet.

## Example

> **Commercial deviation detected**

Approved:

> 5% escrow for 18 months.

Counterparty draft:

> 10% escrow for 24 months.

Impact:

> Additional R$ 23,6 mi retained for six more months.

Action:

> Review deviation

---

# 90. Term-sheet-to-closing handoff

When terms are agreed, the system should create an immutable commercial baseline.

## Handoff should include

* Agreed price;
* consideration;
* purchase-price mechanics;
* earn-out;
* escrow;
* conditions;
* timetable;
* governance;
* restrictive covenants;
* unresolved drafting items;
* source document;
* approval record;
* signed artifact.

## Consequence

Closing should use this baseline to compare:

> Approved term sheet versus definitive agreement.

---

# 91. Handoff gate

Before transfer to Closing, verify:

* Commercial terms approved;
* legal review complete;
* client approval complete;
* signed or agreed source attached;
* unresolved terms identified;
* closing owners assigned;
* target signing date set.

Primary action:

> **Transfer agreed terms to Closing**

---

# 92. Negotiation history

The History view should distinguish:

* Proposal received;
* proposal normalized;
* term validated;
* alternative generated;
* internal position changed;
* approval requested;
* approval completed;
* counterproposal communicated;
* concession recorded;
* client instruction;
* counsel review;
* term sheet signed;
* transfer to Closing.

## Actor distinction

* Banker;
* client;
* legal counsel;
* counterparty;
* M&Ai agent;
* deterministic engine;
* document source.

---

# 93. Decision history

Every material decision should preserve:

* Decision;
* alternatives considered;
* selected option;
* rationale;
* authority;
* decision-maker;
* supporting proposal;
* economic impact;
* conditions;
* timestamp.

Example:

> **Balanced counterproposal approved**

Rationale:

> Preserves headline value, improves cash certainty and reduces earn-out duration.

Approved by:

> Marina Alves · Deal Lead

Client approval:

> Helena Duarte · Seller representative

---

# 94. Negotiation brief

The screen should be able to generate an internal brief containing:

* Current proposal;
* transaction valuation;
* proposal economics;
* open material terms;
* concessions to date;
* internal position;
* recommended alternatives;
* required approvals;
* next interaction;
* supporting evidence.

The brief should clearly identify:

> **Internal and confidential**

---

# 95. Tasks and next actions

Recommended tasks:

* Validate proposal extraction;
* review net-debt definition;
* approve counterproposal;
* obtain client instruction;
* resolve earn-out language;
* review conflict with valuation;
* request financing evidence;
* prepare call brief;
* confirm exclusivity;
* transfer agreed terms to Closing.

Each should link to the exact term or proposal context.

---

# 96. Contextual Copilot

Suggested prompts:

* Compare the latest Northbridge and Polaris proposals.
* Explain why the highest headline offer is not the highest expected proceeds.
* What changed from Northbridge Round 2 to Round 3?
* Show every unresolved material term.
* Which diligence findings are reflected in escrow?
* Identify possible double counting.
* Prepare three counterproposal alternatives.
* Draft the client decision brief.
* Which terms deviate from the approved mandate?
* Compare the signed term sheet with the approved position.
* Prepare instructions for legal counsel.
* Summarize concessions made in each round.

## Response requirements

The Copilot should:

* Use the active proposal version;
* cite original proposal clauses;
* distinguish external terms from internal positions;
* show assumptions;
* identify restricted fields;
* never communicate externally;
* avoid declaring a single mandatory outcome;
* distinguish commercial analysis from legal advice.

---

# 97. Recommended desktop layout

For a **1440 × 900** canvas:

| Region                       | Approximate width |
| ---------------------------- | ----------------: |
| Compact global sidebar       |          72–80 px |
| Proposal and round navigator |        220–260 px |
| Main term workspace          |        600–720 px |
| Economic and approval panel  |        360–440 px |
| Page padding                 |          24–32 px |

## Recommended composition

```text
┌────────┬─────────────────────────────────────────────────────────────┐
│ Global │ Negotiation Room · Northbridge R3 · Response due tomorrow │
│ shell  ├─────────────────────────────────────────────────────────────┤
│        │ Overview Proposals Comparison Alternatives Approvals ...   │
│        ├──────────────┬──────────────────────────┬───────────────────┤
│        │ Proposals    │ Current proposal         │ Economic impact   │
│        │              │                          │                   │
│        │ Northbridge  │ R$ 472 mi EV             │ Cash close        │
│        │ R3 · Current │ 85% cash                 │ R$ 401,2 mi       │
│        │              │ 10% earn-out             │                   │
│        │ Meridian R2  │ 5% escrow                │ Expected proceeds │
│        │ Polaris R2   │                          │ R$ 451,7 mi       │
│        │              │ Open terms               │                   │
│        │              │ Earn-out protections     │ Approval          │
│        │              │ Working capital          │ Deal Lead         │
│        │              │ Exclusivity              │ [ Review response]│
└────────┴──────────────┴──────────────────────────┴───────────────────┘
```

---

# 98. Comparison layout

```text
┌────────────────────────────────────────────┬─────────────────────────┐
│ Proposal comparison                        │ Selected difference     │
│                                            │                         │
│             Northbridge Meridian Polaris   │ Earn-out                │
│ EV          R$472m      R$485m   R$458m    │                         │
│ Cash        85%         70%      90%        │ Northbridge: 10%        │
│ Earn-out    10%         10%      —          │ 24 months              │
│ Rollover    —           20%      —          │                         │
│ Escrow      5%          —        10%        │ Safeguards incomplete  │
│                                            │                         │
│ Expected    R$452m      R$445m   R$454m    │ [ Open clause ]        │
└────────────────────────────────────────────┴─────────────────────────┘
```

---

# 99. Alternative layout

```text
┌────────────────────────────────────────────────────────────────────┐
│ Counterproposal alternatives                                       │
├──────────────────────┬──────────────────────┬──────────────────────┤
│ Liquidity focused    │ Value preservation   │ Balanced             │
│                      │                      │                      │
│ R$ 465 mi            │ R$ 480 mi            │ R$ 472 mi            │
│ 90% cash             │ 75% cash             │ 85% cash             │
│ 5% earn-out          │ 15% rollover         │ 10% earn-out         │
│ 5% escrow            │ 10% earn-out         │ 5% escrow            │
│                      │                      │                      │
│ High certainty       │ Highest headline     │ Strong balance       │
│                      │                      │                      │
│ [ Select ]           │ [ Select ]           │ [ Select ]           │
└──────────────────────┴──────────────────────┴──────────────────────┘
```

---

# 100. UI design direction

## Overall character

Aim for:

> **A controlled transaction war room with financial precision and legal restraint**

The screen should feel:

* Confidential;
* strategic;
* analytical;
* deliberate;
* versioned;
* accountable;
* calm under pressure.

It should not feel:

* Gamified;
* adversarial;
* like a trading terminal;
* like a sales CRM;
* like a legal-document editor;
* like an AI chess game;
* like an automated deal selector.

---

# 101. Visual hierarchy

Prioritize:

1. Current authoritative proposal;
2. headline and actual economics;
3. material open terms;
4. differences from prior round;
5. internal approved position;
6. required decision;
7. deadline;
8. source and calculation detail.

Do not prioritize:

* Utility score;
* agent activity;
* number of messages;
* number of document pages;
* decorative bidder logos.

---

# 102. Color application

Use the M&Ai foundation:

* Canvas Cream: `#F3F0EE`;
* Lifted Cream: `#FCFBFA`;
* Ink Black: `#141413`;
* Signal Orange: `#CF4500`;
* Light Signal Orange: `#F37338`;
* Dust Taupe: `#D1CDC7`;
* Slate Gray: `#696969`.

## Semantic use

* Current proposal: Ink Black or strong neutral;
* internal draft: blue-neutral;
* approval required: Signal Orange;
* agreed term: green;
* rejected or withdrawn: muted red;
* reopened term: red-orange;
* counterparty position: neutral;
* internal restricted position: dark neutral;
* stale analysis: gray.

Do not use green for higher value and red for lower value.

The economic desirability of a proposal depends on more than price.

---

# 103. Typography

Use **Sofia Sans**.

| Element           |     Size |  Weight |
| ----------------- | -------: | ------: |
| Page title        | 26–30 px | 500–600 |
| Headline value    | 28–36 px | 500–600 |
| Expected proceeds | 22–28 px | 550–650 |
| Counterparty      | 16–20 px | 600–700 |
| Section title     | 15–17 px | 650–700 |
| Term value        | 14–17 px | 550–650 |
| Body              | 13–15 px | 450–500 |
| Metadata          | 12–13 px | 450–550 |
| Status            | 11–12 px | 650–700 |

Use tabular figures for:

* Currency;
* percentages;
* dates;
* periods;
* valuation ranges;
* concession movements.

---

# 104. Geometry and density

Recommended:

* Main analytical surfaces: 6–10 px radius;
* proposal rows: 56–68 px;
* term rows: 40–52 px;
* alternative cards: 8–12 px radius;
* status tags: compact pills;
* selected term: restrained highlight;
* drawers: flush to viewport.

Avoid:

* Large rounded bidder cards;
* oversized logos;
* heavy shadows;
* circular utility gauges;
* decorative gradients;
* excessive card fragmentation.

---

# 105. UX design principles

## 105.1 External proposal before internal interpretation

Users should always be able to verify the original proposal language.

## 105.2 Nominal value before economic adjustment—but never alone

Headline price should remain visible, alongside timing and conditionality.

## 105.3 Terms before score

Structured terms are more important than utility indices.

## 105.4 Current versus authoritative

The latest document is not necessarily the approved negotiation position.

## 105.5 Internal versus external

Never visually merge internal strategy with terms communicated to the counterparty.

## 105.6 Multiple alternatives

Present trade-offs rather than one mandatory answer.

## 105.7 Explicit assumptions

Expected proceeds and utility analysis must disclose probability and discount assumptions.

## 105.8 Preserve every round

Prior proposals and approvals should remain immutable.

## 105.9 Concessions require reciprocity context

Track what was received in return.

## 105.10 Human authorization before communication

No external position may be sent or recorded as sent without approval.

## 105.11 Legal terms remain counsel-reviewed

Commercial normalization does not establish legal equivalence.

## 105.12 Exact handoff

Closing must receive the approved commercial baseline, not a generated summary alone.

---

# 106. System states

## 106.1 Negotiation not started

> **No active negotiation**

Possible actions:

* Import proposal;
* define internal position;
* open Buyer Universe;
* create preliminary offer.

## 106.2 Proposal received

> **Extraction review required**

Show:

* Source;
* terms extracted;
* ambiguities;
* missing fields.

## 106.3 Proposal incomplete

> **Material terms missing**

Examples:

* No financing evidence;
* no working-capital mechanism;
* escrow duration undefined;
* response deadline unclear.

## 106.4 Extraction conflict

> **Source language is ambiguous**

Require human interpretation.

## 106.5 Internal position missing

> **Define approved negotiation parameters before preparing a response.**

## 106.6 Valuation stale

> **Negotiation analysis may be stale**

Approved valuation changed after this proposal was analyzed.

## 106.7 Finding changed

> **Risk treatment requires review**

A linked diligence finding changed or was rejected.

## 106.8 Response awaiting approval

Disable external communication.

## 106.9 Client approval pending

Internal approval may be complete, but communication remains blocked.

## 106.10 Legal review pending

Term-sheet circulation remains blocked where legal review is required.

## 106.11 Deadline imminent

> **Response due in 3 hours**

Do not use aggressive countdown animation.

## 106.12 Proposal expired

Retain for history and allow controlled reopening.

## 106.13 Counterparty withdrew

Retain all rounds and decisions.

## 106.14 Agreement in principle

Show unresolved drafting and closing dependencies.

## 106.15 Restricted negotiation

> **Negotiation details restricted**

Do not leak values, counterparty identities or internal positions.

## 106.16 Archived deal

Read-only proposals, rounds, terms, decisions and artifacts.

## 106.17 Offline

Allow review of safely cached approved data where policy permits.

Disable:

* Approval;
* communication;
* proposal import;
* generation;
* state changes.

---

# 107. Responsive behavior

## Desktop — 1280 px and above

* Compact global sidebar;
* proposal navigator;
* comparison or term workspace;
* persistent economic and approval panel;
* side-by-side alternative comparison.

## Tablet — 768–1279 px

* Proposal navigator collapses;
* approval panel becomes drawer;
* fewer comparison columns;
* differences-only mode becomes default;
* alternative cards stack.

## Mobile — below 768 px

Recommended order:

1. Counterparty and round;
2. headline value;
3. cash and contingent consideration;
4. approval state;
5. key open terms;
6. changed terms;
7. preferred alternative;
8. deadline;
9. approval action.

Mobile should support:

* Proposal review;
* comments;
* internal approval;
* client approval;
* call-note capture.

Complex term editing and multi-bidder comparison remain desktop-first.

---

# 108. Accessibility requirements

The Negotiation Room should support:

* Accessible comparison tables;
* row headers for term names;
* keyboard proposal navigation;
* visible focus;
* no color-only term state;
* screen-reader announcement of proposal changes;
* explicit value basis;
* correct reading of negative amounts;
* distinction between percentages and percentage points;
* accessible concession bridges;
* textual alternatives for trade-off charts;
* minimum 44 × 44 px targets;
* descriptive approval actions;
* explicit restricted-state descriptions;
* accessible source-clause links;
* keyboard-operable version selection;
* correct announcement of current and approved proposals.

Avoid links labeled:

> Review

Prefer:

> Review Northbridge Round 3 counterproposal

---

# 109. Figma component architecture

## `NegotiationHeader`

Properties:

* Not started;
* active;
* proposal received;
* approval pending;
* agreed in principle;
* signed;
* restricted.

## `NegotiationSummary`

Properties:

* Sell-side;
* buy-side;
* bilateral;
* multiple bidders;
* single counterparty.

## `ProposalNavigator`

Properties:

* Current;
* prior round;
* external;
* internal;
* superseded;
* withdrawn;
* restricted.

## `ProposalRegistry`

States:

* Populated;
* filtered;
* empty;
* loading;
* error;
* restricted.

## `ProposalRow`

Properties:

* Received;
* extraction review;
* under review;
* countered;
* accepted;
* rejected;
* superseded;
* expired.

## `ProposalEconomics`

Properties:

* Enterprise value;
* equity value;
* cash;
* deferred;
* earn-out;
* escrow;
* rollover;
* expected proceeds.

## `TermComparisonMatrix`

Properties:

* Multiple bidders;
* multiple rounds;
* internal versus external;
* approved versus draft;
* differences only.

## `NormalizedTermRow`

Properties:

* Validated;
* ambiguous;
* missing;
* changed;
* agreed;
* reopened;
* restricted.

## `SourceClauseInspector`

Properties:

* PDF;
* email;
* call note;
* term sheet;
* markup;
* unavailable.

## `ConsiderationBridge`

Properties:

* Cash;
* fixed deferred;
* contingent;
* rollover;
* escrow;
* non-reconciling.

## `EarnOutDetail`

Properties:

* Complete;
* protections missing;
* probability modeled;
* stale;
* restricted.

## `EscrowDetail`

Properties:

* Independent;
* holdback;
* phased release;
* claim open;
* legal review.

## `DiligenceProtectionMap`

Properties:

* Price;
* escrow;
* indemnity;
* condition;
* earn-out;
* no treatment;
* duplicate treatment.

## `NegotiationRoundTimeline`

Properties:

* Received;
* sent;
* complete;
* stalled;
* superseded.

## `ConcessionLedger`

Properties:

* Buyer;
* seller;
* paired;
* unreciprocated;
* approved;
* disputed.

## `InternalPosition`

Properties:

* Preferred;
* fallback;
* walk-away;
* restricted;
* stale;
* approved.

## `AlternativeScenarioCard`

Properties:

* Liquidity;
* value preservation;
* balanced;
* selected;
* invalid;
* stale.

## `TradeOffAnalysis`

Properties:

* Economic;
* liquidity;
* certainty;
* risk;
* utility;
* advanced.

## `NegotiationApprovalPanel`

States:

* Draft;
* submit;
* internal review;
* client review;
* legal review;
* approve;
* conditional approval;
* rejected.

## `TermSheetStatus`

Properties:

* Draft;
* review;
* approved;
* sent;
* redlines;
* agreed;
* signed;
* expired.

## `ClosingHandoffPanel`

States:

* Incomplete;
* ready;
* transferred;
* reopened.

---

# 110. Production object model

## `NegotiationWorkspace`

```text
id
dealId
status
activeCounterpartyId
activeProposalId
activeRoundId
internalPositionVersionId
currentTermSheetId
responseDeadline
confidentialityLevel
createdAt
updatedAt
```

## `NegotiationCounterparty`

```text
id
negotiationId
organizationId
candidateId
state
relationshipOwnerId
confidentialityLevel
latestProposalId
latestRoundNumber
createdAt
updatedAt
```

## `Proposal`

```text
id
negotiationId
counterpartyId
roundId
proposalType
version
sourceType
sourceDocumentId
sourceCommunicationId
status
currency
valueBasis
headlineValue
effectiveAt
responseDueAt
createdBy
validatedBy
createdAt
updatedAt
```

## `ProposalTerm`

```text
id
proposalId
termDefinitionId
normalizedValue
valueType
currency
percentage
duration
originalText
sourceLocation
state
interpretation
validatedBy
validatedAt
createdAt
updatedAt
```

## `TermDefinition`

```text
id
category
name
description
valueType
transactionTypes
jurisdictions
materialityPolicy
legalReviewRequired
createdAt
updatedAt
```

## `ConsiderationStructure`

```text
id
proposalId
cashAtClosing
fixedDeferred
earnOutMaximum
escrowAmount
holdbackAmount
rolloverValue
otherConsideration
reconciledTotal
reconciliationState
createdAt
updatedAt
```

## `EarnOutStructure`

```text
id
proposalId
amount
percentage
durationMonths
metric
threshold
target
cap
formula
paymentSchedule
accountingPolicy
auditRights
interferenceProtections
disputeMechanism
probabilityAssumption
presentValue
state
createdAt
updatedAt
```

## `EscrowStructure`

```text
id
proposalId
amount
percentage
structureType
custodian
durationMonths
releaseSchedule
purpose
claimMechanics
basket
cap
interestTreatment
disputeMechanism
state
createdAt
updatedAt
```

## `InternalPositionVersion`

```text
id
negotiationId
version
status
preferredTerms
fallbackTerms
hardConstraints
tradeableTerms
reservationConditions
authorityPolicyId
createdBy
approvedBy
approvedAt
createdAt
```

## `NegotiationPreference`

```text
id
internalPositionVersionId
party
dimension
importance
numericWeight
minimum
maximum
source
state
confidentialityLevel
createdAt
```

## `NegotiationAlternative`

```text
id
negotiationId
baseProposalId
internalPositionVersionId
title
alternativeType
terms
headlineValue
cashAtClosing
expectedProceeds
economicAssumptions
utilityAnalysis
constraintState
generationMethod
status
createdBy
createdAt
```

## `NegotiationRound`

```text
id
negotiationId
counterpartyId
roundNumber
startedAt
completedAt
initiatingParty
incomingProposalId
outgoingProposalId
openTermIds
outcome
status
createdAt
```

## `Concession`

```text
id
roundId
termDefinitionId
party
fromValue
toValue
economicImpact
riskImpact
reciprocalConcessionId
rationale
authorityId
state
createdAt
```

## `NegotiationApproval`

```text
id
negotiationId
proposalId
alternativeId
approvalType
requiredAuthority
assignedTo
status
conditions
comments
submittedAt
decidedBy
decidedAt
createdAt
```

## `NegotiationCommunication`

```text
id
negotiationId
counterpartyId
roundId
communicationType
channel
senderId
recipientIds
proposalId
artifactIds
summary
state
authorizedBy
sentAt
createdAt
```

## `TermSheetArtifact`

```text
id
negotiationId
counterpartyId
proposalId
version
status
documentId
commercialTermsSnapshot
generatedBy
legalReviewedBy
clientApprovedBy
signedAt
supersededBy
createdAt
```

## `ClosingHandoff`

```text
id
negotiationId
termSheetArtifactId
commercialBaseline
unresolvedDraftingItems
approvalSnapshot
transferredBy
transferredAt
closingWorkspaceId
state
createdAt
```

---

# 111. Suggested routes

Primary:

```text
/deals/:dealId/negotiation
```

Selected counterparty:

```text
/deals/:dealId/negotiation?counterparty=:counterpartyId
```

Selected proposal:

```text
/deals/:dealId/negotiation?proposal=:proposalId
```

Comparison:

```text
/deals/:dealId/negotiation?view=comparison&proposals=:id1,:id2,:id3
```

Round comparison:

```text
/deals/:dealId/negotiation?counterparty=:id&compareRounds=2,3
```

Alternatives:

```text
/deals/:dealId/negotiation?view=alternatives
```

Concessions:

```text
/deals/:dealId/negotiation?view=concessions
```

Approvals:

```text
/deals/:dealId/negotiation?view=approvals
```

Term sheet:

```text
/deals/:dealId/negotiation?view=term-sheet&version=:version
```

Closing handoff:

```text
/deals/:dealId/negotiation?panel=closing-handoff
```

---

# 112. Repository direction

The existing repository provides useful negotiation foundations.

It currently includes:

* A specialized Negotiation Agent;
* Structured term-sheet schemas;
* Cash, equity, earn-out and escrow fields;
* Buyer and seller utility values;
* Reservation-utility and Nash-equilibrium concepts;
* Negotiation-round payoff structures;
* Alternative term-sheet generation;
* Red-flag output;
* Non-compete duration;
* Arbitration selection;
* A genetic optimization engine;
* Term-sheet PDF generation.

These components are directionally useful, but they are not yet sufficient for a production banker workspace.

## Keep

* Structured outputs;
* Explicit term components;
* Multiple alternatives;
* Utility-analysis scaffolding;
* Negotiation rounds;
* Red flags;
* Deterministic financial calculations;
* Term-sheet artifact generation;
* Advisory guardrails.

## Reframe

### “Optimal proposal”

Replace banker-facing language with:

> Suggested balanced alternative

The current optimization output should not be represented as objectively optimal.

### Nash score

Keep as advanced internal analysis.

Do not use it as the primary recommendation.

### Exactly three alternatives

Use three as the default presentation, not an immutable product restriction.

### Legal rules

Move legal and jurisdictional rules into:

* Versioned playbooks;
* institution configuration;
* counsel-reviewed templates.

Do not hardcode current legal assumptions as universal product truth.

## Add

* Proposal domain;
* proposal versions;
* canonical term taxonomy;
* source citations;
* term validation;
* multiple counterparties;
* term comparison;
* economic proceeds calculation;
* internal-position versions;
* authority constraints;
* concession ledger;
* approval workflow;
* communication control;
* term-sheet status;
* closing handoff;
* stale dependency tracking;
* access controls;
* client-review view.

## Current-engine limitation

The existing genetic optimizer primarily searches combinations of:

* Value;
* cash;
* equity;
* earn-out;
* escrow;

against configured preferences.

That is a useful prototype, but it is too narrow to support real negotiation recommendations without:

* Constraint validation;
* legal-commercial term modeling;
* financing;
* purchase-price mechanics;
* governance;
* source evidence;
* counterparty credibility;
* explicit approval.

The product should not overstate the maturity of the optimizer.

---

# 113. What not to include

Avoid the following in the Negotiation Room:

* “AI says accept”;
* one optimal proposal;
* autonomous acceptance;
* autonomous outreach;
* hidden utility weights;
* unsupported counterparty intent;
* exact buyer walk-away values presented as fact;
* legal advice presented as definitive;
* one combined headline and expected value;
* cash and rollover treated equally;
* earn-out shown only as a percentage;
* escrow shown without purpose or duration;
* silent proposal extraction;
* silent term normalization;
* overwritten proposal rounds;
* hidden concessions;
* external and internal positions combined;
* client approvals inferred from comments;
* generated PDF treated as approved;
* signed term sheet edited in place;
* raw genetic-algorithm controls;
* technical agent prompts;
* real counterparties in the pitch mock;
* unsupported legal-market benchmarks;
* real counsel names without permission.

---

# 114. MOCKED — Pitch and demo specification

## 114.1 Purpose of the mocked screen

The mocked Negotiation Room should demonstrate that M&Ai continues from valuation into controlled transaction execution.

Its pitch narrative is:

> **M&Ai converts competing offers into comparable economics, exposes risk allocation and routes the approved response through human decision gates.**

This is a strong lifecycle-expansion screen and is appropriate for:

* A product-depth slide;
* A live demo;
* An appendix;
* Showing the path from valuation to closing.

The primary product hero should remain the Diligence Decision Room because it shows evidence, impact and approval simultaneously. The Negotiation Room is a strong supporting proof of lifecycle breadth. 

---

# 115. Mocked shell state

Institution:

> **Atlas M&A Advisory**

User:

> **Ana Costa · Vice President**

Deal:

> **Project Horizon**
> Atlas Industrial · Sell-side
> Negotiation · Restricted workspace

Breadcrumb:

> Deals / Project Horizon / Negotiation

Deal navigation:

* Overview;
* Dossier;
* Documents;
* Diligence;
* Valuation;
* Buyer Universe;
* **Negotiation**;
* Closing.

---

# 116. Mocked page header

Title:

> **Negotiation Room**

Description:

> Compare proposals and approve the next commercial position for Project Horizon.

Summary:

* **3 active bidders**
* **3 current proposals**
* **7 open material terms**
* **1 response awaiting approval**

Primary action:

> **Review counterproposal**

Secondary:

> Compare proposals

---

# 117. Mocked bidder proposals

## Northbridge Automation — selected

> **Round 3 · Current**

Headline EV:

> **R$ 472 mi**

Structure:

* 85% cash at closing;
* 10% earn-out;
* 5% escrow;
* no financing condition;
* 30-day exclusivity.

Expected seller proceeds:

> **R$ 452 mi**

State:

> Counterproposal awaiting approval

---

## Meridian Industrial Group

> **Round 2**

Headline EV:

> **R$ 485 mi**

Structure:

* 70% cash at closing;
* 20% rollover equity;
* 10% earn-out;
* partial financing condition;
* 45-day exclusivity.

Expected seller proceeds:

> **R$ 445 mi**

State:

> Clarification requested

---

## Polaris Technologies

> **Round 2**

Headline EV:

> **R$ 458 mi**

Structure:

* 90% cash at closing;
* no earn-out;
* 10% escrow;
* no financing condition;
* 21-day exclusivity.

Expected seller proceeds:

> **R$ 454 mi**

State:

> Client review complete

---

# 118. Mocked proposal comparison

| Term                 |   Northbridge |      Meridian |       Polaris |
| -------------------- | ------------: | ------------: | ------------: |
| Headline EV          | **R$ 472 mi** | **R$ 485 mi** | **R$ 458 mi** |
| Cash at closing      |           85% |           70% |           90% |
| Earn-out             |           10% |           10% |             — |
| Rollover equity      |             — |           20% |             — |
| Escrow               |            5% |             — |           10% |
| Financing condition  |            No |       Partial |            No |
| Exclusivity          |       30 days |       45 days |       21 days |
| Expected proceeds    |     R$ 452 mi |     R$ 445 mi |     R$ 454 mi |
| Execution assessment |        Strong |      Moderate |        Strong |

Selected comparison message:

> **Meridian has the highest headline value, while Polaris has the highest illustrative expected proceeds.**

---

# 119. Mocked Northbridge term details

## Value and consideration

> Enterprise value: R$ 472,0 mi
> Cash at closing: R$ 401,2 mi
> Earn-out maximum: R$ 47,2 mi
> Escrow: R$ 23,6 mi

## Earn-out

* 24 months;
* adjusted EBITDA;
* 10% maximum;
* audit rights incomplete;
* partial-achievement mechanics included.

## Escrow

* 5%;
* 24 months;
* 50% release after 12 months;
* remaining release after 24 months;
* tax and labor claims.

## Open terms

* Earn-out information rights;
* working-capital target;
* exclusivity;
* independent-expert process.

---

# 120. Mocked valuation context

Approved internal valuation:

> **R$ 438 mi–R$ 478 mi**

Scenario:

> Risk-adjusted v4

Northbridge headline EV:

> R$ 472 mi

Assessment:

> Within approved valuation range

Expected proceeds:

> R$ 452 mi

Assessment:

> Below approved valuation midpoint due to earn-out and escrow.

---

# 121. Mocked diligence linkage

## Customer concentration

> Top three customers represent 41,2% of LTM revenue.

Northbridge treatment:

* 10% earn-out;
* adjusted EBITDA metric;
* 24-month measurement period.

Issue:

> Potential overlap with the valuation downside already applied.

State:

> **Double-count review required**

---

## Tax-credit recoverability

> R$ 11,4 mi exposure remains partially unsupported.

Northbridge treatment:

* Included in general escrow.

Internal concern:

> No specific release condition defined.

---

# 122. Mocked negotiation rounds

## Round 1

> R$ 450 mi
> 75% cash · 15% earn-out · 10% escrow
> 45-day exclusivity

## Round 2

> R$ 465 mi
> 80% cash · 15% earn-out · 5% escrow
> 45-day exclusivity

## Round 3

> **R$ 472 mi**
> **85% cash · 10% earn-out · 5% escrow**
> **30-day exclusivity**

Movement:

* EV +R$ 22 mi;
* cash +10 p.p.;
* earn-out −5 p.p.;
* escrow −5 p.p.;
* exclusivity −15 days.

---

# 123. Mocked concession ledger

## Seller gave

* Reduced target EV from R$ 480 mi to R$ 472 mi.

## Seller received

* Cash increased from 80% to 85%;
* earn-out reduced from 15% to 10%;
* exclusivity reduced from 45 to 30 days;
* financing condition removed.

Assessment:

> **Balanced exchange**

---

# 124. Mocked alternatives

## Liquidity-focused

> **R$ 465 mi**

* 90% cash;
* 5% earn-out;
* 5% escrow;
* 18-month earn-out;
* 21-day exclusivity.

Expected proceeds:

> R$ 455 mi

---

## Value-preservation

> **R$ 480 mi**

* 75% cash;
* 15% rollover equity;
* 10% earn-out;
* no general escrow;
* 30-day exclusivity.

Expected proceeds:

> R$ 449 mi

---

## Balanced — recommended for review

> **R$ 472 mi**

* 90% cash;
* 5% earn-out;
* 5% escrow;
* 18-month earn-out;
* 21-day exclusivity.

Expected proceeds:

> **R$ 461 mi**

---

# 125. Mocked internal recommendation

> **Proceed with the Balanced counterproposal**

Required changes:

1. Cash at closing: 85% → 90%;
2. earn-out: 10% → 5%;
3. earn-out duration: 24 → 18 months;
4. exclusivity: 30 → 21 days;
5. working-capital target fixed at R$ 45 mi;
6. independent expert added for earn-out disputes.

State:

> **Deal Lead approval required**

---

# 126. Mocked approval panel

Title:

> **Approve Northbridge Counterproposal R4**

Headline EV:

> R$ 472 mi

Expected seller proceeds:

> R$ 461 mi

Changes from buyer proposal:

* Cash +5 p.p.;
* earn-out −5 p.p.;
* term −6 months;
* exclusivity −9 days.

Open condition:

> Legal review of earn-out protections.

Assigned to:

> Marina Alves · Deal Lead

Actions:

* **Approve with legal condition**
* Request changes
* Reject response

---

# 127. Mocked term-sheet status

> **Term Sheet v2**

State:

> Internal review

Completed:

* Commercial terms normalized;
* client approval received;
* valuation alignment confirmed.

Open:

* Earn-out language;
* working-capital definition;
* independent-expert clause.

Primary action:

> Review term-sheet deviations

---

# 128. Recommended static pitch composition

```text
┌──────────────────────────────────────────────────────────────────┐
│ Negotiation Room · Northbridge Round 3 · Approval required      │
├─────────────────────────────────┬────────────────────────────────┤
│ Current proposal                │ Internal counterproposal       │
│                                 │                                │
│ R$ 472 mi EV                    │ R$ 472 mi EV                   │
│ 85% cash                        │ 90% cash                       │
│ 10% earn-out                    │ 5% earn-out                    │
│ 5% escrow                       │ 5% escrow                      │
│                                 │                                │
│ Expected proceeds               │ Expected proceeds              │
│ R$ 452 mi                       │ R$ 461 mi                      │
├─────────────────────────────────┼────────────────────────────────┤
│ Open terms                      │ Human approval                 │
│ Earn-out protections            │ Deal Lead                      │
│ Working capital                 │                                │
│ Exclusivity                     │ [ Approve response ]           │
└─────────────────────────────────┴────────────────────────────────┘
```

This communicates:

* Current external proposal;
* internal alternative;
* economic consequence;
* unresolved terms;
* human approval.

---

# 129. Pitch-specific simplification

## Keep visible

* Negotiation Room;
* Northbridge Round 3;
* R$ 472 mi;
* current 85% cash;
* proposed 90% cash;
* expected proceeds;
* open terms;
* Deal Lead approval;
* Approve response.

## Hide

* Complete bidder registry;
* complete term matrix;
* BATNA;
* utility scores;
* full concession history;
* legal clauses;
* document sources;
* approval history;
* all three alternatives;
* complete term-sheet workflow.

## Readability requirement

At deck scale, these must remain readable:

* **Negotiation Room**
* **R$ 472 mi**
* **85% cash**
* **90% cash**
* **R$ 452 mi**
* **R$ 461 mi**
* **Human approval**
* **Approve response**

---

# 130. Recommended demo flows

## Flow A — Proposal to normalized terms

```text
Import Northbridge Round 3
  ↓
Extract proposal terms
  ↓
Review ambiguous earn-out language
  ↓
Validate normalized proposal
  ↓
Open comparison
```

## Flow B — Compare bidders

```text
Proposal comparison
  ↓
Northbridge, Meridian and Polaris
  ↓
Headline value versus expected proceeds
  ↓
Inspect consideration structure
  ↓
Select Northbridge for response
```

## Flow C — Diligence to negotiation protection

```text
Customer-concentration finding
  ↓
Open Negotiation treatment
  ↓
Review earn-out and valuation downside
  ↓
Potential double counting detected
  ↓
Modify counterproposal
```

## Flow D — Concession analysis

```text
Northbridge rounds
  ↓
Compare Round 1 and Round 3
  ↓
Review give/get ledger
  ↓
Prepare next counterproposal
```

## Flow E — Alternative selection

```text
Open Alternatives
  ↓
Compare Liquidity, Value and Balanced
  ↓
Select Balanced
  ↓
Adjust terms
  ↓
Submit for approval
```

## Flow F — Human approval

```text
Counterproposal R4
  ↓
Deal Lead review
  ↓
Approve with legal condition
  ↓
Legal task created
  ↓
Response authorized
```

## Flow G — Closing handoff

```text
Term sheet signed
  ↓
Compare signed terms with approved position
  ↓
Resolve one deviation
  ↓
Transfer commercial baseline
  ↓
Closing Control Room
```

---

# 131. UX prototype tasks to validate

Test with bankers using tasks such as:

1. Identify the current authoritative proposal.
2. Find the highest headline offer.
3. Find the highest expected-proceeds offer.
4. Explain why those offers differ.
5. Compare Northbridge Round 2 and Round 3.
6. Identify the largest concession.
7. Determine what was received in exchange.
8. Find every unresolved material term.
9. Inspect the original earn-out clause.
10. Determine whether the earn-out structure is complete.
11. Compare the offer with the approved valuation.
12. Identify possible double counting.
13. Review the internal preferred position.
14. Determine who can approve the response.
15. Prepare a counterproposal.
16. Compare three alternatives.
17. Approve the response with a condition.
18. Determine whether the response may be communicated.
19. Find the client’s decision.
20. Verify the signed term sheet against the approved terms.
21. Transfer the agreed position into Closing.
22. Return to the same proposal and term after inspecting the source.

## Measures

Record:

* Time to identify the current proposal;
* whether headline value and expected proceeds are confused;
* whether EV and equity value are confused;
* whether users understand contingent consideration;
* whether external and internal positions are distinguished;
* whether comparison reveals meaningful trade-offs;
* whether utility analysis is trusted;
* whether concession tracking is useful;
* whether approval states are clear;
* whether users understand the legal-review boundary;
* whether the screen feels overly complex;
* whether users still rely on parallel spreadsheets.

---

# 132. Design validation criteria

The Negotiation Room is ready for approval when:

1. Users immediately identify the current authoritative proposal.
2. External proposals and internal positions are visually distinct.
3. Headline value and expected proceeds remain separate.
4. Enterprise value and equity value remain separate.
5. Consideration reconciles to the proposal value.
6. Earn-out terms expose metric, duration and protections.
7. Escrow exposes purpose, duration and release.
8. Original proposal language remains accessible.
9. Normalized terms do not claim legal equivalence.
10. Every proposal is versioned.
11. Every negotiation round is preserved.
12. Prior agreed terms can be identified when reopened.
13. Multiple proposals can be compared consistently.
14. Differences-only mode exposes material changes.
15. Concessions show reciprocal value.
16. Internal reservation positions remain restricted.
17. Counterparty reservation values are labeled as estimates.
18. Utility scores never dominate recommendations.
19. Alternatives disclose their assumptions.
20. Diligence findings map to negotiation treatment.
21. Potential cumulative treatment is flagged.
22. Valuation alignment is visible.
23. Mandate deviations require authority.
24. Client and internal approval remain distinct.
25. Legal approval remains distinct from commercial approval.
26. No external response occurs without authorization.
27. Generated term sheets show their approval state.
28. Signed terms cannot be edited in place.
29. Closing receives an immutable commercial baseline.
30. Restricted negotiation data does not leak through search or Copilot.
31. The screen remains useful without the optimization engine.
32. The screen remains useful without Copilot.
33. Mobile supports review and approval.
34. Comparison tables are accessible.
35. The pitch mock remains fictional and readable.
36. The product does not overstate the current optimization maturity.
37. The system never presents a generated proposal as the only correct outcome.

---

# 133. Final design target

The correct design target is not:

> “An AI agent that wins the negotiation.”

It is:

> **A controlled commercial-decision workspace where bankers can normalize proposals, compare true economics, understand risk allocation, preserve negotiation history and authorize each external position without surrendering judgment, confidentiality or accountability.**

Its defining interaction is:

> **Capture the proposal → normalize the terms → compare the economics → understand the trade-offs → prepare alternatives → obtain approval → communicate the authorized position**

**Next iteration: Closing Control Room.**
