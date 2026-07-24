---
id: MAI-86
title: Rebuild local MAI agent skills for an MCP-first solo workflow
status: Done
assignee:
  - '@codex'
created_date: '2026-07-22 06:59'
updated_date: '2026-07-24 08:51'
labels:
  - skills
  - agent-workflow
  - developer-experience
milestone: m-14
dependencies: []
references:
  - 'https://github.com/M-Ai-Fintech/MVP/pull/2#discussion_r3628522421'
  - 'https://github.com/M-Ai-Fintech/MVP/pull/2#discussion_r3628575176'
  - 'https://github.com/M-Ai-Fintech/MVP/pull/2#discussion_r3628492449'
documentation:
  - .agents/skills/matt/writing-great-skills/SKILL.md
  - .agents/skills/matt/grilling/SKILL.md
  - /home/luis/.codex/config.toml
  - .agents/skills/luis/model-selection/references/model-catalog-sources.md
modified_files:
  - .agents/skills/luis/backlog-mcp/SKILL.md
  - .agents/skills/luis/backlog-mcp/agents/openai.yaml
  - .agents/skills/luis/model-selection/SKILL.md
  - .agents/skills/luis/model-selection/agents/openai.yaml
  - .agents/skills/luis/model-selection/references/routing.md
  - .agents/skills/luis/model-selection/references/model-catalog-sources.md
  - .agents/skills/luis/caveman/SKILL.md
  - .agents/skills/luis/caveman/agents/openai.yaml
  - .agents/skills/luis/config-bug-closure/SKILL.md
  - .agents/skills/luis/config-bug-closure/agents/openai.yaml
  - .agents/skills/luis/investigate/SKILL.md
  - .agents/skills/luis/investigate/agents/openai.yaml
  - .agents/skills/luis/solve-mai/SKILL.md
  - .agents/skills/luis/solve-mai/agents/openai.yaml
  - .agents/skills/luis/solve-mai/phases
  - .agents/skills/luis/wrap-up/SKILL.md
  - .agents/skills/luis/wrap-up/agents/openai.yaml
  - .agents/skills/luis/comment-backlog-task
  - .agents/skills/luis/release
priority: high
ordinal: 78000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Establish a compact, English-first local skill system that reliably routes MAI work, selects the appropriate Codex or Antigravity model, uses Backlog.md through its MCP server, and supports a single-developer PR review workflow.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 A model-selection skill recommends an appropriate Codex or Antigravity model for each MAI work phase, accounts for plan limits without hard-coded quotas, and emits a compact user-controlled cross-platform handoff packet when appropriate.
- [x] #2 A Backlog.md skill uses the configured Backlog MCP tools as its management interface and covers task, milestone, documentation, and Definition of Done workflows.
- [x] #3 Caveman is English-only and automatically compresses routine operational communication while preserving clear language for consequential decisions and destructive actions.
- [x] #4 Obsolete comment-backlog-task and release skills and every local reference to them are removed.
- [x] #5 Config-bug-closure, investigate, and wrap-up reflect the MAI monolith, local tools, solo workflow, and English-first policy.
- [x] #6 Solve-mai begins with Graphify, uses Backlog MCP, requires an isolated task branch and human-reviewed PR, uses model selection at each phase, and exposes detailed phase-specific reference files without loading irrelevant guidance.
- [x] #7 All modified skill metadata and instructions are internally consistent, English-first, and validated through representative trigger scenarios.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Create model-selection and Backlog-MCP skills.
2. Rewrite Caveman as automatic, English-only operational compression.
3. Remove comment-backlog-task and release, including metadata and references.
4. Rewrite config-bug-closure, investigate, and wrap-up for MAI’s solo monolith workflow.
5. Rebuild solve-mai around Graphify, Backlog MCP, isolated branches, human-reviewed PRs, and model selection.
6. Add one narrow Markdown reference per solve phase, loaded only when that phase runs.
7. Validate metadata, triggers, references, English-only policy, and removed-skill references.

8. Address review r3628522421: restore Wrap Up's pre-PR structure, translate it to en-US, and replace Aprova-specific references with MAI terminology.

9. Address review r3628575176: expand every Solve MAI phase into a complete, checkable workflow and align all task reads and writes with the corrected Backlog MCP lifecycle.

10. Verify front matter, cross-file links, English-only Wrap Up content, phase coverage, Backlog MCP call semantics, and refresh Graphify after the skill documentation changes.

11. Address review r3628492449: rebuild model routing around explicit task complexity, capabilities, best-fit use cases, and a primary/escalation model per phase without defaulting to OpenAI.

12. Research the current official Gemini and Antigravity catalog, Claude availability inside Antigravity, and Codex models; document dynamic plan limits honestly without inventing quotas.

13. Validate that Google AI Pro routes favor suitable Gemini models, that Claude is conditional on actual Antigravity plan availability, and that OpenAI models are selected only when their repository/tooling advantage is material.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Implemented on branch chore/MAI-86-agent-skills. Validated local skill manifests, phase/reference files, required front-matter delimiters, and removed-skill references. `git diff --check` passed. Backlog MCP was interrogated directly: server backlog.md 1.47.1 exposes task, milestone, document, DoD, and workflow tools.

Committed 9417ccd and pushed branch chore/MAI-86-agent-skills to origin. Draft PR creation is blocked: the GitHub connector returned 404 for M-Ai-Fintech/MVP and `gh auth status` reports the active token invalid. Branch compare URL: https://github.com/M-Ai-Fintech/MVP/pull/new/chore/MAI-86-agent-skills.

First review batch: rebuilt Backlog MCP from the Backlog.md reference; restored Caveman as an English translation with its original activation and examples; expanded configuration closure into an evidence-based systemic gate; and reverted only investigate to its pre-PR form. `comment-backlog-task` and `release` remain removed. Validation: `git diff --check`; investigate matches origin/master exactly; Backlog MCP references resolve in solve-mai and wrap-up.

Expanded `backlog-mcp/SKILL.md` from 59 to 467 lines as a comprehensive MCP-native adaptation of the 959-line Backlog.md CLI reference. It now covers all 20 exposed MCP tools, task field operations, acceptance criteria and DoD semantics, milestones, governed documents, lifecycle recipes, completion gates, troubleshooting, and explicit handling for CLI-only capabilities. Validation: `git diff --check`; tool-name coverage checked against the live Backlog MCP tool inventory.

Addressed PR review r3628522421: restored Wrap Up's original probes, five output sections, rules, example, and boundaries; translated all content to en-US and replaced Aprova/deleted-skill references with MAI, `$commit-changes`, and `$backlog-mcp` terminology.

Addressed PR review r3628575176: expanded all seven Solve MAI phase references from 8-10 lines each to 50-71 lines with purpose, detailed workflow, Backlog MCP writes, blocker handling, and checkable completion gates. Corrected normal task finalization to `task_edit(status: "Done")`; reserved `task_complete` for periodic completed-folder cleanup and `task_archive` for duplicate/canceled/invalid work.

Verification: `git diff --check`; every phase is at least 50 lines and contains a Completion gate; Wrap Up is 68 lines with no Aprova or PT-BR remnants; Backlog calls contain no CLI task writes; `graphify update .` completed with 4,084 nodes and 5,632 edges. Graphify warned that 192 source files produced zero nodes and `tree_sitter_sql` is missing for one SQL file.

Review r3628492449 reopened acceptance criterion #1: the existing routing matrix is too aggregated, omits an explicit complexity dimension and model capability/use-case detail, and does not give enough current Gemini/Antigravity coverage. The revision will use official current sources and preserve dynamic-limit caveats.

Addressed review r3628492449 with an official-source model catalog and deterministic routing procedure. Model selection now separates low/medium/high task complexity from reasoning effort, starts high-complexity work on a stronger model at Medium where possible, and gates High reasoning on observable unresolved risk or failed proof.

Balanced catalog coverage now includes Antigravity's Gemini 3.6 Flash, Gemini 3.5 Flash, Gemini 3.1 Pro, Claude Sonnet 4.6, Claude Opus 4.6, and GPT-OSS-120b plus Codex GPT-5.6 Luna/Terra/Sol with live-runtime caveats. Gemini 3.6 Flash Medium is the main Antigravity workhorse; Codex is selected for concrete workspace/tool advantages rather than by default.

Quota documentation distinguishes public API token limits from managed-surface context, the shared task-weighted Gemini AI Pro baseline (five-hour refresh until weekly cap), separate Antigravity third-party rate limits, and dynamic Codex plan usage. Validation passed: required-model assertions, seven phase routes, medium-first gate, local reference resolution, trailing-whitespace scan, git diff --check, and graphify update/query (4,111 nodes; 5,659 edges).
<!-- SECTION:NOTES:END -->

## Comments

<!-- COMMENTS:BEGIN -->
author: Codex
created: 2026-07-22 06:59
---
Scope and workflow decisions confirmed with the owner: Backlog MCP is mandatory; routine operational responses use English-only Caveman; Codex↔Antigravity handoffs are recommendations with a compact transfer packet and require owner execution. Planning is pending owner approval before skill files are changed.
---
<!-- COMMENTS:END -->
