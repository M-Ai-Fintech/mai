import { assert, assertEquals, assertRejects } from "@std/assert";
import pg from "pg";
import {
  createDecisionHistoryEntry,
  createDecisionProjection,
  createDecisionRecord,
  createDecisionRequest,
  createExactEvidenceBasis,
  createFinding,
  type DecisionAuthoritySnapshot,
  type DecisionProjection,
  type DecisionRecordId,
  type DecisionRequest,
  decisionRequestToDecided,
  decisionRequestToRequested,
  DiligenceDecisionError,
  diligenceDecisionsMigrations,
  type DiligenceScope,
  type Finding,
  PostgresDiligenceDecisionsRepository,
} from "../../src/diligence_decisions/v1.ts";
import {
  platformMigrations,
  PostgresMigrationRunner,
  PostgresTransactionRunner,
} from "../../src/platform/persistence/v1.ts";
import {
  type AggregateVersion,
  parseActorId,
  parseDealId,
  parseTenantId,
  parseWorkspaceId,
} from "../../src/platform/api/v1.ts";
import {
  createPostgresIntegrationTestPool,
  postgresIntegrationTestDatabaseUrl,
} from "../platform/support/postgres.ts";
import { parseFindingId } from "../../src/diligence_decisions/ids.ts";

const databaseUrl = postgresIntegrationTestDatabaseUrl();

Deno.test({
  name:
    "PostgreSQL Diligence migration is repeatable and repository round-trips exact records",
  ignore: databaseUrl === undefined,
  async fn() {
    const pool = createPostgresIntegrationTestPool(databaseUrl!);
    await migrate(pool);
    const transactions = new PostgresTransactionRunner(pool);
    const repository = new PostgresDiligenceDecisionsRepository();
    const value = fixtureFinding(`roundtrip-${Date.now()}`);
    await transactions.run(async (transaction) => {
      await repository.insertFinding(transaction, value);
      const loaded = await repository.findFinding(
        transaction,
        value.scope,
        value.id,
      );
      assertEquals(loaded, value);
    });
    await new PostgresMigrationRunner(pool).apply([
      ...platformMigrations,
      ...diligenceDecisionsMigrations,
    ]);
    await pool.end();
  },
});

Deno.test({
  name: "PostgreSQL Diligence rollback leaves no proposal behind",
  ignore: databaseUrl === undefined,
  async fn() {
    const pool = createPostgresIntegrationTestPool(databaseUrl!);
    await migrate(pool);
    const transactions = new PostgresTransactionRunner(pool);
    const repository = new PostgresDiligenceDecisionsRepository();
    const value = fixtureFinding(`rollback-${Date.now()}`);
    await assertRejects(
      () =>
        transactions.run(async (transaction) => {
          await repository.insertFinding(transaction, value);
          throw new Error("rollback-test");
        }),
      Error,
      "rollback-test",
    );
    await transactions.run(async (transaction) => {
      assertEquals(
        await repository.findFinding(transaction, value.scope, value.id),
        undefined,
      );
    });
    await pool.end();
  },
});

Deno.test({
  name:
    "PostgreSQL Diligence records reject mutation and projections fence stale writers",
  ignore: databaseUrl === undefined,
  async fn() {
    const pool = createPostgresIntegrationTestPool(databaseUrl!);
    await migrate(pool);
    const transactions = new PostgresTransactionRunner(pool);
    const repository = new PostgresDiligenceDecisionsRepository();
    const suffix = `concurrency-${Date.now()}`;
    const request = fixtureRequest(suffix);
    const record = fixtureRecord(suffix, request.id);
    const projection = createDecisionProjection({
      requestId: request.id,
      currentRecordId: record.id,
      state: "active",
      version: version(1),
      updatedAt: now(),
    });
    const history = createDecisionHistoryEntry({
      id: `decision_history_${suffix}` as never,
      requestId: request.id,
      recordId: record.id,
      kind: "recorded",
      scope,
      actor: human,
      authority,
      basisDigest: request.basis.basisDigest,
      expectedProjectionVersion: 0,
      createdAt: now(),
    });
    await transactions.run(async (transaction) => {
      await repository.insertDecisionRequest(transaction, request);
      await repository.insertDecisionRecord(transaction, record);
      await repository.insertProjection(transaction, projection, scope);
      await repository.insertHistory(transaction, history);
    });
    await assertRejects(
      () =>
        transactions.run((transaction) =>
          transaction.query(
            "UPDATE diligence_decisions.decision_records SET payload=$1",
            [{}],
          )
        ),
      Error,
      "Immutable Diligence decision history",
    );
    const winner = {
      ...projection,
      state: "invalidated" as const,
      version: version(2),
      updatedAt: now(),
    };
    await transactions.run((transaction) =>
      repository.updateProjection(transaction, winner, scope, 1)
    );
    const stale = {
      ...winner,
      state: "active" as const,
      version: version(3),
    };
    const error = await assertRejects(
      () =>
        transactions.run((transaction) =>
          repository.updateProjection(transaction, stale, scope, 1)
        ),
      DiligenceDecisionError,
    );
    assertEquals(error.code, "VERSION_CONFLICT");
    await pool.end();
  },
});

Deno.test({
  name:
    "PostgreSQL competing supersessions leave one consistent current record",
  ignore: databaseUrl === undefined,
  async fn() {
    const pool = createPostgresIntegrationTestPool(databaseUrl!);
    await migrate(pool);
    const transactions = new PostgresTransactionRunner(pool);
    const repository = new PostgresDiligenceDecisionsRepository();
    const suffix = `competing-${Date.now()}`;
    const draft = fixtureRequest(suffix);
    const requested = decisionRequestToRequested(draft, now());
    const previous = fixtureRecord(suffix, draft.id, requested.version);
    const request = decisionRequestToDecided(requested, previous.id, now());
    const projection = createDecisionProjection({
      requestId: request.id,
      currentRecordId: previous.id,
      state: "active",
      version: version(1),
      updatedAt: now(),
    });
    await transactions.run(async (transaction) => {
      await repository.insertDecisionRequest(transaction, request);
      await repository.insertDecisionRecord(transaction, previous);
      await repository.insertProjection(transaction, projection, scope);
    });

    const attempts = await Promise.allSettled([
      supersedeInPostgres(
        transactions,
        repository,
        request,
        projection,
        suffix,
        "left",
      ),
      supersedeInPostgres(
        transactions,
        repository,
        request,
        projection,
        suffix,
        "right",
      ),
    ]);
    const winners = attempts.filter((result) => result.status === "fulfilled");
    const loser = attempts.find((result) => result.status === "rejected");
    assertEquals(winners.length, 1);
    assert(loser?.status === "rejected");
    assert(loser.reason instanceof DiligenceDecisionError);
    assertEquals(loser.reason.code, "VERSION_CONFLICT");

    await transactions.run(async (transaction) => {
      const currentRequest = await repository.findDecisionRequest(
        transaction,
        scope,
        request.id,
      );
      const currentProjection = await repository.findProjection(
        transaction,
        scope,
        request.id,
      );
      assert(currentRequest !== undefined && currentProjection !== undefined);
      assertEquals(
        currentRequest.decisionRecordId,
        currentProjection.currentRecordId,
      );
      assertEquals(currentRequest.version, version(4));
      assertEquals(currentProjection.version, version(2));
    });
    await pool.end();
  },
});

async function supersedeInPostgres(
  transactions: PostgresTransactionRunner,
  repository: PostgresDiligenceDecisionsRepository,
  request: DecisionRequest,
  projection: DecisionProjection,
  suffix: string,
  side: string,
): Promise<void> {
  await transactions.run(async (transaction) => {
    const lockedRequest = await repository.findDecisionRequest(
      transaction,
      scope,
      request.id,
      true,
    );
    const lockedProjection = await repository.findProjection(
      transaction,
      scope,
      request.id,
      true,
    );
    if (lockedRequest === undefined || lockedProjection === undefined) {
      throw new Error(`Missing competing supersession fixture "${side}".`);
    }
    const replacement = fixtureRecord(
      `${suffix}-${side}`,
      request.id,
      lockedRequest.version,
      lockedProjection.currentRecordId,
    );
    const nextRequest = {
      ...lockedRequest,
      decisionRecordId: replacement.id,
      version: version(Number(lockedRequest.version) + 1),
      updatedAt: now(),
    };
    const nextProjection = {
      ...lockedProjection,
      currentRecordId: replacement.id,
      state: "active" as const,
      version: version(Number(lockedProjection.version) + 1),
      updatedAt: now(),
    };
    await repository.insertDecisionRecord(transaction, replacement);
    await repository.updateDecisionRequest(
      transaction,
      nextRequest,
      request.version,
    );
    await repository.updateProjection(
      transaction,
      nextProjection,
      scope,
      projection.version,
    );
  });
}

const scope: DiligenceScope = {
  tenantId: required("tenant_pg", parseTenantId),
  workspaceId: required("workspace_pg", parseWorkspaceId),
  dealId: required("deal_pg", parseDealId),
};
const human = {
  id: required("actor_pg", parseActorId),
  kind: "human" as const,
  state: "active" as const,
};
const requester = {
  id: required("actor_pg-requester", parseActorId),
  kind: "human" as const,
  state: "active" as const,
};
const authority: DecisionAuthoritySnapshot = {
  snapshotId: "authority_pg",
  actorId: human.id,
  policyVersion: "policy-v1",
  scope,
  capturedAt: now(),
};

async function migrate(pool: pg.Pool): Promise<void> {
  await new PostgresMigrationRunner(pool).apply([
    ...platformMigrations,
    ...diligenceDecisionsMigrations,
  ]);
}

function fixtureFinding(suffix: string): Finding {
  return createFinding({
    id: required(`finding_${suffix}`, parseFindingId),
    scope,
    title: "PostgreSQL finding",
    statement: "The exact source requires a human decision.",
    basis: basis(suffix),
    proposedBy: human,
    now: now(),
  });
}

function fixtureRequest(suffix: string) {
  return createDecisionRequest({
    id: `decision_request_${suffix}` as never,
    scope,
    subject: { kind: "finding", id: `finding_${suffix}` as never },
    question: "Should the finding be accepted?",
    basis: basis(suffix),
    requester,
    namedApproverId: human.id,
    now: now(),
  });
}

function fixtureRecord(
  suffix: string,
  requestId: string,
  requestVersion: AggregateVersion = version(1),
  supersedesRecordId?: DecisionRecordId,
) {
  return createDecisionRecord({
    id: `decision_record_${suffix}` as never,
    requestId: requestId as never,
    scope,
    outcome: "approved",
    actor: human,
    requestVersion,
    basis: basis(suffix),
    authority,
    ...(supersedesRecordId === undefined ? {} : { supersedesRecordId }),
    recordedAt: now(),
  });
}

function basis(suffix: string) {
  return createExactEvidenceBasis({
    scope,
    references: [{
      kind: "fact_version",
      factVersionId: `factver_${suffix}` as never,
    }],
    basisDigest: "b".repeat(64),
    capturedAt: now(),
  });
}

function version(value: number): AggregateVersion {
  return value as AggregateVersion;
}

function now(): Date {
  return new Date("2026-08-07T12:00:00.000Z");
}

function required<T>(
  value: string,
  parser: (value: unknown) =>
    | { readonly ok: true; readonly value: T }
    | { readonly ok: false },
): T {
  const result = parser(value);
  if (result.ok) return result.value;
  throw new Error(`Invalid PostgreSQL fixture "${value}".`);
}
