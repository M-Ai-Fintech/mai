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

Deno.test("verification runner reports a failing child in its component summary", async () => {
  const check: VerificationCheck = {
    id: "intentional-failure",
    label: "Intentional failure",
    command: "unused",
    args: [],
  };
  const results = await runVerification([check], async (candidate) => ({
    check: candidate,
    success: false,
    output: "expected failure",
  }));

  assert(hasFailures(results));
  assertEquals(results[0].check.id, "intentional-failure");
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
