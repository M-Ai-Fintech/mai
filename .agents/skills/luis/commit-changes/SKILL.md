---
name: commit-changes
description: >
  Commit changes with one-liner message following repo patterns. No co-author, no description.
  Works in PT-BR and EN. Trigger: /commit-changes, "commita", "commit", "faz commit", "make commit".
---

# Commit Changes Skill

Create commits following the project's patterns. One-liner only. No co-author. No multi-line body.

## Context

- Run `git branch --show-current` for the current branch.
- Run `git status --short` for worktree state.
- Run `git diff HEAD --stat` for staged and unstaged scope.
- Run `git log --oneline -15` for the repository's message pattern.

## Commit Message Patterns (from repo history)

Prefixes (conventional commits):
- `fix:` / `fix(scope):` - bug fixes
- `feat:` / `feat(scope):` - new features
- `refactor:` / `refactor(scope):` - code refactoring
- `chore:` / `chore(scope):` - maintenance tasks
- `revert:` - reverting changes
- `doc:` - documentation
- `merge:` - merge operations

Ticket patterns:
- `[MAI-XXX]` or `[DK-XXX]` at start: `[MAI-123] fix: corrige bug no login`
- Ticket in scope: `fix(MAI-123): corrige bug no login`
- Either format is valid, prefer what matches recent commits

Language:
- Match the user's language (PT-BR or EN)
- PT-BR examples: "corrige", "adiciona", "remove", "atualiza", "implementa"
- EN examples: "fix", "add", "remove", "update", "implement"

Multiple changes:
- Separate with `;` if truly independent changes
- Example: `fix(MAI-123): corrige validacao de email; refactor: simplifica handler`
- Prefer single focused commits when possible

## Rules

1. **ONE LINE ONLY** - Never add body, description, or multi-line message
2. **NO CO-AUTHOR** - Never add `Co-Authored-By` footer
3. **NO SKIP FLAGS** - Never use `--no-verify` or `--no-gpg-sign`
4. **MATCH PATTERNS** - Follow the prefix/ticket style from recent commits
5. **BE CONCISE** - Short and descriptive, focus on "what" not "why"
6. **STAGE SPECIFIC FILES** - Don't use `git add -A` or `git add .`

## Execution

1. Analyze the diff to understand what changed
2. Extract ticket number from branch name if present (e.g., `MAI-123-feature-name`)
3. Choose appropriate prefix based on change type
4. Write one-liner in user's language
5. Stage specific changed files
6. Commit with single-line message using HEREDOC:

```bash
git commit -m "$(cat <<'EOF'
fix(MAI-123): corrige validacao de campo obrigatorio
EOF
)"
```

## Examples

| Changes | Branch | Message (PT) | Message (EN) |
|---------|--------|--------------|--------------|
| Bug fix in validation | MAI-456-fix-validation | `fix(MAI-456): corrige validacao de email` | `fix(MAI-456): fix email validation` |
| New endpoint | MAI-789-add-endpoint | `feat(MAI-789): adiciona endpoint de busca` | `feat(MAI-789): add search endpoint` |
| Refactor + fix | MAI-100-refactor | `refactor(MAI-100): simplifica handler; fix: corrige tipo` | `refactor(MAI-100): simplify handler; fix: correct type` |
| Migration script | DK-2000-migration | `[DK-2000] feat: adiciona migration de schema` | `[DK-2000] feat: add schema migration` |
| General cleanup | main | `chore: remove arquivos nao utilizados` | `chore: remove unused files` |

## Do NOT

- Add trailing summaries
- Create empty commits
- Commit sensitive files (.env, credentials, keys)
- Use `git add -A` or `git add .`
- Add co-author lines
- Write multi-line messages
