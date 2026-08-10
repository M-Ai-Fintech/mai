import { assert, assertEquals, assertStringIncludes } from "@std/assert";

interface DenoConfiguration {
  tasks?: Record<string, string>;
}

const FORMER_COMMANDS = [
  "kyb",
  "predict",
  "portfolio",
  "negotiate",
  "document",
  "chat",
  "interactive",
  "serve",
  "smoke",
  "completions",
] as const;

const RETAINED_TASK_TARGETS = [
  ["infra:smoke", "scripts/infra_smoke.ts"],
  ["db:migrate", "scripts/migrate.ts"],
  ["infra:backup", "scripts/infra_recovery.ts backup"],
  ["infra:restore", "scripts/infra_recovery.ts restore"],
  ["infra:rollback", "scripts/infra_rollback.ts"],
  ["verify:fast", "scripts/verify_fast.ts"],
  ["verify:fast:benchmark", "scripts/verify_fast_benchmark.ts"],
] as const;

const FOCUSED_CONTRACT_PATHS = [
  "tests/integrations/configuration_correction.spec.ts",
  "tests/integrations/configuration.spec.ts",
  "tests/api/routes/legacy_compatibility.spec.ts",
  "tests/engines/compatibility_consumers.spec.ts",
  "tests/engines/document_generator.spec.ts",
  "src/engines/optimization/negotiation/compatibility.test.ts",
  "gui/lib/api-client/legacy-tool-client.ts",
] as const;

async function pathExists(path: string): Promise<boolean> {
  try {
    await Deno.stat(path);
    return true;
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) return false;
    throw error;
  }
}

async function configuration(): Promise<DenoConfiguration> {
  return JSON.parse(await Deno.readTextFile("deno.json")) as DenoConfiguration;
}

async function sourceFiles(directory: string): Promise<string[]> {
  const files: string[] = [];
  for await (const entry of Deno.readDir(directory)) {
    const path = `${directory}/${entry.name}`;
    if (entry.isDirectory) {
      if (entry.name !== "graphify-out") {
        files.push(...await sourceFiles(path));
      }
    } else if (/\.(?:ts|tsx|js|mjs|cjs)$/.test(entry.name)) {
      files.push(path);
    }
  }
  return files;
}

async function sourceText(): Promise<string> {
  const files = await sourceFiles("src");
  const contents = await Promise.all(
    files.map((path) => Deno.readTextFile(path)),
  );
  return contents.join("\n");
}

function requiredTask(
  tasks: Readonly<Record<string, string>>,
  name: string,
): string {
  const value = tasks[name];
  assert(value !== undefined, `Task "${name}" is missing.`);
  return value ?? "";
}

Deno.test("obsolete banker CLI entry point and dispatcher are absent", async () => {
  for (const path of ["src/main.ts", "src/cli"]) {
    assertEquals(await pathExists(path), false, path);
  }
});

Deno.test("former commands and indirect CLI registrations are absent", async () => {
  const config = await configuration();
  const manifest = await Deno.readTextFile("deno.json");
  const lockfile = await Deno.readTextFile("deno.lock");
  const source = await sourceText();
  assertEquals(config.tasks?.start, undefined);
  assert(!manifest.includes("@cliffy/"));
  assert(!lockfile.includes("@cliffy/"));
  assert(!source.includes("@cliffy/"));
  assert(!source.includes("src/main.ts"));
  assert(!source.includes("src/cli/"));
  assert(!/(?:from|import)\s*(?:\(\s*)?["'][^"']*\/cli\//.test(source));
  for (const command of FORMER_COMMANDS) {
    assert(!source.includes(`.command("${command}"`), command);
    assert(!source.includes(`value: "${command}"`), command);
    assert(!Object.hasOwn(config.tasks ?? {}, command), command);
  }
  for (const command of Object.values(config.tasks ?? {})) {
    assert(!command.includes("src/main.ts"));
    assert(!command.includes("src/cli/"));
  }
});

Deno.test("former CLI invocation is explicitly unsupported", async () => {
  const result = await new Deno.Command(Deno.execPath(), {
    args: ["task", "start"],
    stdout: "piped",
    stderr: "piped",
  }).output();
  const output = new TextDecoder().decode(result.stdout) +
    new TextDecoder().decode(result.stderr);
  assertEquals(result.success, false);
  assertStringIncludes(output, "Task not found: start");
});

Deno.test("operator, migration, recovery, and developer boundaries remain explicit", async () => {
  const tasks = (await configuration()).tasks ?? {};
  for (const [name, target] of RETAINED_TASK_TARGETS) {
    const command = requiredTask(tasks, name);
    assertStringIncludes(command, "deno ");
    assertStringIncludes(command, target);
    assert(!command.includes("src/main.ts"));
    assert(!command.includes("src/cli/"));
  }
  assertStringIncludes(
    requiredTask(tasks, "api:start"),
    "src/api/server.ts",
  );
  const fast = requiredTask(tasks, "verify:fast");
  assertStringIncludes(fast, "--cached-only --frozen");
  assert(!fast.includes("--allow-net"));
  assert(!fast.includes("--allow-write"));
});

Deno.test("retained tools and shared consumers keep focused contracts", async () => {
  for (const path of FOCUSED_CONTRACT_PATHS) {
    assertEquals(await pathExists(path), true, path);
  }
  const smoke = await Deno.readTextFile("scripts/infra_smoke.ts");
  assertStringIncludes(smoke, "sanitizedFailure");
  assertStringIncludes(smoke, "LocalFailureSanitizer");
  const recovery = await Deno.readTextFile("scripts/infra_recovery.ts");
  assertStringIncludes(recovery, "assertArtifact");
  assertStringIncludes(recovery, "captureRecoveryManifest");
  const rollback = await Deno.readTextFile("scripts/infra_rollback.ts");
  assertStringIncludes(rollback, "assertRecoveryManifestsEqual");
  const fast = await Deno.readTextFile("scripts/verify_fast.ts");
  assertStringIncludes(fast, "developer/operator tooling only");
});

Deno.test("approved API and shared engine boundaries remain present", async () => {
  for (
    const path of [
      "src/api/server.ts",
      "src/api/v1/financial_risk_routes.ts",
      "src/engines/optimization/negotiation/compatibility.ts",
      "src/engines/document-generator/latex.ts",
    ]
  ) {
    assertEquals(await pathExists(path), true, path);
  }
});
