Context

MAI-64 is the Wave J task for **Frontend adapter migration**. Linear issue MAI-64 and its native relations are authoritative. Read `prompts/OPERATING_RULES.md`, `prompts/README.md`, `plan_MAI-64.md`, approved frontend/Figma contracts, the applicable local `AGENTS.md` execution plan, and the full Linear issue before changing code.

Use `$solve-mai` as the task workflow. Begin with the repair-or-restart assessment. Execute from the maestro-created worktree and approved Linear plan, or preserve a partial cutover when repair is safer than restart.

Objective

Replace fixture-backed banker-workspace data behind typed adapters family by family while preserving approved routes, screen states, permissions, stale/error behavior, accessibility, Storybook fixtures, and Figma-authorized interaction semantics.

Relevant scope / architecture

Cut over global, deal-intelligence, deal-execution, administration/external screen families and API clients to authoritative backend v1 contracts without visual redesign.

If delegation is justified, screen-family adapters may be disjoint writing slices. Shared frontend registries, API-client foundations, route integration, cross-family parity, and final workflow verification remain coordinator-owned unless the plan assigns exactly one safer owner.

Known risks or constraints

Do not redesign visuals/workflows, remove fixture-backed Storybook evidence that remains useful, bypass backend v1 contracts, or hide stale/permission/error states.

Preserve approved Figma behavior and route ownership. Do not broaden into backend domain changes or provider certification.

Expected verification

Run family-specific adapter/contract tests continuously, then complete parity, permission, stale/error, accessibility, route, workflow, Storybook, and production-build checks for affected families.

Run changed-file lint/format/type checks, `git diff --check`, and canonical `DENO_ENV=test deno task verify` once when the full cutover state is ready. Record exact family-by-family evidence and remaining fixture boundaries in Linear and the Draft PR.

Allowed state transitions

Move Linear MAI-64 from Todo to In Progress only when implementation starts. Keep it In Progress and its PR Draft through owner/frontend review. Do not self-approve, self-merge, mark Done, perform Wave J closure, or alter downstream state.

Only the authorized Wave J finisher may make the final Done transition after merged-source verification. Use Linear for task evidence and governed documentation.

/goal
