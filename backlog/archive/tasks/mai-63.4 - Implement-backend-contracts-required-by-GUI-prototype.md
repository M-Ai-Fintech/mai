---
id: MAI-63.4
title: Implement backend contracts required by GUI prototype
status: To Do
assignee: []
created_date: '2026-07-19 06:50'
updated_date: '2026-07-19 06:53'
labels:
  - backend
  - api
  - GUI
milestone: m-6
dependencies: []
references:
  - src/api/server.ts
  - gui/lib/api-client.ts
parent_task_id: MAI-63
priority: high
ordinal: 5
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Implement or normalize the backend and API-client contracts required by the approved Stitch prototype. This includes only the capabilities confirmed by the backend audit and needed by the first coherent GUI pass.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 ApiClient exposes typed methods for all prototype-backed interactions
- [ ] #2 Client/entity CRUD endpoints needed by the approved prototype are implemented or explicitly scoped as mock-backed MVP endpoints
- [ ] #3 Deal dashboard data, phase transitions, engine outputs, chat, notifications, and layout preferences use stable response shapes
- [ ] #4 Relevant backend and API tests cover the new or normalized contracts
<!-- AC:END -->
