Context

MAI-67 is the Wave J task for **Audited agent feedback, evaluation, and offline improvement**. Linear issue MAI-67 and its native relations are authoritative. Read `prompts/OPERATING_RULES.md`, `prompts/README.md`, the applicable local `AGENTS.md` execution plan, governed agent/evaluation documents, and the full issue before changing code.

Use `$solve-mai` as the task workflow and begin with the repair-or-restart assessment.

Objective

Deliver immutable feedback linked to exact agent executions, authorization and classification, dataset eligibility, versioned offline evaluation datasets, regression suites, governed promotion records, rollback, and evidence lineage.

Relevant scope / architecture

Feedback is governed evidence for offline evaluation and improvement, not runtime truth. Preserve exact Run/Step/tool/model/prompt/evidence references and distinguish user preference, factual correction, quality signal, and policy/compliance escalation.

Promotion is an explicit governed action over versioned artifacts; runtime mutation is outside this task.

Known risks or constraints

Do not implement autonomous runtime self-learning, automatic prompt/tool/model mutation, direct weight updates, or treat feedback as authoritative policy, compliance, or domain fact.

Do not leak restricted deal data into evaluation datasets without eligibility, scope, privacy, and retention authority.

Expected verification

Run focused feedback immutability, authorization, classification, dataset eligibility, lineage, privacy/redaction, evaluation-regression, promotion/rollback, and replay tests.

Run affected persistence/integration checks, changed-file type/lint/format, `git diff --check`, and canonical `DENO_ENV=test deno task verify` once ready. Record exact dataset/evaluation/promotion evidence in Linear and the Draft PR.

Allowed state transitions

Move Linear MAI-67 from Todo to In Progress only when implementation starts. Keep it In Progress and its PR Draft through owner/model-governance/privacy review. Do not self-approve, self-merge, mark Done, perform Wave J closure, or mutate runtime model state.

Only the authorized Wave J finisher may make the final Done transition.

/goal
