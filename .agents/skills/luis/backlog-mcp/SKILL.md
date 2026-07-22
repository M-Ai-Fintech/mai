---
name: backlog-mcp
description: >
  Manage MAI tasks, milestones, documentation, and Definition of Done through the configured Backlog.md MCP server. Use whenever reading or changing Backlog project state.
---

# Backlog MCP

Use the configured `backlog` MCP server, never direct Markdown edits.

1. Start every MAI request with `get_backlog_instructions` using `overview`.
2. Read task context with `task_view`; use bounded `task_search` before creating work.
3. Use `task_create`, `task_edit`, `task_archive`, and `task_complete` for task lifecycle changes.
4. Use milestone tools for milestone lifecycle, document tools for governed documentation, and DoD tools for project completion standards.
5. Read `task-creation`, `task-execution`, or `task-finalization` instructions before the corresponding lifecycle action.

If the MCP tools are not attached to the current session, stop and ask the owner to refresh the Codex session. Do not substitute the CLI for a state-changing operation.
