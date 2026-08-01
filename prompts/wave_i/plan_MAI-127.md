# Plan MAI-127 — Integration adapters and certification

**Model:** 5.6 Sol High  
**Purpose:** planning only; implementation remains 5.6 Luna Max.

Inside the MAI-127 worktree, read operating rules, the full task, provider ADRs, current adapters/configuration, Papermark certification profile, fixture boundaries, health/capability tests, secrets, infrastructure, and consumers. Do not implement, commit, open a PR, branch, or run Graphify. Use focused `rg`.

Plan provider-by-provider ports, configuration, capability denial, authentication, sandbox/failure/health suites, residency/retention, secret redaction, readiness register, rollout/rollback, and explicit unavailable semantics. Separate adapter implementation from MAI-148 infrastructure and reject fixture/mock success as certification.

Write `## Wave I execution plan — MAI-127` in local `AGENTS.md`, persist with Backlog `planSet`, keep uncommitted/`skip-worktree`, and return the Luna handoff.
