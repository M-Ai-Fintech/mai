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

function approvedDatabaseProbe(databaseUrl: string): Promise<string> {
  return Promise.resolve(new URL(databaseUrl).pathname.slice(1));
}

Deno.test("preflight accepts the approved local target and warm dependencies", async () => {
  const results = await runPreflight({
    environment: healthyEnvironment,
    commandRunner: fakeCommandRunner(healthyCommands),
    databaseProbe: approvedDatabaseProbe,
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
    databaseProbe: approvedDatabaseProbe,
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

Deno.test("preflight reuses reachable approved targets without compose service", async () => {
  const results = await runPreflight({
    environment: healthyEnvironment,
    commandRunner: fakeCommandRunner({
      ...healthyCommands,
      "docker compose ps --status running --services": {
        success: true,
        output: "",
      },
    }),
    databaseProbe: approvedDatabaseProbe,
    filePresenceProbe: () => Promise.resolve(true),
  });
  const service = results.find((result) => result.id === "docker");

  assertEquals(service?.status, "passed");
  assertStringIncludes(service?.detail ?? "", "both approved local");
  assertEquals(hasPreflightFailures(results), false);
});

Deno.test("preflight prepare skips compose when both targets are already reachable", async () => {
  let composeStartupRequested = false;
  const commandRunner = (command: string, args: readonly string[]) => {
    if (command === "docker" && args.includes("up")) {
      composeStartupRequested = true;
    }
    return fakeCommandRunner({
      ...healthyCommands,
      "docker compose ps --status running --services": {
        success: true,
        output: "",
      },
    })(command, args);
  };
  const results = await runPreflight({
    environment: healthyEnvironment,
    prepare: true,
    commandRunner,
    databaseProbe: approvedDatabaseProbe,
    databaseProvisioner: () => Promise.resolve(),
    filePresenceProbe: () => Promise.resolve(true),
  });
  const preparation = results.find((result) =>
    result.id === "prepare-postgres-service"
  );

  assertEquals(composeStartupRequested, false);
  assertEquals(preparation?.status, "passed");
  assertStringIncludes(preparation?.detail ?? "", "compose startup skipped");
  assertEquals(hasPreflightFailures(results), false);
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
    databaseProbe: approvedDatabaseProbe,
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
