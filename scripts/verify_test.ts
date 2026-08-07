import { assert, assertEquals, assertStringIncludes } from "@std/assert";
import {
  hasFailures,
  runVerification,
  type VerificationCheck,
  verificationChecks,
} from "./verify.ts";

Deno.test("verification runner explicitly uses the isolated test environment", () => {
  const denoTests = verificationChecks.find((check) =>
    check.id === "deno-tests"
  );
  assertEquals(denoTests?.env, { DENO_ENV: "test" });
});

Deno.test("verification runner includes the canonical documentation checker", () => {
  const documentation = verificationChecks.find((check) =>
    check.id === "canonical-documentation"
  );

  assertEquals(documentation, {
    id: "canonical-documentation",
    label: "Canonical documentation",
    command: "deno",
    args: ["run", "--allow-read", "scripts/check_docs.ts"],
  });
});

Deno.test("verification runner checks the clean frontend foundation", () => {
  const foundation = verificationChecks.find((check) =>
    check.id === "frontend-foundation"
  );

  assertEquals(foundation, {
    id: "frontend-foundation",
    label: "Frontend foundation boundary",
    command: "npm",
    args: ["--prefix", "gui", "run", "verify:foundation"],
  });
});

Deno.test("verification runner checks generated frontend tokens", () => {
  const tokens = verificationChecks.find((check) =>
    check.id === "frontend-tokens"
  );

  assertEquals(tokens, {
    id: "frontend-tokens",
    label: "Frontend design tokens",
    command: "npm",
    args: ["--prefix", "gui", "run", "verify:tokens"],
  });
});

Deno.test("verification runner checks the approved frontend component boundary", () => {
  const components = verificationChecks.find((check) =>
    check.id === "frontend-components"
  );

  assertEquals(components, {
    id: "frontend-components",
    label: "Frontend component boundary",
    command: "npm",
    args: ["--prefix", "gui", "run", "verify:components"],
  });
});

Deno.test("verification runner checks the application shell boundary", () => {
  const shell = verificationChecks.find((check) =>
    check.id === "frontend-shell"
  );

  assertEquals(shell, {
    id: "frontend-shell",
    label: "Frontend shell boundary",
    command: "npm",
    args: ["--prefix", "gui", "run", "verify:shell"],
  });
});

Deno.test("verification runner reports a failing child in its component summary", async () => {
  const check: VerificationCheck = {
    id: "intentional-failure",
    label: "Intentional failure",
    command: "unused",
    args: [],
  };
  const results = await runVerification(
    [check],
    (candidate) =>
      Promise.resolve({
        check: candidate,
        success: false,
        output: "expected failure",
        durationMs: 0,
      }),
  );

  assert(hasFailures(results));
  assertEquals(results[0].check.id, "intentional-failure");
});

Deno.test("verification stops before expensive categories when preflight fails", async () => {
  const executed: string[] = [];
  const results = await runVerification(
    [
      verificationChecks[0],
      verificationChecks[1],
    ],
    (check) => {
      executed.push(check.id);
      return Promise.resolve({
        check,
        success: false,
        output: "missing approved test target",
        durationMs: 1,
      });
    },
  );

  assertEquals(executed, ["environment-preflight"]);
  assert(hasFailures(results));
});

Deno.test("verification runner returns a non-zero exit code for a controlled child failure", async () => {
  const output = await new Deno.Command(Deno.execPath(), {
    args: [
      "run",
      "--quiet",
      "--allow-run",
      "scripts/verify.ts",
      "--controlled-failure",
    ],
    stdout: "piped",
    stderr: "piped",
  }).output();
  const text = new TextDecoder().decode(output.stdout) +
    new TextDecoder().decode(output.stderr);

  assertEquals(output.code, 1);
  assertStringIncludes(text, "FAIL Controlled failure");
});
