import type { FastCheckDefinition } from "./verify_fast.ts";

export const FAST_CHECK_MANIFEST: readonly FastCheckDefinition[] = [
  includedCheck(
    "api-contracts",
    "Core API contract parsing",
    ["tests/platform/api/v1_contracts.spec.ts"],
  ),
  includedCheck(
    "authorization-policy",
    "Authorization policy evaluation",
    [
      "tests/platform/authz/v1.spec.ts",
      "tests/platform/authz/guard_projection.spec.ts",
    ],
  ),
  includedCheck(
    "deal-terminology",
    "Deal terminology enforcement",
    ["tests/unit/deal_terminology_contract.spec.ts"],
  ),
  includedCheck(
    "workflow-transitions",
    "Deterministic workflow transitions",
    ["tests/smoke.spec.ts"],
  ),
  includedCheck(
    "persistence-contracts",
    "Persistence contract types",
    [
      "tests/platform/persistence/concurrency.spec.ts",
      "tests/platform/persistence/idempotency.spec.ts",
      "tests/platform/persistence/migration.spec.ts",
      "tests/platform/persistence/transaction.spec.ts",
    ],
  ),
  includedCheck(
    "durable-job-state",
    "Durable-job state mechanics",
    [
      "tests/platform/jobs/model.spec.ts",
      "tests/platform/jobs/worker.spec.ts",
    ],
  ),
  includedCheck(
    "outbox-inbox-contracts",
    "Outbox and inbox contract mechanics",
    [
      "tests/platform/events/dispatcher.spec.ts",
      "tests/platform/events/inbox_contract.spec.ts",
    ],
  ),
  includedCheck(
    "target-dossier-proposal",
    "Target Dossier proposal boundary",
    ["tests/unit/target_dossier_contract.spec.ts"],
  ),
  includedCheck(
    "term-sheet-separation",
    "Term-sheet contract separation",
    ["tests/unit/term_sheet_schema_test.ts"],
  ),
  includedCheck(
    "domain-risk-contracts",
    "DomainArea and RiskSeverity contracts",
    ["tests/shared/domain-area.spec.ts", "tests/shared/risk-severity.spec.ts"],
  ),
  includedCheck(
    "operations-contract",
    "Offline operations contract parsing",
    ["tests/platform/operations/contract.spec.ts"],
  ),
  unavailableCheck(
    "live-postgresql",
    "Live PostgreSQL health",
    "Unavailable by the offline profile; use deno task verify:integration.",
  ),
  unavailableCheck(
    "live-providers",
    "Live provider credentials and health",
    "Unavailable by the offline profile; use the owning integration gate.",
  ),
  skippedCheck(
    "external-network",
    "External network access",
    "Skipped by the explicit offline permission manifest.",
  ),
  skippedCheck(
    "production-build",
    "Production build",
    "Skipped by the explicit manifest; covered by canonical verification.",
  ),
  skippedCheck(
    "storybook-browser",
    "Storybook browser execution",
    "Skipped by the explicit manifest; covered by GUI verification.",
  ),
  skippedCheck(
    "cloud-infrastructure",
    "Cloud infrastructure health",
    "Skipped by the explicit manifest; covered by deployment verification.",
  ),
  skippedCheck(
    "model-downloads",
    "Long-running model downloads",
    "Skipped by the explicit manifest; covered by model and integration gates.",
  ),
];

function includedCheck(
  id: string,
  label: string,
  files: readonly string[],
): FastCheckDefinition {
  return {
    id,
    label,
    mode: "included",
    files,
    adapter: "deterministic-test-adapter",
    fallbackPolicy: "forbidden",
  };
}

function skippedCheck(
  id: string,
  label: string,
  reason: string,
): FastCheckDefinition {
  return manifestOnlyCheck(id, label, "skipped", reason);
}

function unavailableCheck(
  id: string,
  label: string,
  reason: string,
): FastCheckDefinition {
  return manifestOnlyCheck(id, label, "unavailable", reason);
}

function manifestOnlyCheck(
  id: string,
  label: string,
  mode: "skipped" | "unavailable",
  reason: string,
): FastCheckDefinition {
  return { id, label, mode, files: [], reason, fallbackPolicy: "forbidden" };
}
