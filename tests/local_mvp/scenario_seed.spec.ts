import { assertEquals, assertStringIncludes } from "@std/assert";
import type { LocalMvpSqlPort } from "../../src/local_mvp/identity_seed.ts";
import {
  localMvpScenarioContexts,
  seedLocalMvpScenario,
} from "../../src/local_mvp/scenario_seed.ts";

class RecordingScenarioDatabase implements LocalMvpSqlPort {
  readonly calls: Array<{
    readonly text: string;
    readonly values: readonly unknown[];
  }> = [];

  query(text: string, values: readonly unknown[] = []) {
    this.calls.push({ text, values });
    return Promise.resolve({ rowCount: text.startsWith("SELECT 1") ? 0 : 1 });
  }
}

Deno.test("local scenario covers every activated banker context", async () => {
  const database = new RecordingScenarioDatabase();
  await seedLocalMvpScenario(database, "2026-08-15T12:00:00.000Z");

  assertEquals(localMvpScenarioContexts.map((context) => context.name), [
    "organization_registry",
    "work_management",
    "notifications",
    "valuation",
    "financial_risk",
    "matching",
    "negotiation",
    "closing",
    "deal_governance",
    "agent_runtime",
  ]);
  assertEquals(database.calls.length, 11);
});

Deno.test("local scenario binds scope, actor, time, and payload consistently", async () => {
  const database = new RecordingScenarioDatabase();
  const now = "2026-08-15T12:00:00.000Z";
  await seedLocalMvpScenario(database, now);

  assertEquals(database.calls[1]?.values.slice(0, 4), [
    "tenant_serra-azul",
    "workspace_investor-demo",
    "deal_serra-azul",
    now,
  ]);
  assertEquals(database.calls[3]?.values.slice(0, 5), [
    "tenant_serra-azul",
    "workspace_investor-demo",
    "deal_serra-azul",
    "actor_demo-banker",
    now,
  ]);
  assertStringIncludes(String(database.calls[5]?.values[5]), "netDebtBrl");
});

Deno.test("local scenario persists coherent context-owned child records", async () => {
  const database = new RecordingScenarioDatabase();
  await seedLocalMvpScenario(database, "2026-08-15T12:00:00.000Z");

  assertStringIncludes(database.calls[2]!.text, "tasks_current");
  assertStringIncludes(String(database.calls[2]!.values[4]), "taskIds");
  assertStringIncludes(String(database.calls[2]!.values[4]), "workstreamId");
  assertStringIncludes(database.calls[4]!.text, "valuation.scenarios");
  assertStringIncludes(database.calls[4]!.text, "valuation.inputs");
  assertStringIncludes(database.calls[4]!.text, "valuation.results");
  assertStringIncludes(database.calls[6]!.text, "matching.criteria");
  assertStringIncludes(database.calls[6]!.text, "candidate_projections");
  assertStringIncludes(database.calls[10]!.text, "agent_runtime.plan_versions");
  assertStringIncludes(database.calls[10]!.text, "agent_runtime.runs");
  assertStringIncludes(database.calls[5]!.text, "'fallback'");
  assertStringIncludes(String(database.calls[5]!.values[5]), "not_claimed");
});

Deno.test("local scenario replay stops at the final transactional marker", async () => {
  const database = new RecordingScenarioDatabase();
  database.query = (text: string, values: readonly unknown[] = []) => {
    database.calls.push({ text, values });
    return Promise.resolve({ rowCount: 1 });
  };

  await seedLocalMvpScenario(database, "2026-08-15T12:00:00.000Z");

  assertEquals(database.calls.length, 1);
  assertStringIncludes(database.calls[0]!.text, "agent_runtime.missions");
});
