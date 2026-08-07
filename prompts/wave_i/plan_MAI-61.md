Context

This is the planning-only handoff for Linear MAI-61 — Integration adapters and certification. Read `prompts/OPERATING_RULES.md`, `prompts/README.md`, the full Linear issue, provider ADRs, current ports/adapters/configuration, Papermark profile, fixtures, health/capability tests, secrets/infrastructure boundaries, and current consumers.

Objective

Produce the executable provider-by-provider plan for ports, configuration, authentication, capability denial, sandbox/failure/health suites, residency/retention, secret redaction, readiness evidence, rollout, rollback, and explicit unavailable semantics.

Relevant scope / architecture

Separate adapter implementation from MAI-22 infrastructure and domain ownership. Define provider lanes, exact exclusive paths, one coordinator-owned readiness register, shared configuration ownership, consumer contracts, environment prerequisites, and certification evidence.

If delegation is justified, include one concrete `/goal` draft per provider worker plus disjoint paths, checks, stop conditions, and serial integration order.

Known risks or constraints

Do not implement, commit, push, open a PR, run Graphify, change MAI-61 state, silently accept fixture/mock success as certification, expose credentials, or assume environment access that has not been proven.

Expected verification

Validate the plan against Linear dependencies, provider credentials/environment prerequisites, public ports, security/residency/retention constraints, failure semantics, and executable verification. Write `## Wave I execution plan — MAI-61` to local `AGENTS.md` and persist it in Linear.

Allowed state transitions

Planning only. Keep MAI-61 Todo and make no provider readiness transition.

/goal
