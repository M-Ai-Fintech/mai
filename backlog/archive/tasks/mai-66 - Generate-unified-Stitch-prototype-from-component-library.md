---
id: MAI-66
title: Generate unified Stitch prototype from component library
status: To Do
assignee: []
created_date: '2026-07-19 06:53'
updated_date: '2026-07-22 05:55'
labels:
  - stitch
  - prototype
  - GUI
  - design
  - superseded
milestone: m-12
dependencies: []
modified_files:
  - gui/docs/stitch-master-prototype-prompt.md
  - gui/docs/prototype-state-map.md
  - gui/scripts/validate-stitch-master-prompt.mjs
  - gui/package.json
priority: high
ordinal: 4
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Use the clean Stitch project, which now contains only component showcases and DESIGN.md, to generate one coherent desktop prototype covering the core M&Ai screen families and their variations. This must be one master product prompt, not isolated stateless prompts.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 The master prompt references only remaining component showcase screen titles and DESIGN.md
- [x] #2 The prototype covers dashboard, reusable entity CRUD, agentic workspace, and custom dashboard families
- [ ] #3 Each family includes default, loading, empty, error, modal, success, and relevant interaction states
- [x] #4 Prototype navigation and actions are described as connected flows across states
- [x] #5 No unsupported backend-dependent interaction is included without a matching contract
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Convert the approved component contract and backend matrix into one master prompt.\n2. Define connected route families and default, loading, empty, error, modal, validation, success, and interaction states.\n3. Validate the prompt against exact visible showcase titles, blocked vocabulary, and backend-contract gates.\n4. Submit one desktop generation request using Mastercard Editorial asset version 3.\n5. Inspect the generated output and record screen IDs, state coverage, and required corrections.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Single generation session 6687577330794631075 completed from the validated master prompt. Stitch returned eight representative screens across all four families and used design-system asset 6617072512575356605 version 3. The result is not accepted as complete: generated heights are 2048–2144px rather than 1440px, only two representative states per family were rendered, and the new screens are addressable by ID but are not present in the visible list_screens inventory. Known IDs verified: 1926a95e1c434707bc04258b3ed3547e, 2b4c77817b6b471b82cbfbaa4b3fb73d, 274a6ec770a24a2e97266beeda6a9718, c9bcd5a1b8fb4d7daaada70d55a66e5c. Prompt validation passes. Keep MAI-66 In Progress; acceptance criterion 3 remains open.
<!-- SECTION:NOTES:END -->

## Comments

<!-- COMMENTS:BEGIN -->
author: @codex
created: 2026-07-22 05:55
---
Supersession decision — 2026-07-22: The unified Stitch prototype could not be completed because generated screens repeatedly diverged from the design system. Continuing this task would preserve a failed tool constraint rather than a product outcome. It is superseded by MAI-85; stale Stitch validation references are covered by MAI-83.
---
<!-- COMMENTS:END -->
