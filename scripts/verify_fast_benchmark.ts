import {
  DenoTestExecutor,
  type FastCheckExecutor,
  hasIncludedFailures,
  runFastPreflight,
} from "./verify_fast.ts";

export const REFERENCE_RUN_COUNT = 10;
export const REFERENCE_P95_TARGET_MS = 5_000;

export interface FastBenchmarkResult {
  readonly runs: number;
  readonly durationsMs: readonly number[];
  readonly p95Ms: number;
  readonly targetMs: number;
  readonly targetPassed: boolean;
  readonly runner: string;
}

export function percentile(
  values: readonly number[],
  requestedPercentile: number,
): number {
  validatePercentileInput(values, requestedPercentile);
  const sorted = [...values].sort((left, right) => left - right);
  const rank = Math.max(
    1,
    Math.ceil((requestedPercentile / 100) * sorted.length),
  );
  return sorted[rank - 1];
}

export async function runReferenceBenchmark(
  executor: FastCheckExecutor = new DenoTestExecutor(),
  runs = REFERENCE_RUN_COUNT,
): Promise<FastBenchmarkResult> {
  if (runs < REFERENCE_RUN_COUNT) {
    throw new Error(
      `Reference benchmark runs "${runs}" is invalid; expected at least ${REFERENCE_RUN_COUNT}.`,
    );
  }
  const durationsMs: number[] = [];
  for (let index = 0; index < runs; index += 1) {
    durationsMs.push(await measurePreflight(executor));
  }
  const p95Ms = percentile(durationsMs, 95);
  return {
    runs,
    durationsMs,
    p95Ms,
    targetMs: REFERENCE_P95_TARGET_MS,
    targetPassed: p95Ms <= REFERENCE_P95_TARGET_MS,
    runner: referenceRunnerDescription(),
  };
}

export function formatReferenceBenchmark(
  result: FastBenchmarkResult,
): string {
  const durations = result.durationsMs.map((duration) => `${duration}ms`).join(
    ", ",
  );
  return [
    "Fast preflight reference benchmark (local target; not a universal SLA):",
    `Runner: ${result.runner}`,
    `Runs: ${result.runs}`,
    `Durations: ${durations}`,
    `p95: ${result.p95Ms}ms (target <= ${result.targetMs}ms)`,
    `Target: ${result.targetPassed ? "PASS" : "FAIL"}`,
  ].join("\n");
}

function validatePercentileInput(
  values: readonly number[],
  requestedPercentile: number,
): void {
  if (values.length === 0) {
    throw new Error("Percentile requires at least one timing sample.");
  }
  if (requestedPercentile < 0 || requestedPercentile > 100) {
    throw new Error(
      `Percentile "${requestedPercentile}" is invalid; expected 0-100.`,
    );
  }
}

async function measurePreflight(executor: FastCheckExecutor): Promise<number> {
  const startedAt = performance.now();
  const results = await runFastPreflight({ executor });
  if (hasIncludedFailures(results)) {
    throw new Error(
      "Reference benchmark failed because an included component failed.",
    );
  }
  return Math.round(performance.now() - startedAt);
}

function referenceRunnerDescription(): string {
  return `${Deno.build.os}/${Deno.build.arch}, Deno ${Deno.version.deno}`;
}

if (import.meta.main) {
  const result = await runReferenceBenchmark();
  console.log(formatReferenceBenchmark(result));
  if (!result.targetPassed) Deno.exit(1);
}
