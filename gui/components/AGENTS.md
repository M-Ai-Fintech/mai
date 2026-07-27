# GUI UI Components Agent Instructions (`gui/components/`)

This directory contains the component library and screen-level composition components for the MAI Next.js web application.

## Directory Structure & Organization

- **Atomic UI Components**: Component folders (`Accordion/`, `Avatar/`, `Badge/`, `Button/`, `Card/`, `Checkbox/`, `CountrySelector/`, `Divider/`, `Dropdown/`, `EmptyState/`, `ErrorBoundary/`, `Footer/`, `FormField/`, `Icon/`, `Input/`, `Modal/`, `Navigation/`, `Radio/`, `Skeleton/`, `Spinner/`, `Table/`, `Tabs/`, `Textarea/`, `Toast/`).
- **Screen Compositions**: `screens/` contains complex screen composition components (`agentic/`, `custom-dashboard/`, `dashboard/`, `entities/`).
- **Scaffolding Template**: `_template/` contains `ComponentTemplate.mdx` as baseline component documentation structure.

## Component Triad Pattern

Every UI component in `gui/components/<ComponentName>/` must follow the three-file triad pattern:
1. **`ComponentName.tsx`**: Implementation of the React component using TypeScript and TailwindCSS v4.
2. **`ComponentName.stories.tsx`**: Storybook component stories for visual verification and testing.
3. **`ComponentName.mdx`**: Storybook MDX documentation providing usage examples, props tables, and design context.

## Runtime Environment & Tooling

- **Runtime Environment**: Node.js (v20+) / React 19 / Next.js 16 / TailwindCSS v4.
- **Test Runners**: Vitest (`vitest.unit.config.ts`) and Storybook Vitest plugin (`test-storybook`).

## Key Commands & Operations

From the repository root or inside `gui/`:
- **Run Component Unit Tests**: `npm --prefix gui run test:unit`
- **Run Storybook Component Tests**: `npm --prefix gui run test-storybook`
- **Launch Interactive Storybook**: `npm --prefix gui run storybook`
- **Validate Component Documentation**: `npm --prefix gui run validate:storybook-docs`

## Local Authority Governance

Per root project governance rules in `AGENTS.md`:
- **Local MDX Authority**: Storybook MDX files (`gui/components/*/*.mdx`) have **local implementation authority** for component API specifications, props usage, and visual guidelines.
- **System Architecture**: High-level platform UX and component specifications are governed by [`backlog/docs/`](../../backlog/docs/index/doc-10%20-%20Documentation-Index-and-Information-Architecture.md) (`doc-08-GUI-Architecture.md`).
