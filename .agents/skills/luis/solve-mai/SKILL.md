---
name: solve-mai
description: Resolve a MAI Backlog task from scoped discovery to a human-reviewed pull request.
disable-model-invocation: true
---

# Solve MAI

Use this only with a task ID. Backlog MCP is the project-state interface. The owner approves every PR; `Done` requires every acceptance criterion, Definition of Done item, and required test to pass.

## 1. Intake

Read [intake](phases/01-intake.md). Completion: task context, applicable instructions, worktree state, and duplicate-work check are recorded.

## 2. Discovery

Read [discovery](phases/02-discovery.md). Completion: Graphify has scoped the codebase and the task has an approved, recorded plan before edits.

## 3. Investigation

Read [investigation](phases/03-investigation.md) only when the cause or scope is unclear. Completion: evidence supports one implementation path.

## 4. Implementation

Read [implementation](phases/04-implementation.md). Completion: the narrowest coherent change and its regression coverage exist on the isolated task branch.

## 5. Verification

Read [verification](phases/05-verification.md). Completion: focused and relevant broader checks pass, with exact results recorded.

## 6. Review and PR

Read [review-and-pr](phases/06-review-and-pr.md). Completion: a human-reviewable PR exists when remote mutation is authorized; it is never self-approved or merged by the agent.

## 7. Finalization

Read [finalization](phases/07-finalization.md). Completion: Backlog accurately records verification and remaining human action. Mark Done only after human approval and all completion gates pass.

At every phase, invoke `$model-selection` to choose the smallest capable model. Use `$investigate` for unclear defects and `$config-bug-closure` for configuration or provider defects. Use `$caveman` for routine updates.
