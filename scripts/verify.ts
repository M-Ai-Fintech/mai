export interface VerificationCheck {
  id: string;
  label: string;
  command: string;
  args: string[];
  env?: Record<string, string>;
}

export interface VerificationResult {
  check: VerificationCheck;
  success: boolean;
  output: string;
}

export type CheckExecutor = (
  check: VerificationCheck,
) => Promise<VerificationResult>;

export const verificationChecks: VerificationCheck[] = [
  {
    id: "canonical-documentation",
    label: "Canonical documentation",
    command: "deno",
    args: ["run", "--allow-read", "scripts/check_docs.ts"],
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
      "test",
      "--env",
      "--allow-read",
      "--allow-write",
      "--allow-env",
      "--allow-ffi",
      "--allow-run",
      "--allow-net",
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
  try {
    const command = verificationCommand(check);
    const output = await command.output();
    return commandResult(check, output);
  } catch (error) {
    return failedCommandResult(check, error);
  }
}

function verificationCommand(check: VerificationCheck): Deno.Command {
  return new Deno.Command(check.command, {
    args: check.args,
    env: check.env,
    stdout: "piped",
    stderr: "piped",
  });
}

function commandResult(
  check: VerificationCheck,
  output: Deno.CommandOutput,
): VerificationResult {
  const decoder = new TextDecoder();
  const text = decoder.decode(output.stdout) + decoder.decode(output.stderr);
  return { check, success: output.success, output: text };
}

function failedCommandResult(
  check: VerificationCheck,
  error: unknown,
): VerificationResult {
  const reason = error instanceof Error ? error.message : String(error);
  const command = [check.command, ...check.args].join(" ");
  return {
    check,
    success: false,
    output: `Failed to run '${command}': ${reason}`,
  };
}

export async function runVerification(
  checks: readonly VerificationCheck[] = verificationChecks,
  execute: CheckExecutor = executeCheck,
): Promise<VerificationResult[]> {
  const results: VerificationResult[] = [];
  for (const check of checks) {
    results.push(await executeAndReport(check, execute));
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
    console.log(`  ${result.success ? "PASS" : "FAIL"} ${result.check.label}`);
  }
}

export function hasFailures(results: readonly VerificationResult[]): boolean {
  return results.some((result) => !result.success);
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
