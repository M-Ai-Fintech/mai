import { FAST_CHECK_MANIFEST } from "./verify_fast_manifest.ts";

export { FAST_CHECK_MANIFEST } from "./verify_fast_manifest.ts";

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

export interface FastCheckExecutionOptions {
  readonly timeoutMs: number;
}

export interface FastCheckExecutor {
  execute(
    check: FastCheckDefinition,
    options?: FastCheckExecutionOptions,
  ): Promise<FastCheckExecution>;
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
  readonly timeoutMs?: number;
  readonly concurrency?: number;
}

export const FAST_RUNNER_PERMISSIONS = [
  "--allow-read=.",
  "--allow-run=deno",
] as const;

export const FAST_TEST_PERMISSIONS = ["--allow-read=."] as const;
export const FAST_COMPONENT_TIMEOUT_MS = 5_000;
export const FAST_MAX_CONCURRENCY = 4;

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
  return [
    "test",
    "--cached-only",
    "--frozen",
    "--no-prompt",
    "--quiet",
    ...FAST_TEST_PERMISSIONS,
    ...files,
  ];
}

export async function runFastPreflight(
  options: FastPreflightOptions = {},
): Promise<FastCheckResult[]> {
  const manifest = options.manifest ?? FAST_CHECK_MANIFEST;
  const executor = options.executor ?? new DenoTestExecutor();
  const timeoutMs = options.timeoutMs ?? FAST_COMPONENT_TIMEOUT_MS;
  const concurrency = options.concurrency ?? FAST_MAX_CONCURRENCY;
  validateFastManifest(manifest);
  validateExecutionOptions(timeoutMs, concurrency);
  return await runManifest(
    manifest,
    executor,
    timeoutMs,
    concurrency,
  );
}

async function runManifest(
  manifest: readonly FastCheckDefinition[],
  executor: FastCheckExecutor,
  timeoutMs: number,
  concurrency: number,
): Promise<FastCheckResult[]> {
  const results = new Array<FastCheckResult>(manifest.length);
  const cursor = { nextIndex: 0 };
  const workerCount = Math.min(concurrency, manifest.length);
  await Promise.all(
    Array.from(
      { length: workerCount },
      () => runManifestWorker(manifest, results, cursor, executor, timeoutMs),
    ),
  );
  return results;
}

async function runManifestWorker(
  manifest: readonly FastCheckDefinition[],
  results: FastCheckResult[],
  cursor: { nextIndex: number },
  executor: FastCheckExecutor,
  timeoutMs: number,
): Promise<void> {
  while (cursor.nextIndex < manifest.length) {
    const index = cursor.nextIndex++;
    results[index] = await runFastCheck(manifest[index], executor, timeoutMs);
  }
}

function validateExecutionOptions(
  timeoutMs: number,
  concurrency: number,
): void {
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    throw new Error(
      `Fast component timeout "${timeoutMs}" is invalid; expected a positive finite number.`,
    );
  }
  if (!Number.isInteger(concurrency) || concurrency <= 0) {
    throw new Error(
      `Fast preflight concurrency "${concurrency}" is invalid; expected a positive integer.`,
    );
  }
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

  async execute(
    check: FastCheckDefinition,
    options: FastCheckExecutionOptions = {
      timeoutMs: FAST_COMPONENT_TIMEOUT_MS,
    },
  ): Promise<FastCheckExecution> {
    const child = new Deno.Command(this.executable, {
      args: buildDenoTestArgs(check.files),
      stdout: "piped",
      stderr: "piped",
    }).spawn();
    return await collectChildOutput(check, child, options.timeoutMs);
  }
}

interface ChildExecutionState {
  timedOut: boolean;
}

async function collectChildOutput(
  check: FastCheckDefinition,
  child: Deno.ChildProcess,
  timeoutMs: number,
): Promise<FastCheckExecution> {
  const state: ChildExecutionState = { timedOut: false };
  const timeoutId = setTimeout(() => {
    state.timedOut = true;
    terminateChild(child);
  }, timeoutMs);
  try {
    return await readChildOutput(check, child, timeoutMs, state);
  } finally {
    clearTimeout(timeoutId);
  }
}

async function readChildOutput(
  check: FastCheckDefinition,
  child: Deno.ChildProcess,
  timeoutMs: number,
  state: ChildExecutionState,
): Promise<FastCheckExecution> {
  try {
    const output = await child.output();
    if (state.timedOut) return timeoutExecution(check, timeoutMs);
    return {
      success: output.success,
      output: decodeCommandOutput(output.stdout, output.stderr),
    };
  } catch (error) {
    if (state.timedOut) return timeoutExecution(check, timeoutMs);
    throw error;
  }
}

class ControlledFailureExecutor implements FastCheckExecutor {
  constructor(
    private readonly delegate: FastCheckExecutor,
    private readonly failedId: string,
  ) {}

  execute(
    check: FastCheckDefinition,
    options?: FastCheckExecutionOptions,
  ): Promise<FastCheckExecution> {
    if (check.id === this.failedId) {
      return Promise.resolve({
        success: false,
        output: "controlled component failure",
      });
    }
    return this.delegate.execute(check, options);
  }
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
  timeoutMs: number,
): Promise<FastCheckResult> {
  if (check.mode !== "included") return manifestResult(check);
  const startedAt = performance.now();
  try {
    const execution = await executeWithTimeout(check, executor, timeoutMs);
    return executionResult(check, execution, performance.now() - startedAt);
  } catch (error) {
    return executionFailure(check, error, performance.now() - startedAt);
  }
}

async function executeWithTimeout(
  check: FastCheckDefinition,
  executor: FastCheckExecutor,
  timeoutMs: number,
): Promise<FastCheckExecution> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<FastCheckExecution>((resolve) => {
    timeoutId = setTimeout(
      () => resolve(timeoutExecution(check, timeoutMs)),
      timeoutMs,
    );
  });
  try {
    return await Promise.race([
      executor.execute(check, { timeoutMs }),
      timeout,
    ]);
  } finally {
    if (timeoutId !== undefined) clearTimeout(timeoutId);
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

function timeoutExecution(
  check: FastCheckDefinition,
  timeoutMs: number,
): FastCheckExecution {
  return {
    success: false,
    output: `Component "${check.id}" timed out after ${timeoutMs}ms.`,
  };
}

function terminateChild(child: Deno.ChildProcess): void {
  try {
    child.kill("SIGTERM");
  } catch {
    // The child may exit between timeout and termination; the result stays failed.
  }
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
