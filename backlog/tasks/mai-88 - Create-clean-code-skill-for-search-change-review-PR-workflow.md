---
id: MAI-88
title: Create project-wide clean-code audit skill
status: In Progress
assignee:
  - '@codex'
created_date: '2026-07-26 17:28'
updated_date: '2026-07-26 17:53'
labels:
  - skills
  - clean-code
dependencies: []
references:
  - 'https://github.com/M-Ai-Fintech/MVP/pull/8'
documentation:
  - .agents/skills/writing-great-skills/SKILL.md
  - .agents/skills/writing-great-skills/GLOSSARY.md
  - .agents/skills/solve-mai/SKILL.md
modified_files:
  - AGENTS.md
  - .agents/README.md
  - .agents/skills/clean-code/SKILL.md
  - graphify-out/GRAPH_REPORT.md
  - graphify-out/graph.json
priority: medium
ordinal: 81000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Create a reusable local agent skill for project-wide clean-code audits and refactors. The skill should search the whole repository for files, functions, modules, tests, names, dependency boundaries, comments, and generated artifacts that violate the clean-code rules in AGENTS.md; partition the work across multiple agents when the audit is extensive; implement scoped fixes; review the result; and prepare a pull request. The skill should follow .agents/skills/writing-great-skills/SKILL.md and use .agents/skills/solve-mai/SKILL.md as a phase-gated reference without becoming a generic feature-implementation workflow.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 A .agents/skills/clean-code/SKILL.md file exists and defines a project-wide clean-code audit/refactor workflow with search, triage, partition, implementation, review, verification, and PR phases.
- [x] #2 The skill treats AGENTS.md as the local rule source for clean-code checks and avoids duplicating those rules as a competing source of truth.
- [x] #3 The skill instructs agents to use multiple subagents for extensive repository scans or disjoint cleanup slices, with explicit ownership and integration gates.
- [x] #4 AGENTS.md is adapted to reference the clean-code skill for repository-wide audits while preserving governed documentation and Backlog authority.
- [x] #5 The corrected skill is run against the project at least through audit and review planning, challenged by another subagent, improved from the review, and the outcome is recorded.
- [x] #6 Verification includes markdown/link checks, graphify update, and the repository verification gate where available, with blockers recorded honestly.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Correct MAI-88 and the skill from feature-development hygiene to a project-wide clean-code audit/refactor workflow.
2. Rewrite .agents/skills/clean-code/SKILL.md around whole-repo search, finding inventory, multi-agent partitioning, scoped fixes, integration review, verification, and PR handoff.
3. Adapt AGENTS.md so it points to the skill only for repository-wide clean-code audits, while AGENTS.md remains the local rule source for clean-code bullets.
4. Run the corrected skill against the repository to produce an audit inventory and identify safe immediate changes versus larger follow-up slices.
5. Use another subagent to challenge the corrected skill and audit plan, then fix skill issues it finds.
6. Run markdown/link checks, graphify update, deno task verify where available, update Backlog evidence, commit, push, and create a PR with any verification blockers called out.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Implementation evidence (2026-07-26):
- Search/read scope: backlog instructions overview/task-creation/task-execution/task-finalization; documentation index doc-10; AGENTS.md; .agents/README.md; writing-great-skills SKILL.md and GLOSSARY.md; solve-mai SKILL.md and phases 01, 02, 04, 05, 06; nearby skills code-review, commit-changes, handoff.
- Created .agents/skills/clean-code/SKILL.md with Search, Change, Review, and PR phases. Each phase now has artifact-oriented completion criteria after review fixes.
- Adapted AGENTS.md to instruct agents to read .agents/skills/clean-code/SKILL.md for non-trivial clean-code work while keeping AGENTS.md as the local agent rule source for the clean-code bullets, not project-wide canonical authority.
- Updated .agents/README.md to list clean-code, corrected writing-great-skills spelling, removed nonexistent ask-matt, and corrected triagr to triage.
- Ran the new clean-code skill against this diff: search artifacts and worktree state inspected; change checklist compared against AGENTS.md; review phase performed locally and through subagent Carson.
- Subagent review findings: clarified user-invoked loading from AGENTS.md; replaced source-of-truth wording; strengthened completion criteria; added commit/push/PR behavior; recorded evidence; fixed stale README entries.
- Graphify generated output was updated with graphify update . and is included as generated task output.
Verification evidence:
- node local Markdown link check: PASS (local Markdown links resolve).
- git diff --check: PASS.
- graphify update .: PASS with existing extraction warnings about zero-node files, missing tree_sitter_sql, and missing source_file on src::ref_mastra_core_tools.
- deno test --env --allow-read --allow-write --allow-env --allow-ffi --allow-run --allow-net scripts/check_docs_test.ts scripts/check_i18n_test.ts scripts/verify_test.ts: PASS, 17 passed.
- deno task verify after npm --prefix gui ci and escalation: PASS Canonical documentation, I18n Strings Check, GUI unit tests, Next.js production build, Storybook documentation, Storybook build, Storybook interaction tests; FAIL Deno tests due tests/e2e/flow.test.ts AgentOrchestrator execution raising ComplianceConflictError: Fiduciary Rule Conflict: Accounting norms require provisioning for probable contingencies. This failure is outside the MAI-88 markdown/skill diff and is recorded as a PR verification blocker.

Correction after owner feedback (2026-07-26): owner clarified clean-code is a project-wide audit/refactor skill, not a feature-writing hygiene checklist. Updated MAI-88 title, description, acceptance criteria, and plan accordingly.
Corrected skill run - audit scope and partition:
- Main local audit used AGENTS.md, gui/AGENTS.md, Graphify query, file metrics, rg scans for any/generic names/functions, and pruned vendor/generated paths after an initial node_modules false positive.
- Spawned three read-only audit subagents with disjoint areas: src (Lorentz), gui (Laplace), and tests/scripts/.agents (Kepler).
High-value audit inventory:
- SRC follow-up/high risk: src/agent/actions.ts is 1,033 lines with many z.any/output any and mixed tool registry responsibilities; src/api/server.ts has a ~221-line startServer owning boot, routes, DB, CORS, and errors; src/core/db/DatabaseMemoryService.ts is 619 lines with singleton pool and any query rows; src/cli/commands.ts is 736 lines with rendering, DB, AI/provider, and optimization mixed.
- SRC immediate candidates: duplicated VDR provider error/upload/parsing flow in src/core/vdr/providers/ideals.ts and intralinks.ts; handleDealRoutes in src/api/routes/deals.ts is ~95 lines; src/core/pubsub/MessageBus.ts uses any payloads.
- GUI follow-up/high risk: AgenticWorkspace.tsx, EntitiesWorkspace.tsx, app/page.tsx, api-client.ts, and EntityDetail/CustomDashboard/AgenticWorkspace dependency boundaries need large split/test work; consumeEventStream in api-client.ts should be extracted with streaming tests.
- GUI immediate candidates: duplicate deal load/filter flow between gui/app/page.tsx and gui/app/deals/page.tsx; any usage in I18nProvider and engines page; no-op comments in gui/components/Table/Table.tsx.
- Tests/scripts/.agents follow-up: scripts/check_docs.ts runDocumentationCheck extraction; tests/e2e/flow.test.ts should split deterministic contracts from opt-in smoke and is the current deno task verify blocker class; tests/pubsub.spec.ts repeated any and setTimeout waits; backlog-mcp skill is stale/sprawling relative to current CLI workflow.
- Tests/scripts/.agents immediate candidates: typed VDR tool test fixture/guards; .agents/README.md index cleanup; no-op comments in document_generator.spec.ts; generated graphify-out directories under src/tests/gui need policy decision.
Triage decision for MAI-88 PR: keep this PR focused on creating the corrected clean-code skill, adapting AGENTS.md, cleaning the local skills index entries already touched, recording the audit inventory, and deferring actual broad cleanup slices to follow-up tasks/owner-selected PRs because they span many ownership boundaries and risk levels.

Final corrected-scope verification (2026-07-26):
- Corrected skill challenge subagent Leibniz reviewed clean-code/SKILL.md, AGENTS.md, .agents/README.md, and MAI-88 after owner correction. Findings fixed: whole-repo audits now default to read-only subagent partitions; follow-up task creation requires owner approval; finding inventory schema includes stable IDs/source slice/ownership/PR scope/expected tests/disposition; Verification and PR are separate phases; PR phase requires one coherent cleanup slice; .agents/README.md is now a trigger-oriented skill router.
- node local Markdown link check: PASS (Local Markdown links resolve).
- git diff --check: PASS.
- deno test --env --allow-read --allow-write --allow-env --allow-ffi --allow-run --allow-net scripts/check_docs_test.ts scripts/check_i18n_test.ts scripts/verify_test.ts: PASS, 17 passed.
- graphify update .: PASS with existing warnings about zero-node files, missing tree_sitter_sql, and src::ref_mastra_core_tools missing label.
- deno task verify (escalated after final corrections): PASS Canonical documentation, I18n Strings Check, GUI unit tests, Next.js production build, Storybook documentation, Storybook build, Storybook interaction tests; FAIL Deno tests due tests/e2e/flow.test.ts AgentOrchestrator execution raising ComplianceConflictError: Fiduciary Rule Conflict: Accounting norms require provisioning for probable contingencies. This is recorded as a broader existing blocker and appears in the clean-code audit inventory as follow-up class tests/e2e/flow.test.ts cleanup.

PR handoff (2026-07-26): committed 2fd95d1 chore(MAI-88): add clean-code audit skill; pushed chore/MAI-88-clean-code-skill; created PR https://github.com/M-Ai-Fintech/MVP/pull/8. PR body includes corrected audit-skill scope, multi-agent audit inventory summary, exact verification, and the deno task verify Deno E2E blocker.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Created the project-wide clean-code audit skill, adapted AGENTS.md and the local skill router, ran the corrected skill with disjoint read-only audit subagents, recorded the audit inventory, verified focused checks, and opened PR #8. Broader gate remains blocked by tests/e2e/flow.test.ts ComplianceConflictError in deno task verify.
<!-- SECTION:FINAL_SUMMARY:END -->
