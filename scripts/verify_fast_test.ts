import {
  buildDenoTestArgs,
  FAST_CHECK_MANIFEST,
  FAST_COMPONENT_TIMEOUT_MS,
  FAST_MAX_CONCURRENCY,
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

  assertEquals(
    [...executor.executedIds].sort(),
    [...EXPECTED_INCLUDED_IDS].sort(),
  );
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

Deno.test("fast runner fails a component that exceeds its timeout", async () => {
  const [check] = FAST_CHECK_MANIFEST.filter((entry) =>
    entry.mode === "included"
  );
  const results = await runFastPreflight({
    manifest: [check],
    executor: new NeverResolvingFastCheckExecutor(),
    timeoutMs: 5,
    concurrency: 1,
  });

  assertEquals(results[0].status, "failed");
  assertStringIncludes(results[0].output, "timed out after 5ms");
  assert(hasIncludedFailures(results));
});

Deno.test("fast runner bounds included component concurrency", async () => {
  const executor = new ConcurrencyTrackingFastCheckExecutor();
  const results = await runFastPreflight({
    executor,
    timeoutMs: FAST_COMPONENT_TIMEOUT_MS,
    concurrency: 2,
  });

  assertEquals(executor.maxActive, 2);
  assertEquals(
    results.filter((result) => result.status === "passed").length,
    EXPECTED_INCLUDED_IDS.length,
  );
  assertEquals(FAST_MAX_CONCURRENCY, 4);
});

Deno.test("fast permission manifest excludes network, write, ffi, and child env access", () => {
  assertEquals(FAST_RUNNER_PERMISSIONS, ["--allow-read=.", "--allow-run=deno"]);
  assertEquals(FAST_TEST_PERMISSIONS, ["--allow-read=."]);
  assert(!([...FAST_RUNNER_PERMISSIONS] as string[]).includes("--allow-read"));
  assert(!([...FAST_RUNNER_PERMISSIONS] as string[]).includes("--allow-run"));
  assert(!([...FAST_TEST_PERMISSIONS] as string[]).includes("--allow-read"));
});

Deno.test("fast commands freeze and cache dependency resolution", async () => {
  const configuration = JSON.parse(await Deno.readTextFile("deno.json")) as {
    tasks?: Record<string, string>;
  };

  assertEquals(
    configuration.tasks?.["verify:fast"],
    "deno run --cached-only --frozen --allow-read=. --allow-run=deno --no-prompt scripts/verify_fast.ts",
  );
  assertEquals(
    configuration.tasks?.["verify:fast:benchmark"],
    "deno run --cached-only --frozen --allow-read=. --allow-run=deno --no-prompt scripts/verify_fast_benchmark.ts",
  );
  assertEquals(
    buildDenoTestArgs(["tests/example.spec.ts"]),
    [
      "test",
      "--cached-only",
      "--frozen",
      "--no-prompt",
      "--quiet",
      "--allow-read=.",
      "tests/example.spec.ts",
    ],
  );
});

Deno.test("fast command remains bounded developer tooling after CLI retirement", async () => {
  const configuration = JSON.parse(await Deno.readTextFile("deno.json")) as {
    tasks?: Record<string, string>;
  };

  assertEquals(
    configuration.tasks?.["verify:fast"],
    "deno run --cached-only --frozen --allow-read=. --allow-run=deno --no-prompt scripts/verify_fast.ts",
  );
  assertEquals(configuration.tasks?.start, undefined);
  for (const command of Object.values(configuration.tasks ?? {})) {
    assert(!command.includes("src/main.ts"));
    assert(!command.includes("src/cli/"));
  }
});

Deno.test("fast CLI returns non-zero when an included component fails", async () => {
  const output = await new Deno.Command(Deno.execPath(), {
    args: [
      "run",
      "--cached-only",
      "--frozen",
      "--no-prompt",
      "--allow-read=.",
      "--allow-run=deno",
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

class NeverResolvingFastCheckExecutor implements FastCheckExecutor {
  execute(_check: FastCheckDefinition): Promise<FastCheckExecution> {
    return new Promise(() => {});
  }
}

class ConcurrencyTrackingFastCheckExecutor implements FastCheckExecutor {
  active = 0;
  maxActive = 0;

  async execute(_check: FastCheckDefinition): Promise<FastCheckExecution> {
    this.active += 1;
    this.maxActive = Math.max(this.maxActive, this.active);
    await new Promise((resolve) => setTimeout(resolve, 2));
    this.active -= 1;
    return { success: true, output: "" };
  }
}
