import { assertEquals, assertRejects } from "@std/assert";
import {
  applyEvidenceMigration,
  closePool,
  databaseUrl,
  insertFact,
  insertTransition,
  insertVersion,
  loadCurrentFactVersionId,
  loadMigrationChecksum,
  openMigratedPool,
  setFactState,
  type MigrationScope,
} from "./migration_postgres_test_support.ts";

Deno.test({
  name:
    "evidence_knowledge-0003 backfills an effectively approved proposed row",
  ignore: databaseUrl === undefined,
  async fn() {
    const pool = await openMigratedPool(2);
    try {
      const scope = fixtureScope("backfill");
      await insertFact(pool, {
        scope,
        factId: "fact_backfill",
        status: "approved",
        aggregateVersion: 2,
      });
      await insertVersion(pool, {
        scope,
        factId: "fact_backfill",
        factVersionId: "version_backfill",
        versionNumber: 1,
      });
      await insertTransition(pool, {
        scope,
        historyId: "history_backfill",
        factId: "fact_backfill",
        factVersionId: "version_backfill",
        fromStatus: "proposed",
        toStatus: "approved",
        commandKey: "command_backfill",
      });

      await applyEvidenceMigration(pool, 3);

      assertEquals(
        await loadCurrentFactVersionId(pool, "fact_backfill"),
        "version_backfill",
      );
    } finally {
      await closePool(pool);
    }
  },
});

Deno.test({
  name:
    "evidence_knowledge-0004 preserves the 0003 checksum and repairs only an invalid pointer",
  ignore: databaseUrl === undefined,
  async fn() {
    const pool = await openMigratedPool(3);
    try {
      const scope = fixtureScope("repair");
      const checksumBefore = await loadMigrationChecksum(
        pool,
        "evidence_knowledge-0003",
      );

      await insertFact(pool, {
        scope,
        factId: "fact_repair",
        aggregateVersion: 3,
      });
      await insertVersion(pool, {
        scope,
        factId: "fact_repair",
        factVersionId: "version_repair_v1",
        versionNumber: 1,
      });
      await insertVersion(pool, {
        scope,
        factId: "fact_repair",
        factVersionId: "version_repair_v2",
        versionNumber: 2,
      });
      await insertTransition(pool, {
        scope,
        historyId: "history_repair_1",
        factId: "fact_repair",
        factVersionId: "version_repair_v1",
        fromStatus: "proposed",
        toStatus: "approved",
        commandKey: "command_repair_1",
      });
      await insertTransition(pool, {
        scope,
        historyId: "history_repair_2",
        factId: "fact_repair",
        factVersionId: "version_repair_v2",
        fromStatus: "proposed",
        toStatus: "approved",
        commandKey: "command_repair_2",
      });
      await insertTransition(pool, {
        scope,
        historyId: "history_repair_3",
        factId: "fact_repair",
        factVersionId: "version_repair_v1",
        fromStatus: "approved",
        toStatus: "superseded",
        commandKey: "command_repair_3",
      });
      await setFactState(
        pool,
        "fact_repair",
        "approved",
        "version_repair_v1",
      );

      await insertFact(pool, {
        scope,
        factId: "fact_valid",
        aggregateVersion: 2,
      });
      await insertVersion(pool, {
        scope,
        factId: "fact_valid",
        factVersionId: "version_valid",
        versionNumber: 1,
      });
      await insertTransition(pool, {
        scope,
        historyId: "history_valid",
        factId: "fact_valid",
        factVersionId: "version_valid",
        fromStatus: "proposed",
        toStatus: "approved",
        commandKey: "command_valid",
      });
      await setFactState(pool, "fact_valid", "approved", "version_valid");

      await applyEvidenceMigration(pool, 4);

      assertEquals(
        await loadMigrationChecksum(pool, "evidence_knowledge-0003"),
        checksumBefore,
      );
      assertEquals(
        await loadCurrentFactVersionId(pool, "fact_repair"),
        "version_repair_v2",
      );
      assertEquals(
        await loadCurrentFactVersionId(pool, "fact_valid"),
        "version_valid",
      );
    } finally {
      await closePool(pool);
    }
  },
});

Deno.test({
  name: "evidence_knowledge-0004 rejects an ambiguous approved state",
  ignore: databaseUrl === undefined,
  async fn() {
    const pool = await openMigratedPool(3);
    try {
      const scope = fixtureScope("ambiguous");
      await insertFact(pool, { scope, factId: "fact_ambiguous" });
      for (const [version, number] of [
        ["version_ambiguous_v1", 1],
        ["version_ambiguous_v2", 2],
        ["version_ambiguous_v3", 3],
      ] as const) {
        await insertVersion(pool, {
          scope,
          factId: "fact_ambiguous",
          factVersionId: version,
          versionNumber: number,
        });
      }
      for (const [history, version] of [
        ["history_ambiguous_1", "version_ambiguous_v1"],
        ["history_ambiguous_2", "version_ambiguous_v2"],
      ] as const) {
        await insertTransition(pool, {
          scope,
          historyId: history,
          factId: "fact_ambiguous",
          factVersionId: version,
          fromStatus: "proposed",
          toStatus: "approved",
          commandKey: `command_${history}`,
        });
      }
      await setFactState(
        pool,
        "fact_ambiguous",
        "approved",
        "version_ambiguous_v3",
      );

      await assertRejects(
        () => applyEvidenceMigration(pool, 4),
        Error,
        "independently eligible approved versions",
      );
    } finally {
      await closePool(pool);
    }
  },
});

Deno.test({
  name:
    "evidence_knowledge-0004 rejects an approved Fact without an approved version",
  ignore: databaseUrl === undefined,
  async fn() {
    const pool = await openMigratedPool(3);
    try {
      const scope = fixtureScope("missing");
      await insertFact(pool, { scope, factId: "fact_missing" });
      await insertVersion(pool, {
        scope,
        factId: "fact_missing",
        factVersionId: "version_missing",
        versionNumber: 1,
      });
      await setFactState(
        pool,
        "fact_missing",
        "approved",
        "version_missing",
      );

      await assertRejects(
        () => applyEvidenceMigration(pool, 4),
        Error,
        "no effective approved version",
      );
    } finally {
      await closePool(pool);
    }
  },
});

function fixtureScope(suffix: string): MigrationScope {
  return {
    tenant: `tenant_${suffix}`,
    workspace: `workspace_${suffix}`,
    deal: `deal_${suffix}`,
  };
}
