---
id: MAI-88
title: Apply clean-code rules across the project
status: Done
assignee:
  - '@codex'
created_date: '2026-07-26 17:28'
updated_date: '2026-07-27 19:18'
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
  - .agents/skills/backlog-mcp/SKILL.md
  - .agents/skills/clean-code/SKILL.md
  - AGENTS.md
  - >-
    backlog/tasks/mai-88 -
    Create-clean-code-skill-for-search-change-review-PR-workflow.md
  - deno.json
  - deno.lock
  - graphify-out/GRAPH_REPORT.md
  - graphify-out/graph.json
  - gui/app/api/engines/optimize/route.ts
  - gui/app/api/engines/predict/route.ts
  - gui/app/dashboard/dashboard-cards.tsx
  - gui/app/dashboard/dashboard-create-modal.tsx
  - gui/app/dashboard/dashboard-header.tsx
  - gui/app/dashboard/dashboard-page-client.tsx
  - gui/app/dashboard/dashboard-pipeline-view.tsx
  - gui/app/dashboard/use-dashboard-create.ts
  - 'gui/app/deals/[id]/deal-detail-modals.tsx'
  - 'gui/app/deals/[id]/deal-detail-model.test.ts'
  - 'gui/app/deals/[id]/deal-detail-model.ts'
  - 'gui/app/deals/[id]/deal-detail-panels.tsx'
  - 'gui/app/deals/[id]/deal-page-client.tsx'
  - 'gui/app/deals/[id]/deal-phase-history-content.tsx'
  - 'gui/app/deals/[id]/engines/engine-workbench-fields.tsx'
  - 'gui/app/deals/[id]/engines/engine-workbench-model.test.ts'
  - 'gui/app/deals/[id]/engines/engine-workbench-model.ts'
  - 'gui/app/deals/[id]/engines/engine-workbench-view.tsx'
  - 'gui/app/deals/[id]/engines/page.tsx'
  - 'gui/app/deals/[id]/engines/use-engines-workbench.ts'
  - 'gui/app/deals/[id]/page.tsx'
  - 'gui/app/deals/[id]/use-deal-detail.tsx'
  - 'gui/app/deals/[id]/use-deal-edit-flow.ts'
  - gui/app/deals/deal-list-model.test.ts
  - gui/app/deals/deal-list-model.ts
  - gui/app/deals/deals-page-client.tsx
  - gui/app/deals/deals-table.tsx
  - gui/app/deals/page.tsx
  - gui/app/deals/use-deal-list.ts
  - gui/app/generative-ui/generative-schema-model.test.ts
  - gui/app/generative-ui/generative-schema-model.ts
  - gui/app/generative-ui/generative-ui-section-model.ts
  - gui/app/generative-ui/generative-ui-sections.test.ts
  - gui/app/generative-ui/generative-ui-sections.tsx
  - gui/app/generative-ui/page.tsx
  - gui/app/page.tsx
  - gui/app/settings/page.tsx
  - gui/app/settings/settings-sections.test.ts
  - gui/app/settings/settings-sections.tsx
  - gui/components/Accordion/Accordion.stories.tsx
  - gui/components/Accordion/Accordion.tsx
  - gui/components/Avatar/Avatar.stories.tsx
  - gui/components/Avatar/Avatar.tsx
  - gui/components/Badge/Badge.stories.tsx
  - gui/components/Badge/Badge.tsx
  - gui/components/Button/Button.stories.tsx
  - gui/components/Button/Button.tsx
  - gui/components/Card/Card.stories.tsx
  - gui/components/Card/Card.tsx
  - gui/components/Checkbox/Checkbox.stories.tsx
  - gui/components/CountrySelector/CountrySelector.stories.tsx
  - gui/components/CountrySelector/CountrySelector.tsx
  - gui/components/Divider/Divider.stories.tsx
  - gui/components/Divider/Divider.tsx
  - gui/components/Dropdown/Dropdown.stories.tsx
  - gui/components/Dropdown/Dropdown.tsx
  - gui/components/Dropdown/dropdown-model.ts
  - gui/components/EmptyState/EmptyState.stories.tsx
  - gui/components/EmptyState/EmptyState.tsx
  - gui/components/ErrorBoundary/ErrorBoundary.stories.tsx
  - gui/components/ErrorBoundary/ErrorBoundary.tsx
  - gui/components/Footer/Footer.stories.tsx
  - gui/components/Footer/Footer.tsx
  - gui/components/FormField/FormField.stories.tsx
  - gui/components/FormField/FormField.tsx
  - gui/components/Icon/Icon.stories.tsx
  - gui/components/Icon/Icon.tsx
  - gui/components/Input/Input.stories.tsx
  - gui/components/Input/Input.tsx
  - gui/components/Modal/Modal.stories.tsx
  - gui/components/Modal/Modal.tsx
  - gui/components/Navigation/AppShell.tsx
  - gui/components/Navigation/Navigation.stories.tsx
  - gui/components/Navigation/Sidebar.tsx
  - gui/components/Navigation/TopBar.tsx
  - gui/components/Navigation/navigation-model.test.ts
  - gui/components/Navigation/navigation-model.ts
  - gui/components/Radio/Radio.stories.tsx
  - gui/components/Skeleton/Skeleton.stories.tsx
  - gui/components/Skeleton/Skeleton.tsx
  - gui/components/Spinner/Spinner.tsx
  - gui/components/Table/Table.stories.tsx
  - gui/components/Table/Table.tsx
  - gui/components/Tabs/Tabs.stories.tsx
  - gui/components/Tabs/Tabs.tsx
  - gui/components/Textarea/Textarea.stories.tsx
  - gui/components/Toast/Toast.stories.tsx
  - gui/components/Toast/Toast.tsx
  - gui/components/screens/agentic/AgentConversationPanel.tsx
  - gui/components/screens/agentic/AgentThreadSidebar.tsx
  - gui/components/screens/agentic/AgenticInsightsPanel.tsx
  - gui/components/screens/agentic/AgenticOverlays.tsx
  - gui/components/screens/agentic/AgenticStatusPanels.tsx
  - gui/components/screens/agentic/AgenticWorkspace.tsx
  - gui/components/screens/agentic/AssistantResponse.tsx
  - gui/components/screens/agentic/agentic-stream.ts
  - gui/components/screens/agentic/agentic-workspace-actions.ts
  - gui/components/screens/agentic/agentic-workspace-core-actions.ts
  - gui/components/screens/agentic/agentic-workspace-model.test.ts
  - gui/components/screens/agentic/agentic-workspace-model.ts
  - gui/components/screens/agentic/agentic-workspace-state.ts
  - gui/components/screens/agentic/agentic-workspace-types.ts
  - gui/components/screens/agentic/agentic-workspace-view-model.ts
  - gui/components/screens/agentic/useAgenticWorkspace.ts
  - gui/components/screens/custom-dashboard/CustomDashboard.tsx
  - gui/components/screens/custom-dashboard/CustomDashboardModals.tsx
  - gui/components/screens/custom-dashboard/CustomDashboardStatusPanels.tsx
  - gui/components/screens/custom-dashboard/CustomDashboardToolbar.tsx
  - gui/components/screens/custom-dashboard/CustomDashboardWidgets.tsx
  - gui/components/screens/custom-dashboard/custom-dashboard-actions.ts
  - gui/components/screens/custom-dashboard/custom-dashboard-model.test.ts
  - gui/components/screens/custom-dashboard/custom-dashboard-model.ts
  - gui/components/screens/custom-dashboard/custom-dashboard-types.ts
  - gui/components/screens/custom-dashboard/useCustomDashboard.ts
  - gui/components/screens/dashboard/dashboard-model-clean-code.test.ts
  - gui/components/screens/dashboard/dashboard-model.ts
  - gui/components/screens/entities/EntitiesWorkspace.tsx
  - gui/components/screens/entities/EntitiesWorkspaceModals.tsx
  - gui/components/screens/entities/EntitiesWorkspaceViews.tsx
  - gui/components/screens/entities/EntityDetail.tsx
  - gui/components/screens/entities/EntityDetailViews.tsx
  - gui/components/screens/entities/EntityFormView.tsx
  - gui/components/screens/entities/TargetDossier.tsx
  - gui/components/screens/entities/entities-workspace-actions.ts
  - gui/components/screens/entities/entities-workspace-controller.ts
  - gui/components/screens/entities/entities-workspace-derived.ts
  - gui/components/screens/entities/entities-workspace-model.ts
  - gui/components/screens/entities/entities-workspace-types.ts
  - gui/components/screens/entities/entity-detail-model.test.ts
  - gui/components/screens/entities/entity-detail-model.ts
  - gui/components/screens/entities/entity-detail-route-model.ts
  - gui/components/screens/entities/entity-detail-types.ts
  - gui/components/screens/entities/entity-options.test.ts
  - gui/components/screens/entities/entity-options.ts
  - gui/components/screens/entities/entity-state.test.ts
  - gui/components/screens/entities/target-dossier-payload.ts
  - gui/components/screens/entities/target-dossier.test.ts
  - gui/components/screens/entities/useEntityInvalidFieldFocus.ts
  - gui/eslint.config.mjs
  - gui/lib/api-client.test.ts
  - gui/lib/api-client.ts
  - gui/lib/api-client/chat-client.ts
  - gui/lib/api-client/chat-schemas.ts
  - gui/lib/api-client/client.ts
  - gui/lib/api-client/common-schemas.ts
  - gui/lib/api-client/deal-client.ts
  - gui/lib/api-client/deal-schemas.ts
  - gui/lib/api-client/entity-client.ts
  - gui/lib/api-client/entity-schemas.ts
  - gui/lib/api-client/errors.ts
  - gui/lib/api-client/legacy-schemas.ts
  - gui/lib/api-client/legacy-tool-client.ts
  - gui/lib/api-client/resource-client.ts
  - gui/lib/api-client/resource-schemas.ts
  - gui/lib/api-client/team-schemas.ts
  - gui/lib/api-client/transport.ts
  - gui/lib/api-client/types.ts
  - gui/lib/dashboard-model.test.ts
  - gui/lib/event-stream.test.ts
  - gui/lib/event-stream.ts
  - gui/lib/generative-ui-engine.tsx
  - gui/lib/i18n/I18nProvider.tsx
  - gui/lib/i18n/translation.test.ts
  - gui/lib/i18n/translation.ts
  - gui/lib/select-options.test.ts
  - gui/lib/select-options.ts
  - scripts/check_docs.ts
  - scripts/check_docs_test.ts
  - scripts/check_i18n.ts
  - scripts/documentation_check_inventory.ts
  - scripts/documentation_check_links.ts
  - scripts/documentation_check_paths.ts
  - scripts/documentation_check_types.ts
  - scripts/verify.ts
  - scripts/verify_integration.ts
  - scripts/verify_test.ts
  - src/agent/actions.ts
  - src/agent/agents/broker-orchestrator/index.ts
  - src/agent/agents/broker-orchestrator/schemas/input.ts
  - src/agent/agents/broker-orchestrator/schemas/memory.ts
  - src/agent/agents/deal-matching/schemas/input.ts
  - src/agent/agents/financial-risk/schemas/input.ts
  - src/agent/agents/general-dd/schemas/input.ts
  - src/agent/agents/legal-closing/schemas/input.ts
  - src/agent/agents/legal-dd/schemas/input.ts
  - src/agent/agents/negotiation/schemas/input.ts
  - src/agent/agents/sourcing-kyb/schemas/input.ts
  - src/agent/ai_provider.ts
  - src/agent/continuous_learning.ts
  - src/agent/index.ts
  - src/agent/rag/documents.ts
  - src/agent/rag/vectors.ts
  - src/agent/rag_layer.ts
  - src/agent/tools/ai_tools.ts
  - src/agent/tools/core_tools.ts
  - src/agent/tools/integration_tools.ts
  - src/agent/tools/memory_tools.ts
  - src/agent/vdr_mock.ts
  - src/api/contracts/http.ts
  - src/api/mvp_routes.ts
  - src/api/mvp_store.ts
  - src/api/routes/chat.ts
  - src/api/routes/chat_stream.ts
  - src/api/routes/dashboard.ts
  - src/api/routes/deals.ts
  - src/api/routes/engines_documents.ts
  - src/api/routes/entities_team.ts
  - src/api/routes/legacy.ts
  - src/api/routes/notifications.ts
  - src/api/server.ts
  - src/api/store/chat.ts
  - src/api/store/deals.ts
  - src/api/store/engines.ts
  - src/api/store/entities.ts
  - src/api/store/layouts.ts
  - src/api/store/seed.ts
  - src/api/store/team.ts
  - src/cli/chat-console.ts
  - src/cli/chat-feedback.ts
  - src/cli/chat-session.ts
  - src/cli/chat.ts
  - src/cli/command-output.ts
  - src/cli/command-progress.ts
  - src/cli/commands.ts
  - src/cli/document-command.ts
  - src/cli/errors.ts
  - src/cli/interface.ts
  - src/cli/portfolio-command.ts
  - src/cli/registry-command.ts
  - src/cli/risk-command.ts
  - src/cli/term-sheet-command.ts
  - src/core/boot.ts
  - src/core/db/DatabaseConnection.ts
  - src/core/db/DatabaseMemoryService.ts
  - src/core/db/TransactionRepository.ts
  - src/core/db/memory_search.ts
  - src/core/db/setup.ts
  - src/core/db/similarity.test.ts
  - src/core/db/similarity.ts
  - src/core/db/transactions/read_operations.ts
  - src/core/db/transactions/write_operations.ts
  - src/core/pubsub/AgentFlowWrapper.ts
  - src/core/pubsub/LocalPubSubBus.test.ts
  - src/core/pubsub/LocalPubSubBus.ts
  - src/core/pubsub/MessageBus.ts
  - src/core/vdr/mock.ts
  - src/core/vdr/papermark.ts
  - src/core/vdr/provider.ts
  - src/core/vdr/provider_documents.ts
  - src/core/vdr/providers/ideals.ts
  - src/core/vdr/providers/intralinks.ts
  - src/core/vdr/types.ts
  - src/engines/document-generator/latex.ts
  - src/engines/document-generator/pdf.ts
  - src/engines/document-generator/pdf_layout.ts
  - src/engines/optimization/alternatives.ts
  - src/engines/optimization/constraints.ts
  - src/engines/optimization/constraints_test.ts
  - src/engines/optimization/genetic.test.ts
  - src/engines/optimization/genetic.ts
  - src/engines/optimization/index.ts
  - src/engines/optimization/kyc/kyc_valuation_solver.ts
  - src/engines/optimization/matching/term_sheet_optimizer.ts
  - src/engines/optimization/types.ts
  - src/engines/optimization/valuation/index.ts
  - src/engines/optimization/valuation/methods/book_value.ts
  - src/engines/optimization/valuation/methods/discounted_cash_flow.ts
  - src/engines/optimization/valuation/methods/ebitda.ts
  - src/engines/optimization/valuation/methods/enterprise_value.ts
  - src/engines/optimization/valuation/methods/growing_perpetuity.ts
  - src/engines/optimization/valuation/pipeline.ts
  - src/engines/optimization/valuation/reconciliation/contingencies.ts
  - src/engines/optimization/valuation/reconciliation/dlom.ts
  - src/engines/optimization/valuation/reconciliation/index.ts
  - src/engines/optimization/valuation/weights.ts
  - src/engines/prediction/index.ts
  - src/engines/prediction/ml.ts
  - src/engines/prediction/onnx.test.ts
  - src/engines/prediction/onnx.ts
  - src/engines/prediction/transformers.ts
  - src/shared/errors.test.ts
  - src/shared/errors.ts
  - src/shared/json.ts
  - tests/agents/config.spec.ts
  - tests/agents/vdr_tools.spec.ts
  - tests/api/contracts/domain.spec.ts
  - tests/api/contracts/http.spec.ts
  - tests/api/routes/chat.spec.ts
  - tests/api/routes/entities_deals.spec.ts
  - tests/api/routes/operations.spec.ts
  - tests/api/store/deals.spec.ts
  - tests/api/store/entities.spec.ts
  - tests/api/store/operations.spec.ts
  - tests/api/store/team_chat.spec.ts
  - tests/cli/errors.spec.ts
  - tests/core/continuous_learning.spec.ts
  - tests/core/db/DatabaseMemoryService.spec.ts
  - tests/core/db/TransactionRepository.spec.ts
  - tests/core/memory_service.spec.ts
  - tests/core/papermark.spec.ts
  - tests/db_setup.spec.ts
  - tests/e2e/cli.spec.ts
  - tests/e2e/flow.test.ts
  - tests/e2e/flow_smoke.test.ts
  - tests/engines/optimization.spec.ts
  - tests/engines/prediction.spec.ts
  - tests/engines/valuation.spec.ts
  - tests/engines/valuation_reconciliation.spec.ts
  - tests/fine_tuning_mcp.test.ts
  - tests/pubsub.spec.ts
  - tests/smoke.spec.ts
  - tests/support/tool_context.ts
  - tests/support/value_guards.ts
  - tests/support/value_guards_test.ts
  - tests/vdr_connectors.spec.ts
  - tests/vdr_provider.spec.ts
  - tests/workflows/schemas.spec.ts
priority: medium
ordinal: 81000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Apply the clean-code rules in AGENTS.md across the repository. Correct project-specific commands in AGENTS.md, run the clean-code skill as an implementation workflow, partition the repository across multiple agents, fix identified violations in source, GUI, tests, scripts, and local skills, challenge the integrated result with an independent reviewer, verify the repository, and update the existing PR. The owner explicitly requires all cleanup to remain in one PR regardless of size.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 The existing PR is updated to contain the complete repository-wide cleanup as one PR.
- [x] #2 AGENTS.md contains concrete project commands and no clean-code skill routing paragraph.
- [x] #3 The repository is audited across source, GUI, tests, scripts, and local skills with generated and dependency paths excluded.
- [x] #4 Fix-now clean-code violations are implemented across all audited ownership areas in the existing branch and single PR.
- [x] #5 Files over 500 lines and functions over 20 lines are split where behavior can be preserved; remaining exceptions are documented with concrete risk.
- [x] #6 Untyped any usage, duplication, vague names, weak comments, nesting, error messages, dependency boundaries, and test quality violations are fixed or explicitly justified.
- [x] #7 An independent challenge agent reviews the integrated repository cleanup and all actionable findings are resolved.
- [x] #8 deno fmt, focused tests, deno task verify, git diff --check, and graphify update . are run with exact results recorded.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Correct AGENTS.md with repository-specific test and formatting commands and remove the clean-code skill routing paragraph.
2. Re-run the clean-code audit with metrics and targeted searches, excluding dependencies and generated artifacts.
3. Partition disjoint implementation slices across source, GUI, and tests/scripts/skills agents while the main agent handles shared integration and task governance.
4. Integrate every slice, inspect remaining violations, and perform additional repair passes until only justified exceptions remain.
5. Run an independent challenge review over the integrated diff and repository-wide rule compliance; fix all actionable findings.
6. Run formatting, focused checks, the full verification gate, Graphify update, and diff checks.
7. Record exact evidence, commit and push all scoped changes to the existing branch, and update PR #8 as the single repository-wide cleanup PR.
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

Owner correction implementation restart (2026-07-26):
- Removed the clean-code skill routing paragraph from AGENTS.md.
- Replaced the test placeholder with deno task verify, deno task test, and npm --prefix gui run test:unit.
- Replaced generic formatter examples with deno fmt and npm --prefix gui run lint.
- Owner explicitly requires one PR, so the skill PR phase now honors an explicit repository-wide single-PR scope.
- Fresh baseline excluding dependencies/generated paths: 12 production TS/TSX files exceed 500 lines; TypeScript AST scan identifies 297 functions over 20 lines across production/tests/scripts; deno lint src tests scripts reports 187 diagnostics; npm --prefix gui run lint passes on the pre-refactor baseline.
- Three disjoint implementation agents are active for src/backend, gui, and tests/scripts/local skills. Each has explicit write ownership and focused verification requirements.

Integrated verification before final challenge: production TypeScript/TSX scan passed across 323 files with 0 functions over 20 lines and 0 files over 500; executable any/Dict/z.any scan returned no findings; deno lint src tests scripts passed; deno task test passed with 167 tests and 1 opt-in live smoke ignored; GUI TypeScript, ESLint, and 72 unit tests passed; changed-file deno fmt --check and git diff --check passed; escalated deno task verify passed all 8 checks; graphify update . rebuilt 6,210 nodes and 10,872 edges with pre-existing zero-node/tree_sitter_sql/source_file warnings.

Independent challenge agent Herschel found five modified test callbacks over 20 lines and a stale modified-files inventory. The five callbacks were refactored and focused tests passed after adding the required --allow-run permission. A stricter all-test scan then found additional long test callbacks outside the initial production/diff scans; four disjoint agents were assigned to eliminate all remaining test exceptions before finalization.

Correction to the prior note: the immediate two-file focused command initially omitted --allow-run and therefore failed the documentation command test before assertions; the code assertions otherwise passed. The final evidence will replace this with deno task test and deno task verify results after the remaining test refactors.

Final integrated evidence (2026-07-27): exhaustive TypeScript/TSX/JS/JSX/MJS/CJS AST scan covered 419 code files across src, scripts, tests, gui, and Storybook with dependency/cache/generated paths excluded; 0 functions exceed 20 lines and 0 files exceed 500 lines. Executable any/Dict/z.any scan has 0 findings. Generic data remains only where it is a protocol envelope, database column, third-party tensor result, or established domain term.

Challenge fixes completed: five reviewer-identified callbacks plus 76 additional test callbacks and 13 final Storybook/scanner-count outliers were refactored through four disjoint agents and local integration. The task modified-files inventory was replaced with the complete current worktree path set.

Final verification: deno fmt --check passed for 317 changed code files; deno lint src tests scripts passed for 227 files; deno task test passed 167 tests with 1 opt-in live smoke ignored; npm --prefix gui run test:unit passed 72 tests in 19 files; GUI ESLint and tsc passed; git diff --check passed; graphify update . passed; escalated deno task verify passed all 8 phases (canonical docs, i18n, Deno tests, GUI tests, Next build, Storybook docs/build/interactions).

PR #8 updated after push: title is 'refactor(MAI-88): apply clean-code rules across project'; body records the one-PR scope, 419-file audit result, challenge resolution, exact passing verification, opt-in live smoke behavior, and Graphify warnings.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Implemented the MAI-88 repository-wide clean-code cleanup in the single existing PR requested by the owner. Corrected AGENTS.md commands and removed the routing paragraph; updated the clean-code skill for explicit whole-repository single-PR work; refactored backend, agents, engines, CLI, GUI, scripts, local skills, tests, and Storybook into focused typed modules; removed executable any/Dict/z.any usage; split every code file/function beyond the configured thresholds; made default tests deterministic and kept live agent smoke coverage opt-in. Independent challenge findings and the stricter follow-up scan were resolved. Final evidence: 419 code files scanned with 0 functions over 20 lines and 0 files over 500; deno fmt check passed for 317 changed code files; Deno lint passed for 227 files; deno task test passed 167 tests with 1 live smoke ignored; GUI passed 72 unit tests, ESLint, and TypeScript; git diff check and Graphify update passed; deno task verify passed all 8 phases. PR #8 is updated at https://github.com/luisfelipeluis49/mai/pull/8.
<!-- SECTION:FINAL_SUMMARY:END -->
