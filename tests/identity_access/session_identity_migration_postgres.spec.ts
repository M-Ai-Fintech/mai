import { assertEquals, assertRejects } from "@std/assert";
import pg from "pg";
import {
  iamIdentityMigration,
  iamSessionIdentityMigration,
} from "../../src/identity_access/v1.ts";
import {
  platformMigrations,
  PostgresMigrationRunner,
} from "../../src/platform/persistence/v1.ts";
import { postgresIntegrationTestDatabaseUrl } from "../platform/support/postgres.ts";

const databaseUrl = postgresIntegrationTestDatabaseUrl();

Deno.test({
  name: "IAM session identity upgrades the current master schema safely",
  ignore: databaseUrl === undefined,
  async fn() {
    const databaseName = `identity_access_upgrade_${
      crypto.randomUUID().replaceAll("-", "")
    }`;
    const admin = new pg.Pool({ connectionString: databaseUrl });
    const upgradedUrl = new URL(databaseUrl!);
    upgradedUrl.pathname = `/${databaseName}`;
    await admin.query(`CREATE DATABASE "${databaseName}" TEMPLATE template0`);
    const pool = new pg.Pool({ connectionString: upgradedUrl.toString() });
    try {
      const runner = new PostgresMigrationRunner(pool);
      await runner.apply([...platformMigrations, iamIdentityMigration]);
      await insertMasterSession(pool, "session_valid", "identity_valid");
      await insertMasterSession(pool, "session_invalid", undefined);

      await assertRejects(() => runner.apply([iamSessionIdentityMigration]));
      assertEquals(await identityColumnCount(pool), 0);

      await pool.query(
        "UPDATE iam.sessions SET document = document || $1::jsonb WHERE aggregate_id = $2",
        [
          JSON.stringify({ identityId: "identity_repaired" }),
          "session_invalid",
        ],
      );
      await runner.apply([iamSessionIdentityMigration]);
      const result = await pool.query(
        "SELECT aggregate_id, identity_id FROM iam.sessions ORDER BY aggregate_id",
      );
      assertEquals(result.rows, [
        { aggregate_id: "session_invalid", identity_id: "identity_repaired" },
        { aggregate_id: "session_valid", identity_id: "identity_valid" },
      ]);
    } finally {
      await pool.end();
      await admin.query(
        `DROP DATABASE IF EXISTS "${databaseName}" WITH (FORCE)`,
      );
      await admin.end();
    }
  },
});

async function insertMasterSession(
  pool: pg.Pool,
  sessionId: string,
  identityId: string | undefined,
): Promise<void> {
  const document = identityId === undefined ? {} : { identityId };
  await pool.query(
    `INSERT INTO iam.sessions
      (aggregate_id, tenant_id, workspace_id, actor_id, version, state,
       issued_at, expires_at, document, created_at, updated_at)
     VALUES ($1, 'tenant_upgrade', 'workspace_upgrade', 'actor_upgrade', 1,
       'active', NOW(), NOW() + INTERVAL '1 hour', $2::jsonb, NOW(), NOW())`,
    [sessionId, JSON.stringify(document)],
  );
}

async function identityColumnCount(pool: pg.Pool): Promise<number> {
  const result = await pool.query<{ count: number }>(
    `SELECT COUNT(*)::int AS count FROM information_schema.columns
     WHERE table_schema = 'iam' AND table_name = 'sessions'
       AND column_name = 'identity_id'`,
  );
  return result.rows[0].count;
}
