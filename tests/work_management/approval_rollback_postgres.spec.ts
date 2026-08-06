import { assertEquals, assertRejects } from "@std/assert";
import {
  createApprovalPackage,
  createApprovalRequest,
} from "../../src/work_management/approval_requests.ts";
import {
  actor,
  aggregateVersion,
  approvalPackageId,
  approvalRequestId,
  deal,
  targetCommandType,
  tenant,
  workspace,
} from "../../src/work_management/ids.ts";
import { InMemoryWorkManagementRepository } from "../../src/work_management/repository.ts";
import {
  platformMigrations,
  PostgresMigrationRunner,
  PostgresTransactionRunner,
} from "../../src/platform/persistence/v1.ts";
import { workManagementMigrations } from "../../src/work_management/migrations/index.ts";
import { PostgresWorkManagementRepository } from "../../src/work_management/repository_sql.ts";
import {
  createMai106Pool,
  mai106DatabaseUrl,
} from "../platform/support/postgres.ts";

const scope = {
  tenantId: tenant("tenant_rollback"),
  workspaceId: workspace("workspace_rollback"),
  dealId: deal("deal_rollback"),
};

async function fixture(id: string) {
  const approver = actor("actor_rollback-approver");
  const requester = actor("actor_rollback-requester");
  const target = {
    aggregateType: "evidence",
    aggregateId: `evidence_${id}`,
    expectedVersion: aggregateVersion(1),
    scope,
  } as const;
  const packageValue = await createApprovalPackage({
    id: approvalPackageId(`package_${id}`),
    version: 1,
    target,
    evidence: [],
    authority: {
      commandType: targetCommandType("approve"),
      target,
      namedApproverId: approver,
      policyVersion: "policy-1",
      snapshotReference: `snapshot_${id}`,
      scope,
      effectiveAt: "2026-08-06T11:00:00.000Z",
      expiresAt: "2026-08-06T13:00:00.000Z",
      applicableLimits: [],
      humanOnly: true,
    },
    authoritySnapshot: {
      snapshotId: `snapshot_${id}`,
      actorId: approver,
      actorKind: "human",
      policyVersion: "policy-1",
      capturedAt: "2026-08-06T12:00:00.000Z",
      scope,
    },
    payload: { summary: "rollback" },
  });
  return createApprovalRequest({
    ...scope,
    id: approvalRequestId(`approval_${id}`),
    requesterId: requester,
    namedApproverId: approver,
    package: packageValue,
    now: "2026-08-06T12:00:00.000Z",
  });
}

Deno.test("in-memory transaction failure does not leave the approval row", async () => {
  const repository = new InMemoryWorkManagementRepository();
  const request = await fixture("memory");
  await assertRejects(
    () =>
      repository.run(async (transaction) => {
        await transaction.saveApprovalRequest(request, 0);
        throw new Error("rollback-fixture");
      }),
    Error,
    "rollback-fixture",
  );
  assertEquals(
    await repository.findApprovalRequest(scope, request.id),
    undefined,
  );
});

const databaseUrl = mai106DatabaseUrl();
Deno.test({
  name:
    "PostgreSQL approval write rolls back current row on transaction failure",
  ignore: databaseUrl === undefined,
  async fn() {
    const pool = createMai106Pool(databaseUrl!);
    await new PostgresMigrationRunner(pool).apply([
      ...platformMigrations,
      ...workManagementMigrations,
    ]);
    const runner = new PostgresTransactionRunner(pool);
    const request = await fixture(`pg-${Date.now()}`);
    await assertRejects(
      () =>
        runner.run(async (transaction) => {
          await new PostgresWorkManagementRepository(transaction)
            .saveApprovalRequest(request, 0);
          throw new Error("approval-rollback-fixture");
        }),
      Error,
      "approval-rollback-fixture",
    );
    await runner.run(async (transaction) => {
      assertEquals(
        await new PostgresWorkManagementRepository(transaction)
          .findApprovalRequest(scope, request.id),
        undefined,
      );
    });
    await pool.end();
  },
});
