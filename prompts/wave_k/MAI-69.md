Context

MAI-69 is the Wave K task for **Governed Brazilian M&A model-adaptation strategy**. Linear issue MAI-69 and its native relations are authoritative. Read `prompts/OPERATING_RULES.md`, `prompts/README.md`, the applicable local `AGENTS.md` execution plan, governed evaluation documents, MAI-67 evidence, and the full Linear issue before changing repository evidence.

Use `$solve-mai` as the task workflow and begin with the repair-or-restart assessment.

Objective

Evaluate base-model behavior, prompt engineering, governed retrieval, knowledge bundles, structured tools, few-shot methods, and fine-tuning/LoRA against one approved Brazilian M&A evaluation methodology, then record a formal evidence-backed Go/No-go strategy decision.

Relevant scope / architecture

The task owns evaluation and strategy approval, not adapted-model implementation. Compare candidate methods on the same versioned datasets, quality/safety metrics, runtime requirements, artifact lineage, rollback implications, and provider constraints.

Known risks or constraints

Do not train, deploy, or load an adapted model inside this task. Do not label base-model, Gemini, mock, or fixture output as fine-tuned inference.

Do not bypass MAI-67 dataset governance or treat a theoretically attractive method as approved without comparative evidence.

Expected verification

Run source-backed methodology checks, reproducibility scripts, dataset/version validation, baseline-versus-candidate comparisons, quality/safety checks, and artifact-lineage validation that are applicable to the decision.

Run `git diff --check` and canonical `DENO_ENV=test deno task verify` once when the governed decision state is ready if repository mutation requires it. Record the formal Go/No-go, rationale, limitations, rollback, and future implementation conditions in Linear and the Draft PR.

Allowed state transitions

Move Linear MAI-69 from Todo to In Progress only when work starts. Keep it In Progress and its PR Draft through owner/model-governance/domain review. Do not self-approve, self-merge, mark Done, perform Wave K closure, train/deploy a model, or start a future adaptation implementation task without authorization.

Only the authorized Wave K finisher may make the final Done transition.

/goal
