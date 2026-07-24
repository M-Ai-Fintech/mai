---
name: wrap-up
description: >
  End-of-session recap for MAI work. Summarizes what changed, surfaces uncommitted state, and lists
  follow-ups. Caveman style by default. Use for /wrap-up, "wrap up", "end session",
  "finish session", or "summarize session".
---

# Wrap-up

End-of-session brief. Caveman style. Zero fluff.

## Context probes

- Run `git branch --show-current` for the branch.
- Run `git status --short` for worktree state.
- Run `git log --oneline @{u}..HEAD`; if no upstream exists, use `git log --oneline -5`.

## Output sections

Skip empty sections.

1. **Done** — bullets describing what was accomplished.
2. **Diff** — files touched, one per line: `path (new|edit|del)`.
3. **Commits** — one line per new commit.
4. **Pending** — uncommitted changes, untracked files, and unresolved questions.
5. **Next** — obvious follow-ups such as opening a PR, updating Backlog, or running QA.

## Rules

- Use Caveman: drop articles, filler, and pleasantries.
- Keep each bullet at 15 words or fewer.
- Skip empty sections instead of writing "N/A".
- List paths without restating file contents.
- Write in en-US.
- Do not add praise or a closing summary.
- Do not auto-commit; the user invokes `$commit-changes` when a commit is wanted.
- Do not change or comment on Backlog automatically; the user invokes `$backlog-mcp` for that operation.

## Example

```text
Done:
- MAI-942 fix: middleware handles expiration with `<=`
- Coverage increased from 78% to 91%

Diff:
- src/auth/middleware.ts (edit)
- src/auth/middleware.test.ts (edit)

Commits:
- fix(MAI-942): correct expiration check

Pending:
- src/utils/log.ts modified, uncommitted
- Open question: refresh-token behavior

Next:
- Open PR
- Record MAI-942 test run in Backlog
```

## Do not

- Add closing pleasantries.
- Suggest commit contents inline; let the user invoke `$commit-changes`.
- Save to memory automatically.
- Repeat the full session; report only the brief.
