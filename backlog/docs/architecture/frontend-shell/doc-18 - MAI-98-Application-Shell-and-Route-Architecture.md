---
id: doc-18
title: MAI-98 Application Shell and Route Architecture
type: specification
created_date: '2026-07-29 19:22'
updated_date: '2026-07-29 19:22'
tags:
  - MAI-98
  - frontend
  - shell
  - routing
---
# MAI-98 Application Shell and Route Architecture

## Authority
Figma v0.3 approved references: global `41:16`; deal desktop `43:10`; deal mobile `44:85`; Decision Room `52:21`; critical desktop path `251:3323`. Product behavior is governed by the MVP GUI/API behavior document and cross-screen interaction map.

## Shell modes
The typed registry discriminates Global, Deal, Administration, and External modes. External mode receives only external permission data; it never receives internal navigation, counts, approval, notification, or organization metadata.

## Registry and context
Every route declares ID, pattern, mode, navigation parent, breadcrumbs, permission, availability, implementation status, authority, and deferred owner. Route identity, fixture data, access decisions, and unavailable states are separate. Fixture adapters are deterministic local demonstrations only and never prove backend existence or authorization.

## Navigation and access
Global routes cover workspace objects; deal routes preserve the validated deal ID across module links; administration stays visually separate; external routes use a reduced surface. Breadcrumbs identify the current page with `aria-current`. Restricted, unavailable, malformed-context, and not-found states are separate and render no protected values.

## Responsive and keyboard
The desktop rail becomes a Drawer navigation on mobile. The shell provides a skip link, landmarks, visible focus, named controls, Escape close, Drawer focus return, and native navigation semantics. Automated checks do not establish complete assistive-technology conformance.

## Deferred MAI-99 consumption
Route bodies remain explicit neutral placeholders owned by MAI-99+. Downstream screen work must consume the route registry and adapter interfaces; it must not add backend assumptions or duplicate shell components.

## Evidence
Baseline GUI verification passed before implementation. Focused MAI-98 verifier, lint, and Next build passed after implementation. Rendered visual review and full final suite remain owner-handoff evidence for this in-progress task.
