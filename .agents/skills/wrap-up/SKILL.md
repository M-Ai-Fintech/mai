---
name: wrap-up
description: >
  End-of-session recap for Aprova work. Summarizes what changed, surfaces uncommitted state, lists
  follow-ups. Caveman style by default. Trigger: /wrap-up, "wrap up", "encerra", "finaliza",
  "fecha sessão", "resume sessão".
---

# Wrap-up

End-of-session brief. Caveman style. Zero fluff.

## Context probes

- Run `git branch --show-current` for the branch.
- Run `git status --short` for worktree state.
- Run `git log --oneline @{u}..HEAD`; if no upstream exists, use `git log --oneline -5`.

## Output sections (skip empty ones)

1. **Done** — bullets of what was accomplished.
2. **Diff** — files touched, one per line: `path (new|edit|del)`.
3. **Commits** — one-liner per new commit.
4. **Pending** — uncommitted changes, untracked files, unresolved questions.
5. **Next** — obvious follow-ups (open PR, comment Backlog, run QA).

## Rules

- Caveman: drop articles, filler, pleasantries.
- Each bullet ≤ 15 words.
- No "Great work!", no closing summary.
- Skip empty sections — don't write "N/A".
- Don't restate file contents, just paths.
- Don't auto-commit; if user wants commit, they invoke `commit-changes`.
- Don't auto-comment Backlog; user invokes `comment-backlog-task`.
- Match user's language (PT-BR or EN).

## Example

```
Done:
- MAI-942 fix: middleware pega expiração com `<=`
- Coverage 78% → 91%

Diff:
- src/auth/middleware.ts (edit)
- src/auth/middleware.test.ts (edit)

Commits:
- fix(MAI-942): corrige check de expiração

Pending:
- src/utils/log.ts modificado, sem commit
- Pergunta aberta: comportamento em refresh token

Next:
- Abrir PR
- Comentar MAI-942 com run dos testes
```

## Do NOT

- Add closing pleasantries.
- Suggest commits inline (let user invoke `commit-changes`).
- Save to memory automatically (let user invoke `auto-memory` if needed).
- Repeat content already visible in the session — only the brief.
