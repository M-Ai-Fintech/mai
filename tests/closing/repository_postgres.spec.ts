import { assertEquals } from "@std/assert";
import {
  PostgresClosingEffects,
  PostgresClosingUnitOfWork,
} from "../../src/closing/v1.ts";
import { ClosingService } from "../../src/closing/v1.ts";
import {
  platformMigrations,
  PostgresMigrationRunner,
  PostgresTransactionRunner,
} from "../../src/platform/persistence/v1.ts";
import { closingMigrations } from "../../src/closing/migrations/index.ts";
import {
  createPostgresIntegrationTestPool,
  postgresIntegrationTestDatabaseUrl,
} from "../platform/support/postgres.ts";
import type { ActorReference } from "../../src/platform/authz/v1.ts";
import type {
  DealId,
  IdempotencyKey,
  TenantId,
  WorkspaceId,
} from "../../src/platform/api/v1.ts";

const databaseUrl = postgresIntegrationTestDatabaseUrl();
const scope = {
  tenantId: "tenant_closing-postgres" as TenantId,
  workspaceId: "workspace_closing-postgres" as WorkspaceId,
  dealId: "deal_closing-postgres" as DealId,
};
const actor: ActorReference = {
  id: "actor_closing-postgres" as never,
  kind: "human",
  state: "active",
};

Deno.test({
  name: "PostgreSQL Closing repository persists and replays an exact command",
  ignore: databaseUrl === undefined,
  async fn() {
    const pool = createPostgresIntegrationTestPool(databaseUrl!);
    try {
      await new PostgresMigrationRunner(pool).apply([
        ...platformMigrations,
        ...closingMigrations,
      ]);
      const unitOfWork = new PostgresClosingUnitOfWork(
        new PostgresTransactionRunner(pool),
        { now: () => new Date("2026-08-07T12:00:00.000Z") },
      );
      const service = new ClosingService({
        unitOfWork,
        effects: new PostgresClosingEffects(),
        clock: { now: () => "2026-08-07T12:00:00.000Z" },
      });
      const first = await service.createWorkspace({
        scope,
        closingWorkspaceId: "closing_postgres",
        actor,
        idempotencyKey: "idem_closing-postgres-create" as IdempotencyKey,
      });
      const replay = await service.createWorkspace({
        scope,
        closingWorkspaceId: "closing_postgres",
        actor,
        idempotencyKey: "idem_closing-postgres-create" as IdempotencyKey,
      });
      assertEquals(first.replayed, false);
      assertEquals(replay.replayed, true);
      assertEquals(replay.workspace.history.length, 1);
    } finally {
      await pool.end();
    }
  },
});
