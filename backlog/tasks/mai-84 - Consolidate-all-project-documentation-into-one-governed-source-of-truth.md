---
id: MAI-84
title: Consolidate all project documentation into one governed source of truth
status: Done
assignee:
  - codex
created_date: '2026-07-22 05:24'
updated_date: '2026-07-29 15:27'
labels:
  - documentation
  - architecture
  - governance
milestone: m-14
dependencies: []
references:
  - 'https://github.com/M-Ai-Fintech/MVP/pull/5'
modified_files:
  - AGENTS.md
  - CONTEXT.md
  - README.md
  - >-
    backlog/docs/architecture/agent-workflows/doc-3 -
    Agent-Architecture-and-Workflows.md
  - >-
    backlog/docs/architecture/data-and-memory/doc-4 -
    Data-and-Memory-Architecture.md
  - backlog/docs/architecture/engines/doc-5 - Engine-Architecture.md
  - >-
    backlog/docs/architecture/system-core/doc-2 -
    System-and-Core-Architecture.md
  - >-
    backlog/docs/architecture/vdr-and-integrations/doc-6 -
    VDR-and-Integration-Architecture.md
  - >-
    backlog/docs/decisions/adr-0001-english-internal-identifiers-i18n/doc-14 -
    ADR-0001-English-Internal-Identifiers-and-i18n.md
  - backlog/docs/domain/domain-model/doc-7 - MA-Domain-Model.md
  - >-
    backlog/docs/governance/document-inventory/doc-12 -
    Documentation-Inventory-and-Classification.md
  - >-
    backlog/docs/governance/documentation-governance/doc-11 -
    Documentation-Governance-and-Ownership.md
  - >-
    backlog/docs/governance/generated-artifacts-and-agent-knowledge/doc-13 -
    Generated-Artifacts-and-Agent-Knowledge-Classification.md
  - >-
    backlog/docs/index/doc-10 -
    Documentation-Index-and-Information-Architecture.md
  - backlog/docs/mocks_architecture/doc-1 - Arquitetura-e-Escopo-dos-Mocks.md
  - backlog/docs/mocks_architecture/doc-1 - Deprecated-MVP-Mock-Architecture.md
  - >-
    backlog/docs/operations/local-setup/doc-8 -
    Local-Setup-and-Runtime-Operations.md
  - backlog/docs/product/mvp-gui-and-api/doc-9 - MVP-GUI-and-API-Behavior.md
  - >-
    backlog/tasks/mai-84 -
    Consolidate-all-project-documentation-into-one-governed-source-of-truth.md
  - context/agents_architecture.md
  - context/architecture.md
  - context/constraint_negotiation_api.md
  - context/continuous_learning_and_rag.md
  - context/core_architecture.md
  - context/database_memory_singleton.md
  - context/google_ai_studio_setup.md
  - context/nextjs_gui_and_api.md
  - context/onnx_bootstrapper.md
  - context/optimization_portfolio_solver.md
  - context/refactoring_technical_debt.md
  - context/term_sheet_genetic_optimizer.md
  - context/valuation.md
  - context/vdr_integration_supergood.md
  - docs/adr/0001-english-internal-identifiers-with-i18n.md
  - docs/architecture.md
  - docs/prediction_engine.md
  - fix_commits.sh
  - graphify-out/GRAPH_REPORT.md
  - graphify-out/graph.json
  - gui/AGENTS.md
  - gui/README.md
  - scripts/check_docs.ts
  - scripts/check_docs_test.ts
  - scripts/verify.ts
  - scripts/verify_test.ts
  - src/agent/ai_provider.ts
priority: high
ordinal: 83000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Inventory and consolidate documentation currently spread across context/, docs/, backlog/docs/, README files, ADRs, and agent knowledge assets. Establish backlog/docs as the governed documentation root, distinguish normative documentation from generated reports and model knowledge, and define how Backlog decisions relate to ADRs and domain context.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Every documentation-like file is inventoried with owner, purpose, authority, freshness, language, and target disposition
- [x] #2 A documented information architecture defines canonical locations for architecture, domain model, setup, operations, product behavior, decisions/ADRs, generated reports, and agent knowledge assets
- [x] #3 Authoritative content from context/, docs/, and other duplicate locations is migrated or referenced from backlog/docs without losing unique knowledge
- [x] #4 Duplicate, stale, and conflicting documents are marked for approved removal rather than silently retained as competing sources
- [x] #5 AGENTS.md and relevant README navigation point to the canonical documentation entry point
- [x] #6 Canonical documentation is written in English; translated end-user material is routed through the i18n policy
- [x] #7 The canonical decision policy is documented: English ADRs under backlog/docs/decisions/ are authoritative, and Backlog Decisions remain unused until the CLI supports governed create, view, and edit workflows
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
## Approved implementation plan — 2026-07-24

1. Establish `backlog/docs/index.md` as the canonical English documentation entry point and define the information architecture.
2. Create a complete tracked-document inventory with owner, purpose, authority, freshness, language, and disposition, including colocated agent knowledge and generated Graphify artifacts.
3. Consolidate unique knowledge into governed English documentation for system/agent/data/engine/integration architecture, domain model, setup/operations, GUI/product behavior, and agent/model knowledge policy.
4. Move decision authority to English ADRs under `backlog/docs/decisions/`; document that Backlog Decisions remain unused until governed create/view/edit support exists.
5. Classify Storybook MDX and agent knowledge as referenced non-canonical assets and `graphify-out/` as generated/non-authoritative.
6. Replace legacy governed documents with explicit redirects/deprecation notices where MCP deletion is unavailable.
7. Remove approved legacy duplicates from `context/` and `docs/` after preserving unique content, including the exact duplicate context copies of core architecture, Google AI Studio setup, and refactoring technical debt.
8. Update root and GUI navigation (`AGENTS.md`, `README.md`, and relevant shims) to point to the canonical index.
9. Add a Deno documentation checker for broken internal links, duplicate authority claims, required metadata, and canonical-tree policy; integrate it into `deno task verify` with regression tests.
10. Run focused tests, `deno task verify`, `git diff --check`, and `graphify update .`; record exact evidence.
11. Work on an isolated MAI-84 branch while preserving pre-existing MAI-79 changes; commit, push, and open a human-review PR without merge or self-approval.

### Delegation
- Small Terra-low agents may implement independent canonical-document and checker/navigation slices.
- The coordinating agent owns integration, Backlog state, verification, review, and PR.

### Approved removals
Legacy documentation under `context/` and `docs/` may be removed after unique content is preserved and canonical navigation exists. Governed Backlog documents that cannot be deleted through MCP will become explicit non-authoritative redirects/deprecation notices.

### Risks and checkpoints
Reconcile stale GUI route claims, seven-role versus eight-directory agent terminology, outdated model/path claims, overlapping GUI design authority, and unavailable remote PR discovery. Material scope changes require renewed approval.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Intake started 2026-07-24. Scope: consolidate repository documentation into governed `backlog/docs` source of truth per seven acceptance criteria and three task-specific DoD gates. Local state at intake: branch `chore/MAI-79-verification-gate`; pre-existing modified Backlog file for MAI-79 must be preserved. Remote writes are treated as authorized only for the Solve MAI review-PR workflow; no merge or self-approval.

## Implementation
- Created 13 canonical English governed documents through Backlog MCP for navigation, governance, inventory, ADR policy, architecture, domain, operations, and product behavior.
- Inventory individually classifies 194 documentation-like assets; Backlog tasks/milestones remain governed work-record families.
- Removed approved legacy `CONTEXT.md`, `context/`, and `docs/` sources after preserving unique knowledge. Converted the addressable mock architecture document into an English non-authoritative redirect.
- Four pre-governance top-level Backlog documents have no MCP IDs; they remain explicitly deprecated/non-authoritative in the manifest. Direct editing was not used.
- Added `scripts/check_docs.ts`, regression coverage, and the `canonical-documentation` aggregate verification check. Checker validates manifest coverage, document existence, relative links, authority uniqueness, English canonical disposition, and six required body metadata fields.
- Updated root/GUI navigation and the AI-provider documentation path. Preserved the pre-existing MAI-79 worktree change and excluded it from MAI-84 scope.

## Verification
- `graphify update .` — PASS; graph refreshed. Existing Graphify extraction warnings about unsupported/zero-node inputs remain visible.
- `deno fmt --check scripts/check_docs.ts scripts/check_docs_test.ts scripts/verify.ts scripts/verify_test.ts src/agent/ai_provider.ts` — PASS (5 files).
- `deno check scripts/check_docs.ts scripts/verify.ts` — PASS.
- `deno test --allow-read --allow-write --allow-run scripts/check_docs_test.ts scripts/verify_test.ts` — PASS (13 passed, 0 failed).
- `deno run --allow-read scripts/check_docs.ts backlog/docs` — PASS (`Documentation check passed.`).
- `git diff --check` — PASS.
- `deno task verify` — initial sandbox run: task-scoped/Deno/GUI unit/Storybook docs/build passed; Next build and Storybook interactions blocked by Google Fonts network and local-port permissions. Exact rerun with required permissions — PASS: Canonical documentation, Deno tests, GUI unit tests, Next.js production build, Storybook documentation, Storybook build, Storybook interaction tests.

## Review
- Independent standards review: no code-smell or standards defect; MAI-79 file must remain outside commit.
- Independent spec review findings were addressed: canonical body metadata is enforced; missing manifest files are detected; ADR removal policy matches approved migration. Four ID-less legacy governed documents remain deprecated and non-authoritative pending future MCP lifecycle support.

## Remaining human action
- Create/review PR and approve. Task remains In Progress until required human review is complete.

## Commits and PR
- `2334610` — `doc(MAI-84): consolidate governed project documentation`.
- `82ec95a` — `chore(MAI-84): refresh documentation graph`.
- Draft PR: https://github.com/M-Ai-Fintech/MVP/pull/5 targeting `master`.
- GitHub/Backlog automation added unrelated MAI-79 commit `13316a6` after publication. It was neutralized without force-push by `b5d489d` (`chore(MAI-84): exclude unrelated MAI-79 update`). Final PR file list contains no MAI-79 file.
- PR state: OPEN, draft; no review decision; no remote status checks reported. Human review and approval remain required.
<!-- SECTION:NOTES:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 A link and duplication checker passes for the canonical documentation tree
- [x] #2 No unresolved pair of files claims authority over the same concept
- [x] #3 Documentation ownership and update rules are part of the task completion workflow
<!-- DOD:END -->

## Comments

<!-- COMMENTS:BEGIN -->
author: @codex
created: 2026-07-22 05:55
---
Decision verdict — 2026-07-22: Do not adopt Backlog Decisions with the current CLI. It supports creation but not a governed view/edit lifecycle, while direct Markdown editing is prohibited by project rules. English ADRs consolidated under backlog/docs/decisions/ remain the canonical decision records. Reassess Backlog Decisions only when the CLI supports the full lifecycle without direct file edits.
---
<!-- COMMENTS:END -->
