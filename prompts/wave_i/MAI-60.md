Context

MAI-60 is the Wave I task for **Governed agent definitions and tools**. Linear issue MAI-60 and its native relations are authoritative. Read `prompts/OPERATING_RULES.md`, `prompts/README.md`, `plan_MAI-60.md`, the applicable local `AGENTS.md` execution plan, and the full Linear issue before changing code.

Use `$solve-mai` as the task workflow. Begin with the repair-or-restart assessment. Execute from the maestro-created worktree and approved Linear plan, or preserve a partial implementation when repair is safer than restart.

Objective

Migrate governed agent definitions and eight specialist agents to versioned schemas and capability-specific ToolGateway read/proposal contracts with exact provenance, authorization-before-load, structured outputs, human-boundary regressions, and removal or fencing of obsolete self-learning and fake adaptation behavior.

Relevant scope / architecture

Agent definitions and tools remain governed adapters over domain application services; they do not become transaction authority. Preserve versioned definitions, capability-specific permissions, exact source/result provenance, mission/run integration, evaluation hooks, and explicit prohibited effects.

Read-only and proposal capabilities may be delegated when safely separable; shared registries, public exports, runtime composition, Linear evidence, and cross-agent integration stay coordinator-owned.

Known risks or constraints

Do not grant approval, send, invite, permission, release, archive, delete, waiver, signature, runtime self-learning, automatic prompt/tool/model mutation, or fake fine-tuned inference capabilities.

Do not bypass domain authorization or load protected evidence before authorization. Do not broaden into MAI-61 provider certification, frontend redesign, or Agent Runtime ownership.

Applied migrations and historical agent evidence are immutable; use additive changes or explicit retirement evidence.

Expected verification

Run focused definition/versioning, ToolGateway authorization, schema/output, provenance, mission/run integration, prohibited-effect, legacy-learning/fine-tuning fence, and security tests.

Before handoff, run directly affected PostgreSQL/integration tests where persistence changed, changed-file type/lint/format checks, and `git diff --check`.

Run canonical `DENO_ENV=test deno task verify` once when ready. Record exact evidence and unresolved provider boundaries in Linear and the Draft PR. Do not include Graphify output in the implementation PR.

Allowed state transitions

Move Linear MAI-60 from Todo to In Progress only when implementation starts. Keep it In Progress and its PR Draft through owner/security review. Do not self-approve, self-merge, mark Done, perform Wave I closure, or alter downstream state.

Only the authorized Wave I finisher may make the final Done transition after merged-source verification. Use Linear for task evidence and governed documentation.

/goal
