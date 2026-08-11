import pg from "pg";
import { assertEquals, assertRejects } from "@std/assert";
import manifestJson from "../fixtures/investor-demo/manifest.json" with {
  type: "json",
};
import type { AuditEventDraft } from "../../src/audit_activity/v1.ts";
import { auditActivityMigrations } from "../../src/audit_activity/v1.ts";
import { deliverablesMigrations } from "../../src/deliverables/migrations/index.ts";
import { diligenceDecisionsMigrations } from "../../src/diligence_decisions/migrations/index.ts";
import { documentsMigrations } from "../../src/documents/migrations/index.ts";
import { evidenceKnowledgeMigrations } from "../../src/evidence_knowledge/migrations/index.ts";
import type { DemoManifest } from "../../src/demo_readiness/contracts.ts";
import { demoReadinessMigrations } from "../../src/demo_readiness/migrations.ts";
import {
  type DemoAuditAppendPort,
  DemoWorkflowPersistence,
} from "../../src/demo_readiness/persistence.ts";
import {
  buildSyntheticInvestorDemo,
  demoScope,
} from "../../src/demo_readiness/runner.ts";
import {
  platformMigrations,
  PostgresMigrationRunner,
  PostgresTransactionRunner,
  type TransactionHandle,
} from "../../src/platform/persistence/v1.ts";
import type { IdempotencyKey } from "../../src/platform/api/v1.ts";
import {
  createPostgresIntegrationTestPool,
  postgresIntegrationTestDatabaseUrl,
} from "../platform/support/postgres.ts";
import {
  createIsolatedPostgresDatabase,
  dropIsolatedPostgresDatabase,
} from "../../scripts/postgres_test_state.ts";

const databaseUrl = postgresIntegrationTestDatabaseUrl();
const fixtureRoot = new URL("../fixtures/investor-demo/", import.meta.url);

class FailingAuditAppender implements DemoAuditAppendPort {
  append(
    _transaction: TransactionHandle,
    _event: AuditEventDraft,
  ): Promise<void> {
    return Promise.reject(new Error("synthetic audit append failure"));
  }
}

Deno.test({
  name: "demo persistence rolls back every context record when audit fails",
  async fn() {
    if (databaseUrl === undefined) {
      throw new Error(
        "Demo audit rollback regression is unverified; expected POSTGRES_INTEGRATION_TEST_DATABASE_URL.",
      );
    }
    const isolatedUrl = await createIsolatedPostgresDatabase(
      databaseUrl,
      "demo_readiness_persistence_audit_rollback",
    );
    const pool = createPostgresIntegrationTestPool(isolatedUrl);
    try {
      await applyMigrations(pool);
      const workflow = await buildSyntheticInvestorDemo(
        manifestJson as DemoManifest,
        fixtureRoot,
        { environment: "test", databaseName: "mai_demo_readiness" },
      );
      const persistence = new DemoWorkflowPersistence(
        new PostgresTransactionRunner(pool),
        new FailingAuditAppender(),
      );

      await assertRejects(
        () =>
          persistence.persist(
            "idem_demo-audit-rollback" as IdempotencyKey,
            workflow,
            receipt(),
          ),
        Error,
        "synthetic audit append failure",
      );
      assertEquals(await retainedRowCount(pool), 0);
    } finally {
      await pool.end();
      await dropIsolatedPostgresDatabase(
        databaseUrl,
        new URL(isolatedUrl).pathname.slice(1),
      );
    }
  },
});

function applyMigrations(pool: pg.Pool): Promise<void> {
  return new PostgresMigrationRunner(pool).apply([
    ...platformMigrations,
    ...auditActivityMigrations,
    ...documentsMigrations,
    ...evidenceKnowledgeMigrations,
    ...diligenceDecisionsMigrations,
    ...deliverablesMigrations,
    ...demoReadinessMigrations,
  ]);
}

async function retainedRowCount(pool: pg.Pool): Promise<number> {
  const result = await pool.query<{ readonly count: string }>(
    `SELECT (
      (SELECT count(*) FROM demo_readiness.workflow_snapshots) +
      (SELECT count(*) FROM documents.documents) +
      (SELECT count(*) FROM evidence_knowledge.evidence_records) +
      (SELECT count(*) FROM diligence_decisions.findings) +
      (SELECT count(*) FROM deliverables.deliverables)
    )::text AS count`,
  );
  return Number(result.rows[0]?.count ?? "0");
}

function receipt(): AuditEventDraft {
  const now = new Date("2026-08-10T12:00:00.000Z");
  const actorId = "actor_demo-banker" as AuditEventDraft["actorId"];
  return {
    eventId: "audit_demo-rollback" as AuditEventDraft["eventId"],
    ...demoScope,
    actorId,
    actorKind: "human",
    origin: "http",
    correlationId: "cor_demo-rollback" as AuditEventDraft["correlationId"],
    aggregateType: "DemoReadinessRun",
    aggregateId: demoScope.dealId,
    aggregateVersion: 1 as AuditEventDraft["aggregateVersion"],
    eventType: "DemoReadinessCompleted",
    schemaVersion: 1,
    authoritySnapshot: {
      snapshotId: "authority_demo-rollback",
      actorId,
      actorKind: "human",
      policyVersion: "test",
      scope: demoScope,
      capturedAt: now,
    },
    evidenceSnapshot: { capturedAt: now, references: [] },
    provenance: { actorId, actorKind: "human", origin: "http" },
    payload: { synthetic: true },
    classifications: { synthetic: "public" },
    contentDigest: "0".repeat(64),
    occurredAt: now,
  };
}
