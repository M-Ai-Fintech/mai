import { assertEquals, assertMatch, assertRejects } from "@std/assert";
import pg from "pg";
import { evidenceKnowledgeMigrations } from "../../src/evidence_knowledge/migrations/index.ts";
import { evidenceKnowledgeMigration } from "../../src/evidence_knowledge/migrations/evidence_knowledge_0001.ts";
import { evidenceKnowledgeMigration0002 } from "../../src/evidence_knowledge/migrations/evidence_knowledge_0002.ts";
import { evidenceKnowledgeMigration0003 } from "../../src/evidence_knowledge/migrations/evidence_knowledge_0003.ts";
import { evidenceKnowledgeMigration0004 } from "../../src/evidence_knowledge/migrations/evidence_knowledge_0004.ts";
import {
  platformMigrations,
  PostgresMigrationRunner,
} from "../../src/platform/persistence/v1.ts";
import { auditActivityMigrations } from "../../src/audit_activity/migrations/index.ts";
import {
  createMai106Pool,
  mai106DatabaseUrl,
} from "../platform/support/postgres.ts";

const databaseUrl = Deno.env.get("EVIDENCE_KNOWLEDGE_DATABASE_URL") ??
  mai106DatabaseUrl();

Deno.test("Evidence Knowledge migration owns additive append-only stream", () => {
  assertEquals(evidenceKnowledgeMigrations.length, 4);
  const [migration1, migration2, migration3, migration4] =
    evidenceKnowledgeMigrations;
  assertEquals(migration1.owner, "evidence_knowledge");
  assertEquals(migration1.schema, "evidence_knowledge");
  assertEquals(migration1.id, "evidence_knowledge-0001");
  assertMatch(migration1.forwardNotes, /additive/i);
  assertMatch(migration1.rollbackNotes, /retain/i);

  assertEquals(migration2.owner, "evidence_knowledge");
  assertEquals(migration2.schema, "evidence_knowledge");
  assertEquals(migration2.id, "evidence_knowledge-0002");

  assertEquals(migration3.owner, "evidence_knowledge");
  assertEquals(migration3.schema, "evidence_knowledge");
  assertEquals(migration3.id, "evidence_knowledge-0003");
  assertMatch(migration3.forwardNotes, /corrective/i);
  assertMatch(migration3.rollbackNotes, /retain/i);
  for (const statement of migration3.statements) {
    assertEquals(statement.schema, "evidence_knowledge");
    assertEquals(/\b(?:documents|platform)\./i.test(statement.sql), false);
  }

  assertEquals(migration4.owner, "evidence_knowledge");
  assertEquals(migration4.schema, "evidence_knowledge");
  assertEquals(migration4.id, "evidence_knowledge-0004");
  assertMatch(migration4.forwardNotes, /corrective/i);
  assertMatch(migration4.rollbackNotes, /retain/i);
  for (const statement of migration4.statements) {
    assertEquals(statement.schema, "evidence_knowledge");
    assertEquals(/\b(?:documents|platform)\./i.test(statement.sql), false);
  }
});

Deno.test({
  name:
    "evidence_knowledge-0003 migration valid backfill when row status is proposed but history says approved",
  ignore: databaseUrl === undefined,
  async fn() {
    const pool = createMai106Pool(databaseUrl!);
    await resetSchema(pool);

    const runner = new PostgresMigrationRunner(pool);
    await runner.apply([
      ...platformMigrations,
      ...auditActivityMigrations,
      evidenceKnowledgeMigration,
      evidenceKnowledgeMigration0002,
    ]);

    const tenant = "t_mig1";
    const workspace = "w_mig1";
    const deal = "d_mig1";
    const factId = "fact_mig1";
    const v1Id = "v1_mig1";
    const now = new Date().toISOString();

    await pool.query(
      `INSERT INTO evidence_knowledge.facts (fact_id, tenant_id, workspace_id, deal_id, category, status, aggregate_version, created_at, current_fact_version_id)
       VALUES ($1, $2, $3, $4, 'financial', 'approved', 2, $5, NULL)`,
      [factId, tenant, workspace, deal, now],
    );

    await pool.query(
      `INSERT INTO evidence_knowledge.fact_versions (fact_version_id, fact_id, tenant_id, workspace_id, deal_id, statement, category, status, version_number, citation_ids, created_at)
       VALUES ($1, $2, $3, $4, $5, 'statement 1', 'financial', 'proposed', 1, '[]', $6)`,
      [v1Id, factId, tenant, workspace, deal, now],
    );

    await pool.query(
      `INSERT INTO evidence_knowledge.fact_transition_history (history_id, tenant_id, workspace_id, deal_id, fact_id, fact_version_id, from_status, to_status, command_key, created_at)
       VALUES ('h1', $1, $2, $3, $4, $5, 'proposed', 'approved', 'cmd1', $6)`,
      [tenant, workspace, deal, factId, v1Id, now],
    );

    await runner.apply([evidenceKnowledgeMigration0003]);

    const factRes = await pool.query<{ current_fact_version_id: string }>(
      `SELECT current_fact_version_id FROM evidence_knowledge.facts WHERE fact_id=$1`,
      [factId],
    );
    assertEquals(factRes.rows[0].current_fact_version_id, v1Id);

    await resetSchema(pool);
    await pool.end();
  },
});

Deno.test({
  name:
    "evidence_knowledge migration sequence 0001..0003 -> 0004 retains 0003 checksum, repairs superseded pointer, and retains valid pointer",
  ignore: databaseUrl === undefined,
  async fn() {
    const pool = createMai106Pool(databaseUrl!);
    await resetSchema(pool);

    const runner = new PostgresMigrationRunner(pool);
    await runner.apply([
      ...platformMigrations,
      ...auditActivityMigrations,
      evidenceKnowledgeMigration,
      evidenceKnowledgeMigration0002,
      evidenceKnowledgeMigration0003,
    ]);

    const ledgerResBefore = await pool.query<{ checksum: string }>(
      `SELECT checksum FROM platform.migration_ledger WHERE context_owner='evidence_knowledge' AND migration_id='evidence_knowledge-0003'`,
    );
    const checksum0003Before = ledgerResBefore.rows[0].checksum;

    const tenant = "t_seq";
    const workspace = "w_seq";
    const deal = "d_seq";
    const factSupId = "fact_sup";
    const factValidId = "fact_val";
    const v1Id = "v1_seq";
    const v2Id = "v2_seq";
    const vValId = "v_val_seq";
    const now = new Date().toISOString();

    await pool.query(
      `INSERT INTO evidence_knowledge.facts (fact_id, tenant_id, workspace_id, deal_id, category, status, aggregate_version, created_at, current_fact_version_id)
       VALUES ($1, $2, $3, $4, 'financial', 'proposed', 3, $5, NULL),
              ($6, $2, $3, $4, 'financial', 'proposed', 2, $5, NULL)`,
      [factSupId, tenant, workspace, deal, now, factValidId],
    );

    await pool.query(
      `INSERT INTO evidence_knowledge.fact_versions (fact_version_id, fact_id, tenant_id, workspace_id, deal_id, statement, category, status, version_number, citation_ids, created_at)
       VALUES ($1, $2, $3, $4, $5, 'statement 1', 'financial', 'proposed', 1, '[]', $6),
              ($7, $2, $3, $4, $5, 'statement 2', 'financial', 'proposed', 2, '[]', $6),
              ($8, $9, $3, $4, $5, 'statement valid', 'financial', 'proposed', 1, '[]', $6)`,
      [
        v1Id,
        factSupId,
        tenant,
        workspace,
        deal,
        now,
        v2Id,
        vValId,
        factValidId,
      ],
    );

    await pool.query(
      `INSERT INTO evidence_knowledge.fact_transition_history (history_id, tenant_id, workspace_id, deal_id, fact_id, fact_version_id, from_status, to_status, command_key, created_at)
       VALUES ('h1', $1, $2, $3, $4, $5, 'proposed', 'approved', 'cmd1', $7),
              ('h2', $1, $2, $3, $4, $6, 'proposed', 'approved', 'cmd2', $7),
              ('h3', $1, $2, $3, $4, $5, 'approved', 'superseded', 'cmd3', $7),
              ('h4', $1, $2, $3, $8, $9, 'proposed', 'approved', 'cmd4', $7)`,
      [
        tenant,
        workspace,
        deal,
        factSupId,
        v1Id,
        v2Id,
        now,
        factValidId,
        vValId,
      ],
    );

    await pool.query(
      `UPDATE evidence_knowledge.facts SET status='approved', current_fact_version_id=$2 WHERE fact_id=$1`,
      [factSupId, v1Id],
    );
    await pool.query(
      `UPDATE evidence_knowledge.facts SET status='approved', current_fact_version_id=$2 WHERE fact_id=$1`,
      [factValidId, vValId],
    );

    await runner.apply([evidenceKnowledgeMigration0004]);

    const ledgerResAfter = await pool.query<{ checksum: string }>(
      `SELECT checksum FROM platform.migration_ledger WHERE context_owner='evidence_knowledge' AND migration_id='evidence_knowledge-0003'`,
    );
    const checksum0003After = ledgerResAfter.rows[0].checksum;
    assertEquals(checksum0003Before, checksum0003After);

    const factSupRes = await pool.query<{ current_fact_version_id: string }>(
      `SELECT current_fact_version_id FROM evidence_knowledge.facts WHERE fact_id=$1`,
      [factSupId],
    );
    assertEquals(factSupRes.rows[0].current_fact_version_id, v2Id);

    const factValRes = await pool.query<{ current_fact_version_id: string }>(
      `SELECT current_fact_version_id FROM evidence_knowledge.facts WHERE fact_id=$1`,
      [factValidId],
    );
    assertEquals(factValRes.rows[0].current_fact_version_id, vValId);

    await resetSchema(pool);
    await pool.end();
  },
});

Deno.test({
  name: "evidence_knowledge-0004 migration rejects ambiguous state",
  ignore: databaseUrl === undefined,
  async fn() {
    const pool = createMai106Pool(databaseUrl!);
    await resetSchema(pool);

    const runner = new PostgresMigrationRunner(pool);
    await runner.apply([
      ...platformMigrations,
      ...auditActivityMigrations,
      evidenceKnowledgeMigration,
      evidenceKnowledgeMigration0002,
      evidenceKnowledgeMigration0003,
    ]);

    const tenant = "t_mig3";
    const workspace = "w_mig3";
    const deal = "d_mig3";
    const factId = "fact_mig3";
    const v1Id = "v1_mig3";
    const v2Id = "v2_mig3";
    const v3Id = "v3_mig3";
    const now = new Date().toISOString();

    await pool.query(
      `INSERT INTO evidence_knowledge.facts (fact_id, tenant_id, workspace_id, deal_id, category, status, aggregate_version, created_at, current_fact_version_id)
       VALUES ($1, $2, $3, $4, 'financial', 'proposed', 3, $5, NULL)`,
      [factId, tenant, workspace, deal, now],
    );

    await pool.query(
      `INSERT INTO evidence_knowledge.fact_versions (fact_version_id, fact_id, tenant_id, workspace_id, deal_id, statement, category, status, version_number, citation_ids, created_at)
       VALUES ($1, $2, $3, $4, $5, 'statement 1', 'financial', 'proposed', 1, '[]', $6),
              ($7, $2, $3, $4, $5, 'statement 2', 'financial', 'proposed', 2, '[]', $6),
              ($8, $2, $3, $4, $5, 'statement 3', 'financial', 'proposed', 3, '[]', $6)`,
      [v1Id, factId, tenant, workspace, deal, now, v2Id, v3Id],
    );

    await pool.query(
      `INSERT INTO evidence_knowledge.fact_transition_history (history_id, tenant_id, workspace_id, deal_id, fact_id, fact_version_id, from_status, to_status, command_key, created_at)
       VALUES ('h1', $1, $2, $3, $4, $5, 'proposed', 'approved', 'cmd1', $7),
              ('h2', $1, $2, $3, $4, $6, 'proposed', 'approved', 'cmd2', $7)`,
      [tenant, workspace, deal, factId, v1Id, v2Id, now],
    );

    await pool.query(
      `UPDATE evidence_knowledge.facts SET status='approved', current_fact_version_id=$2 WHERE fact_id=$1`,
      [factId, v3Id],
    );

    await assertRejects(
      () => runner.apply([evidenceKnowledgeMigration0004]),
      Error,
      "independently eligible approved versions",
    );

    await resetSchema(pool);
    await pool.end();
  },
});

Deno.test({
  name: "evidence_knowledge-0004 migration rejects missing state",
  ignore: databaseUrl === undefined,
  async fn() {
    const pool = createMai106Pool(databaseUrl!);
    await resetSchema(pool);

    const runner = new PostgresMigrationRunner(pool);
    await runner.apply([
      ...platformMigrations,
      ...auditActivityMigrations,
      evidenceKnowledgeMigration,
      evidenceKnowledgeMigration0002,
      evidenceKnowledgeMigration0003,
    ]);

    const tenant = "t_mig4";
    const workspace = "w_mig4";
    const deal = "d_mig4";
    const factId = "fact_mig4";
    const v1Id = "v1_mig4";
    const now = new Date().toISOString();

    await pool.query(
      `INSERT INTO evidence_knowledge.facts (fact_id, tenant_id, workspace_id, deal_id, category, status, aggregate_version, created_at, current_fact_version_id)
       VALUES ($1, $2, $3, $4, 'financial', 'proposed', 1, $5, NULL)`,
      [factId, tenant, workspace, deal, now],
    );

    await pool.query(
      `INSERT INTO evidence_knowledge.fact_versions (fact_version_id, fact_id, tenant_id, workspace_id, deal_id, statement, category, status, version_number, citation_ids, created_at)
       VALUES ($1, $2, $3, $4, $5, 'statement 1', 'financial', 'proposed', 1, '[]', $6)`,
      [v1Id, factId, tenant, workspace, deal, now],
    );

    await pool.query(
      `UPDATE evidence_knowledge.facts SET status='approved', current_fact_version_id=$2 WHERE fact_id=$1`,
      [factId, v1Id],
    );

    await assertRejects(
      () => runner.apply([evidenceKnowledgeMigration0004]),
      Error,
      "no effective approved version",
    );

    await resetSchema(pool);
    await pool.end();
  },
});

Deno.test({
  name:
    "evidence_knowledge-0004 constraint trigger rejects invalid pointers and permits valid pointers",
  ignore: databaseUrl === undefined,
  async fn() {
    const pool = createMai106Pool(databaseUrl!);
    await resetSchema(pool);

    const runner = new PostgresMigrationRunner(pool);
    await runner.apply([
      ...platformMigrations,
      ...auditActivityMigrations,
      ...evidenceKnowledgeMigrations,
    ]);

    const tenant = "t_trig";
    const workspace = "w_trig";
    const deal = "d_trig";
    const factId = "fact_trig";
    const fact2Id = "fact_trig2";
    const v1Id = "v1_trig";
    const v2Id = "v2_trig";
    const now = new Date().toISOString();

    await pool.query(
      `INSERT INTO evidence_knowledge.facts (fact_id, tenant_id, workspace_id, deal_id, category, status, aggregate_version, created_at, current_fact_version_id)
       VALUES ($1, $2, $3, $4, 'financial', 'proposed', 1, $5, NULL),
              ($6, $2, $3, $4, 'financial', 'proposed', 1, $5, NULL)`,
      [factId, tenant, workspace, deal, now, fact2Id],
    );

    await pool.query(
      `INSERT INTO evidence_knowledge.fact_versions (fact_version_id, fact_id, tenant_id, workspace_id, deal_id, statement, category, status, version_number, citation_ids, created_at)
       VALUES ($1, $2, $3, $4, $5, 'statement 1', 'financial', 'proposed', 1, '[]', $6),
              ($7, $8, $3, $4, $5, 'statement 2', 'financial', 'proposed', 1, '[]', $6)`,
      [v1Id, factId, tenant, workspace, deal, now, v2Id, fact2Id],
    );

    // 1. Reject approved fact with null pointer (check constraint)
    await assertRejects(
      () =>
        pool.query(
          `UPDATE evidence_knowledge.facts SET status='approved', current_fact_version_id=NULL WHERE fact_id=$1`,
          [factId],
        ),
      Error,
      "check_facts_approved_has_current_version",
    );

    // 2. Reject approved fact pointing to version owned by another fact (foreign key constraint)
    await assertRejects(
      () =>
        pool.query(
          `UPDATE evidence_knowledge.facts SET status='approved', current_fact_version_id=$2 WHERE fact_id=$1`,
          [factId, v2Id],
        ),
      Error,
      "fk_facts_current_fact_version",
    );

    // 3. Reject approved fact pointing to version that is not effectively approved (trigger check)
    await assertRejects(
      () =>
        pool.query(
          `UPDATE evidence_knowledge.facts SET status='approved', current_fact_version_id=$2 WHERE fact_id=$1`,
          [factId, v1Id],
        ),
      Error,
      "not effectively approved",
    );

    // 4. Transition v1 to approved in history, then set current pointer -> succeeds!
    await pool.query(
      `INSERT INTO evidence_knowledge.fact_transition_history (history_id, tenant_id, workspace_id, deal_id, fact_id, fact_version_id, from_status, to_status, command_key, created_at)
       VALUES ('h_trig1', $1, $2, $3, $4, $5, 'proposed', 'approved', 'cmd_trig1', $6)`,
      [tenant, workspace, deal, factId, v1Id, now],
    );

    await pool.query(
      `UPDATE evidence_knowledge.facts SET status='approved', current_fact_version_id=$2 WHERE fact_id=$1`,
      [factId, v1Id],
    );

    const factRes = await pool.query<{ current_fact_version_id: string }>(
      `SELECT current_fact_version_id FROM evidence_knowledge.facts WHERE fact_id=$1`,
      [factId],
    );
    assertEquals(factRes.rows[0].current_fact_version_id, v1Id);

    await resetSchema(pool);
    await pool.end();
  },
});

async function resetSchema(pool: pg.Pool): Promise<void> {
  await pool.query("DROP SCHEMA IF EXISTS evidence_knowledge CASCADE");
  await pool.query("DROP SCHEMA IF EXISTS audit_activity CASCADE");
  await pool.query(
    "DELETE FROM platform.migration_ledger WHERE context_owner IN ($1, $2)",
    ["evidence_knowledge", "audit_activity"],
  ).catch(() => {});
}
