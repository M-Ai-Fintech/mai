Context

The authoritative execution policy is `prompts/OPERATING_RULES.md`; read it before execution.

Wave K contains Linear issue MAI-68 only. Run only after its owner-approved PR is merged. MAI-69 is post-MVP and is not a Wave K closure gate.

Objective

Close Wave K only after proving legacy banker-facing CLI replacement/retirement is safe and bounded operator tooling remains governed on merged master.

Relevant scope / architecture

Verify MAI-68 replacement coverage, removal/inaccessibility of unsupported banker-facing CLI workflows, preservation of required domain logic, and bounded operator/migration/diagnostic tooling. Only the finisher writes Linear closure evidence and Graphify/master metadata.

Known risks or constraints

Do not remove post-MVP migration tooling, repair feature code, start MAI-69/70/81/82/83, or remove shared domain logic still consumed by the MVP.

Expected verification

Run focused CLI replacement/operations checks plus canonical `DENO_ENV=test deno task verify`. Reconcile acceptance criteria, merged evidence, retained tools, supported frontend/API workflow coverage, and open P0/P1 findings.

If green, run one `graphify update .`, `git diff --check`, mark MAI-68 Done in Linear, remove only its merged branch/worktree, commit `docs: close delivery wave K`, push master, and confirm clean synchronized master. Otherwise record blockers and leave Wave K open.

Allowed state transitions

The finisher may mark MAI-68 Done and push the closure commit only after every MVP gate passes. It may not implement fixes or start Wave L implementation.

/goal
