import pg from "pg";
import { auditActivityMigrations } from "../src/audit_activity/v1.ts";
import { dealManagementMigrations } from "../src/deal_management/v1.ts";
import { deliverablesMigrations } from "../src/deliverables/migrations/index.ts";
import { diligenceDecisionsMigrations } from "../src/diligence_decisions/migrations/index.ts";
import { documentsMigrations } from "../src/documents/migrations/index.ts";
import { evidenceKnowledgeMigrations } from "../src/evidence_knowledge/migrations/index.ts";
import { identityAccessMigrations } from "../src/identity_access/v1.ts";
import {
  platformMigrations,
  PostgresMigrationRunner,
} from "../src/platform/persistence/v1.ts";
import { demoReadinessMigrations } from "../src/demo_readiness/migrations.ts";
import type { DemoResetTarget } from "../src/demo_readiness/contracts.ts";
import { demoScope } from "../src/demo_readiness/runner.ts";
import { assertSafeDemoDatabaseUrl } from "../src/demo_readiness/reset.ts";

export interface DemoPersistedRecordCounts {
  readonly documents: number;
  readonly documentVersions: number;
  readonly processingRuns: number;
  readonly derivedArtifacts: number;
  readonly citations: number;
  readonly evidenceRecords: number;
  readonly calculations: number;
  readonly findings: number;
  readonly decisionRequests: number;
  readonly decisionRecords: number;
  readonly deliverables: number;
  readonly sourceSnapshots: number;
  readonly deliverableVersions: number;
  readonly workflowSnapshots: number;
}

export class GuardedDemoDatabase {
  private readonly guard = "mai-demo-readiness-loopback";

  private constructor(
    readonly pool: pg.Pool,
    private readonly connectionString: string,
    private readonly target: DemoResetTarget,
  ) {}

  static open(
    connectionString: string,
    target: DemoResetTarget,
  ): GuardedDemoDatabase {
    assertSafeDemoDatabaseUrl(connectionString, target);
    const pool = createDemoPool(connectionString);
    assertDemoPoolTarget(pool, connectionString, target);
    return new GuardedDemoDatabase(pool, connectionString, target);
  }

  async verifiedPool(): Promise<pg.Pool> {
    if (this.guard !== "mai-demo-readiness-loopback") {
      throw new Error(
        "Demo database guard is invalid; expected a verified pool.",
      );
    }
    assertSafeDemoDatabaseUrl(this.connectionString, this.target);
    assertDemoPoolTarget(this.pool, this.connectionString, this.target);
    const name = await currentDatabase(this.pool);
    if (name === this.target.databaseName) return this.pool;
    throw new Error(
      `Demo database "${name}" is unsafe; expected "${this.target.databaseName}".`,
    );
  }

  executableEnvironment(): Readonly<Record<string, string>> {
    return {
      DENO_ENV: this.target.environment,
      MAI_DEMO_READINESS_ENABLED: "true",
      DATABASE_URL: this.connectionString,
    };
  }
}

function createDemoPool(connectionString: string): pg.Pool {
  const url = new URL(connectionString);
  return new pg.Pool({
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    host: url.hostname,
    port: Number(url.port),
    database: url.pathname.slice(1),
    ssl: false,
    application_name: "mai-demo-readiness",
    connectionTimeoutMillis: 5_000,
    max: 2,
  });
}

export function assertDemoPoolTarget(
  pool: pg.Pool,
  connectionString: string,
  target: DemoResetTarget,
): void {
  const url = new URL(connectionString);
  const expected = {
    host: url.hostname,
    port: Number(url.port),
    database: target.databaseName,
  };
  const actual = {
    host: pool.options.host,
    port: pool.options.port,
    database: pool.options.database,
  };
  if (
    actual.host === expected.host && actual.port === expected.port &&
    actual.database === expected.database
  ) return;
  throw new Error(
    `Demo pool target "${actual.host}:${actual.port}/${actual.database}" is unsafe; expected "${expected.host}:${expected.port}/${expected.database}".`,
  );
}

export async function prepareDemoDatabase(
  database: GuardedDemoDatabase,
): Promise<void> {
  const pool = await database.verifiedPool();
  await new PostgresMigrationRunner(pool).apply([
    ...platformMigrations,
    ...auditActivityMigrations,
    ...identityAccessMigrations,
    ...dealManagementMigrations,
    ...documentsMigrations,
    ...evidenceKnowledgeMigrations,
    ...diligenceDecisionsMigrations,
    ...deliverablesMigrations,
    ...demoReadinessMigrations,
  ]);
}

export async function resetDemoDatabase(
  database: GuardedDemoDatabase,
): Promise<void> {
  const pool = await database.verifiedPool();
  await pool.query(
    `TRUNCATE audit_activity.redaction_overlays, audit_activity.audit_events,
      demo_readiness.workflow_snapshots,
      deliverables.deliverable_versions, deliverables.source_snapshots,
      deliverables.deliverables,
      diligence_decisions.decision_records,
      diligence_decisions.decision_requests,
      diligence_decisions.findings,
      evidence_knowledge.calculation_inputs,
      evidence_knowledge.calculations,
      evidence_knowledge.evidence_records,
      evidence_knowledge.citations,
      documents.derived_artifacts, documents.processing_runs,
      documents.document_versions, documents.object_references,
      documents.document_sources, documents.documents,
      deal_management.lifecycle_transition_history,
      deal_management.lifecycle_current,
      deal_management.reconciliation_routing_history,
      deal_management.reconciliation_records,
      deal_management.legacy_reference_mappings,
      deal_management.legacy_deal_mappings,
      deal_management.reconciliation_manifest,
      deal_management.command_claims, deal_management.command_receipts,
      deal_management.aggregate_history, deal_management.deals,
      platform.outbox, platform.idempotency_records,
      access.restrictions, access.permission_grants, access.role_policies,
      iam.sessions, iam.memberships, iam.user_identities CASCADE`,
  );
}

export async function seedDemoIdentity(
  database: GuardedDemoDatabase,
  now: string,
): Promise<void> {
  const pool = await database.verifiedPool();
  const expiry = "2099-08-10T12:00:00.000Z";
  await pool.query(
    `INSERT INTO iam.user_identities
      (aggregate_id, tenant_id, version, state, provider_subject, document, created_at, updated_at)
     VALUES ('identity_demo-banker', $1, 1, 'active', 'synthetic-demo-banker',
       '{"id":"identity_demo-banker"}', $2, $2)`,
    [demoScope.tenantId, now],
  );
  await pool.query(
    `INSERT INTO iam.memberships
      (aggregate_id, tenant_id, workspace_id, version, state, document, created_at, updated_at)
     VALUES ('membership_demo-banker', $1, $2, 1, 'active', $3, $4, $4)`,
    [
      demoScope.tenantId,
      demoScope.workspaceId,
      JSON.stringify({
        tenantId: demoScope.tenantId,
        workspaceId: demoScope.workspaceId,
        identityId: "identity_demo-banker",
        rolePolicyIds: ["role_demo-banker"],
      }),
      now,
    ],
  );
  await seedDemoSession(pool, now, expiry);
  await seedDemoRole(pool, now);
}

async function seedDemoSession(
  pool: pg.Pool,
  now: string,
  expiry: string,
): Promise<void> {
  const document = {
    sessionId: "session_investor-demo",
    tenantId: demoScope.tenantId,
    workspaceId: demoScope.workspaceId,
    identityId: "identity_demo-banker",
    state: "active",
    expiresAt: expiry,
    actor: { id: "actor_demo-banker", kind: "human", state: "active" },
  };
  await pool.query(
    `INSERT INTO iam.sessions
      (aggregate_id, tenant_id, workspace_id, actor_id, identity_id, version,
       state, issued_at, expires_at, document, created_at, updated_at)
     VALUES ('session_investor-demo', $1, $2, 'actor_demo-banker',
       'identity_demo-banker', 1, 'active', $3, $4, $5, $3, $3)`,
    [
      demoScope.tenantId,
      demoScope.workspaceId,
      now,
      expiry,
      JSON.stringify(document),
    ],
  );
}

async function seedDemoRole(pool: pg.Pool, now: string): Promise<void> {
  const document = {
    id: "role_demo-banker",
    tenantId: demoScope.tenantId,
    workspaceId: demoScope.workspaceId,
    state: "active",
    resourceKinds: ["deal", "demo_readiness", "document", "evidence"],
    actions: ["create", "execute", "read", "upload", "sync", "process"],
    fields: [
      "deal",
      "parties",
      "roles",
      "mandate_ceiling",
      "authority_constraints",
    ],
  };
  await pool.query(
    `INSERT INTO access.role_policies
      (aggregate_id, tenant_id, workspace_id, version, state, document, created_at, updated_at)
     VALUES ('role_demo-banker', $1, $2, 1, 'active', $3, $4, $4)`,
    [demoScope.tenantId, demoScope.workspaceId, JSON.stringify(document), now],
  );
}

export async function receiptCount(pool: pg.Pool): Promise<number> {
  const result = await pool.query<{ readonly count: string }>(
    `SELECT count(*)::text AS count FROM audit_activity.audit_events
     WHERE event_type='DemoReadinessCompleted'`,
  );
  return Number(result.rows[0]?.count ?? "0");
}

export async function receiptCorrelationIds(
  pool: pg.Pool,
): Promise<readonly string[]> {
  const result = await pool.query<{ readonly correlationId: string }>(
    `SELECT correlation_id AS "correlationId"
     FROM audit_activity.audit_events
     WHERE event_type='DemoReadinessCompleted'
     ORDER BY event_id`,
  );
  return result.rows.map((row) => row.correlationId);
}

export async function receiptEventIds(
  pool: pg.Pool,
): Promise<readonly string[]> {
  const result = await pool.query<{ readonly eventId: string }>(
    `SELECT event_id AS "eventId"
     FROM audit_activity.audit_events
     WHERE event_type='DemoReadinessCompleted'
     ORDER BY event_id`,
  );
  return result.rows.map((row) => row.eventId);
}

export async function persistedRecordCounts(
  pool: pg.Pool,
): Promise<DemoPersistedRecordCounts> {
  const tables = [
    ["documents", "documents.documents"],
    ["documentVersions", "documents.document_versions"],
    ["processingRuns", "documents.processing_runs"],
    ["derivedArtifacts", "documents.derived_artifacts"],
    ["citations", "evidence_knowledge.citations"],
    ["evidenceRecords", "evidence_knowledge.evidence_records"],
    ["calculations", "evidence_knowledge.calculations"],
    ["findings", "diligence_decisions.findings"],
    ["decisionRequests", "diligence_decisions.decision_requests"],
    ["decisionRecords", "diligence_decisions.decision_records"],
    ["deliverables", "deliverables.deliverables"],
    ["sourceSnapshots", "deliverables.source_snapshots"],
    ["deliverableVersions", "deliverables.deliverable_versions"],
    ["workflowSnapshots", "demo_readiness.workflow_snapshots"],
  ] as const;
  const counts = await Promise.all(tables.map(async ([name, table]) => {
    const result = await pool.query<{ readonly count: string }>(
      `SELECT count(*)::text AS count FROM ${table}`,
    );
    return [name, Number(result.rows[0]?.count ?? "0")] as const;
  }));
  return Object.fromEntries(counts) as unknown as DemoPersistedRecordCounts;
}

function currentDatabase(pool: pg.Pool): Promise<string> {
  return pool.query<{ readonly name: string }>(
    `SELECT current_database() AS name`,
  ).then((result) => result.rows[0]?.name ?? "unknown");
}
