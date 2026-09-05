import { assert, assertEquals, assertStringIncludes } from "@std/assert";

interface DenoConfiguration {
  tasks?: Record<string, string>;
}

interface GuiConfiguration {
  scripts?: Record<string, string>;
}

interface CodexHookConfiguration {
  hooks?: Record<
    string,
    Array<{
      matcher?: string;
      hooks?: Array<{ command?: string }>;
    }>
  >;
}

type RetainedClass =
  | "PRESERVE_OPERATOR"
  | "PRESERVE_MIGRATION"
  | "PRESERVE_DEVELOPER"
  | "SHARED";

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

const TASK_TARGETS = {
  "api:start": "src/api/server.ts",
  "worker:start": "src/platform/jobs/worker_process.ts",
  test: "deno test",
  "test:infra": "tests/platform/operations/*.spec.ts",
  "infra:validate": "scripts/infra_validate.ts",
  "infra:smoke": "scripts/infra_smoke.ts",
  "infra:bootstrap": "scripts/infra_bootstrap.ts",
  "local:prepare": "scripts/local_env.ts",
  "local:mvp:seed": "scripts/local_mvp_seed.ts",
  "local:mvp:reset": "scripts/local_mvp_seed.ts --reset",
  "local:gui:start": "scripts/local_gui_start.ts",
  "db:migrate": "scripts/migrate.ts",
  "infra:backup": "scripts/infra_recovery.ts backup",
  "infra:restore": "scripts/infra_recovery.ts restore",
  "infra:rollback": "scripts/infra_rollback.ts",
  preflight: "scripts/preflight.ts --json",
  prepare: "scripts/preflight.ts --prepare",
  verify: "scripts/verify.ts",
  "verify:fast": "scripts/verify_fast.ts",
  "verify:fast:benchmark": "scripts/verify_fast_benchmark.ts",
  "verify:integration": "scripts/verify_integration.ts",
  "demo:verify": "scripts/investor_demo.ts",
  "test:smoke": "tests/smoke.spec.ts",
  "db:start": "docker compose up -d postgres-integration-test",
  "db:stop": "docker compose down",
  "db:setup": "src/core/db/setup.ts",
  "gui:start": "npm --prefix gui run dev",
} as const;

const TASK_CLASSIFICATIONS: Readonly<
  Record<RetainedClass, readonly string[]>
> = {
  PRESERVE_OPERATOR: [
    "infra:validate",
    "infra:smoke",
    "infra:bootstrap",
    "db:start",
    "db:stop",
    "local:mvp:seed",
    "local:mvp:reset",
  ],
  PRESERVE_MIGRATION: [
    "db:migrate",
    "infra:backup",
    "infra:restore",
    "infra:rollback",
    "db:setup",
  ],
  PRESERVE_DEVELOPER: [
    "test",
    "test:infra",
    "local:prepare",
    "local:gui:start",
    "preflight",
    "prepare",
    "verify",
    "verify:fast",
    "verify:fast:benchmark",
    "verify:integration",
    "demo:verify",
    "test:smoke",
  ],
  SHARED: ["api:start", "worker:start", "gui:start"],
};

const DIRECT_ENTRYPOINT_CLASSIFICATIONS: Readonly<
  Record<RetainedClass, readonly string[]>
> = {
  PRESERVE_OPERATOR: [
    "scripts/deal_reconciliation.ts",
    "scripts/infra_bootstrap.ts",
    "scripts/infra_smoke.ts",
    "scripts/infra_validate.ts",
    "scripts/investor_demo.ts",
    "scripts/local_mvp_seed.ts",
  ],
  PRESERVE_MIGRATION: [
    "scripts/check_migration_integrity.ts",
    "scripts/infra_recovery.ts",
    "scripts/infra_rollback.ts",
    "scripts/migrate.ts",
    "src/core/db/setup.ts",
  ],
  PRESERVE_DEVELOPER: [
    ".githooks/post-checkout",
    ".githooks/post-commit",
    "gui/scripts/generate-design-tokens.mjs",
    "gui/scripts/verify-components.mjs",
    "gui/scripts/verify-design-tokens.mjs",
    "scripts/check_docs.ts",
    "scripts/check_i18n.ts",
    "scripts/check_linear_policy.ts",
    "scripts/check_repository_standards.ts",
    "scripts/check_resource_naming.ts",
    "scripts/export_reference_model.py",
    "scripts/graphify-merged-rebuild.sh",
    "scripts/install-git-hooks.sh",
    "scripts/local_compose_policy.ts",
    "scripts/local_env.ts",
    "scripts/local_gui_start.ts",
    "scripts/preflight.ts",
    "scripts/run_canonical_deno_tests.ts",
    "scripts/verify.ts",
    "scripts/verify_fast.ts",
    "scripts/verify_fast_benchmark.ts",
    "scripts/verify_integration.ts",
  ],
  SHARED: [
    "src/api/server.ts",
    "src/platform/jobs/worker_process.ts",
  ],
};

const RUNTIME_REGISTRATION_CLASSIFICATIONS: Readonly<
  Record<RetainedClass, readonly string[]>
> = {
  PRESERVE_OPERATOR: [],
  PRESERVE_MIGRATION: [],
  PRESERVE_DEVELOPER: [
    ".codex/hooks.json#PreToolUse:Bash",
    ".codex/hooks.json#PostToolUse:Edit|Write|apply_patch",
    ".codex/hooks.json#Stop:*",
    "gui/package.json#scripts.build",
    "gui/package.json#scripts.lint",
    "gui/package.json#scripts.storybook",
    "gui/package.json#scripts.build-storybook",
    "gui/package.json#scripts.test:unit",
    "gui/package.json#scripts.tokens:generate",
    "gui/package.json#scripts.tokens:check",
    "gui/package.json#scripts.verify:tokens",
    "gui/package.json#scripts.verify:components",
    "gui/package.json#scripts.verify:shell",
    "gui/package.json#scripts.verify:screens",
    "gui/package.json#scripts.verify:deal-screens",
    "gui/package.json#scripts.verify:execution-screens",
    "gui/package.json#scripts.verify:conformance",
    "gui/package.json#scripts.verify:workflows",
    "gui/package.json#scripts.verify:foundation",
    "gui/package.json#scripts.validate:storybook-docs",
    "gui/package.json#scripts.test-storybook",
    "gui/package.json#scripts.test-storybook:update",
  ],
  SHARED: [
    "gui/package.json#scripts.dev",
    "gui/package.json#scripts.start",
  ],
};

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

async function directEntrypoints(directory: string): Promise<string[]> {
  const files: string[] = [];
  for await (const entry of Deno.readDir(directory)) {
    const path = `${directory}/${entry.name}`;
    if (entry.isDirectory) {
      if (entry.name !== "graphify-out") {
        files.push(...await directEntrypoints(path));
      }
      continue;
    }
    const content = await Deno.readTextFile(path);
    if (
      content.startsWith("#!") || content.includes("import.meta.main") ||
      (content.includes("import.meta.url") &&
        content.includes("process.argv[1]"))
    ) {
      files.push(path);
    }
  }
  return files.sort();
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

function classifiedEntries(
  table: Readonly<Record<RetainedClass, readonly string[]>>,
): string[] {
  return (Object.keys(table) as RetainedClass[]).flatMap((classification) =>
    table[classification]
  );
}

function assertUniqueEntries(entries: readonly string[], label: string): void {
  assertEquals(
    new Set(entries).size,
    entries.length,
    `${label} contains duplicate classifications.`,
  );
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
  const classifiedTasks = classifiedEntries(TASK_CLASSIFICATIONS);
  assertUniqueEntries(classifiedTasks, "Task inventory");
  assertEquals(
    [...classifiedTasks].sort(),
    Object.keys(TASK_TARGETS).sort(),
  );
  assertEquals(Object.keys(tasks).sort(), Object.keys(TASK_TARGETS).sort());
  for (const [name, target] of Object.entries(TASK_TARGETS)) {
    const command = requiredTask(tasks, name);
    assertStringIncludes(command, target);
    assert(!command.includes("src/main.ts"));
    assert(!command.includes("src/cli/"));
  }
  for (const name of TASK_CLASSIFICATIONS.PRESERVE_OPERATOR) {
    const command = requiredTask(tasks, name);
    assert(
      command.includes("deno run") || command.includes("docker compose"),
      `${name} must remain an explicit operator command.`,
    );
  }
  for (const name of TASK_CLASSIFICATIONS.PRESERVE_MIGRATION) {
    assertStringIncludes(requiredTask(tasks, name), "deno run");
  }
  for (const name of TASK_CLASSIFICATIONS.SHARED) {
    assert(
      requiredTask(tasks, name).includes(
        TASK_TARGETS[name as keyof typeof TASK_TARGETS],
      ),
      `${name} must retain its approved shared boundary.`,
    );
  }
  const fast = requiredTask(tasks, "verify:fast");
  assertStringIncludes(fast, "--cached-only --frozen");
  assert(!fast.includes("--allow-net"));
  assert(!fast.includes("--allow-write"));
});

Deno.test("direct executable entrypoints are fully classified", async () => {
  const discovered = (await Promise.all([
    directEntrypoints(".githooks"),
    directEntrypoints("gui/scripts"),
    directEntrypoints("scripts"),
    directEntrypoints("src"),
  ])).flat().sort();
  const classified = classifiedEntries(DIRECT_ENTRYPOINT_CLASSIFICATIONS)
    .sort();
  assertUniqueEntries(classified, "Direct entrypoint inventory");
  assertEquals(classified, discovered);
  for (const path of classified) {
    assertEquals(await pathExists(path), true, path);
    const source = await Deno.readTextFile(path);
    assert(!source.includes("src/main.ts"), path);
    assert(!source.includes("src/cli/"), path);
    assert(!source.includes("@cliffy/"), path);
  }
});

Deno.test("runtime registrations are fully classified and non-product", async () => {
  const gui = JSON.parse(
    await Deno.readTextFile("gui/package.json"),
  ) as GuiConfiguration;
  const guiRegistrations = Object.keys(gui.scripts ?? {}).map((name) =>
    `gui/package.json#scripts.${name}`
  );
  const codex = JSON.parse(
    await Deno.readTextFile(".codex/hooks.json"),
  ) as CodexHookConfiguration;
  const codexRegistrations = Object.entries(codex.hooks ?? {}).flatMap(
    ([event, registrations]) =>
      registrations.map(({ matcher }) =>
        `.codex/hooks.json#${event}:${matcher ?? "*"}`
      ),
  );
  const discovered = [...guiRegistrations, ...codexRegistrations].sort();
  const classified = classifiedEntries(RUNTIME_REGISTRATION_CLASSIFICATIONS)
    .sort();
  assertUniqueEntries(classified, "Runtime registration inventory");
  assertEquals(classified.length, 24);
  assertEquals(
    RUNTIME_REGISTRATION_CLASSIFICATIONS.PRESERVE_DEVELOPER.length,
    22,
  );
  assertEquals(RUNTIME_REGISTRATION_CLASSIFICATIONS.SHARED.length, 2);
  assertEquals(classified, discovered);
  assertStringIncludes(gui.scripts?.dev ?? "", "next dev");
  assertStringIncludes(gui.scripts?.start ?? "", "next start");
  for (const [name, command] of Object.entries(gui.scripts ?? {})) {
    assert(!command.includes("src/main.ts"), name);
    assert(!command.includes("src/cli/"), name);
    assert(!command.includes("@cliffy/"), name);
  }
  for (const registrations of Object.values(codex.hooks ?? {})) {
    for (const registration of registrations) {
      for (const hook of registration.hooks ?? []) {
        const command = hook.command ?? "";
        assert(!command.includes("src/main.ts"), command);
        assert(!command.includes("src/cli/"), command);
        assert(!command.includes("@cliffy/"), command);
      }
    }
  }
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
  const reconciliation = await Deno.readTextFile(
    "scripts/deal_reconciliation.ts",
  );
  assertStringIncludes(reconciliation, "APPLY_MAI_110");
  assertStringIncludes(reconciliation, "sanitizeOperatorReport");
  assert(!reconciliation.includes("JSON.stringify(report)"));
  assert(!reconciliation.includes("import(new URL"));
  assertStringIncludes(reconciliation, '"--runtime-module"');
  const reconciliationRuntime = await Deno.readTextFile(
    "scripts/deal_reconciliation_runtime.ts",
  );
  assertStringIncludes(
    reconciliationRuntime,
    "DEAL_MANAGEMENT_OPERATOR_SESSION",
  );
  assertStringIncludes(reconciliationRuntime, "assertOperatorScope");
  assertStringIncludes(
    reconciliationRuntime,
    "assertReconciliationPermission",
  );
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
