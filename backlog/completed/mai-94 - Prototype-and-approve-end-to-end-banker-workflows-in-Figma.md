---
id: MAI-94
title: Prototype and approve end-to-end banker workflows in Figma
status: Done
assignee: []
created_date: '2026-07-28 03:08'
updated_date: '2026-07-29 12:27'
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
- [x] #1 A linked desktop prototype covers Command Center → Deals Portfolio → Deal Overview → Documents → Diligence Decision Room → Valuation → Matching → one execution/approval outcome.
- [x] #2 The happy path preserves institution, deal, target, evidence, fact, finding, scenario, shortlist, task, approval, and audit context.
- [x] #3 One recoverable failure path and one permission-safe restricted-data path are testable without protected metadata leakage.
- [x] #4 One human approval boundary, destructive/irreversible confirmation where applicable, and recorded audit output are testable.
- [x] #5 Capability labels distinguish designed interaction, prototype simulation, and backend-required behavior.
- [x] #6 The MVP is desktop-only; the 25-screen matrix, administration, external participants, tablet/mobile, and noncritical permutations are explicitly deferred.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Prototype the eight-step desktop banker path from Command Center through one execution/approval outcome. 2. Add only the minimum failure, permission, and human-approval paths needed to validate implementation. 3. Preserve object identity and authority across transitions and label simulated/backend-required behavior. 4. Produce a bounded desktop handoff; defer 25-screen comprehensive coverage, administration, external participants, tablet/mobile, and noncritical permutations.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
MAI-94 bounded desktop-only prototype evidence: Figma page 09 Critical Path Prototype, section MAI-94 — Critical Desktop Banker Path; authoritative nodes 251:3323, 251:1355, 251:1455, 251:1575, 251:1909, 251:3238, 251:2275, 251:2524, 251:2773, 251:3319, 251:3396, 251:3778, 251:4043. Named flow start; 13 click reactions; context spine Atlas M&A Advisory → Ana Costa → DL-HOR-042 → Northstar Foods → DOC-120 → FAC-018 → FND-014 → VAL-HOR-03 → CRI-HOR-02 → APR-HOR-07 → AUD-HOR-31; recoverable Documents failure/retry; permission-safe restricted-counterparty path; explicit human approval; recorded audit outcome; capability-boundary labels; no open P0/P1; comprehensive, administration, external, responsive, and noncritical scope deferred. Canonical file: design/28_Critical_Desktop_Banker_Path_Prototype.md. Draft PR #14. Repository verification and push remain blocked because the MAI-94 branch could not be fetched under the environment escalation timeout.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Critical desktop banker path prototype and approval workflow completed in Figma. Marked as done.
<!-- SECTION:FINAL_SUMMARY:END -->
