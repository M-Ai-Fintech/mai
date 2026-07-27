# Repository Agent Instructions

Canonical project architecture, domain, setup, operations, and product
documentation lives under `backlog/docs/`. Start with the
[Documentation Index](backlog/docs/index/doc-10%20-%20Documentation-Index-and-Information-Architecture.md).
Do not place competing project-wide authority in this file.

## Backlog.md workflow

This project uses Backlog.md as its system of record.

For every request:

1. Run `backlog instructions overview` before answering or acting.
2. Use the overview to decide whether to search, read, create, or update a task.
3. Read `task-execution` before planning or implementation and
   `task-finalization` before completion.
4. Run `backlog <command> --help` before unfamiliar CLI operations.

Never edit Backlog tasks, documents, decisions, drafts, or milestones directly.
Use the configured Backlog tools so metadata, relationships, and history remain
consistent.

## Documentation governance

- `backlog/docs/` is the governed documentation root.
- Canonical documentation and ADRs are English.
- English ADRs under `backlog/docs/decisions/` are authoritative.
- Backlog Decisions remain unused until governed create, view, and edit
  workflows are available.
- Colocated Storybook MDX and `src/agent/agents/**` knowledge assets have local
  implementation authority only.
- `graphify-out/` is generated and non-authoritative.
- Update the documentation inventory and ownership metadata whenever a
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
