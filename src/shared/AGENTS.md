# Shared Subsystem Agent Instructions (`src/shared/`)

This directory contains cross-cutting domain schemas, type definitions, and
shared utilities consumed across core, engines, agents, and API subsystems.

## Subdirectories & Modules

- **`schemas/`**: Runtime validation Zod schemas shared across subsystems.
  - `domain-area.ts`: Validation schemas for financial domain areas, industry
    classifications, and deal categories.
  - `term-sheet.ts`: Validation schemas for M&A term sheets, financial terms,
    earnouts, and valuation ranges.
- **`types.ts`**: Standard TypeScript type definitions and interfaces for common
  platform data models.

## Runtime Environment & Module Import Rules

- **Runtime**: Deno runtime (TypeScript).
- **Import Policy**: Explicit `.ts` extensions required for relative imports
  (e.g. `import { TermSheetSchema } from "./schemas/term-sheet.ts"`).
- **No Side Effects**: Modules in `src/shared/` must be pure type definitions or
  Zod schema declarations with zero runtime side effects, external I/O, or
  network connections.

## Key Commands & Operations

- **Typecheck & Validate via Tests**: `deno task test`
- **Run Full System Verification**: `deno task verify`

## Domain Rules & Modification Guidelines

- **Shared Domain Immutability**: Modifying shared schemas or types directly
  impacts multiple platform layers (`src/core/`, `src/engines/`, `src/agent/`,
  `src/api/`).
- **Backward Compatibility**: Any schema update must maintain backward
  compatibility or be accompanied by updates across all dependent consumer code.

## Documentation Governance

Canonical domain models and system architecture are governed by Linear
Documents `doc-2` and `doc-7` in the
[MAI workspace](https://linear.app/mergesai/).
