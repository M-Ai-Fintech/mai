---
name: investigate
description: >
  Diagnose an MAI defect or failed task with Backlog MCP context, Graphify-scoped code tracing, and reproducible evidence. Use before implementation when the cause is unclear.
---

# Investigate MAI

Diagnose; do not implement.

1. Read the Backlog overview, then `task_view` for the cited task when one exists.
2. Query Graphify before broad file searches. Read the applicable `AGENTS.md` and preserve worktree state.
3. Trace the failing path: entry point, transport, domain logic, persistence or provider, and visible output.
4. Test competing explanations with read-only checks or a focused safe reproduction.
5. Stop only when one explanation accounts for every observed symptom.

Report: root cause with `file:line`; failing flow; evidence; minimal fix; regression test; confidence and uncertainty. Use Caveman by default.

Do not edit files, change Backlog state, create a branch, commit, or invoke privileged diagnostics.
