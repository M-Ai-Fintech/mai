---
id: MAI-64
title: Map Stitch component showcases to local component APIs
status: Done
assignee: []
created_date: '2026-07-19 06:52'
updated_date: '2026-07-19 14:48'
labels:
  - GUI
  - stitch
  - design-system
  - components
milestone: m-6
dependencies: []
references:
  - gui/components
  - gui/DESIGN.md
modified_files:
  - gui/docs/stitch-component-version-contract.md
priority: high
ordinal: 2
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Create the version contract between the clean Stitch component showcases and the local React component library. This task prevents future screen prompts from referencing variants, states, colors, spacing, or interaction patterns that do not exist locally or in Stitch.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Every remaining Stitch component showcase is listed with its exact title and intended usage
- [x] #2 Each showcase is mapped to the matching local gui/components API and supported props
- [x] #3 Mismatches between Stitch, DESIGN.md, and local components are documented before screen generation
- [x] #4 The final contract can be used as the source section of the master Stitch prototype prompt
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Inventory the exact remaining visible Stitch component showcases and design-system version.
2. Inventory local React component APIs, variants, states, and tokens.
3. Map each Stitch showcase to local implementation and document mismatches.
4. Produce and validate the authoritative component contract for the master prototype prompt.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Investigation found Stitch asset Mastercard Editorial version 3 and local GUI 0.1.0 are not the same component version. Visible Stitch showcases are the visual authority for MAI-66; local TypeScript APIs remain the executable boundary to reconcile in MAI-68. Stitch lists 23 approved visible references; hidden deleted-screen instances remain only as unapproved project metadata. Validation: live Stitch project/screens/design-system queried; git diff --check passed; artifact is non-empty.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Created the authoritative Stitch-to-local version contract with exact visible screen titles and IDs, local API mappings, blocked vocabulary, mismatch decisions, hidden-instance warning, and a copy-ready MAI-66 source section.
<!-- SECTION:FINAL_SUMMARY:END -->
