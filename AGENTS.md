# Repository Agent Instructions

Linear is the system of record for active and completed project work and
governed project documentation. Use the MAI team in
<https://linear.app/mergesai/>. The local
[migration map](docs/migrations/backlog-to-linear-map.json) preserves historical
Backlog IDs and paths without becoming active authority.
Do not place competing project-wide authority in this file.

## Linear workflow

This project uses Linear as its permanent active work and documentation system.

For every request:

1. Resolve the relevant Linear issue, project, and governed documents before
   answering or acting.
2. Use the Linear MAI team to search, read, create, or update work records.
3. Read the full issue, acceptance criteria, dependencies, evidence, and
   project context before planning or implementation.
4. Record plans, evidence, documentation links, relations, and completion
   summaries in Linear; use native issue/document operations for writes.

Never create a competing local task or documentation system. Git remains the
source of truth for code and history; legacy Backlog IDs are historical
traceability only.

## Documentation governance

- Linear Documents are the governed documentation root for active project work.
- Canonical documentation and ADRs are English.
- English Linear Documents with the relevant architecture or decision context
  are authoritative.
- Colocated Storybook MDX and `src/agent/agents/**` knowledge assets have local
  implementation authority only.
- `graphify-out/` is generated and non-authoritative.
- Update the relevant Linear Document and migration metadata whenever a
  documentation-like asset is added, removed, moved, or reclassified.

## Graphify

The project knowledge graph is stored in `graphify-out/`.

- For codebase questions, first run `graphify query "<question>"` when
  `graphify-out/graph.json` exists.
- Use `graphify path "<A>" "<B>"` for relationships and
  `graphify explain "<concept>"` for focused concepts.
- Use `graphify-out/wiki/index.md` for broad navigation when present.
- Dirty generated graph files are expected after hooks or incremental updates.
- After modifying code, run `graphify update .`.

## Local instructions

Read every more-specific `AGENTS.md` that applies to files being changed. For
the GUI, `gui/AGENTS.md` contains the Next.js-version rule.

## Code style

- Functions: 4-20 lines. Split if longer.
- Files: under 500 lines. Split by responsibility.
- One thing per function, one responsibility per module (SRP).
- Names: specific and unique. Avoid `data`, `handler`, `Manager`.
  Prefer names that return <5 grep hits in the codebase.
- Types: explicit. No `any`, no `Dict`, no untyped functions.
- No code duplication. Extract shared logic into a function/module.
- Early returns over nested ifs. Max 2 levels of indentation.
- Exception messages must include the offending value and expected shape.

## Comments

- Keep your own comments. Don't strip them on refactor — they carry
  intent and provenance.
- Write WHY, not WHAT. Skip `// increment counter` above `i++`.
- Docstrings on public functions: intent + one usage example.
- Reference issue numbers / commit SHAs when a line exists because
  of a specific bug or upstream constraint.

## Tests

- Run the full verification suite with `deno task verify`.
- Run backend tests directly with `deno task test`.
- Run GUI unit tests with `npm --prefix gui run test:unit`.
- Every new function gets a test. Bug fixes get a regression test.
- Mock external I/O (API, DB, filesystem) with named fake classes,
  not inline stubs.
- Tests must be F.I.R.S.T: fast, independent, repeatable,
  self-validating, timely.

## Dependencies

- Inject dependencies through constructor/parameter, not global/import.
- Wrap third-party libs behind a thin interface owned by this project.

## Structure

- Follow the framework's convention (Rails, Django, Next.js, etc.).
- Prefer small focused modules over god files.
- Predictable paths: controller/model/view, src/lib/test, etc.

## Formatting

- Format Deno and TypeScript source with `deno fmt`.
- Check GUI formatting and lint rules with `npm --prefix gui run lint`.

## Logging

- Structured JSON when logging for debugging / observability.
- Plain text only for user-facing CLI output.
## Resource naming

Linear issue IDs are governance and traceability identifiers, not names for runtime resources. Never use Linear issue IDs or legacy Backlog identifiers in environment variables, database or schema names, Docker resources, code symbols, helpers, filenames, queues, topics, metrics, fixtures, or runtime configuration. Current issue IDs remain valid in Linear records, branches, pull requests, commits, comments, and current references; legacy Backlog IDs remain historical only.

## Wave K execution authority — MAI-68

The owner decision recorded in Linear comment `cf26b36a-b2e0-47b1-a998-9bd97b3f2746` is authoritative: the banker-facing CLI is obsolete and may be removed without replacement coverage. Broader legacy migration and retirement remain MAI-70 scope. MAI-68 is In Progress on `delivery/MAI-68-retire-legacy-banker-cli`, with Draft PR #70; Linear is the active work and decision record.

The retired product surface includes `src/main.ts`, `src/cli/**`, `deno task start`, and Cliffy product registrations. They must not be restored as a supported banker workflow. The supported product boundaries are the approved frontend, API/application services, and agent workspace. Retained command-line work is bounded operator, migration, recovery, diagnostic, or developer tooling and is classified by the MAI-68 retirement test and its governed Linear inventory.

Current implementation authority for this correction is limited to `tests/cli/retirement.spec.ts`, `src/agent/ai_provider.ts`, `src/agent/ai_provider_test.ts`, this section, and the stale log-ignore cleanup. Preserve shared API, worker, engine, frontend, and application behavior. Do not redesign GUI/API/platform/core/scripts, perform migration or cloud work, or broaden into MAI-70.

Keep the PR Draft and MAI-68 In Progress for owner review. Do not self-approve, self-merge, mark Done, or close Wave K. The finisher requires a fresh exact-head Luna Max review with P0=0/P1=0, focused verification, and one terminal `DENO_ENV=test deno task verify`; canonical remains pending until then. Do not run Graphify manually. If hooks invoke Graphify, restore only its generated artifacts before publishing.
