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
    const output = await new Deno.Command(check.command, {
      args: check.args,
      env: check.env,
      stdout: "piped",
      stderr: "piped",
    }).output();
    const text = new TextDecoder().decode(output.stdout) +
      new TextDecoder().decode(output.stderr);

    return { check, success: output.success, output: text };
  } catch (error) {
    return {
      check,
      success: false,
      output: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function runVerification(
  checks: readonly VerificationCheck[] = verificationChecks,
  execute: CheckExecutor = executeCheck,
): Promise<VerificationResult[]> {
  const results: VerificationResult[] = [];

  for (const check of checks) {
    console.log(`\n▶ ${check.label}`);
    const result = await execute(check);
    results.push(result);

    if (!result.success && result.output.trim()) {
      console.error(result.output.trim());
    }
  }

  console.log("\nVerification summary:");
  for (const result of results) {
    console.log(`  ${result.success ? "PASS" : "FAIL"} ${result.check.label}`);
  }

  return results;
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
