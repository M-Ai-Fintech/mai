import {
  FAST_CHECK_MANIFEST,
  FAST_RUNNER_PERMISSIONS,
  FAST_TEST_PERMISSIONS,
  type FastCheckDefinition,
  type FastCheckExecution,
  type FastCheckExecutor,
  formatFastPreflight,
  hasIncludedFailures,
  runFastPreflight,
  validateFastManifest,
} from "./verify_fast.ts";
import {
  assert,
  assertEquals,
  assertStringIncludes,
  assertThrows,
} from "@std/assert";

const EXPECTED_INCLUDED_IDS = [
  "api-contracts",
  "authorization-policy",
  "deal-terminology",
  "workflow-transitions",
  "persistence-contracts",
  "durable-job-state",
  "outbox-inbox-contracts",
  "target-dossier-proposal",
  "term-sheet-separation",
  "domain-risk-contracts",
  "operations-contract",
];

Deno.test("fast manifest names the approved deterministic boundaries", () => {
  assertEquals(
    FAST_CHECK_MANIFEST.filter((check) => check.mode === "included").map((
      check,
    ) => check.id),
    EXPECTED_INCLUDED_IDS,
  );
  for (const check of FAST_CHECK_MANIFEST) {
    assertEquals(check.fallbackPolicy, "forbidden");
    if (check.mode === "included") {
      assertEquals(check.adapter, "deterministic-test-adapter");
      assert(check.files.length > 0);
    }
  }
});

Deno.test("fast manifest rejects silent fixture fallback after live failure", () => {
  const invalidCheck: FastCheckDefinition = {
    ...FAST_CHECK_MANIFEST[0],
    fallbackPolicy: "silent-fixture",
  };

  assertThrows(
    () => validateFastManifest([invalidCheck]),
    Error,
    "must forbid silent fixture fallback",
  );
});

Deno.test("fast runner reports included, skipped, and unavailable components", async () => {
  const executor = new PassingFastCheckExecutor();
  const results = await runFastPreflight({ executor });
  const output = formatFastPreflight(results);

  assertEquals(executor.executedIds, EXPECTED_INCLUDED_IDS);
  assertEquals(
    results.filter((result) => result.status === "passed").length,
    EXPECTED_INCLUDED_IDS.length,
  );
  assert(results.some((result) => result.status === "skipped"));
  assert(results.some((result) => result.status === "unavailable"));
  assertStringIncludes(output, "SKIPPED");
  assertStringIncludes(output, "UNAVAILABLE");
  assertStringIncludes(output, "adapter=deterministic-test-adapter");
  assert(!output.toLowerCase().includes("database healthy"));
});

Deno.test("fast runner propagates an included component failure", async () => {
  const failedId = EXPECTED_INCLUDED_IDS[3];
  const executor = new SelectiveFailureExecutor(failedId);
  const results = await runFastPreflight({ executor });
  const failed = results.find((result) => result.id === failedId);

  assertEquals(failed?.status, "failed");
  assert(hasIncludedFailures(results));
});

Deno.test("fast permission manifest excludes network, write, ffi, and child env access", () => {
  assertEquals(FAST_RUNNER_PERMISSIONS, ["--allow-read", "--allow-run"]);
  assertEquals(FAST_TEST_PERMISSIONS, ["--allow-read"]);
});

Deno.test("fast command is developer tooling outside the banker-facing CLI", async () => {
  const configuration = JSON.parse(await Deno.readTextFile("deno.json")) as {
    tasks?: Record<string, string>;
  };
  const productCli = await Deno.readTextFile("src/main.ts");

  assertEquals(
    configuration.tasks?.["verify:fast"],
    "deno run --allow-read --allow-run scripts/verify_fast.ts",
  );
  assert(!productCli.includes("verify:fast"));
});

Deno.test("fast CLI returns non-zero when an included component fails", async () => {
  const output = await new Deno.Command(Deno.execPath(), {
    args: [
      "run",
      "--no-prompt",
      "--allow-read",
      "--allow-run",
      "scripts/verify_fast.ts",
      "--controlled-failure",
    ],
    stdout: "piped",
    stderr: "piped",
  }).output();
  const text = new TextDecoder().decode(output.stdout) +
    new TextDecoder().decode(output.stderr);

  assertEquals(output.code, 1);
  assertStringIncludes(text, "FAILED Core API contract parsing");
});

class PassingFastCheckExecutor implements FastCheckExecutor {
  readonly executedIds: string[] = [];

  execute(check: FastCheckDefinition): Promise<FastCheckExecution> {
    this.executedIds.push(check.id);
    return Promise.resolve({ success: true, output: "" });
  }
}

class SelectiveFailureExecutor extends PassingFastCheckExecutor {
  constructor(private readonly failedId: string) {
    super();
  }

  override execute(check: FastCheckDefinition): Promise<FastCheckExecution> {
    if (check.id === this.failedId) {
      return Promise.resolve({
        success: false,
        output: "controlled component failure",
      });
    }
    return super.execute(check);
  }
}
