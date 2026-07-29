---
id: MAI-96
title: Implement Figma variables and tokens in the frontend
status: In Progress
assignee:
  - '@codex'
created_date: '2026-07-28 03:08'
updated_date: '2026-07-29 16:25'
labels:
  - frontend
  - design-tokens
  - figma
  - foundation
  - mai-85-initiative
milestone: m-12
dependencies:
  - MAI-95
documentation:
  - design/
  - >-
    backlog/docs/index/doc-10 -
    Documentation-Index-and-Information-Architecture.md
  - backlog/docs/product/mvp-gui-and-api/doc-9 - MVP-GUI-and-API-Behavior.md
  - >-
    backlog/docs/architecture/frontend-tokens/doc-16 -
    MAI-96-Figma-to-Code-Semantic-Token-Architecture.md
modified_files:
  - >-
    backlog/docs/architecture/frontend-tokens/doc-16 -
    MAI-96-Figma-to-Code-Semantic-Token-Architecture.md
  - >-
    backlog/docs/governance/document-inventory/doc-12 -
    Documentation-Inventory-and-Classification.md
  - >-
    backlog/docs/index/doc-10 -
    Documentation-Index-and-Information-Architecture.md
  - >-
    backlog/tasks/mai-96 -
    Implement-Figma-variables-and-tokens-in-the-frontend.md
  - graphify-out/GRAPH_REPORT.md
  - graphify-out/graph.json
  - gui/README.md
  - gui/app/globals.css
  - gui/components/FoundationStatus/FoundationStatus.mdx
  - gui/components/FoundationStatus/FoundationStatus.module.css
  - gui/components/FoundationStatus/FoundationStatus.tsx
  - gui/package.json
  - gui/scripts/generate-design-tokens.mjs
  - gui/scripts/verify-design-tokens.mjs
  - gui/scripts/verify-frontend-foundation.mjs
  - gui/tokens/README.md
  - gui/tokens/generated/tokens.css
  - gui/tokens/generated/tokens.ts
  - gui/tokens/index.ts
  - gui/tokens/source/mai-figma-v0.3.json
  - gui/tokens/token-schema.ts
  - gui/tokens/token-system.test.mjs
  - gui/vitest.unit.config.ts
  - scripts/verify.ts
  - scripts/verify_test.ts
priority: high
ordinal: 900
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Delivery step 8 of the MAI-85 initiative.

Implement a versioned frontend token layer derived from the approved Figma variables and styles. The token layer must be semantic, typed where practical, responsive, testable, and reusable by every component and screen implementation.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 A documented, versioned mapping connects Figma variables and styles to frontend tokens.
- [x] #2 Semantic tokens cover color, typography, spacing, sizing, grids, breakpoints, radii, elevation, and motion.
- [x] #3 Supported themes or modes and responsive behavior match the approved Figma definitions.
- [x] #4 Automated checks detect invalid token references, drift, or disallowed hard-coded visual values in new design-system code.
- [x] #5 New frontend components consume semantic tokens rather than duplicating raw design values.
- [x] #6 Token behavior and usage are covered by documentation and focused tests.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
- Baseline verification.
- Live read-only Figma extraction.
- Normalized source snapshot.
- Generated CSS and TypeScript tokens.
- Responsive and motion behavior.
- Token verification.
- Neutral proof consumer.
- Full repository verification.
- Draft PR and owner review.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
MAI-96 implementation evidence (2026-07-29): baseline passed npm ci, verify:foundation, lint, 21 unit tests, Next build, Storybook docs/build/interaction, and deno task verify; initial foundation EPERM was sandbox-only and passed with authorized subprocess access. Read-only live Figma extraction found 5 collections, 193 variables, one distinct Light / Standard mode name across 5 collection-mode records, 14 text styles, 17 paint styles, and 2 effect styles; the historical 178 display was not used. Source checksum sha256:fac58231bda73cf550a96e228c5ac4840da5afce62dd558070f3d272056fec6c. Final verification passed clean npm ci; deterministic tokens:generate plus repository-wide git diff --exit-code; tokens:check; verify:tokens with 21 contrast pairs; verify:foundation across 68 paths; lint; 29 unit tests; Next build; Storybook docs/build/interaction; documentation check; git diff checks; and deno task verify with all 10 checks PASS. Graphify was refreshed through the governed src/gui/tests merged workflow. The requested in-app desktop/mobile visual smoke could not run because this session exposes no browser-control runtime; the repository browser interaction test passed. Commits: 2b22d95, 93f4d39, c88f436, a3616d8. Status remains In Progress for draft PR and owner review.
<!-- SECTION:NOTES:END -->
