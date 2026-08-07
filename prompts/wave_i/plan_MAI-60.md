Context

This is the planning-only handoff for Linear MAI-60 — Governed agent definitions and tools. Read `prompts/OPERATING_RULES.md`, `prompts/README.md`, the full Linear issue, applicable agent/human-authority documents, current agent definitions/schemas/tools/runtime ports/tests, and legacy learning/fine-tuning paths.

Objective

Produce the executable MAI-60 implementation plan for versioned agent definitions, capability-specific ToolGateway contracts, authorization-before-load, provenance, structured outputs, migration of the specialist agents, prohibited effects, and removal/fencing of obsolete self-learning and fake adaptation behavior.

Relevant scope / architecture

Plan only; use focused repository inspection. Define bounded slices, exclusive paths, coordinator-owned shared files, public contracts, migration/compatibility consequences, tests, rollback, and integration order.

If delegation is materially faster and safely separable, include a concrete worker matrix with one `/goal` draft per worker, read-only/writer classification, exclusive paths, forbidden shared paths, dependencies, checks, return artifact, and stop conditions. No overlapping writers.

Known risks or constraints

Do not implement, edit production code, commit, push, open a PR, run Graphify, or change MAI-60 state. Do not grant agents human authority or design fake fine-tuning/self-learning paths.

Expected verification

Validate the plan against Linear dependencies, current public contracts, migration immutability, human-authority constraints, file ownership, and executable tests. Write `## Wave I execution plan — MAI-60` to local `AGENTS.md` and persist the plan in Linear according to repository convention.

Allowed state transitions

Planning only. Keep MAI-60 Todo. No branch state, PR state, Graphify, implementation, or wave transition.

/goal
