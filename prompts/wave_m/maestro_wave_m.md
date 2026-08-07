Context

The authoritative execution policy is `prompts/OPERATING_RULES.md`; read it before execution.

Wave M contains Linear issue MAI-71 — End-to-end, security and operational release gate. Linear native relations and `prompts/manifest.json` are authoritative. Read the operating policy, README, full issue, and all dependency evidence before planning.

Objective

Prepare the final MAI-71 release-gate worktree and verification-stream plan without implementing features or making a release decision.

Relevant scope / architecture

Create `delivery/MAI-71-end-to-end-security-and-operational-release-gate` at `../mai-worktrees/wave_m/MAI-71` from synchronized master. Plan disjoint verification streams for workflows/E2E, authorization/isolation, external access, human authority, concurrency/idempotency, jobs/recovery, audit, provider failure, backup/restore, frontend, security/privacy, and operational evidence.

MAI-71 is primarily parallel read-only verification. Set one authoritative coordinator and at most one writer for release artifacts. Persist `## Wave M execution plan — MAI-71` in Linear and local `AGENTS.md` according to repository convention.

Known risks or constraints

Do not implement, set MAI-71 In Progress during planning, open its implementation/release PR, merge, run Graphify, waive P0/P1 defects, or treat missing environment evidence as pass.

Expected verification

Confirm Wave L closed, every MAI-71 dependency Done, clean synchronized master, MAI-71 Todo, no duplicate branch/worktree/PR, exact base SHA, test-stream ownership, environment prerequisites, P0/P1 disposition rules, and no implementation changes.

Allowed state transitions

Planning only. Leave MAI-71 Todo and make no production-candidate decision.

/goal
