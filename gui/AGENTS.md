<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

Project-wide documentation is governed from
[`backlog/docs/`](../backlog/docs/index/doc-10%20-%20Documentation-Index-and-Information-Architecture.md).
This file contains only GUI-local agent instructions.

# GUI Subsystem Agent Instructions (`gui/`)

This directory contains the front-end Next.js Web application for MAI.

## Runtime Environment & Node Workspace

- **Runtime**: Node.js (v20+) with `npm` package manager.
- **Framework & Libraries**: Next.js 16.2.10 (App Router), React 19.2.4, TailwindCSS v4, Vitest 4.1.10, Storybook 10.5.0.
- **IMPORTANT**: The GUI subsystem uses Node.js and `npm`. Do **NOT** use Deno commands inside the `gui/` directory.

## Subdirectory Structure

- **`app/`**: Next.js App Router pages, layouts, API routes, and global CSS styling.
- **`components/`**: Atomic UI design system components, screen compositions (`screens/`), and template (`_template/`).
- **`lib/`**: Front-end utility functions, API clients, and state helpers.
- **`docs/`** & **`tokens/`**: UI design tokens, component guidelines, and Storybook setup.

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
- **Component Documentation**: Storybook MDX files (`*.mdx`) colocated with components provide local component usage and implementation authority.
- **Styling**: Use TailwindCSS v4 utility classes. Keep styles modular and responsive.

## Documentation Governance

Canonical front-end architecture documentation lives under [`backlog/docs/`](../backlog/docs/index/doc-10%20-%20Documentation-Index-and-Information-Architecture.md) (specifically `doc-08-GUI-Architecture.md`). Storybook MDX assets inside `gui/components/` retain local authority over individual UI components.
