---
id: MAI-63.5
title: Implement shared GUI shell and stateful screen families
status: To Do
assignee: []
created_date: '2026-07-19 06:50'
updated_date: '2026-07-19 06:53'
labels:
  - frontend
  - GUI
  - components
  - prototype
milestone: m-6
dependencies: []
references:
  - gui/app
  - gui/components
parent_task_id: MAI-63
priority: high
ordinal: 6
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Implement the approved coherent prototype in the Next.js GUI using the existing MAI-53 component library. The implementation should use one shared app shell and reusable stateful screen families rather than isolated page-specific layouts.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 The shared shell owns Sidebar, TopBar, breadcrumbs, POV state, active navigation, and page canvas spacing
- [ ] #2 Dashboard, entity CRUD, agentic workspace, and custom dashboard routes use the same shell and design contract
- [ ] #3 Each screen family implements loading, empty, error, modal, validation, success, and relevant interaction states
- [ ] #4 Pages reuse existing gui/components rather than creating duplicate visual primitives
- [ ] #5 Frontend tests or visual checks cover the core state transitions
<!-- AC:END -->
