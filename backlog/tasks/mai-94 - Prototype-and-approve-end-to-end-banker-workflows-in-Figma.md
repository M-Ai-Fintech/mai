---
id: MAI-94
title: Prototype and approve end-to-end banker workflows in Figma
status: To Do
assignee: []
created_date: '2026-07-28 03:08'
updated_date: '2026-07-29 01:41'
labels:
  - figma
  - prototype
  - workflow
  - approval-gate
  - mai-85-initiative
milestone: m-12
dependencies:
  - MAI-93
documentation:
  - design/
  - >-
    backlog/docs/index/doc-10 -
    Documentation-Index-and-Information-Architecture.md
  - backlog/docs/product/mvp-gui-and-api/doc-9 - MVP-GUI-and-API-Behavior.md
priority: high
ordinal: 700
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Delivery step 6 of the MAI-85 initiative, re-baselined for the 12-day desktop-first MVP.

Objective:
Prototype and approve the critical desktop banker path before frontend implementation. The prototype is a bounded workflow proof, not a comprehensive product prototype.

Critical desktop path:
Command Center → Deals Portfolio → Deal Overview → Documents → Diligence Decision Room → Valuation → Matching → one execution/approval outcome.

Minimum validation coverage:
- Happy path preserves institution, deal, target, evidence, fact, finding, scenario, shortlist, task, approval, and audit context.
- Failure path covers one recoverable document/connector or calculation failure and recovery action.
- Permission path covers restricted evidence or counterparty data without protected metadata leakage.
- Approval path covers one human approval boundary and recorded audit output.
- Capability labels distinguish designed interaction, prototype simulation, and backend-required behavior.

Explicitly out of MVP prototype scope:
- comprehensive 25-screen readiness matrix;
- complete administration and external-participant journeys;
- tablet and mobile prototype coverage;
- noncritical notification/search/deep-link permutations;
- full closing, settings, deliverables, and team-administration coverage beyond the critical outcome.

Deferred scope remains recorded for later planning; it is not deleted. No frontend implementation is included.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 A linked desktop prototype covers Command Center → Deals Portfolio → Deal Overview → Documents → Diligence Decision Room → Valuation → Matching → one execution/approval outcome.
- [ ] #2 The happy path preserves institution, deal, target, evidence, fact, finding, scenario, shortlist, task, approval, and audit context.
- [ ] #3 One recoverable failure path and one permission-safe restricted-data path are testable without protected metadata leakage.
- [ ] #4 One human approval boundary, destructive/irreversible confirmation where applicable, and recorded audit output are testable.
- [ ] #5 Capability labels distinguish designed interaction, prototype simulation, and backend-required behavior.
- [ ] #6 The MVP is desktop-only; the 25-screen matrix, administration, external participants, tablet/mobile, and noncritical permutations are explicitly deferred.
<!-- AC:END -->



## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Prototype the eight-step desktop banker path from Command Center through one execution/approval outcome. 2. Add only the minimum failure, permission, and human-approval paths needed to validate implementation. 3. Preserve object identity and authority across transitions and label simulated/backend-required behavior. 4. Produce a bounded desktop handoff; defer 25-screen comprehensive coverage, administration, external participants, tablet/mobile, and noncritical permutations.
<!-- SECTION:PLAN:END -->
