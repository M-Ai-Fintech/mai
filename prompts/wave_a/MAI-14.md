# MAI-14 — Identity, institution, workspace and access lifecycle

**Skill:** `$solve-mai`

Read `plan_MAI-14.md` first and use the central model route. Read `prompts/OPERATING_RULES.md` and `## Wave A execution plan — MAI-14` in local `AGENTS.md`; never commit it. Invoke `$solve-mai MAI-14`.

## Focus

Deliver identities, institution/workspace memberships, invitations, grants, restrictions, revocation, safe session context, and deny-before-load authorization integration.

## Boundary

Do not implement concrete IdP certification, Deal participation, or frontend redesign. Preserve protected-not-found and field omission.

Use focused`rg`, TDD/security tests, task checks, and `deno task verify`. Set In Progress, record migration/rollback evidence, open a PR containing MAI-14, never self-merge, and do not mark Done.
