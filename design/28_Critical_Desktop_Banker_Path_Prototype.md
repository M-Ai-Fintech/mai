---
canonical_name: "Critical Desktop Banker Path Prototype"
definition_id: "BD-28"
definition_status: "Ready for owner review in MAI-94"
screen_family: "cross-screen-workflow"
owning_task: "MAI-94"
canonical_routes:
  - "/home"
  - "/deals"
  - "/deals/:dealId/overview"
  - "/deals/:dealId/documents"
  - "/deals/:dealId/diligence"
  - "/deals/:dealId/valuation"
  - "/deals/:dealId/matching"
  - "/deals/:dealId/negotiation"
figma_file_key: "otMJE31OKIxdXogV4RNbGQ"
figma_status: "Ready for owner review — bounded desktop MVP prototype in MAI-94"
figma_area: "MAI Banker Workspace — Design System & Product UI / 09 Critical Path Prototype / MAI-94 — Critical Desktop Banker Path"
figma_nodes:
  - "251:3323"
  - "251:1355"
  - "251:1455"
  - "251:1575"
  - "251:1909"
  - "251:3238"
  - "251:2275"
  - "251:2524"
  - "251:2773"
  - "251:3319"
  - "251:3396"
  - "251:3778"
  - "251:4043"
related_definitions:
  - "design/2_Command_Center.md"
  - "design/3_Deals_Portfolio.md"
  - "design/5_Deal_Overview.md"
  - "design/7_Documents_VDR.md"
  - "design/8_Diligence_Decision_Room.md"
  - "design/9_Valuation_Lab.md"
  - "design/10_Matching_Counterparty_Universe.md"
  - "design/11_Negotiation_Room.md"
  - "design/14_Tasks_Approvals.md"
  - "design/20_Deal_Activity_Audit.md"
  - "design/26_Cross_Screen_Interaction_Map.md"
  - "design/27_Shared_State_Model.md"
last_reviewed_task: "MAI-94"
implementation_capability_boundary: "Prototype authority only; interactions are Figma simulations. Production navigation, permissions, connector recovery, approval persistence, audit creation, external transmission, frontend behavior, and backend behavior remain unimplemented."
mock_demo_data_boundary: "Uses fictional Project Horizon, Northstar Foods, counterparties, object identifiers, financial values, and timestamps only."
---

# Critical Desktop Banker Path Prototype

## 1. Purpose

This document records the bounded MAI-94 desktop prototype authority used to validate the MVP implementation path before frontend work begins.

It is not a comprehensive product prototype and does not supersede the individual screen definitions or their authoritative Figma source frames.

## 2. Prototype location

- Figma page: `09 Critical Path Prototype`
- Section: `MAI-94 — Critical Desktop Banker Path`
- Section node: `251:3323`
- Named flow start: `MAI-94 Critical Desktop Banker Path`
- Flow-start node: `251:1355`

All prototype frames are contained inside the bounded section and use section-relative positioning.

## 3. Critical happy path

| Step | Workspace | Prototype node | Approved source authority | Context carried |
| --- | --- | --- | --- | --- |
| 1 | Command Center | `251:1355` | `193:957` | Atlas M&A Advisory, Ana Costa, prioritized Project Horizon work |
| 2 | Deals Portfolio | `251:1455` | `193:1258` | Deal selection `DL-HOR-042`; restricted portfolio values remain permission-safe |
| 3 | Deal Overview | `251:1575` | `205:662` | Project Horizon, Northstar Foods, Due Diligence, current blockers and decisions |
| 4 | Documents & VDR | `251:1909` | `205:3738` | Evidence `DOC-120` and approved fact `FAC-018`; simulated source boundary |
| 5 | Diligence Decision Room | `251:3238` | `52:21` | Finding `FND-014`, exact evidence, human decision authority |
| 6 | Valuation Lab | `251:2275` | `205:4234` | Scenario `VAL-HOR-03`, deterministic impact, approval state |
| 7 | Matching & Counterparty Universe | `251:2524` | `205:4436` | Criteria/shortlist `CRI-HOR-02`, recommendation and human shortlist boundary |
| 8 | Negotiation Room | `251:2773` | `239:3` | Proposed counteroffer, mandate constraints, no autonomous external communication |
| 9 | Human approval gate | `251:3319` | `57:87` | Approval `APR-HOR-07`, explicit human authorization before state change |
| 10 | Recorded audit outcome | `251:4043` | Negotiation state variant | Audit `AUD-HOR-31`, actor, timestamp, before/after context and object references |

The full context spine is:

```text
Atlas M&A Advisory
→ Ana Costa, Vice President
→ DL-HOR-042 Project Horizon
→ Northstar Foods
→ DOC-120
→ FAC-018
→ FND-014
→ VAL-HOR-03
→ CRI-HOR-02
→ APR-HOR-07
→ AUD-HOR-31
```

## 4. Prototype interactions

The named flow contains the following click transitions:

```text
Command Center
→ Deals Portfolio
→ Deal Overview
→ Documents & VDR
→ Diligence Decision Room
→ Valuation Lab
→ Matching & Counterparty Universe
→ Negotiation Room
→ Human approval gate
→ Recorded audit outcome
```

The prototype uses explicit hotspots over existing governed actions and navigation targets. It does not change the source-authority frames.

## 5. Recoverable failure path

- Trigger: `Test recoverable failure`
- Failure state: `251:3396`
- Recovery action: `Retry synchronization`
- Return destination: Documents & VDR `251:1909`

The failure preserves `DOC-120`, the previous synchronized version, read-only availability, and a recoverable retry action. The production connector, retry execution and audit persistence are backend-required behavior.

## 6. Restricted-data path

- Trigger: `Test restricted candidate`
- Restricted state: `251:3778`
- Return action: `Return to shortlist`
- Return destination: Matching `251:2524`

The state exposes only ranking position and workflow status. Candidate identity, relationship owner, contact data and protected evidence remain hidden. Access must be requested through the Deal Lead; the interface must not infer or disclose hidden identity.

## 7. Human approval and audit path

- Approval frame: `251:3319`
- Confirmation action: `Approve and record decision`
- Recorded outcome: `251:4043`

The approval boundary is explicitly human. The recorded outcome includes `APR-HOR-07`, `AUD-HOR-31`, Ana Costa, a timestamp, evidence and mandate references, and the affected finding, valuation scenario, shortlist and proposed counteroffer.

Approval records the internal position. External transmission remains a separate explicitly authorized action and is not simulated as autonomous behavior.

## 8. Capability labels

The section distinguishes:

- **Designed interaction** — governed screen structure and intended navigation.
- **Prototype simulation** — Figma-only transition or state change used to validate the workflow.
- **Backend required** — production connector behavior, retry execution, permission enforcement, approval persistence, audit creation and external transmission.

No prototype transition is evidence that production behavior exists.

## 9. Gate result

The bounded prototype was reviewed at natural screen size and as a complete section.

- Named flow start exists.
- Thirteen click reactions are present.
- All twelve frames are contained in the section.
- Happy-path object context is recorded.
- Recoverable failure and retry are testable.
- Restricted-data handling is testable without protected metadata leakage.
- Human approval and recorded audit output are testable.
- Capability boundaries are explicit.
- Open P0 findings: none.
- Open P1 findings: none after correcting audit-overlay containment.

## 10. Deferred scope

The following remain explicitly deferred for the MVP:

- comprehensive 25-screen prototype coverage;
- administration journeys;
- external-participant journeys;
- tablet and mobile prototype coverage;
- noncritical search, notification and deep-link permutations;
- full closing, settings, deliverables and team-administration workflows;
- runtime responsive verification.

## 11. Implementation conditions

Downstream implementation must:

1. preserve the canonical context envelope across every transition;
2. resolve every deep link through authorization before showing metadata;
3. treat Figma state changes as simulations rather than implemented capability;
4. enforce restricted evidence and counterparty boundaries server-side;
5. persist human approvals and immutable audit outcomes;
6. keep external or irreversible actions behind explicit human authorization;
7. derive responsive behavior during implementation and verify it at runtime.
