---
id: doc-7
title: M&A Domain Model
type: specification
created_date: '2026-07-24 15:35'
updated_date: '2026-07-30 06:51'
tags:
  - domain
  - ma
  - canonical
---
# M&A Domain Model

- **Authority ID:** DOMAIN-001
- **Owner:** Product and Domain Architecture
- **Authority:** Canonical target business language proposed by MAI-103
- **Freshness:** Proposed as of 2026-07-30
- **Language:** English
- **Update trigger:** Bounded-context ownership, aggregate invariant, workflow state or human-authority terminology changes

## Bounded business language

MAI separates identity/tenancy, access governance, organization registry, deal management (identity, parties, mandate, lifecycle and milestones), work management (workstreams, tasks and approvals), documents/evidence, diligence decisions (including assumptions and generic calculations), valuation, matching, negotiation, closing, agent execution, external access, deliverables/distribution, deal governance, notifications, integrations and audit/activity.

Deal is the transaction identity and party/mandate anchor; it is not a universal aggregate. Milestones, tasks, documents, findings, scenarios, proposals, conditions, missions, grants and deliverables are independent aggregate roots or projections in their owning contexts.

## Evidence-to-authority chain

```text
Document Version → Evidence/Citation → Fact or Interpretation
→ Finding/Impact, Assumption/Calculation, Recommendation
→ exact-version human Decision Record
→ separately authorized consequential command
```

Facts are not interpretations; assumptions are not facts; calculations and model recommendations are not decisions. Provenance records origin and derivation across every link.

## Transaction workflow

Deal Phase, Milestone and Workstream coordinate progression without owning downstream records. Task and Approval Request assign work and exact review packages. Valuation Scenario, Matching Run, Negotiation Round/Proposal and Closing Condition each enforce their own lifecycle and expected-version boundary.

## Participation and distribution

Membership is institution/workspace participation; Deal Participation is deal scope; external access is purpose-bound with sponsor, expiry and object/field restrictions. Deliverable drafts, redactions, approvals, releases, exports and distributions are distinct states.

## Human authority

Approval/rejection, price, external communication, waiver, signature, invitation/offboarding, permission changes, release, archive/restore/termination/deletion and irreversible closing confirmation are human-only transitions. Agents propose or calculate through application services.

Doc-20 is the detailed context/aggregate/state-machine catalog; doc-19 supplies product traceability and doc-21 supplies isolation/persistence semantics. Earlier prototype terms remain historical evidence in doc-23 rather than target constraints.
