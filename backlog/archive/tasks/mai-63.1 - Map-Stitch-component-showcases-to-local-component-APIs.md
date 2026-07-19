---
id: MAI-63.1
title: Map Stitch component showcases to local component APIs
status: To Do
assignee: []
created_date: '2026-07-19 06:50'
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
parent_task_id: MAI-63
priority: high
ordinal: 2
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Create the version contract between the clean Stitch component showcases and the local React component library. This task prevents future screen prompts from referencing variants, states, colors, spacing, or interaction patterns that do not exist locally or in Stitch.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Every remaining Stitch component showcase is listed with its exact title and intended usage
- [ ] #2 Each showcase is mapped to the matching local gui/components API and supported props
- [ ] #3 Mismatches between Stitch, DESIGN.md, and local components are documented before screen generation
- [ ] #4 The final contract can be used as the source section of the master Stitch prototype prompt
<!-- AC:END -->
