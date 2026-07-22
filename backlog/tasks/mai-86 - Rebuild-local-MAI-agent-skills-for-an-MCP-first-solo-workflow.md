---
id: MAI-86
title: Rebuild local MAI agent skills for an MCP-first solo workflow
status: In Progress
assignee:
  - '@codex'
created_date: '2026-07-22 06:59'
updated_date: '2026-07-22 07:07'
labels:
  - skills
  - agent-workflow
  - developer-experience
milestone: m-14
dependencies: []
documentation:
  - .agents/skills/matt/writing-great-skills/SKILL.md
  - .agents/skills/matt/grilling/SKILL.md
  - /home/luis/.codex/config.toml
modified_files:
  - .agents/skills/luis/backlog-mcp/SKILL.md
  - .agents/skills/luis/backlog-mcp/agents/openai.yaml
  - .agents/skills/luis/model-selection/SKILL.md
  - .agents/skills/luis/model-selection/agents/openai.yaml
  - .agents/skills/luis/model-selection/references/routing.md
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
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Implemented on branch chore/MAI-86-agent-skills. Validated eight local skill manifests, all phase/reference files, required front-matter delimiters, deleted-skill absence, and absence of inherited QA/Slack/Mongo/Aprova references. `git diff --check` passed. Backlog MCP was interrogated directly: server backlog.md 1.47.1 exposes task, milestone, document, DoD, and workflow tools. Implementation is ready for owner review; no commit, push, or PR was created without explicit remote-mutation authorization.
<!-- SECTION:NOTES:END -->

## Comments

<!-- COMMENTS:BEGIN -->
author: Codex
created: 2026-07-22 06:59
---
Scope and workflow decisions confirmed with the owner: Backlog MCP is mandatory; routine operational responses use English-only Caveman; Codex↔Antigravity handoffs are recommendations with a compact transfer packet and require owner execution. Planning is pending owner approval before skill files are changed.
---
<!-- COMMENTS:END -->
