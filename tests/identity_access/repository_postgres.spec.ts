import { assert, assertEquals } from "@std/assert";
import type {
  TransactionHandle,
  TransactionQueryResult,
} from "../../src/platform/persistence/v1.ts";
import {
  actorId,
  changeIdentityState,
  createAdministrationContext,
  createIdentityAccessEvent,
  createUserIdentity,
  PostgresIdentityAccessRepository,
  tenantId,
  userIdentityId,
  workspaceId,
} from "../../src/identity_access/v1.ts";

class FakeTransactionRunner {
  readonly queries: {
    readonly sql: string;
    readonly parameters: readonly unknown[];
  }[] = [];
  private document: unknown;
  private storedVersion = 0;

  run<TResult>(
    callback: (transaction: TransactionHandle) => Promise<TResult> | TResult,
  ): Promise<TResult> {
    const transaction: TransactionHandle = {
      metadata: {},
      query: <TRow>(sql: string, parameters: readonly unknown[] = []) => {
        this.queries.push({ sql, parameters });
        if (sql.includes("SELECT version FROM")) {
          return Promise.resolve({
            rows: this.storedVersion === 0
              ? []
              : [{ version: this.storedVersion }],
            rowCount: this.storedVersion === 0 ? 0 : 1,
          } as TransactionQueryResult<TRow>);
        }
        if (sql.includes("SELECT document FROM")) {
          return Promise.resolve({
            rows: this.document === undefined
              ? []
              : [{ document: this.document }],
            rowCount: this.document === undefined ? 0 : 1,
          } as TransactionQueryResult<TRow>);
        }
        if (sql.startsWith("INSERT INTO iam.user_identities")) {
          this.document = parameters.find((value) =>
            typeof value === "string" && value.startsWith("{")
          );
          this.storedVersion = 1;
        }
        if (sql.startsWith("UPDATE iam.user_identities")) {
          this.document = parameters.find((value) =>
            typeof value === "string" && value.startsWith("{")
          );
          this.storedVersion++;
        }
        return Promise.resolve(
          { rows: [], rowCount: 1 } as TransactionQueryResult<TRow>,
        );
      },
    };
    return Promise.resolve(callback(transaction));
  }
}

const actor = {
  id: actorId("actor_postgres"),
  kind: "human" as const,
  state: "active" as const,
};
const context = createAdministrationContext({
  actor,
  request: {
    actorId: actor.id,
    tenantId: tenantId("tenant_postgres"),
    correlationId: "cor_postgres" as never,
    origin: "internal",
  },
  now: "2026-08-01T12:00:00.000Z",
});

function eventFor(
  identity: ReturnType<typeof createUserIdentity>,
  eventType: string,
) {
  return createIdentityAccessEvent({
    aggregate: identity,
    eventId: `event_${identity.version}`,
    eventType,
    context,
  });
}

Deno.test("PostgreSQL repository binds tenant-only and workspace scopes correctly", async () => {
  const runner = new FakeTransactionRunner();
  const repository = new PostgresIdentityAccessRepository(runner);
  const identity = createUserIdentity({
    id: userIdentityId("identity_postgres"),
    tenantId: context.tenantId,
    providerSubject: "provider-postgres",
    displayName: "Postgres User",
  }, context);
  await repository.save(
    identity,
    undefined,
    eventFor(identity, "user_identity.created"),
  );
  await repository.find(
    { tenantId: context.tenantId },
    "user_identity",
    identity.id,
  );
  const tenantFind = runner.queries.find((query) =>
    query.sql.includes("SELECT document FROM")
  );
  assert(tenantFind !== undefined);
  assert(tenantFind.sql.includes("workspace_id IS NULL"));
  assertEquals(tenantFind.parameters, [context.tenantId, identity.id]);

  await repository.list({
    tenantId: context.tenantId,
    workspaceId: workspaceId("workspace_postgres"),
  }, "user_identity");
  const workspaceList = runner.queries.find((query) =>
    query.sql.includes("SELECT document FROM") &&
    query.sql.includes("workspace_id = $2")
  );
  assert(workspaceList !== undefined);
  assertEquals(workspaceList.parameters, [
    context.tenantId,
    "workspace_postgres",
  ]);
});

Deno.test("PostgreSQL repository fences tenant-only updates and appends history/outbox", async () => {
  const runner = new FakeTransactionRunner();
  const repository = new PostgresIdentityAccessRepository(runner);
  const identity = createUserIdentity({
    id: userIdentityId("identity_update"),
    tenantId: context.tenantId,
    providerSubject: "provider-update",
    displayName: "Update User",
  }, context);
  await repository.save(
    identity,
    undefined,
    eventFor(identity, "user_identity.created"),
  );
  const updated = changeIdentityState(identity, {
    expectedVersion: 1,
    state: "inactive",
    context,
  });
  await repository.save(updated, 1, eventFor(updated, "user_identity.updated"));
  const update = runner.queries.find((query) =>
    query.sql.startsWith("UPDATE iam.user_identities")
  );
  assert(update !== undefined);
  assert(update.sql.includes("SET version = $3"));
  assert(!update.sql.includes("$8"));
  assertEquals(update.parameters.length, 7);
  assert(
    runner.queries.some((query) => query.sql.includes("iam.aggregate_history")),
  );
  assert(runner.queries.some((query) => query.sql.includes("platform.outbox")));
});
