# M&Ai

M&Ai is a Deno and TypeScript middleware for low-touch mergers and
acquisitions workflows. The repository contains the Deno API and agent runtime,
the Next.js GUI, PostgreSQL-backed services, and prediction, optimization, and
document-generation engines.

## Documentation

The governed documentation root is `backlog/docs/`. Start with the
[Documentation Index](backlog/docs/index/doc-10%20-%20Documentation-Index-and-Information-Architecture.md).

Key references:

- [System and Core Architecture](backlog/docs/architecture/system-core/doc-2%20-%20System-and-Core-Architecture.md)
- [Agent Architecture and Workflows](backlog/docs/architecture/agent-workflows/doc-3%20-%20Agent-Architecture-and-Workflows.md)
- [M&A Domain Model](backlog/docs/domain/domain-model/doc-7%20-%20MA-Domain-Model.md)
- [Local Setup and Runtime Operations](backlog/docs/operations/local-setup/doc-8%20-%20Local-Setup-and-Runtime-Operations.md)
- [MVP GUI and API Behavior](backlog/docs/product/mvp-gui-and-api/doc-9%20-%20MVP-GUI-and-API-Behavior.md)

Documents elsewhere in the repository are colocated implementation references,
agent knowledge, work records, or generated artifacts. They do not supersede
the governed documentation.

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
backlog/      Governed tasks, milestones, and canonical documentation
graphify-out/ Generated knowledge graph; non-authoritative
```

See [AGENTS.md](AGENTS.md) for repository-agent operating rules.
