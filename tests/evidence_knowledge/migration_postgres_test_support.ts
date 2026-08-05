import pg from "pg";
import { auditActivityMigrations } from "../../src/audit_activity/migrations/index.ts";
import { evidenceKnowledgeMigration } from "../../src/evidence_knowledge/migrations/evidence_knowledge_0001.ts";
import { evidenceKnowledgeMigration0002 } from "../../src/evidence_knowledge/migrations/evidence_knowledge_0002.ts";
import { evidenceKnowledgeMigration0003 } from "../../src/evidence_knowledge/migrations/evidence_knowledge_0003.ts";
import { evidenceKnowledgeMigration0004 } from "../../src/evidence_knowledge/migrations/evidence_knowledge_0004.ts";
import {
  platformMigrations,
  PostgresMigrationRunner,
} from "../../src/platform/persistence/v1.ts";
import {
  createMai106Pool,
  mai106DatabaseUrl,
} from "../platform/support/postgres.ts";

export const databaseUrl =
  Deno.env.get("EVIDENCE_KNOWLEDGE_DATABASE_URL") ?? mai106DatabaseUrl();

const evidenceMigrations = [
  evidenceKnowledgeMigration,
  evidenceKnowledgeMigration0002,
  evidenceKnowledgeMigration0003,
  evidenceKnowledgeMigration0004,
] as const;

export interface MigrationScope {
  readonly tenant: string;
  readonly workspace: string;
  readonly deal: string;
}

export async function openMigratedPool(
  throughVersion: 1 | 2 | 3 | 4,
): Promise<pg.Pool> {
  const pool = createMai106Pool(databaseUrl!);
  await resetSchema(pool);
  await new PostgresMigrationRunner(pool).apply([
    ...platformMigrations,
    ...auditActivityMigrations,
    ...evidenceMigrations.slice(0, throughVersion),
  ]);
  return pool;
}

export async function applyEvidenceMigration(
  pool: pg.Pool,
  version: 3 | 4,
): Promise<void> {
  await new PostgresMigrationRunner(pool).apply([
    evidenceMigrations[version - 1],
  ]);
}

export async function resetSchema(pool: pg.Pool): Promise<void> {
  await pool.query("DROP SCHEMA IF EXISTS evidence_knowledge CASCADE");
  await pool.query("DROP SCHEMA IF EXISTS audit_activity CASCADE");
  await pool.query(
    "DELETE FROM platform.migration_ledger WHERE context_owner IN ($1, $2)",
    ["evidence_knowledge", "audit_activity"],
  ).catch(() => {});
}

export async function closePool(pool: pg.Pool): Promise<void> {
  await resetSchema(pool);
  await pool.end();
}

export async function insertFact(
  pool: pg.Pool,
  input: {
    readonly scope: MigrationScope;
    readonly factId: string;
    readonly status?: "proposed" | "approved" | "superseded";
    readonly aggregateVersion?: number;
    readonly currentFactVersionId?: string | null;
  },
): Promise<void> {
  await pool.query(
    `INSERT INTO evidence_knowledge.facts
      (fact_id, tenant_id, workspace_id, deal_id, category, status,
       aggregate_version, created_at, current_fact_version_id)
     VALUES ($1, $2, $3, $4, 'financial', $5, $6, $7, $8)`,
    [
      input.factId,
      input.scope.tenant,
      input.scope.workspace,
      input.scope.deal,
      input.status ?? "proposed",
      input.aggregateVersion ?? 1,
      new Date().toISOString(),
      input.currentFactVersionId ?? null,
    ],
  );
}

export async function insertVersion(
  pool: pg.Pool,
  input: {
    readonly scope: MigrationScope;
    readonly factId: string;
    readonly factVersionId: string;
    readonly versionNumber: number;
    readonly status?: "proposed" | "approved" | "superseded";
  },
): Promise<void> {
  await pool.query(
    `INSERT INTO evidence_knowledge.fact_versions
      (fact_version_id, fact_id, tenant_id, workspace_id, deal_id, statement,
       category, status, version_number, citation_ids, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, 'financial', $7, $8, '[]', $9)`,
    [
      input.factVersionId,
      input.factId,
      input.scope.tenant,
      input.scope.workspace,
      input.scope.deal,
      `statement ${input.factVersionId}`,
      input.status ?? "proposed",
      input.versionNumber,
      new Date().toISOString(),
    ],
  );
}

export async function insertTransition(
  pool: pg.Pool | pg.PoolClient,
  input: {
    readonly scope: MigrationScope;
    readonly historyId: string;
    readonly factId: string;
    readonly factVersionId: string;
    readonly fromStatus: "proposed" | "approved" | "superseded";
    readonly toStatus: "proposed" | "approved" | "superseded";
    readonly commandKey: string;
  },
): Promise<void> {
  await pool.query(
    `INSERT INTO evidence_knowledge.fact_transition_history
      (history_id, tenant_id, workspace_id, deal_id, fact_id,
       fact_version_id, from_status, to_status, command_key, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
    [
      input.historyId,
      input.scope.tenant,
      input.scope.workspace,
      input.scope.deal,
      input.factId,
      input.factVersionId,
      input.fromStatus,
      input.toStatus,
      input.commandKey,
      new Date().toISOString(),
    ],
  );
}

export async function setFactState(
  pool: pg.Pool | pg.PoolClient,
  factId: string,
  status: "proposed" | "approved" | "superseded",
  currentFactVersionId: string | null,
): Promise<void> {
  await pool.query(
    `UPDATE evidence_knowledge.facts
     SET status=$2, current_fact_version_id=$3
     WHERE fact_id=$1`,
    [factId, status, currentFactVersionId],
  );
}

export async function loadCurrentFactVersionId(
  pool: pg.Pool,
  factId: string,
): Promise<string | null> {
  const result = await pool.query<{ current_fact_version_id: string | null }>(
    `SELECT current_fact_version_id
     FROM evidence_knowledge.facts
     WHERE fact_id=$1`,
    [factId],
  );
  return result.rows[0].current_fact_version_id;
}

export async function loadMigrationChecksum(
  pool: pg.Pool,
  migrationId: string,
): Promise<string> {
  const result = await pool.query<{ checksum: string }>(
    `SELECT checksum
     FROM platform.migration_ledger
     WHERE context_owner='evidence_knowledge' AND migration_id=$1`,
    [migrationId],
  );
  return result.rows[0].checksum;
}
