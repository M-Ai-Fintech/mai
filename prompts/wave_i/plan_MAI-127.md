# Plan MAI-127 — Integration adapters and certification

**Purpose:** planning only; implementation follows the route in `prompts/OPERATING_RULES.md`.

Inside the MAI-127 worktree, Read `prompts/OPERATING_RULES.md`, the full task, provider ADRs,
current adapters/configuration, Papermark certification profile, fixture
boundaries, health/capability tests, secrets, infrastructure, and consumers. Do
not implement, commit, open a PR, branch, or run Graphify. Use focused `rg`.

Plan provider-by-provider ports, configuration, capability denial,
authentication, sandbox/failure/health suites, residency/retention, secret
redaction, readiness register, rollout/rollback, and explicit unavailable
semantics. Separate adapter implementation from MAI-148 infrastructure and
reject fixture/mock success as certification.

## Execution policy

Plan for one accountable implementation agent by default. Propose delegation only when genuinely separable and materially faster; if justified, include exclusive paths, forbidden shared paths, checks, integration order, and stop conditions under `prompts/SUBAGENT_RULES.md`.

Write `## Wave I execution plan — MAI-127` in local `AGENTS.md`, persist with
Backlog `planSet`, keep uncommitted/`skip-worktree`, and return the
implementation handoff.
