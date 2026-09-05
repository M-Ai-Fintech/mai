import { assertEquals, assertStringIncludes } from "@std/assert";
import { demoScope } from "../../src/demo_readiness/runner.ts";
import type { LocalMvpSqlPort } from "../../src/local_mvp/identity_seed.ts";
import {
  localMvpDeals,
  resetLocalMvpWorkspaceData,
  seedLocalMvpPortfolio,
} from "../../src/local_mvp/portfolio_seed.ts";

class RecordingPortfolioSql implements LocalMvpSqlPort {
  readonly queries: {
    readonly text: string;
    readonly values: readonly unknown[];
  }[] = [];

  query(text: string, values: readonly unknown[] = []) {
    this.queries.push({ text, values });
    return Promise.resolve({ rowCount: 1 });
  }
}

Deno.test("local MVP reset clears only scoped mutable deal rows", async () => {
  const sql = new RecordingPortfolioSql();
  await resetLocalMvpWorkspaceData(sql);

  assertEquals(sql.queries.length, 1);
  assertStringIncludes(sql.queries[0].text, "deal_management.deals");
  assertEquals(sql.queries[0].values, [
    demoScope.tenantId,
    demoScope.workspaceId,
  ]);
});

Deno.test("local MVP portfolio includes one complete focal mandate", async () => {
  const sql = new RecordingPortfolioSql();
  await seedLocalMvpPortfolio(sql, "2026-08-12T12:00:00.000Z");

  assertEquals(localMvpDeals.length, 3);
  assertEquals(localMvpDeals[0].id, demoScope.dealId);
  assertEquals(sql.queries.length, 3);
  const focal = JSON.parse(String(sql.queries[0].values[4]));
  assertEquals(focal.id, demoScope.dealId);
  assertEquals(focal.parties.length, 2);
  assertEquals(focal.roles.length, 2);
  assertEquals(
    focal.parties.map((party: { reference: { id: string } }) =>
      party.reference.id
    ),
    ["org_serra-azul", "org_atlas-advisory"],
  );
  assertEquals(focal.mandate.authorityCeiling, 8);
  assertEquals(focal.authorityConstraints.length, 1);
  assertEquals(focal.authorityConstraints[0].humanOnly, true);
  assertStringIncludes(String(sql.queries[1].values), "Project Copper");
  assertStringIncludes(String(sql.queries[2].values), "Project Summit");
});
