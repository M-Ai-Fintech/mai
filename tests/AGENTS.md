# Test Suite Agent Instructions (`tests/`)

This directory contains the central automated test suite for the MAI backend,
microservices, engines, API endpoints, and end-to-end workflows.

## Subdirectories & Spec Types

- **`agents/`**: Unit and integration tests for multi-agent workflows and
  sub-agents (`config.spec.ts`, `vdr_tools.spec.ts`).
- **`api/`**: API contract validation (`contracts/`), endpoint route tests
  (`routes/`), and store state synchronization tests (`store/`).
- **`cli/`**: Tests for CLI commands and administrative tools
  (`errors.spec.ts`).
- **`core/`**: Core infrastructure tests (database persistence, memory service,
  continuous learning, Papermark VDR).
- **`engines/`**: Mathematical optimization, valuation models, ONNX model
  predictions, transformers, and document generation tests.
- **`e2e/`**: End-to-end user journey and integration tests (`cli.spec.ts`,
  `flow.test.ts`).
- **`fixtures/`**: Shared static test data, mock payloads, and snapshot fixtures
  (`ideals.json`, `intralinks.json`).
- **`workflows/`**: End-to-end multi-agent deal lifecycle execution tests
  (`agentic_workflow.spec.ts`).
- **Top-level Specs**: `smoke.spec.ts`, `pubsub.spec.ts`, `db_setup.spec.ts`,
  `vdr_connectors.spec.ts`, `vdr_provider.spec.ts`, `fine_tuning_mcp.test.ts`.

## Runtime Environment & Test Runner

Integration-test resources use semantic names only. The shared isolated
PostgreSQL contract is `POSTGRES_INTEGRATION_TEST_DATABASE_URL` pointing to
`mai_test_postgres_integration`; bounded-context-specific databases must name
their owner and purpose. Do not introduce legacy Backlog IDs or current Linear
issue IDs into test environment variables, database names, schemas, helpers,
fixtures, or test documentation. Legacy Backlog IDs are historical migration
metadata only.

- **Runtime**: Deno test runner (`deno.json`).
- **Standard Assertion Library**: `@std/assert`
  (`https://deno.land/std@0.224.0/assert/mod.ts`).
- **Included File Patterns**: Per `deno.json`, files matching
  `tests/**/*.spec.ts`, `tests/**/*.test.ts`, and `tests/**/*_test.ts`.

## Key Commands & Verification Tasks

- **Run Full Test Suite**: `deno task test`
- **Run Fast Smoke Tests**: `deno task test:smoke`
- **Run General Verification**: `deno task verify`
- **Run Integration Verification**: `deno task verify:integration`
- **Run Specific Directory/File Tests**:
  - `deno test --env --allow-read --allow-write --allow-env --allow-ffi --allow-run --allow-net tests/engines/`
  - `deno test --env --allow-read --allow-write --allow-env --allow-ffi --allow-run --allow-net tests/smoke.spec.ts`

## Test Conventions & Best Practices

- **Test Isolation**: Tests must clean up temporary files or state changes to
  maintain test independence.
- **Deterministic Mocking**: Use `fixtures/` or mock providers (e.g., VDR mock
  provider, AI provider fallback mode) rather than live external API calls in
  standard test runs.
- **Fast Execution**: Unit and smoke tests must execute rapidly (< 5s overall)
  to support fast development iterations.

## Documentation Governance

Canonical testing specifications and quality assurance procedures are documented
in Linear Documents in the [MAI workspace](https://linear.app/mergesai/).
