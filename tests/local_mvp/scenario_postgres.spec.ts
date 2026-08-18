import pg from "pg";
import { assertEquals } from "@std/assert";
import { createExecutableApiServer } from "../../src/api/server.ts";
import { dealId } from "../../src/deal_management/v1.ts";
import { tenantId, workspaceId } from "../../src/identity_access/v1.ts";
import { demoScope } from "../../src/demo_readiness/runner.ts";
import { localMvpIdentity } from "../../src/local_mvp/identity_seed.ts";
import { seedLocalMvpWorkflow } from "../../src/local_mvp/workflow_seed.ts";
import { seedLocalMvpDatabase } from "../../scripts/local_mvp_seed.ts";
import { PostgresMigrationRunner } from "../../src/platform/persistence/v1.ts";
import {
  registeredMigrationOptions,
  registeredMigrations,
} from "../../src/platform/persistence/registered_migrations.ts";
import {
  createPostgresIntegrationTestPool,
  postgresIntegrationTestDatabaseUrl,
} from "../platform/support/postgres.ts";

const databaseUrl = postgresIntegrationTestDatabaseUrl();

Deno.test({
  name: "local scenario persists, replays, serves v1, and isolates scope",
  sanitizeResources: false,
  sanitizeOps: false,
  async fn() {
    if (databaseUrl === undefined) {
      throw new Error(
        "Local scenario integration is unverified; expected POSTGRES_INTEGRATION_TEST_DATABASE_URL.",
      );
    }
    const pool = createPostgresIntegrationTestPool(databaseUrl);
    await new PostgresMigrationRunner(pool).apply(
      registeredMigrations(),
      registeredMigrationOptions(),
    );
    assertEquals((await seedLocalMvpDatabase(pool)).kind, "created");
    assertEquals((await seedLocalMvpDatabase(pool)).kind, "replayed");
    const activeEnvironment = {
      ...Deno.env.toObject(),
      DATABASE_URL: databaseUrl,
    };
    const router = createExecutableApiServer(activeEnvironment);
    try {
      assertEquals((await seedLocalMvpWorkflow(pool)).kind, "replayed");
      assertEquals(await positiveContextCounts(pool), 14);
      await assertRepresentativeScenarioRows(pool);
      await assertApiReadback(router.handle);
      await assertCrossScopeIsolation(router);
    } finally {
      await pool.end();
      if (router.dealManagement.kind === "configured") {
        await router.dealManagement.composition.close();
      }
    }
  },
});

async function assertRepresentativeScenarioRows(pool: pg.Pool): Promise<void> {
  const result = await pool.query<{ readonly complete: boolean }>(
    representativeScenarioQuery,
  );
  assertEquals(result.rows[0]?.complete, true);
}

async function positiveContextCounts(pool: pg.Pool): Promise<number> {
  const result = await pool.query<Record<string, string>>(contextCountQuery);
  const counts = Object.values(result.rows[0] ?? {}).map(Number);
  assertEquals(counts.every((count) => count > 0), true);
  return counts.length;
}

async function assertApiReadback(
  handle: (request: Request) => Promise<Response>,
): Promise<void> {
  assertEquals(
    (await handle(apiRequest("workspace-shell", false))).status,
    401,
  );
  const shell = await handle(apiRequest("workspace-shell"));
  assertEquals(shell.status, 200);
  assertEquals((await shell.json()).data, {
    organization: {
      id: localMvpIdentity.institutionId,
      name: "Atlas M&A Advisory",
    },
    workspace: {
      id: localMvpIdentity.workspaceId,
      name: "Atlas M&A Advisory",
    },
    principal: {
      actorId: localMvpIdentity.actorId,
      identityId: localMvpIdentity.identityId,
      tenantId: localMvpIdentity.tenantId,
    },
    permissions: ["workspace", "deal"],
    counts: {},
  });
  assertEquals(
    (await handle(apiRequest(`deals/${demoScope.dealId}`))).status,
    200,
  );
  assertEquals((await handle(apiRequest("deals/deal_missing"))).status, 404);
}

async function assertCrossScopeIsolation(
  router: ReturnType<typeof createExecutableApiServer>,
): Promise<void> {
  if (router.dealManagement.kind !== "configured") {
    throw new Error(
      "Executable Deal composition is unavailable in local profile.",
    );
  }
  const absent = await router.dealManagement.composition.repository.find({
    tenantId: tenantId("tenant_other"),
    workspaceId: workspaceId("workspace_other"),
  }, dealId(demoScope.dealId));
  assertEquals(absent, undefined);
}

function apiRequest(path: string, authenticated = true): Request {
  const headers = new Headers({ "X-Correlation-Id": "cor_local-scenario" });
  if (authenticated) {
    headers.set("Authorization", `Bearer ${localMvpIdentity.sessionId}`);
  }
  return new Request(`http://localhost/api/v1/${path}`, { headers });
}

const contextCountQuery = `SELECT
  (SELECT count(*)::text FROM organization_registry.organizations) AS organizations,
  (SELECT count(*)::text FROM work_management.workstreams_current) AS workstreams,
  (SELECT count(*)::text FROM notifications.projections) AS notifications,
  (SELECT count(*)::text FROM valuation.models) AS valuations,
  (SELECT count(*)::text FROM financial_risk.results) AS risks,
  (SELECT count(*)::text FROM matching.runs) AS matches,
  (SELECT count(*)::text FROM negotiation.rounds) AS negotiations,
  (SELECT count(*)::text FROM closing.workspaces) AS closings,
  (SELECT count(*)::text FROM deal_governance.governance_aggregates) AS governance,
  (SELECT count(*)::text FROM agent_runtime.missions) AS missions,
  (SELECT count(*)::text FROM documents.documents) AS documents,
  (SELECT count(*)::text FROM evidence_knowledge.evidence_records) AS evidence,
  (SELECT count(*)::text FROM diligence_decisions.findings) AS diligence,
  (SELECT count(*)::text FROM deliverables.deliverables) AS deliverables`;

const representativeScenarioQuery = `SELECT
  EXISTS (SELECT 1 FROM work_management.workstreams_current
    WHERE document->'taskIds' ? 'task_validate-tax-evidence')
  AND EXISTS (SELECT 1 FROM work_management.tasks_current
    WHERE document->>'workstreamId' = 'workstream_diligence')
  AND EXISTS (SELECT 1 FROM valuation.scenarios)
  AND EXISTS (SELECT 1 FROM valuation.inputs)
  AND EXISTS (SELECT 1 FROM valuation.results)
  AND EXISTS (SELECT 1 FROM matching.criteria)
  AND EXISTS (SELECT 1 FROM matching.candidate_projections)
  AND EXISTS (SELECT 1 FROM agent_runtime.plan_versions)
  AND EXISTS (SELECT 1 FROM agent_runtime.runs WHERE state = 'queued')
  AND EXISTS (SELECT 1 FROM financial_risk.results
    WHERE state = 'fallback' AND payload->>'readiness' = 'not_claimed')
  AS complete`;
