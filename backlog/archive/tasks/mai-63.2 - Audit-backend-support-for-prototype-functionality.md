---
id: MAI-63.2
title: Audit backend support for prototype functionality
status: To Do
assignee: []
created_date: '2026-07-19 06:50'
labels:
  - backend
  - api
  - GUI
  - stitch
milestone: m-6
dependencies: []
references:
  - src/api/server.ts
  - gui/lib/api-client.ts
parent_task_id: MAI-63
priority: high
ordinal: 3
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Check the Deno backend, Next API routes, ApiClient, repositories, and persistence model before committing UI flows to Stitch. The output is a capability matrix separating supported functionality from required backend work.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Deals, clients, team, chat, engines, notifications, and custom dashboard layout persistence are each classified as supported, partial, or missing
- [ ] #2 Required API contracts are specified before the prototype prompt includes dependent interactions
- [ ] #3 Unsupported features are either removed from the first prototype or converted into explicit backend tasks
- [ ] #4 ApiClient changes required for the GUI are identified
<!-- AC:END -->
