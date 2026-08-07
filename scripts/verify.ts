export interface VerificationCheck {
  id: string;
  label: string;
  command: string;
  args: string[];
  env?: Record<string, string>;
  required?: boolean;
}

export interface VerificationResult {
  check: VerificationCheck;
  success: boolean;
  output: string;
  durationMs: number;
}

export type CheckExecutor = (
  check: VerificationCheck,
) => Promise<VerificationResult>;

export const verificationChecks: VerificationCheck[] = [
  {
    id: "environment-preflight",
    label: "Environment preflight",
    command: "deno",
    args: [
      "run",
      "--env",
      "--allow-read",
      "--allow-env",
      "--allow-net",
      "--allow-run",
      "scripts/preflight.ts",
      "--json",
    ],
  },
  {
    id: "canonical-documentation",
    label: "Canonical documentation",
    command: "deno",
    args: ["run", "--allow-read", "scripts/check_docs.ts"],
  },
  {
    id: "linear-policy",
    label: "Linear system-of-record policy",
    command: "deno",
    args: ["run", "--allow-read", "scripts/check_linear_policy.ts"],
  },
  {
    id: "resource-naming",
    label: "Semantic resource naming",
    command: "deno",
    args: ["run", "--allow-read", "scripts/check_resource_naming.ts"],
  },
  {
    id: "migration-integrity",
    label: "Migration integrity",
    command: "deno",
    args: ["run", "--allow-read", "scripts/check_migration_integrity.ts"],
  },
  {
    id: "repository-standards",
    label: "Repository standards",
    command: "deno",
    args: [
      "run",
      "--allow-read",
      "--allow-run=git",
      "scripts/check_repository_standards.ts",
    ],
  },
  {
    id: "i18n-strings",
    label: "I18n Strings Check",
    command: "deno",
    args: ["run", "--allow-read", "scripts/check_i18n.ts"],
  },
  {
    id: "deno-tests",
    label: "Deno tests",
    command: "deno",
    args: [
      "run",
      "--allow-read",
      "--allow-run",
      "--allow-env",
      "--allow-net",
      "scripts/run_canonical_deno_tests.ts",
    ],
    env: { DENO_ENV: "test" },
  },
  {
    id: "frontend-tokens",
    label: "Frontend design tokens",
    command: "npm",
    args: ["--prefix", "gui", "run", "verify:tokens"],
  },
  {
    id: "frontend-foundation",
    label: "Frontend foundation boundary",
    command: "npm",
    args: ["--prefix", "gui", "run", "verify:foundation"],
  },
  {
    id: "frontend-components",
    label: "Frontend component boundary",
    command: "npm",
    args: ["--prefix", "gui", "run", "verify:components"],
  },
  {
    id: "frontend-shell",
    label: "Frontend shell boundary",
    command: "npm",
    args: ["--prefix", "gui", "run", "verify:shell"],
  },
  {
    id: "frontend-screens",
    label: "Frontend screen families",
    command: "npm",
    args: ["--prefix", "gui", "run", "verify:screens"],
  },
  {
    id: "frontend-deal-screens",
    label: "Frontend deal intelligence screens",
    command: "npm",
    args: ["--prefix", "gui", "run", "verify:deal-screens"],
  },
  {
    id: "frontend-execution-screens",
    label: "Frontend deal execution screens",
    command: "npm",
    args: ["--prefix", "gui", "run", "verify:execution-screens"],
  },
  {
    id: "frontend-conformance",
    label: "Frontend Figma-to-code conformance",
    command: "npm",
    args: ["--prefix", "gui", "run", "verify:conformance"],
  },
  {
    id: "gui-unit-tests",
    label: "GUI unit tests",
    command: "npm",
    args: ["--prefix", "gui", "run", "test:unit"],
  },
  {
    id: "next-build",
    label: "Next.js production build",
    command: "npm",
    args: ["--prefix", "gui", "run", "build"],
  },
  {
    id: "frontend-workflows",
    label: "Frontend principal workflows",
    command: "npm",
    args: ["--prefix", "gui", "run", "verify:workflows"],
  },
  {
    id: "storybook-docs",
    label: "Storybook documentation",
    command: "npm",
    args: ["--prefix", "gui", "run", "validate:storybook-docs"],
  },
  {
    id: "storybook-build",
    label: "Storybook build",
    command: "npm",
    args: ["--prefix", "gui", "run", "build-storybook"],
  },
  {
    id: "storybook-interactions",
    label: "Storybook interaction tests",
    command: "npm",
    args: ["--prefix", "gui", "run", "test-storybook", "--", "--run"],
  },
];

export async function executeCheck(
  check: VerificationCheck,
): Promise<VerificationResult> {
  const startedAt = performance.now();
  try {
    const command = verificationCommand(check);
    const child = command.spawn();
    const output = await outputWithTimeout(child, 600_000);
    return commandResult(
      check,
      output,
      Math.round(performance.now() - startedAt),
    );
  } catch (error) {
    return failedCommandResult(
      check,
      error,
      Math.round(performance.now() - startedAt),
    );
  }
}

function verificationCommand(check: VerificationCheck): Deno.Command {
  return new Deno.Command(check.command, {
    args: check.args,
    env: { ...Deno.env.toObject(), ...check.env },
    stdout: "piped",
    stderr: "piped",
  });
}

function commandResult(
  check: VerificationCheck,
  output: CommandOutput,
  durationMs: number,
): VerificationResult {
  return { check, success: output.success, output: output.text, durationMs };
}

function failedCommandResult(
  check: VerificationCheck,
  error: unknown,
  durationMs: number,
): VerificationResult {
  const reason = error instanceof Error ? error.message : String(error);
  const command = [check.command, ...check.args].join(" ");
  return {
    check,
    success: false,
    output: `Failed to run '${command}': ${reason}`,
    durationMs,
  };
}

interface CommandOutput {
  readonly success: boolean;
  readonly text: string;
}

async function outputWithTimeout(
  child: Deno.ChildProcess,
  timeoutMs: number,
): Promise<CommandOutput> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<CommandOutput>((resolve) => {
    timeoutId = setTimeout(() => {
      try {
        child.kill("SIGTERM");
      } catch {
        // The child can exit between the timeout and the signal.
      }
      resolve({ success: false, text: `Timed out after ${timeoutMs} ms.` });
    }, timeoutMs);
  });
  const output = child.output().then((result) => ({
    success: result.success,
    text: decodeCommandOutput(result.stdout, result.stderr),
  }));
  try {
    return await Promise.race([output, timeout]);
  } finally {
    if (timeoutId !== undefined) clearTimeout(timeoutId);
  }
}

function decodeCommandOutput(
  stdout: Uint8Array,
  stderr: Uint8Array,
): string {
  const decoder = new TextDecoder();
  return decoder.decode(stdout) + decoder.decode(stderr);
}

export async function runVerification(
  checks: readonly VerificationCheck[] = verificationChecks,
  execute: CheckExecutor = executeCheck,
): Promise<VerificationResult[]> {
  const results: VerificationResult[] = [];
  for (const check of checks) {
    const result = await executeAndReport(check, execute);
    results.push(result);
    if (check.id === "environment-preflight" && !result.success) break;
  }
  reportVerificationSummary(results);
  return results;
}

async function executeAndReport(
  check: VerificationCheck,
  execute: CheckExecutor,
): Promise<VerificationResult> {
  console.log(`\n▶ ${check.label}`);
  const result = await execute(check);
  if (!result.success && result.output.trim()) {
    console.error(result.output.trim());
  }
  return result;
}

function reportVerificationSummary(
  results: readonly VerificationResult[],
): void {
  console.log("\nVerification summary:");
  for (const result of results) {
    const status = result.success
      ? "PASS"
      : result.check.required === false
      ? "OPTIONAL-FAIL"
      : "FAIL";
    console.log(`  ${status} ${result.check.label} (${result.durationMs} ms)`);
  }
  console.log(`VERIFICATION_RESULT_JSON=${
    JSON.stringify({
      results: results.map((result) => ({
        id: result.check.id,
        label: result.check.label,
        required: result.check.required !== false,
        success: result.success,
        durationMs: result.durationMs,
      })),
    })
  }`);
}

export function hasFailures(results: readonly VerificationResult[]): boolean {
  return results.some((result) =>
    result.check.required !== false && !result.success
  );
}

if (import.meta.main) {
  const controlledFailure = Deno.args.includes("--controlled-failure");
  const checks = controlledFailure
    ? [{
      id: "controlled-failure",
      label: "Controlled failure",
      command: Deno.execPath(),
      args: ["eval", "Deno.exit(1)"],
    }]
    : verificationChecks;
  const results = await runVerification(checks);
  if (hasFailures(results)) Deno.exit(1);
}
