export type FastCheckMode = "included" | "skipped" | "unavailable";
export type FastCheckStatus =
  | "passed"
  | "failed"
  | "skipped"
  | "unavailable";
export type FastAdapter = "deterministic-test-adapter";
export type FastFallbackPolicy = "forbidden" | "silent-fixture";

export interface FastCheckDefinition {
  readonly id: string;
  readonly label: string;
  readonly mode: FastCheckMode;
  readonly files: readonly string[];
  readonly adapter?: FastAdapter;
  readonly reason?: string;
  readonly fallbackPolicy: FastFallbackPolicy;
}

export interface FastCheckExecution {
  readonly success: boolean;
  readonly output: string;
}

export interface FastCheckExecutor {
  execute(check: FastCheckDefinition): Promise<FastCheckExecution>;
}

export interface FastCheckResult {
  readonly id: string;
  readonly label: string;
  readonly mode: FastCheckMode;
  readonly status: FastCheckStatus;
  readonly adapter?: FastAdapter;
  readonly reason?: string;
  readonly durationMs: number;
  readonly output: string;
}

export interface FastPreflightOptions {
  readonly manifest?: readonly FastCheckDefinition[];
  readonly executor?: FastCheckExecutor;
}

export const FAST_RUNNER_PERMISSIONS = [
  "--allow-read",
  "--allow-run",
] as const;

export const FAST_TEST_PERMISSIONS = ["--allow-read"] as const;

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

export const FAST_PREFLIGHT_MANIFEST = FAST_CHECK_MANIFEST;

export function validateFastManifest(
  manifest: readonly FastCheckDefinition[],
): void {
  if (manifest.length === 0) {
    throw new Error(
      "Fast preflight manifest is empty; expected at least one check.",
    );
  }
  const ids = new Set<string>();
  for (const check of manifest) {
    validateUniqueId(check, ids);
    validateFallbackPolicy(check);
    validateModeShape(check);
  }
}

export function buildDenoTestArgs(
  files: readonly string[],
): string[] {
  return ["test", "--no-prompt", "--quiet", ...FAST_TEST_PERMISSIONS, ...files];
}

export async function runFastPreflight(
  options: FastPreflightOptions = {},
): Promise<FastCheckResult[]> {
  const manifest = options.manifest ?? FAST_CHECK_MANIFEST;
  const executor = options.executor ?? new DenoTestExecutor();
  validateFastManifest(manifest);
  return await Promise.all(
    manifest.map((check) => runFastCheck(check, executor)),
  );
}

export function hasIncludedFailures(
  results: readonly FastCheckResult[],
): boolean {
  return results.some((result) =>
    result.mode === "included" && result.status === "failed"
  );
}

export function formatFastPreflight(
  results: readonly FastCheckResult[],
): string {
  const lines = [
    "Fast deterministic developer preflight (offline; developer/operator tooling only):",
  ];
  for (const result of results) lines.push(formatResult(result));
  lines.push(formatSummary(results));
  return lines.join("\n");
}

export class DenoTestExecutor implements FastCheckExecutor {
  constructor(private readonly executable = Deno.execPath()) {}

  async execute(check: FastCheckDefinition): Promise<FastCheckExecution> {
    const command = new Deno.Command(this.executable, {
      args: buildDenoTestArgs(check.files),
      stdout: "piped",
      stderr: "piped",
    });
    const output = await command.output();
    return {
      success: output.success,
      output: decodeCommandOutput(output.stdout, output.stderr),
    };
  }
}

class ControlledFailureExecutor implements FastCheckExecutor {
  constructor(
    private readonly delegate: FastCheckExecutor,
    private readonly failedId: string,
  ) {}

  execute(check: FastCheckDefinition): Promise<FastCheckExecution> {
    if (check.id === this.failedId) {
      return Promise.resolve({
        success: false,
        output: "controlled component failure",
      });
    }
    return this.delegate.execute(check);
  }
}

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

function validateUniqueId(
  check: FastCheckDefinition,
  ids: Set<string>,
): void {
  if (!check.id || ids.has(check.id)) {
    throw new Error(
      `Fast preflight check id "${check.id}" is duplicated or empty.`,
    );
  }
  ids.add(check.id);
}

function validateFallbackPolicy(check: FastCheckDefinition): void {
  if (check.fallbackPolicy === "forbidden") return;
  throw new Error(
    `Fast preflight check "${check.id}" must forbid silent fixture fallback after live failure.`,
  );
}

function validateModeShape(check: FastCheckDefinition): void {
  if (check.mode === "included") {
    validateIncludedCheck(check);
    return;
  }
  if (check.files.length > 0 || !check.reason) {
    throw new Error(
      `Fast preflight check "${check.id}" is ${check.mode}; expected a reason and no test files.`,
    );
  }
}

function validateIncludedCheck(check: FastCheckDefinition): void {
  if (check.files.length === 0 || check.adapter === undefined) {
    throw new Error(
      `Fast preflight check "${check.id}" is included; expected files and an explicit test adapter.`,
    );
  }
  if (
    check.files.some((file) => file.startsWith("-") || file.includes("://"))
  ) {
    throw new Error(
      `Fast preflight check "${check.id}" contains an invalid test path; expected repository-relative files.`,
    );
  }
}

async function runFastCheck(
  check: FastCheckDefinition,
  executor: FastCheckExecutor,
): Promise<FastCheckResult> {
  if (check.mode !== "included") return manifestResult(check);
  const startedAt = performance.now();
  try {
    const execution = await executor.execute(check);
    return executionResult(check, execution, performance.now() - startedAt);
  } catch (error) {
    return executionFailure(check, error, performance.now() - startedAt);
  }
}

function manifestResult(check: FastCheckDefinition): FastCheckResult {
  const status: FastCheckStatus = check.mode === "skipped"
    ? "skipped"
    : "unavailable";
  return {
    id: check.id,
    label: check.label,
    mode: check.mode,
    status,
    reason: check.reason,
    durationMs: 0,
    output: "",
  };
}

function executionResult(
  check: FastCheckDefinition,
  execution: FastCheckExecution,
  durationMs: number,
): FastCheckResult {
  return {
    id: check.id,
    label: check.label,
    mode: check.mode,
    status: execution.success ? "passed" : "failed",
    adapter: check.adapter,
    durationMs: roundedMilliseconds(durationMs),
    output: execution.output,
  };
}

function executionFailure(
  check: FastCheckDefinition,
  error: unknown,
  durationMs: number,
): FastCheckResult {
  const message = error instanceof Error ? error.message : String(error);
  return executionResult(
    check,
    { success: false, output: `Failed to execute component: ${message}` },
    durationMs,
  );
}

function roundedMilliseconds(durationMs: number): number {
  return Math.max(0, Math.round(durationMs));
}

function decodeCommandOutput(stdout: Uint8Array, stderr: Uint8Array): string {
  const decoder = new TextDecoder();
  return `${decoder.decode(stdout)}${decoder.decode(stderr)}`.trim();
}

function formatResult(result: FastCheckResult): string {
  const source = result.adapter === undefined
    ? result.reason ?? "explicit manifest status"
    : `adapter=${result.adapter}`;
  const detail = result.output ? ` :: ${truncate(result.output)}` : "";
  return `  ${result.status.toUpperCase()} ${result.label} [${result.id}] (${source})${detail}`;
}

function formatSummary(results: readonly FastCheckResult[]): string {
  const counts = countStatuses(results);
  return `Summary: ${counts.passed} passed, ${counts.failed} failed, ${counts.skipped} skipped, ${counts.unavailable} unavailable.`;
}

function countStatuses(
  results: readonly FastCheckResult[],
): Record<FastCheckStatus, number> {
  const counts: Record<FastCheckStatus, number> = {
    passed: 0,
    failed: 0,
    skipped: 0,
    unavailable: 0,
  };
  for (const result of results) counts[result.status] += 1;
  return counts;
}

function truncate(output: string): string {
  const compact = output.replace(/\s+/g, " ").trim();
  return compact.length <= 600 ? compact : `${compact.slice(0, 597)}...`;
}

function firstIncludedId(): string {
  const first = FAST_CHECK_MANIFEST.find((check) => check.mode === "included");
  if (first === undefined) {
    throw new Error("Fast preflight has no included checks.");
  }
  return first.id;
}

async function main(): Promise<void> {
  const executor = new DenoTestExecutor();
  const selectedExecutor = Deno.args.includes("--controlled-failure")
    ? new ControlledFailureExecutor(executor, firstIncludedId())
    : executor;
  const results = await runFastPreflight({ executor: selectedExecutor });
  console.log(formatFastPreflight(results));
  if (hasIncludedFailures(results)) Deno.exit(1);
}

if (import.meta.main) await main();
