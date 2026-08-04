import { assertEquals, assertRejects } from "@std/assert";
import pg from "pg";
import {
  platformMigrations,
  PostgresMigrationRunner,
  PostgresTransactionRunner,
} from "../../src/platform/persistence/v1.ts";
import { evidenceKnowledgeMigrations } from "../../src/evidence_knowledge/migrations/index.ts";
import { PostgresInvalidationReceiptRepository } from "../../src/evidence_knowledge/invalidation_repository.ts";
import type { EvidenceInvalidationEvent } from "../../src/evidence_knowledge/events.ts";
import {
  parseEvidenceId,
  parseInvalidationId,
} from "../../src/evidence_knowledge/ids.ts";
import {
  parseDealId,
  parseTenantId,
  parseWorkspaceId,
} from "../../src/platform/api/v1.ts";
import {
  createMai106Pool,
  mai106DatabaseUrl,
} from "../platform/support/postgres.ts";

const databaseUrl = Deno.env.get("EVIDENCE_KNOWLEDGE_DATABASE_URL") ??
  mai106DatabaseUrl();

Deno.test({
  name: "invalidation receipts reclaim expired workers and fence stale owners",
  ignore: databaseUrl === undefined,
  async fn() {
    const pool = createMai106Pool(databaseUrl!);
    await reset(pool);
    await new PostgresMigrationRunner(pool).apply([
      ...platformMigrations,
      ...evidenceKnowledgeMigrations,
    ]);
    const transactions = new PostgresTransactionRunner(pool);
    const clock = new TestClock();
    const repository = new PostgresInvalidationReceiptRepository(
      transactions,
      clock,
      1_000,
    );
    const event = fixtureEvent();
    const first = await repository.acquire(event);
    if (first.kind !== "acquired") {
      throw new Error("First receipt acquisition failed.");
    }
    assertEquals((await repository.acquire(event)).kind, "busy");
    await assertRejects(
      () => repository.complete(event.eventId, "stale-before-reclaim"),
      Error,
      "stale",
    );
    clock.advance(1_001);
    const reclaimed = await repository.acquire(event);
    if (reclaimed.kind !== "acquired") {
      throw new Error("Expired receipt was not reclaimed.");
    }
    await assertRejects(
      () => repository.complete(event.eventId, first.ownerToken),
      Error,
      "stale",
    );
    await assertRejects(
      () =>
        repository.releaseAfterFailure(event.eventId, first.ownerToken, {
          code: "STALE",
          message: "old worker",
        }),
      Error,
      "stale",
    );
    await repository.complete(event.eventId, reclaimed.ownerToken);
    assertEquals((await repository.acquire(event)).kind, "completed");
    const row = await pool.query<{ attempts: string; state: string }>(
      `SELECT attempt_count::text AS attempts, state FROM evidence_knowledge.invalidation_receipts WHERE event_id=$1`,
      [event.eventId],
    );
    assertEquals(row.rows[0], { attempts: "2", state: "completed" });
    await reset(pool);
    await pool.end();
  },
});

class TestClock {
  private current = new Date("2026-08-04T12:00:00.000Z");
  now(): Date {
    return new Date(this.current);
  }
  advance(milliseconds: number): void {
    this.current = new Date(this.current.getTime() + milliseconds);
  }
}

function fixtureEvent(): EvidenceInvalidationEvent {
  return {
    type: "evidence.source-invalidated",
    eventId: required("invalidation_lease", parseInvalidationId),
    scope: {
      tenantId: required("tenant_acme", parseTenantId),
      workspaceId: required("workspace_dealroom", parseWorkspaceId),
      dealId: required("deal_horizon", parseDealId),
    },
    evidenceId: required("evidence_lease", parseEvidenceId),
    reason: "source changed",
  };
}
function required<T>(
  value: string,
  parser: (value: unknown) => { ok: true; value: T } | { ok: false },
): T {
  const result = parser(value);
  if (result.ok) return result.value;
  throw new Error(`Fixture identifier "${value}" is invalid.`);
}
async function reset(pool: pg.Pool): Promise<void> {
  await pool.query("DROP SCHEMA IF EXISTS evidence_knowledge CASCADE");
  await pool.query(
    "DELETE FROM platform.migration_ledger WHERE context_owner=$1",
    ["evidence_knowledge"],
  ).catch(() => {});
}
