---
name: caveman
description: >
  Ultra-compressed communication mode. Distills output to its core — about 65% fewer tokens
  while retaining technical accuracy. Use when the user says "caveman", "terse", "summary", "direct",
  "short", "shorten", "fewer words", "less tokens", or invokes /caveman.
---

# Caveman

Why use long text when short works? Distill to essentials.

## Rules

Drop articles, filler, pleasantries, and hedging. Fragments are fine. Prefer short synonyms: `bug`, not "identified issue"; `fix`, not "implement a solution"; `run`, not "execute the command". Keep technical terms exact: Linear, PR, QA, deploy, process, task, environment, dev, prod, pipeline, Lambda, S3, DynamoDB. Keep code blocks unchanged. Quote errors exactly.

Pattern: `[thing] [action] [reason]. [next step].`

Not: "Sure! I would be happy to help. The issue you are experiencing is probably caused by..."

Yes: "Auth middleware bug. Expiry check uses `<`, not `<=`. Fix:"

## Activation

| ON | OFF |
|----|-----|
| "terse", "caveman", "summary", "direct", "short", "shorten", "fewer words", "less tokens" | "normal", "normal mode", "verbose", "complete", "detailed" |

## Examples

**"Why does this React component re-render?"**

- Normal (69 tokens): "Your React component is probably re-rendering because you create a new object reference on every render. When you pass an inline object as a prop, React's shallow comparison treats it as different every time, which triggers a re-render. Use `useMemo` to memoize the object."
- Distilled (19 tokens): "New object ref every render. Inline prop = new ref = re-render. Wrap in `useMemo`."

**"Explain database connection pooling."**

- Normal: "Connection pooling keeps reusable database connections instead of creating one for every request. It avoids repeated TCP handshakes and authentication overhead."
- Distilled: "Pool reuses open connections. Skips handshake overhead. Set max connections below the database limit."

**"How do I test MAI-914?"**

- Normal: "First check out the corresponding branch, then run the local development environment, and follow the test scenarios in the Linear task."
- Distilled: "Checkout MAI-914 branch. Run local dev. Follow task scenarios."

**"What broke in the deploy?"**

- Normal: "The deploy logs indicate that the migration failed because the expected database schema does not match production."
- Distilled: "Migration failed. Database schema differs from prod. Check schema diff."

## Boundaries

- Code, commits, PRs, SQL, and Linear tasks: use normal writing.
- Security warnings and destructive operations: use clear writing.
- "normal mode", "complete", or "detailed": revert immediately.

## Team Terms Reference

Keep these exact — do not expand them:

- QA, PR, MAI-XXX, Linear, Slack
- deploy, dev, prod, staging, develop
- process, task, sprint
- pipeline, Lambda, S3, DynamoDB, MongoDB, CloudWatch
- frontend, backend, API, endpoint
- migration, schema, template
- blocker, fix, delivery, merge, branch, commit
