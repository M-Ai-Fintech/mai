---
id: MAI-147
title: Define the canonical dispute-resolution mechanism contract and legacy adapters
status: To Do
assignee: []
created_date: '2026-07-31 05:06'
updated_date: '2026-07-31 05:07'
labels:
  - backend
  - architecture
  - legal
  - contracts
  - negotiation
  - closing
  - migration
milestone: m-12
dependencies: []
priority: high
ordinal: 133000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Replace the narrow and internally inconsistent MAI-76 arbitration-chamber task with a correct shared legal contract.

The target concept is a dispute-resolution mechanism, not merely an arbitration chamber.

The canonical representation must distinguish arbitration from court litigation and support controlled representation of non-canonical arbitration institutions.

This task owns:
- the shared authoritative schema;
- arbitration-institution vocabulary;
- court-resolution representation;
- explicit “other institution” representation;
- legacy normalization;
- compatibility adapters;
- migration and API contract guidance.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 One authoritative shared dispute-resolution schema exists.
- [ ] #2 Arbitration and court litigation are represented as structurally distinct variants.
- [ ] #3 The arbitration variant references a canonical institution contract.
- [ ] #4 Non-canonical institutions use an explicit structure containing their supplied name rather than a literal authoritative enum value of `Other`.
- [ ] #5 Court litigation supports the jurisdiction and forum fields required by the approved legal workflow.
- [ ] #6 The canonical arbitration-institution list is explicitly reviewed against existing product and legal requirements.
- [ ] #7 Existing legacy values are inventoried, including at minimum: B3; CAM-B3; CAM-CCBC; CCI; FGV; Judicial-Court; Other.
- B3;
- CAM-B3;
- CAM-CCBC;
- CCI;
- FGV;
- Judicial-Court;
- Other.
- [ ] #8 Legacy adapters normalize unambiguous values.
- [ ] #9 Unknown or ambiguous legacy values are rejected or require explicit human resolution; they are never silently guessed.
- [ ] #10 `Judicial-Court` maps to the court variant, not an arbitration institution.
- [ ] #11 Contract Analysis, Negotiation Term Sheet, and SPA/Closing contracts use or are migrated toward the shared representation.
- [ ] #12 Agent proposal schemas reference the canonical contract.
- [ ] #13 API and persistence representations are versioned and documented.
- [ ] #14 Migration ownership is recorded for MAI-129.
- [ ] #15 Tests cover: every canonical arbitration institution; court representation; explicit other institution; each legacy normalization; ambiguous input rejection; serialization and parsing; compatibility behavior.
- every canonical arbitration institution;
- court representation;
- explicit other institution;
- each legacy normalization;
- ambiguous input rejection;
- serialization and parsing;
- compatibility behavior.
- [ ] #16 Focused tests and `deno task verify` pass.
<!-- AC:END -->



































## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Every acceptance criterion is checked with evidence.
- [ ] #2 One shared dispute-resolution contract is authoritative.
- [ ] #3 Arbitration and court mechanisms cannot be confused.
- [ ] #4 Existing schemas no longer maintain contradictory independent enums.
- [ ] #5 Legacy values have tested adapters or explicit rejection behavior.
- [ ] #6 MAI-118, MAI-119, MAI-121, and MAI-129 depend on MAI-147.
- [ ] #7 Canonical repository verification passes.
<!-- DOD:END -->
