# M&Ai

M&Ai is a Deno and TypeScript middleware for low-touch mergers and
acquisitions workflows. The repository contains the Deno API and agent runtime,
the Next.js GUI, PostgreSQL-backed services, and prediction, optimization, and
document-generation engines.

## Documentation

Linear is the permanent system of record for active and completed work and
governed project documentation. Open the [MAI Linear workspace](https://linear.app/mergesai/)
and use the [migration map](docs/migrations/backlog-to-linear-map.json) for
historical Backlog traceability.

Key references:

- [System and Core Architecture](https://linear.app/mergesai/document/system-and-core-architecture-4a57aeede3db)
- [Agent Architecture and Workflows](https://linear.app/mergesai/document/agent-architecture-and-workflows-63b3e527b203)
- [M&A Domain Model](https://linear.app/mergesai/document/manda-domain-model-259ba512b0b3)
- [Local Setup and Runtime Operations](https://linear.app/mergesai/document/local-setup-and-runtime-operations-8fd2fbfba9f7)
- [MVP GUI and API Behavior](https://linear.app/mergesai/document/mvp-gui-and-api-behavior-1b432ee81db9)

Documents elsewhere in the repository are colocated implementation references,
agent knowledge, migration metadata, or generated artifacts. They do not
supersede Linear Documents.

## Quick start

Prerequisites: Deno, Node/npm for the GUI, and PostgreSQL for database-backed
paths.

```bash
deno task db:start
deno task db:setup
deno task api:start
```

In another terminal:

```bash
deno task gui:start
```

Set `GEMINI_API_KEY` only when live Google AI calls are required. Without it,
supported local paths use their documented dry-run or fallback behavior.

## Verification

Run the repository gate from the project root:

```bash
deno task verify
```

The gate covers Deno tests, the documentation policy, GUI tests, the Next.js
build, Storybook documentation/build checks, and Storybook interaction tests.

## Repository map

```text
src/          Deno API, agents, core services, and engines
gui/          Next.js application and colocated component documentation
tests/        Cross-module and contract tests
scripts/      Verification, training, and repository tooling
docs/         Migration metadata and local repository references
graphify-out/ Generated knowledge graph; non-authoritative
```

See [AGENTS.md](AGENTS.md) for repository-agent operating rules.
