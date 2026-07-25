# Code-Rot Audit Report

**Repository:** `/home/luis/mai`
**Branch:** `chore/MAI-83-code-rot-audit`
**Date:** 2026-07-24
**Mode:** Report-only (no deletions)

---

## Methodology

1. Graphify knowledge graph queried for dead code, orphan modules, and duplicates.
2. Four parallel research agents scanned: root files/directories, `scripts/`, `src/`, and `gui/`.
3. Every candidate verified against:
   - `deno.json` tasks and imports
   - `gui/package.json` scripts and dependencies
   - `git ls-files` tracking status
   - Import graphs (grep for usage across `src/`, `tests/`, `scripts/`, `gui/`)
   - Framework conventions (Next.js routes, dynamic imports, registries, CLI entry points, migrations, test runners, deployment configs)

---

## Summary

| Classification     | Count | Removable LOC (est.) | Removable Bytes (est.) |
|--------------------|-------|-----------------------|------------------------|
| **SAFE TO REMOVE** | 11    | ~370                  | ~42 KB                 |
| **REVIEW**         | 8     | ~400                  | ~32 KB                 |
| **KEEP**           | —     | —                     | —                      |

---

## SAFE TO REMOVE

### S1. `fix_commits.sh` (root)

| Field        | Value |
|--------------|-------|
| **Path**     | `fix_commits.sh` |
| **Type**     | One-off shell script |
| **What**     | Historical commit-splitting script for MAI-8 through MAI-16. Runs `git add` + `git commit` in sequence. |
| **Evidence** | Zero references in `deno.json`, CI, docs, or code. All referenced commits are long merged. |
| **LOC**      | 62 |
| **Risk**     | None — purely historical. |

### S2. `scratch/` directory (root)

| Field        | Value |
|--------------|-------|
| **Path**     | `scratch/new_interface.ts`, `scratch/new_interface2.ts`, `scratch/patch_commands.ts` |
| **Type**     | Temporary draft files |
| **What**     | CLI interface prototypes and a 3-line import stub. Unreferenced by any production code, test, or `deno.json` task. |
| **Evidence** | Git-tracked (3 files). Zero imports from `src/`, `tests/`, or `scripts/`. |
| **LOC**      | ~260 (3 files) |
| **Risk**     | None — disconnected prototypes. |

### S3. `scripts/antigravity_agent.py`

| Field        | Value |
|--------------|-------|
| **Path**     | `scripts/antigravity_agent.py` |
| **Type**     | Python demo script |
| **What**     | Google Antigravity SDK demonstration simulating an M&A contract auditing agent. |
| **Evidence** | Zero references in `deno.json`, `gui/package.json`, any TS code, tests, docs, or git hooks. Orphaned Python file in a Deno/TypeScript repo. |
| **LOC**      | ~100 |
| **Risk**     | None. |

### S4. `src/engines/document-generator/hybrid.ts`

| Field        | Value |
|--------------|-------|
| **Path**     | `src/engines/document-generator/hybrid.ts` |
| **Type**     | Orphan TypeScript module |
| **What**     | `HybridDocumentEngine` class combining Handlebars templates, LaTeX, and pdf-lib signatures. |
| **Evidence** | Zero imports across all `src/`, `tests/`, `scripts/`, `gui/`. `LaTeXGenerator` and `PDFGenerator` are used directly. |
| **LOC**      | ~80 (estimated) |
| **Risk**     | None — dead class, never instantiated. |

### S5. Unused `deno.json` dependency: `@bubblyworld/highs-ts`

| Field        | Value |
|--------------|-------|
| **Path**     | `deno.json` import map entry |
| **Type**     | Unused NPM dependency |
| **What**     | HiGHS solver TypeScript bindings. |
| **Evidence** | Zero import statements in `src/`, `tests/`, `scripts/`. LP solving uses `javascript-lp-solver`. |
| **Risk**     | None — import map entry only (no code references). |

### S6. Unused `deno.json` dependency: `genetic-search`

| Field        | Value |
|--------------|-------|
| **Path**     | `deno.json` import map entry |
| **Type**     | Unused NPM dependency |
| **What**     | Generic genetic algorithm library. |
| **Evidence** | Zero imports. Custom implementation in `src/engines/optimization/genetic.ts`. |
| **Risk**     | None. |

### S7. Unused `deno.json` dependency: `commander`

| Field        | Value |
|--------------|-------|
| **Path**     | `deno.json` import map entry |
| **Type**     | Unused NPM dependency |
| **What**     | Node.js CLI framework. |
| **Evidence** | CLI was rewritten using `@cliffy/command`. Only a comment in `tests/e2e/cli.spec.ts` references Commander. |
| **Risk**     | None. |

### S8. Unused `deno.json` dependency: `@std/cli`

| Field        | Value |
|--------------|-------|
| **Path**     | `deno.json` import map entry |
| **Type**     | Unused Deno std library module |
| **What**     | Deno standard CLI utilities. |
| **Evidence** | Zero imports anywhere. CLI uses Cliffy. |
| **Risk**     | None. |

### S9. `gui/components/screens/entities/entity.vitest.config.ts`

| Field        | Value |
|--------------|-------|
| **Path**     | `gui/components/screens/entities/entity.vitest.config.ts` |
| **Type**     | Redundant Vitest configuration file |
| **What**     | Scopes Vitest to `components/screens/entities/**/*.test.ts`. |
| **Evidence** | Not referenced in `gui/package.json` scripts. Root `gui/vitest.unit.config.ts` already includes `components/**/*.test.ts`. Git-tracked. |
| **LOC**      | ~10 |
| **Risk**     | None. |

### S10. Unused GUI devDependency: `jest-image-snapshot` + `@types/jest-image-snapshot`

| Field        | Value |
|--------------|-------|
| **Path**     | `gui/package.json` devDependencies |
| **Type**     | Unused NPM devDependencies |
| **What**     | Jest image snapshot comparison assertions. |
| **Evidence** | Zero imports in `gui/`. Visual testing uses `@vitest/browser-playwright` and `@storybook/addon-vitest`. |
| **Risk**     | None. |

### S11. Unused GUI devDependency: `axe-playwright`

| Field        | Value |
|--------------|-------|
| **Path**     | `gui/package.json` devDependencies |
| **Type**     | Unused NPM devDependency |
| **What**     | Playwright accessibility testing helper. |
| **Evidence** | Zero imports in `gui/`. A11y testing uses `@storybook/addon-a11y`. |
| **Risk**     | None. |

---

## REVIEW

### R1. `src/agent/fine_tuning.ts`

| Field        | Value |
|--------------|-------|
| **Path**     | `src/agent/fine_tuning.ts` |
| **Type**     | Orphan module |
| **What**     | `FineTuningRegistry` class — static metadata, LoRA config schema, and Python training script template. |
| **Evidence** | Zero imports in `src/`, `tests/`, or anywhere else. Created for MAI-10. Related to `scripts/fine_tuning_lora.py` and `scripts/dataset_ma_br_mock.jsonl`. |
| **Recommendation** | Move to `scripts/` as reference material or remove if fine-tuning pipeline is not planned. |

### R2. `src/engines/prediction/pytorch.ts`

| Field        | Value |
|--------------|-------|
| **Path**     | `src/engines/prediction/pytorch.ts` |
| **Type**     | Orphan module |
| **What**     | `PyTorchExporter` class — Python script template for ONNX model export. |
| **Evidence** | Zero imports. Functionality duplicated by `generate_onnx.py` (root) and `scripts/colab_training_notebook.ipynb`. |
| **Recommendation** | Remove or consolidate with `generate_onnx.py`. |

### R3. `src/engines/optimization/config.ts`

| Field        | Value |
|--------------|-------|
| **Path**     | `src/engines/optimization/config.ts` |
| **Type**     | Dead configuration schema |
| **What**     | `OptimizationConfig` interface and `defaultConfig` object. Re-exported by `src/engines/optimization/index.ts` but never consumed. |
| **Evidence** | Zero active usage beyond the barrel re-export. |
| **Recommendation** | Remove or integrate into `constraints.ts` if config is needed. |

### R4. `src/scripts/e2e_flow.ts`

| Field        | Value |
|--------------|-------|
| **Path**     | `src/scripts/e2e_flow.ts` |
| **Type**     | Misplaced orphan script |
| **What**     | Standalone E2E pubsub flow simulator. |
| **Evidence** | Not in `deno.json` tasks. Not imported. `src/scripts/` is non-canonical (scripts live in root `scripts/`). No corresponding test file exists. |
| **Recommendation** | Move to root `scripts/` or remove if superseded by `tests/e2e/`. |

### R5. `scripts/benchmark_optimization.ts`

| Field        | Value |
|--------------|-------|
| **Path**     | `scripts/benchmark_optimization.ts` |
| **Type**     | Developer utility |
| **What**     | Performance benchmark for genetic algorithm and portfolio solver. |
| **Evidence** | Not in `deno.json` tasks. Referenced in MAI-27 task only. |
| **Recommendation** | Keep as dev tool or wire into `deno task bench`. |

### R6. `scripts/fine_tuning_lora.py`

| Field        | Value |
|--------------|-------|
| **Path**     | `scripts/fine_tuning_lora.py` |
| **Type**     | ML training reference script |
| **What**     | Hugging Face SFTTrainer + LoRA + 4-bit quantization script for Llama 3. |
| **Evidence** | Referenced in MAI-10 and `fix_commits.sh`. Not wired to Deno runtime. |
| **Recommendation** | Keep if fine-tuning experiments will continue. |

### R7. GUI orphan components (4 components)

| Component | Path | Evidence |
|-----------|------|----------|
| `ErrorBoundary` | `gui/components/ErrorBoundary/` | 0 imports in `app/` or screens. Referenced only in design docs. |
| `Footer` | `gui/components/Footer/` | 0 imports in `app/` pages or `AppShell` layout. |
| `Radio` | `gui/components/Radio/` | 0 imports in `app/` or screen forms. |
| `Spinner` | `gui/components/Spinner/` | 0 imports (pages use `Skeleton` instead). |

**Recommendation:** These are part of the component library documented in Storybook. They are not dead code in the traditional sense — they're pre-built components awaiting integration. KEEP in component library, but flag for integration or deprecation in a future UI task.

### R8. `generate_onnx.py` (root)

| Field        | Value |
|--------------|-------|
| **Path**     | `generate_onnx.py` |
| **Type**     | Offline model generation script |
| **What**     | PyTorch model training + ONNX export. Generates `models/ma_classifier.onnx`. |
| **Evidence** | Active dependency: the generated model is loaded at boot. Mirrors `scripts/colab_training_notebook.ipynb`. |
| **Recommendation** | Move to `scripts/` to consolidate. Root-level placement is non-canonical. |

---

## KEEP (Selected Notable Items)

| Path | Rationale |
|------|-----------|
| `deno.json`, `deno.lock` | Core Deno runtime config. Actively used. |
| `docker-compose.yml` | pgvector PostgreSQL. Referenced by `deno task db:start`. |
| `CLAUDE.md`, `GEMINI.md` | Platform-specific LLM harness entrypoints. Not duplicates — distinct hooks. |
| `skills-lock.json` | Agent skills integrity lockfile. Active. |
| `scripts/verify.ts` | Primary `deno task verify` gate. Core CI pipeline. |
| `scripts/check_docs.ts` | Documentation validator in verify pipeline. |
| `scripts/check_i18n.ts` | i18n string validator in verify pipeline. |
| `scripts/graphify-merged-rebuild.sh` | Git hook invoked on commit/checkout. |
| `scripts/install-git-hooks.sh` | Environment setup utility. |
| `gui/scripts/validate-storybook-docs.mjs` | Storybook MDX validator. Active in verify pipeline. |
| `bench/` | Benchmark output directory. Used by genetic algorithm tests. |
| `data/` | Runtime data directory (feedback, logs, coverage). |
| `models/` | ONNX models loaded at boot. |
| `term_sheets/` | Generated document output (gitignored). |
| `outputs/` | Task output directory. |
| `src/graphify-out/` | Generated graphify artifact (gitignored). |
| `src/core/db/memory_service.ts` | Compatibility re-export shim. |
| `src/api/contracts.ts` | Compatibility barrel re-export. |

---

## Rejected Candidates

| Candidate | Why Rejected |
|-----------|-------------|
| Stitch validation script (`gui/scripts/validate-stitch-master-prompt.mjs`) | Already removed in MAI-79. Does not exist. |
| `gui/debug-storybook.log` | Exists locally but is gitignored/untracked. Not a repository artifact. |
| `.venv_torch/` | Gitignored. Not tracked. |
| `.codex/config.toml` | Gitignored. Not tracked. |
| Colocated test files in `src/` | Convention per `deno.json` test include patterns. Valid placement. |
| Agent `fonts/` knowledge directories | Active domain context for agent prompts. Architecture convention. |
| GUI component library (non-orphan components) | Active, imported, tested. |

---

## Residual Risk

- **Dependency cleanup** (S5–S8, S10–S11): Removing unused entries from `deno.json` and `gui/package.json` requires running `deno task verify` and `npm test` in gui to confirm no transitive dependency was relying on them.
- **Re-export shims** (`memory_service.ts`, `contracts.ts`): Kept as-is. Removing them would be a separate breaking-change task.
- **Orphan GUI components** (R7): Classified as REVIEW, not SAFE TO REMOVE, because Storybook component libraries conventionally contain pre-built components that may be intentionally unused in app code.

---

## Next Steps

This report fulfills MAI-83 acceptance criterion #1 (deterministic report with classifications). Before any deletions:
1. Owner reviews each SAFE TO REMOVE candidate.
2. Owner provides candidate-by-candidate approval naming exact IDs (S1–S11) and paths.
3. Approved removals are made in batches followed by `deno task verify` and GUI test gates.
