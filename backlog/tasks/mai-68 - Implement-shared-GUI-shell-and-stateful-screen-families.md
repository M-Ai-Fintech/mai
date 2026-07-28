---
id: MAI-68
title: Implement shared GUI shell and stateful screen families
status: Done
assignee:
  - '@codex'
created_date: '2026-07-19 06:53'
updated_date: '2026-07-28 02:59'
labels:
  - frontend
  - GUI
  - components
  - prototype
  - revalidated
milestone: m-12
dependencies:
  - MAI-67
references:
  - gui/app
  - gui/components
modified_files:
  - gui/app/layout.tsx
  - gui/app/globals.css
  - gui/app/page.tsx
  - gui/app/clients/page.tsx
  - gui/app/entities/page.tsx
  - 'gui/app/entities/[id]/page.tsx'
  - 'gui/app/deals/[id]/chat/page.tsx'
  - gui/app/dashboard/custom/page.tsx
  - gui/components/Navigation/AppShell.tsx
  - gui/components/Navigation/Sidebar.tsx
  - gui/components/Navigation/TopBar.tsx
  - gui/components/Navigation/navigation-model.ts
  - gui/components/screens/dashboard/dashboard-model.ts
  - gui/components/screens/entities/EntitiesWorkspace.tsx
  - gui/components/screens/entities/EntityDetail.tsx
  - gui/components/screens/entities/entity-state.ts
  - gui/components/screens/agentic/AgenticWorkspace.tsx
  - gui/components/screens/agentic/agentic-workspace-model.ts
  - gui/components/screens/custom-dashboard/CustomDashboard.tsx
  - gui/components/screens/custom-dashboard/custom-dashboard-model.ts
  - gui/lib/api-client.ts
  - gui/vitest.unit.config.ts
  - src/api/mvp_store.ts
priority: high
ordinal: 6
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Implement the approved coherent prototype in the Next.js GUI using the existing MAI-53 component library. The implementation should use one shared app shell and reusable stateful screen families rather than isolated page-specific layouts.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 The shared shell owns Sidebar, TopBar, breadcrumbs, POV state, active navigation, and page canvas spacing
- [x] #2 Dashboard, entity CRUD, agentic workspace, and custom dashboard routes use the same shell and design contract
- [x] #3 Each screen family implements loading, empty, error, modal, validation, success, and relevant interaction states
- [x] #4 Pages reuse existing gui/components rather than creating duplicate visual primitives
- [x] #5 Frontend tests or visual checks cover the core state transitions
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Normalize and test the shared shell and existing component-library type boundary.
2. Implement the main dashboard and entity CRUD as reusable stateful screen families backed by ApiClient.
3. Implement the agentic workspace and custom dashboard families using the same shell and state model.
4. Add loading, empty, error, modal, validation, success, and interaction-state tests.
5. Run type, lint, unit, and production-build verification and record visual-contract evidence.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Agentic workspace and custom dashboard families implemented via frozen ApiClient contracts. Covers load/empty/error, chat thread and SSE stream states, VDR/engine analytics, and layout add/reorder/remove/save/reset with feedback. Focused TypeScript, ESLint, and 6 model transition tests pass.

Advisor fidelity review removed unsupported chart/progress/drag/attachment/spinner grammar, added reusable entity list/detail routes, added configuration/archive/reset confirmations, and aligned the shell to the 23-screen Stitch component contract. Default custom layout now seeds the approved 3 KPI + pipeline + risk Table + team activity composition.

Validation: production Next.js build passed for 14 routes; TypeScript passed; focused ESLint passed across every modified frontend route/component/client; 21 Vitest tests passed; single Stitch prompt validator passed (1 prompt, 4 families, 23 references); 25 backend contract/store/route tests and server type-check passed; git diff --check passed. Repository-wide lint remains separately noisy in untouched legacy pages/stories and generated storybook-static output, so the task gate uses the complete modified-file lint scope.
<!-- SECTION:NOTES:END -->

## Comments

<!-- COMMENTS:BEGIN -->
author: @codex
created: 2026-07-22 05:30
---
## Done revalidation — 2026-07-22\n\nDone is preserved because the task explicitly delivers stateful screen families for the coherent prototype. GUI unit tests pass 29/29 and the production build succeeds. This does not prove real engines, VDR, persistence, or LLM behavior.
---

author: Codex
created: 2026-07-28 02:59
---
Retained as completed prototype evidence. Under the 2026-07-27 MAI-85 rebaseline, its GUI shell and screen implementation do not constrain the target frontend; conformance and replacement are governed by MAI-85.7 through MAI-85.14.
---
<!-- COMMENTS:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Implemented one shared Mastercard Editorial app shell and four contract-backed stateful screen families: deal dashboard, reusable role-based entity CRUD/detail, agentic chat/analytics, and versioned custom dashboard. All families reuse MAI-53 components and include their loading, empty, error, modal, validation, success, and interaction states. Verified with production build, scoped lint, TypeScript, 21 frontend tests, 25 backend tests, and the unified Stitch prompt validator.
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 The prototype boundary and mock-backed API dependency are explicit
- [x] #2 All focused GUI unit tests and the production build pass
- [x] #3 Screens do not claim that prototype fixtures are verified external integrations
<!-- DOD:END -->
