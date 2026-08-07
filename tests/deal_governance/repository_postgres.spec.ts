import { assert, assertEquals } from "@std/assert";
import type {
  TransactionHandle,
  TransactionQueryResult,
} from "../../src/platform/persistence/v1.ts";
import { createInitialGovernance } from "../../src/deal_governance/model.ts";
import { PostgresDealGovernanceRepository } from "../../src/deal_governance/repository_postgres.ts";
import {
  actor,
  deal,
  tenant,
  workspace,
} from "../../src/work_management/ids.ts";

class FakeGovernanceTransactionRunner {
  readonly queries: {
    readonly sql: string;
    readonly parameters: readonly unknown[];
  }[] = [];
  private document: unknown;
  version = 0;

  run<TResult>(
    callback: (transaction: TransactionHandle) => Promise<TResult> | TResult,
  ): Promise<TResult> {
    const transaction: TransactionHandle = {
      metadata: {},
      query: <TRow>(sql: string, parameters: readonly unknown[] = []) => {
        this.queries.push({ sql, parameters });
        if (
          sql.includes(
            "SELECT document FROM deal_governance.governance_aggregates",
          )
        ) {
          return Promise.resolve({
            rows: this.document === undefined
              ? []
              : [{ document: this.document }],
            rowCount: this.document === undefined ? 0 : 1,
          } as TransactionQueryResult<TRow>);
        }
        if (
          sql.startsWith("INSERT INTO deal_governance.governance_aggregates")
        ) {
          this.document = parameters[6];
          this.version = Number(parameters[4]);
        }
        if (sql.startsWith("UPDATE deal_governance.governance_aggregates")) {
          this.document = parameters[6];
          this.version = Number(parameters[4]);
        }
        return Promise.resolve(
          { rows: [], rowCount: 1 } as TransactionQueryResult<TRow>,
        );
      },
    };
    return Promise.resolve(callback(transaction));
  }
}

const scope = {
  tenantId: tenant("tenant_postgres-governance"),
  workspaceId: workspace("workspace_postgres-governance"),
  dealId: deal("deal_postgres-governance"),
};

Deno.test("PostgreSQL governance repository persists scoped documents and atomic evidence calls", async () => {
  const runner = new FakeGovernanceTransactionRunner();
  const repository = new PostgresDealGovernanceRepository(runner);
  const created = createInitialGovernance({
    scope,
    now: "2026-08-07T12:00:00.000Z",
  });
  await repository.transaction(async (store) => {
    await store.saveGovernance(created);
    await store.appendEvent({
      eventId: "event_postgres-governance",
      scope,
      actorId: actor("actor_postgres-governance"),
      actorKind: "human",
      correlationId: "cor_postgres-governance" as never,
      aggregateVersion: created.version,
      eventType: "GovernanceCreated",
      schemaVersion: 1,
      payload: {},
      occurredAt: created.createdAt,
    });
    await store.appendOutbox({
      eventId: "outbox_event_postgres-governance",
      tenantId: scope.tenantId,
      workspaceId: scope.workspaceId,
      dealId: scope.dealId,
      aggregateType: "deal_governance",
      aggregateId: created.id,
      aggregateVersion: created.version,
      eventType: "GovernanceCreated",
      schemaVersion: 1,
      payload: {},
      correlationId: "cor_postgres-governance" as never,
      occurredAt: new Date(created.createdAt),
      availableAt: new Date(created.createdAt),
    });
  });
  const loaded = await repository.transaction((store) =>
    store.findGovernance(scope)
  );
  assertEquals(loaded?.id, created.id);
  assertEquals(loaded?.scope, scope);
  assert(runner.queries.some((query) => query.sql.includes("tenant_id = $1")));
  assert(runner.queries.some((query) => query.sql.includes("platform.outbox")));
  assertEquals(runner.version, 1);
});
