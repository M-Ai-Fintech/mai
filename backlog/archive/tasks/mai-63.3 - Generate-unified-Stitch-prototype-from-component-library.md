---
id: MAI-63.3
title: Generate unified Stitch prototype from component library
status: To Do
assignee: []
created_date: '2026-07-19 06:50'
updated_date: '2026-07-19 06:53'
labels:
  - stitch
  - prototype
  - GUI
  - design
milestone: m-6
dependencies: []
parent_task_id: MAI-63
priority: high
ordinal: 4
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Use the clean Stitch project, which now contains only component showcases and DESIGN.md, to generate one coherent desktop prototype covering the core M&Ai screen families and their variations. This must be one master product prompt, not isolated stateless prompts.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 The master prompt references only remaining component showcase screen titles and DESIGN.md
- [ ] #2 The prototype covers dashboard, reusable entity CRUD, agentic workspace, and custom dashboard families
- [ ] #3 Each family includes default, loading, empty, error, modal, success, and relevant interaction states
- [ ] #4 Prototype navigation and actions are described as connected flows across states
- [ ] #5 No unsupported backend-dependent interaction is included without a matching contract
<!-- AC:END -->
