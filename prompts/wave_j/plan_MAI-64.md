Context

This is the planning-only handoff for Linear MAI-64 — Frontend adapter migration. Read `prompts/OPERATING_RULES.md`, `prompts/README.md`, the full Linear issue, approved Figma/frontend contracts, route/adapter registries, all banker-workspace screen families, fixtures/tests, and backend v1 APIs.

Objective

Produce the executable family-by-family frontend cutover plan that replaces fixture-backed runtime data through typed adapters while preserving approved routes, screen states, permissions, stale/error behavior, accessibility, Storybook fixtures, and Figma behavior.

Relevant scope / architecture

Define screen-family slices, typed contracts, shared API-client/route ownership, flags/rollback, test ownership, parity gates, and integration order. Shared registries and API-client foundations require one coordinator or one explicitly named owner.

If delegation is justified, include a concrete `/goal` for each disjoint screen-family worker, exclusive/forbidden paths, checks, handoff artifact, and serial integration order.

Known risks or constraints

Do not implement, commit, push, open a PR, run Graphify, change MAI-64 state, redesign visuals/workflows, delete useful Storybook fixture evidence, or bypass backend v1 contracts.

Expected verification

Validate the plan against Linear dependencies, current route and screen contracts, backend API readiness, file-collision risk, rollback flags, accessibility/parity tests, and final workflow/build verification. Write `## Wave J execution plan — MAI-64` to local `AGENTS.md` and persist it in Linear.

Allowed state transitions

Planning only. Keep MAI-64 Todo and make no frontend cutover changes.

/goal
