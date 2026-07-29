---
id: doc-18
title: MAI-98 Application Shell and Route Architecture
type: specification
created_date: '2026-07-29 19:22'
updated_date: '2026-07-29 19:48'
tags:
  - MAI-98
  - frontend
  - shell
  - routing
---
# MAI-98 Application Shell and Route Architecture

- **Authority ID:** ARCH-FRONTEND-SHELL-001
- **Owner:** Frontend Engineering
- **Authority:** Figma v0.3 nodes `41:16`, `43:10`, and `44:85`; MVP GUI/API behavior and cross-screen interaction documents.
- **Freshness:** current
- **Language:** English
- **Update trigger:** Update when a MAI-98 route, shell mode, adapter boundary, or verification contract changes.

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
Fixture-labelled stories cover all four shell modes, error states, long names, count overflow, and Drawer behavior. Focused route and accessibility tests are part of the MAI-98 verification boundary.
