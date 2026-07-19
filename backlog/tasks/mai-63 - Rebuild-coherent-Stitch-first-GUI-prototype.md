---
id: MAI-63
title: Rebuild coherent Stitch-first GUI prototype
status: In Progress
assignee: []
created_date: '2026-07-19 06:50'
updated_date: '2026-07-19 16:40'
labels:
  - GUI
  - stitch
  - prototype
  - backend
  - frontend
milestone: m-6
dependencies: []
references:
  - gui/DESIGN.md
  - gui/DESIGN_GUIDELINES.md
modified_files:
  - README.md
  - gui/README.md
  - context/nextjs_gui_and_api.md
  - gui/docs/user-flow.md
priority: high
ordinal: 1
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Rework the M&Ai GUI prototype from a clean Stitch component-library baseline. The wrong generated product screens were deleted, so the source of truth is now the remaining Stitch component showcases plus the local React component library and backend capability matrix. This initiative ensures the next prototype is stateful, consistent, backed by feasible API contracts, and implementable in the Next.js GUI.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 All product screens are generated from the remaining Stitch component showcase screens only
- [x] #2 Screen states and variations are modeled as reusable screen families, not disconnected static pages
- [x] #3 Backend support is checked before UI functionality is committed to the prototype
- [x] #4 The approved prototype maps cleanly to local React components and API contracts
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Establish the Stitch-to-local component/version contract in MAI-64.\n2. Audit backend capabilities and required contracts in MAI-65.\n3. Review both prerequisites and generate one connected, stateful Stitch prototype in MAI-66.\n4. Implement approved backend contracts in MAI-67.\n5. Implement the shared shell and reusable screen families in MAI-68.\n6. Verify the implementation against Stitch and complete QA handoff in MAI-69.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Documentation synchronized after the MVP_6 implementation and QA gate. README.md, gui/README.md, context/nextjs_gui_and_api.md, and gui/docs/user-flow.md now describe the canonical routes, Next.js API rewrite, typed contracts, SSE/reconnect states, optimistic versions, in-memory persistence boundary, authentication/Gemini limits, and the still-partial Stitch generation. Relative links and prompt validation pass.
<!-- SECTION:NOTES:END -->
