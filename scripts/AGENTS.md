# Scripts Subsystem Agent Instructions (`scripts/`)

This directory contains automation, system verification, documentation governance checks, i18n validation, and maintenance scripts for the MAI repository.

## Key Scripts & Tooling

- **`verify.ts`**: Core system verification suite checking environments, dependencies, and subsystem readiness (`deno task verify`).
- **`verify_integration.ts`**: System integration verification suite testing cross-module operations and external services (`deno task verify:integration`).
- **`check_docs.ts`**: Linear migration-map parity and documentation-governance compliance checking tool.
- **`check_i18n.ts`**: Translation key completeness and internationalization integrity validator.
- **Script Unit Tests**: `check_docs_test.ts`, `check_i18n_test.ts`, `verify_test.ts`, `verify_integration_test.ts`.
- **Utilities & Datasets**: `install-git-hooks.sh`, `graphify-merged-rebuild.sh`, `dataset_ma_br_mock.jsonl`, `colab_training_notebook.ipynb`.

## Runtime Environments & Execution

- **TypeScript Scripts (`.ts`)**: Executed using Deno runtime (`deno run`).
- **Shell Scripts (`.sh`)**: Executed using standard POSIX/Bash shell (`/bin/bash`).

## Key Commands & Workflows

- **Run System Verification**: `deno task verify`
- **Run Integration Verification**: `deno task verify:integration`
- **Run Documentation Check**: `deno run --allow-read scripts/check_docs.ts`
- **Run i18n Translation Check**: `deno run --allow-read scripts/check_i18n.ts`
- **Run Script Unit Tests**: `deno test --allow-read --allow-write --allow-run scripts/`

## Script Authoring & Permission Guidelines

- **Explicit Deno Permissions**: Specify minimal necessary Deno flags when authoring run commands. Note that running script unit tests (specifically `verify_test.ts`) requires `--allow-run` because it spawns sub-processes via `Deno.Command`.
- **Exit Codes**: Scripts must return exit code `0` on success and non-zero on failure to ensure compatibility with CI/CD pipelines and git hooks.
- **Idempotency**: Automation scripts must be safe to execute multiple times consecutively without causing side effects.

## Documentation Governance

DevOps processes and CI/CD automation rules are documented in the [MA&I Linear workspace](https://linear.app/mergesai/) and preserved in the migrated `doc-5` Linear Document (Engine Architecture). The repository migration map records its legacy path and identifier.
