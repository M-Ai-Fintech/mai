import { assert, assertEquals, assertStringIncludes } from "@std/assert";

interface DenoConfiguration {
  tasks?: Record<string, string>;
}

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

Deno.test("obsolete banker CLI entry point and dispatcher are absent", async () => {
  for (const path of ["src/main.ts", "src/cli"]) {
    assertEquals(await pathExists(path), false, path);
  }
});

Deno.test("product command registrations and CLI-only dependencies are absent", async () => {
  const manifest = await Deno.readTextFile("deno.json");
  const config = await configuration();
  assertEquals(config.tasks?.start, undefined);
  assert(!manifest.includes("@cliffy/"));
  for (const command of Object.values(config.tasks ?? {})) {
    assert(!command.includes("src/main.ts"));
    assert(!command.includes("src/cli/"));
  }
});

Deno.test("operator, migration, recovery, and developer boundaries remain explicit", async () => {
  const tasks = (await configuration()).tasks ?? {};
  assertStringIncludes(tasks["infra:smoke"] ?? "", "scripts/infra_smoke.ts");
  assertStringIncludes(tasks["db:migrate"] ?? "", "scripts/migrate.ts");
  assertStringIncludes(
    tasks["infra:backup"] ?? "",
    "scripts/infra_recovery.ts backup",
  );
  assertStringIncludes(tasks["verify:fast"] ?? "", "scripts/verify_fast.ts");
  assertStringIncludes(tasks["verify:fast"] ?? "", "--cached-only --frozen");
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
