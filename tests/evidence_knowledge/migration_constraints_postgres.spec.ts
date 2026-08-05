import { assertEquals, assertRejects } from "@std/assert";
import {
  closePool,
  databaseUrl,
  insertFact,
  insertTransition,
  insertVersion,
  loadCurrentFactVersionId,
  openMigratedPool,
  setFactState,
  type MigrationScope,
} from "./migration_postgres_test_support.ts";

Deno.test({
  name:
    "evidence_knowledge-0004 pointer constraints reject invalid pointers and permit an approved current version",
  ignore: databaseUrl === undefined,
  async fn() {
    const pool = await openMigratedPool(4);
    try {
      const scope = fixtureScope("constraint");
      await insertFact(pool, { scope, factId: "fact_constraint" });
      await insertFact(pool, { scope, factId: "fact_other" });
      await insertVersion(pool, {
        scope,
        factId: "fact_constraint",
        factVersionId: "version_constraint",
        versionNumber: 1,
      });
      await insertVersion(pool, {
        scope,
        factId: "fact_other",
        factVersionId: "version_other",
        versionNumber: 1,
      });

      await assertRejects(
        () => setFactState(pool, "fact_constraint", "approved", null),
        Error,
        "check_facts_approved_has_current_version",
      );
      await assertRejects(
        () =>
          setFactState(
            pool,
            "fact_constraint",
            "approved",
            "version_other",
          ),
        Error,
        "fk_facts_current_fact_version",
      );
      await assertRejects(
        () =>
          setFactState(
            pool,
            "fact_constraint",
            "approved",
            "version_constraint",
          ),
        Error,
        "not effectively approved",
      );

      await insertTransition(pool, {
        scope,
        historyId: "history_constraint_approve",
        factId: "fact_constraint",
        factVersionId: "version_constraint",
        fromStatus: "proposed",
        toStatus: "approved",
        commandKey: "command_constraint_approve",
      });
      await setFactState(
        pool,
        "fact_constraint",
        "approved",
        "version_constraint",
      );

      assertEquals(
        await loadCurrentFactVersionId(pool, "fact_constraint"),
        "version_constraint",
      );
    } finally {
      await closePool(pool);
    }
  },
});

Deno.test({
  name:
    "evidence_knowledge-0004 rejects a history-only transition that invalidates the current pointer",
  ignore: databaseUrl === undefined,
  async fn() {
    const pool = await openMigratedPool(4);
    try {
      const scope = fixtureScope("history_only");
      await createApprovedFact(
        pool,
        scope,
        "fact_history_only",
        "version_history_only",
      );

      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        await insertTransition(client, {
          scope,
          historyId: "history_only_supersede",
          factId: "fact_history_only",
          factVersionId: "version_history_only",
          fromStatus: "approved",
          toStatus: "superseded",
          commandKey: "command_history_only_supersede",
        });
        await assertRejects(
          () => client.query("COMMIT"),
          Error,
          "not effectively approved",
        );
      } finally {
        await client.query("ROLLBACK").catch(() => {});
        client.release();
      }
    } finally {
      await closePool(pool);
    }
  },
});

Deno.test({
  name:
    "evidence_knowledge-0004 permits an atomic supersession whose final pointer is valid",
  ignore: databaseUrl === undefined,
  async fn() {
    const pool = await openMigratedPool(4);
    try {
      const scope = fixtureScope("atomic");
      await createApprovedFact(
        pool,
        scope,
        "fact_atomic",
        "version_atomic_v1",
      );
      await insertVersion(pool, {
        scope,
        factId: "fact_atomic",
        factVersionId: "version_atomic_v2",
        versionNumber: 2,
      });

      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        await insertTransition(client, {
          scope,
          historyId: "history_atomic_supersede",
          factId: "fact_atomic",
          factVersionId: "version_atomic_v1",
          fromStatus: "approved",
          toStatus: "superseded",
          commandKey: "command_atomic_supersede",
        });
        await insertTransition(client, {
          scope,
          historyId: "history_atomic_approve",
          factId: "fact_atomic",
          factVersionId: "version_atomic_v2",
          fromStatus: "proposed",
          toStatus: "approved",
          commandKey: "command_atomic_approve",
        });
        await setFactState(
          client,
          "fact_atomic",
          "approved",
          "version_atomic_v2",
        );
        await client.query("COMMIT");
      } finally {
        await client.query("ROLLBACK").catch(() => {});
        client.release();
      }

      assertEquals(
        await loadCurrentFactVersionId(pool, "fact_atomic"),
        "version_atomic_v2",
      );
    } finally {
      await closePool(pool);
    }
  },
});

Deno.test({
  name:
    "evidence_knowledge-0004 ignores a transition for another Fact when validating the current pointer",
  ignore: databaseUrl === undefined,
  async fn() {
    const pool = await openMigratedPool(4);
    try {
      const scope = fixtureScope("unrelated");
      await createApprovedFact(
        pool,
        scope,
        "fact_unrelated_a",
        "version_unrelated_a",
      );
      await insertFact(pool, { scope, factId: "fact_unrelated_b" });
      await insertVersion(pool, {
        scope,
        factId: "fact_unrelated_b",
        factVersionId: "version_unrelated_b",
        versionNumber: 1,
      });

      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        await insertTransition(client, {
          scope,
          historyId: "history_unrelated_b",
          factId: "fact_unrelated_b",
          factVersionId: "version_unrelated_b",
          fromStatus: "proposed",
          toStatus: "approved",
          commandKey: "command_unrelated_b",
        });
        await client.query("COMMIT");
      } finally {
        await client.query("ROLLBACK").catch(() => {});
        client.release();
      }

      assertEquals(
        await loadCurrentFactVersionId(pool, "fact_unrelated_a"),
        "version_unrelated_a",
      );
    } finally {
      await closePool(pool);
    }
  },
});

async function createApprovedFact(
  pool: Parameters<typeof insertFact>[0],
  scope: MigrationScope,
  factId: string,
  factVersionId: string,
): Promise<void> {
  await insertFact(pool, { scope, factId });
  await insertVersion(pool, {
    scope,
    factId,
    factVersionId,
    versionNumber: 1,
  });
  await insertTransition(pool, {
    scope,
    historyId: `history_${factId}_approve`,
    factId,
    factVersionId,
    fromStatus: "proposed",
    toStatus: "approved",
    commandKey: `command_${factId}_approve`,
  });
  await setFactState(pool, factId, "approved", factVersionId);
}

function fixtureScope(suffix: string): MigrationScope {
  return {
    tenant: `tenant_${suffix}`,
    workspace: `workspace_${suffix}`,
    deal: `deal_${suffix}`,
  };
}
