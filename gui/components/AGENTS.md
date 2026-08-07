# GUI UI Components Agent Instructions (`gui/components/`)

This directory contains only frontend components retained by the current task.
The MAI-95 foundation status specimen is temporary infrastructure, not the
final MAI design system.

## Authority and Scope

- Figma file `otMJE31OKIxdXogV4RNbGQ` is the sole visual and interaction
  authority.
- Never use Stitch, the retired GUI, old stories, old styles, or third-party
  screenshots as component design input.
- MAI-97 owns the final governed component library, variants, states, and
  Storybook design conformance.

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

## Local Documentation Governance

Per root project governance rules in `AGENTS.md`:
- **Local MDX scope**: Storybook MDX may document only the implementation beside
  it. It does not establish visual authority.
- **System architecture**: The current boundary is governed by
  [`doc-15`](https://linear.app/mergesai/document/mai-95-frontend-foundation-inventory-903eec38cc51).
