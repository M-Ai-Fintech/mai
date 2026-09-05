<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

Project-wide documentation is governed by Linear Documents in the
[MAI workspace](https://linear.app/mergesai/).
This file contains only GUI-local agent instructions.

# GUI Subsystem Agent Instructions (`gui/`)

This directory contains the front-end Next.js Web application for MAI.

## Runtime Environment & Node Workspace

- **Runtime**: Node.js (v20+) with `npm` package manager.
- **Framework & Libraries**: Next.js 16.3.0 (App Router), React 19.2.4, TailwindCSS v4, Vitest 4.1.10, Storybook 10.5.0.
- **IMPORTANT**: The GUI subsystem uses Node.js and `npm`. Do **NOT** use Deno commands inside the `gui/` directory.

## Frontend Foundation Boundary

- Figma file `otMJE31OKIxdXogV4RNbGQ` is the sole visual and interaction
  authority.
- Product definitions `design/1–28` govern behavior and boundaries.
- `design/28_Critical_Desktop_Banker_Path_Prototype.md` governs the MAI-94
  critical MVP workflow.
- Stitch and the retired GUI are historical references only. Never use them,
  old stories, old styles, or third-party screenshots as implementation input.
- MAI-96 owns final tokens, MAI-97 owns governed components, and MAI-98 owns the
  approved Shell, navigation, and route architecture.

## Key Operational & Testing Commands

All commands can be run from repository root using `npm --prefix gui run <script>` or directly inside `gui/`:

- **Development Server**: `npm --prefix gui run dev` (or root `deno task gui:start`)
- **Build GUI Production Application**: `npm --prefix gui run build`
- **Lint Code**: `npm --prefix gui run lint`
- **Run Unit Tests**: `npm --prefix gui run test:unit`
- **Launch Storybook Development Server**: `npm --prefix gui run storybook`
- **Run Storybook Component Tests**: `npm --prefix gui run test-storybook`
- **Validate Storybook MDX Documentation**: `npm --prefix gui run validate:storybook-docs`

## Architectural Conventions & Rules

- **Server vs. Client Components**: Components are React Server Components by default. Add the `"use client"` directive at the top of component files only when statefulness, browser hooks, or interactive event handlers are required.
- **Component Documentation**: Storybook MDX may describe only the retained
  implementation beside it. Figma remains the visual authority.
- **Styling**: Keep MAI-95 styling neutral and minimal. Do not define final
  semantic tokens before MAI-96.

## Documentation Governance

Canonical frontend foundation architecture lives in Linear document `doc-15`
([Frontend Foundation Inventory](https://linear.app/mergesai/document/mai-95-frontend-foundation-inventory-903eec38cc51)).
Storybook MDX is local implementation documentation, not cross-project design
authority.
