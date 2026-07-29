---
id: doc-16
title: MAI-96 Figma-to-Code Semantic Token Architecture
type: specification
created_date: '2026-07-29 16:13'
updated_date: '2026-07-29 16:15'
tags:
  - architecture
  - frontend
  - design-tokens
  - figma
  - canonical
---
# MAI-96 Figma-to-Code Semantic Token Architecture

- **Authority ID:** ARCH-FRONTEND-TOKENS-001
- **Authority:** Canonical live Figma-to-code semantic token mapping and verification contract
- **Freshness:** Current for approved Figma release v0.3 and MAI-96 implementation
- **Language:** English
- **Owner:** Frontend Engineering
- **Release:** v0.3 MAI Design System — Approved for Downstream Design
- **Figma file:** `otMJE31OKIxdXogV4RNbGQ`
- **Implementation owner:** MAI-96
- **Update trigger:** approved live Figma variable/style changes or token-generation contract changes

## Authority and extraction

The live local Figma Plugin API data is machine authority. Read-only extraction used nodes `8:2`, `9:2`, `27:2`, `37:173`, `63:2`, `65:2`, `41:16`, `43:10`, `44:85`, and `52:21`. The live inventory contains 5 collections, 193 variables, 5 collection-mode records, 14 text styles, 17 paint styles, and 2 effect styles. The visible 178-variable count on frame `9:2` is historical Slice 1 evidence and is not live authority.

The governed collection families are Core, Semantic, Responsive, Component, and Motion. Every collection exposes only `Light / Standard`; reduced motion is a user-preference override, not another Figma mode. Collections, variables, aliases, scopes, descriptions, raw values, resolved values, publishing metadata, and local/remote state are stored in `gui/tokens/source/mai-figma-v0.3.json`. Its source-content checksum excludes only the checksum field itself.

## Mapping and naming

The source snapshot is the single value authority. Generation converts slash-delimited Figma paths to lowercase kebab-case CSS names with the `--mai-` prefix. Core primitives are internal `--mai-core-*` properties. Semantic, Responsive, Component, Motion, typography, and elevation contracts are public. Aliases remain CSS `var(...)` references where Figma supplies aliases; public consumers cannot use Core properties directly.

Examples:

- `color/surface/canvas` → `--mai-color-surface-canvas`
- `space/layout/panel` → `--mai-space-layout-panel`
- `layout/content-max/desktop` → `--mai-layout-content-max-desktop`

The generated CSS is `gui/tokens/generated/tokens.css`; the typed API is `gui/tokens/generated/tokens.ts`, re-exported by `gui/tokens/index.ts`. `tokenVar(path)` accepts only generated public token paths.

## Semantic coverage

Color roles cover surfaces, content, borders, actions, focus, form/control states, overlays, success, warning, critical, information, incomplete evidence, restricted, neutral, stale, superseded, extracted fact, interpretation, deterministic calculation, human decision, and positive/negative/neutral financial impact. No unavailable role exists live, so none is invented. Supporting Signal Deep remains distinct from the seven canonical brand primitives.

Typography maps all 14 text styles and Core typography values. The CSS declares Sofia Sans first and preserves body weight 450 plus financial tabular numerals. No font dependency was added. Because no repository font file is bundled, Sofia Sans renders only when locally available; otherwise the documented system fallback stack renders. The implementation does not claim that Sofia Sans is bundled.

Spacing, sizing, grids, breakpoints, radii, border widths, elevation, and motion are generated from live values. The public default-border width is a derived alias to the live 1 px Core primitive. No semantic 2 px spacing role is invented.

## Responsive and motion behavior

Generated media queries implement mobile below 768 px, tablet from 768 px, and desktop from 1280 px. They update public grid columns, gutters, margins, content maximum, rail, and sidebar contracts without duplicating breakpoint values outside generated output. The 1440 × 900 validation canvas and the live panel minimum remain typed source contracts.

Motion exposes 0, 120, 200, and 320 ms durations plus the live standard cubic-bezier values. `prefers-reduced-motion: reduce` replaces non-essential public durations with 0 ms and exposes the approved 80 ms maximum essential-opacity continuity duration. It does not create a theme or Figma mode.

## Tailwind and runtime consumption

Tailwind CSS v4 consumes CSS-variable-backed `@theme inline` mappings for clear semantic names such as surface-canvas, surface-raised, content-primary, content-secondary, border-default, action-primary, status-critical, and evidence-calculation. No JavaScript Tailwind configuration is introduced.

MAI-97 must build final components from public semantic/component contracts and preserve the direct token-path types. MAI-98 must use generated responsive layout contracts for Shell and route composition. Neither task may consume `--mai-core-*` directly without a separately documented exception.

## Verification

`npm --prefix gui run tokens:generate` deterministically writes generated output. `tokens:check` fails on generated drift. `verify:tokens` validates schema, checksum, collections, the single supported mode, alias targets, cycles, alias types, canonical primitives, semantic categories, breakpoint contracts, contrast pairs, hard-coded values, Core leakage, generated drift, proof-consumer coverage, and the continued absence of MAI-97/98 implementation.

Twenty-one governed foreground/background pairs are measured deterministically. Normal text pairs use 4.5:1; focus and deterministic-calculation indicator roles use 3:1. These measurements establish only the tested pairs and applicable criteria, not complete WCAG conformance.

The bounded hard-coded verifier scans the FoundationStatus implementation and non-generated token API files for raw colors, raw shadows, transition times/easing, governed visual lengths, and direct Core use. Canonical snapshot content, generated output, parser fixtures, and reset values are intentionally outside that scan.

## Proof consumer and limitations

FoundationStatus is the only product-facing proof consumer. It uses public tokens for canvas, raised surface, primary/secondary content, borders, focus, typography, spacing, sizing, radius, elevation, motion, and responsive margins/content width. It remains a neutral frontend-foundation status, not a final banker screen or component catalog.

Tokens do not prove keyboard behavior, assistive-technology behavior, Dialog/Drawer behavior, production capabilities, or responsive component reflow. Those remain downstream runtime/component concerns. The Figma library remains local and unpublished; Code Connect remains deferred.
