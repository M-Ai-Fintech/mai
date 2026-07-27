---
name: clean-code
description: Audit and refactor a repository against its clean-code rules.
disable-model-invocation: true
---

# Clean Code

Use this when the owner asks for a project-wide clean-code audit, standards
cleanup, or repository refactor. `AGENTS.md` is the local rule source for the
clean-code bullets; this skill is the audit and refactor path that applies them
across the project.

## 1. Scope

Read the Backlog task, applicable `AGENTS.md` files, governed documentation
needed for boundaries, current worktree state, and recent related work. Decide
whether the pass is whole-repo, one subsystem, or a named risk class such as
large functions, vague names, duplication, missing tests, comments, dependency
boundaries, or generated artifacts.

Completion: the audit boundary, excluded paths, relevant rule source, and
unrelated worktree changes are recorded before repository scanning starts.

## 2. Search

Use `rg`, Graphify, file metrics, tests, and representative source reads to find
candidate violations of the clean-code bullets in `AGENTS.md`. Prune vendor,
dependency, cache, and generated paths such as `node_modules`, `.next`, and
`graphify-out` unless generated-artifact policy is the audit target. Search for
long files and functions, generic names, duplicate shapes, nested logic,
untyped boundaries, global dependencies, weak comments, missing regression
tests, and stale generated outputs.

Completion: every finding is recorded with stable ID, source slice or agent,
ownership boundary, path and line, violated rule, evidence, suggested fix class,
risk rating, PR scope, expected tests, and disposition; non-findings for
searched areas are recorded so another agent can reproduce the audit.

## 3. Triage

Group findings by ownership boundary and choose the smallest reviewable repair
slices. Record proposed follow-up task titles and scopes for broad rewrites,
risky behavior changes, or work that spans unrelated subsystems, then ask the
owner before creating them. Keep mechanical fixes separate from semantic
refactors. When Backlog is active, record the inventory before creating or
changing cleanup tasks so the owner can choose the next slice.

Completion: every finding is marked fix-now, delegate-now, follow-up, or
intentional tradeoff, and each fix-now or delegate-now slice has expected files,
tests, and review risk recorded.

## 4. Partition

For whole-repository audits, spawn multiple read-only subagents for disjoint
search slices unless the owner explicitly scoped the run smaller. For
implementation, spawn subagents only for disjoint write slices. Give each
subagent one ownership boundary, the relevant `AGENTS.md` rules, exact search
commands or finding IDs, allowed files, expected tests, and the requirement to
report changed paths and unresolved findings. Keep the main agent responsible
for integration.

Completion: no two agents own the same write path, every delegated slice has a
clear result contract, and the main agent has a merge order for integrating
their patches.

## 5. Change

Implement fix-now slices and integrate accepted subagent patches. Preserve
behavior unless the Backlog task explicitly authorizes behavior changes. Add or
update tests for changed functions, renamed boundaries, extracted modules, and
bug-prone cleanup.

Completion: every changed file maps back to a finding or approved scope item,
every changed behavior has regression evidence, and every deferred finding is
recorded outside the PR scope.

## 6. Review

Review the integrated diff against the finding inventory, `AGENTS.md`, tests,
generated artifacts, and Backlog plan. Use a separate challenge subagent for the
audit inventory, triage decisions, and final integrated diff before Backlog
evidence or PR readiness is claimed.

Completion: every review finding is fixed, recorded as an intentional tradeoff,
or split into follow-up work before verification is claimed.

## 7. Verification

Run focused checks, `git diff --check`, `graphify update .` after code changes,
and the repository verification gate when available. Record exact results in
Backlog when the work is task-tracked.

Completion: every fix-now finding has direct verification evidence, broader
checks are run or blocked with exact causes, and unrelated audit findings remain
outside the verified slice.

## 8. PR

Use the PR scope requested by the owner. Default to one human-reviewable PR per
coherent cleanup slice, but keep a repository-wide cleanup in one PR when the
owner explicitly requires it. When remote mutation is authorized, commit only
task-scoped files, push without force, and create or update the PR with the task
ID, finding summary, verification, risks, and remaining human action.

Completion: Backlog contains the finding inventory and verification evidence,
the branch contains only task-scoped changes, and either the PR URL or explicit
no-remote handoff is recorded.
