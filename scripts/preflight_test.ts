import { assertEquals, assertStringIncludes } from "@std/assert";
import {
  formatPreflight,
  hasPreflightFailures,
  type PreflightCommandResult,
  runPreflight,
} from "./preflight.ts";

function fakeCommandRunner(
  outputs: Record<string, PreflightCommandResult>,
) {
  return (command: string, args: readonly string[]) => {
    const key = [command, ...args].join(" ");
    return Promise.resolve(outputs[key] ?? { success: true, output: "" });
  };
}

const healthyCommands = {
  "docker info": { success: true, output: "server" },
  "docker compose ps --status running --services": {
    success: true,
    output: "postgres-integration-test",
  },
  "docker compose ps --status running --format {{.Service}} {{.Health}} postgres-integration-test":
    {
      success: true,
      output: "postgres-integration-test healthy",
    },
  'deno eval --cached-only --config deno.json await import("./scripts/preflight.ts");await import("./scripts/verify.ts");await import("./scripts/run_canonical_deno_tests.ts")':
    {
      success: true,
      output: "",
    },
  "git remote get-url origin": {
    success: true,
    output: "https://example.test/mai.git",
  },
};

const healthyEnvironment = {
  POSTGRES_INTEGRATION_TEST_DATABASE_URL:
    "postgres://postgres:postgres@localhost:55432/mai_test_postgres_integration",
  NOTIFICATIONS_INTEGRATION_TEST_DATABASE_URL:
    "postgres://postgres:postgres@localhost:55432/mai_test_notifications_integration",
};

Deno.test("preflight accepts the approved local target and warm dependencies", async () => {
  const results = await runPreflight({
    environment: healthyEnvironment,
    commandRunner: fakeCommandRunner(healthyCommands),
    databaseProbe: () => Promise.resolve("mai_test_postgres_integration"),
    filePresenceProbe: () => Promise.resolve(true),
  });

  assertEquals(hasPreflightFailures(results), false);
  assertEquals(
    results.find((result) => result.id === "papermark-hook")?.status,
    "skipped",
  );
});

Deno.test("preflight prepare reuses warm dependencies without reinstalling them", async () => {
  const results = await runPreflight({
    environment: healthyEnvironment,
    prepare: true,
    commandRunner: fakeCommandRunner(healthyCommands),
    databaseProbe: () => Promise.resolve("mai_test_postgres_integration"),
    databaseProvisioner: () => Promise.resolve(),
    filePresenceProbe: () => Promise.resolve(true),
  });

  assertEquals(hasPreflightFailures(results), false);
  assertEquals(
    results.find((result) => result.id === "prepare-node-dependencies")?.detail,
    "Next, Vitest, and Storybook are already warm.",
  );
  assertEquals(
    results.find((result) => result.id === "prepare-browser-dependencies")
      ?.detail,
    "Playwright browsers are already warm.",
  );
});

Deno.test("preflight rejects a development database target before probing it", async () => {
  const results = await runPreflight({
    environment: {
      POSTGRES_INTEGRATION_TEST_DATABASE_URL:
        "postgres://postgres:postgres@localhost:5432/mai",
    },
    commandRunner: fakeCommandRunner(healthyCommands),
    databaseProbe: () => Promise.reject(new Error("must not connect")),
    filePresenceProbe: () => Promise.resolve(true),
  });
  const target = results.find((result) => result.id === "postgres-target");

  assertEquals(target?.status, "failed");
  assertStringIncludes(target?.detail ?? "", "unsafe");
});

Deno.test("preflight reports a missing Docker daemon as unavailable", async () => {
  const results = await runPreflight({
    environment: healthyEnvironment,
    commandRunner: fakeCommandRunner({
      ...healthyCommands,
      "docker info": { success: false, output: "Cannot connect to Docker" },
    }),
    databaseProbe: () => Promise.resolve("mai_test_postgres_integration"),
    filePresenceProbe: () => Promise.resolve(true),
  });

  assertEquals(
    results.find((result) => result.id === "docker")?.status,
    "unavailable",
  );
  assertEquals(hasPreflightFailures(results), true);
});

Deno.test("preflight output includes a compact machine-readable summary", () => {
  const output = formatPreflight([{
    id: "fixture",
    label: "Fixture",
    required: true,
    status: "passed",
    detail: "ready",
  }]);

  assertStringIncludes(output, "PREFLIGHT_RESULT_JSON=");
  assertStringIncludes(output, '"status":"passed"');
});
