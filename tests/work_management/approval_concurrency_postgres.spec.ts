import { assert, assertEquals } from "@std/assert";
import {
  approveApprovalRequest,
  createApprovalPackage,
  createApprovalRequest,
} from "../../src/work_management/approval_requests.ts";
import {
  actor,
  aggregateVersion,
  approvalDecisionId,
  approvalPackageId,
  approvalRequestId,
  deal,
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
  tenantId: tenant("tenant_concurrency"),
  workspaceId: workspace("workspace_concurrency"),
  dealId: deal("deal_concurrency"),
};

async function approvalFixture(id: string) {
  const approver = {
    id: actor("actor_approver"),
    kind: "human" as const,
    state: "active" as const,
  };
  const requester = {
    id: actor("actor_requester"),
    kind: "human" as const,
    state: "active" as const,
  };
  const packageValue = await createApprovalPackage({
    id: approvalPackageId(`package_${id}`),
    version: 1,
    target: {
      aggregateType: "evidence",
      aggregateId: `evidence_${id}`,
      expectedVersion: aggregateVersion(1),
      scope,
    },
    evidence: [],
    authority: {
      action: "approve",
      namedApproverId: approver.id,
      policyVersion: "policy-1",
      snapshotReference: `snapshot_${id}`,
      humanOnly: true,
    },
    authoritySnapshot: {
      snapshotId: `snapshot_${id}`,
      actorId: approver.id,
      actorKind: "human",
      policyVersion: "policy-1",
      capturedAt: "2026-08-06T12:00:00.000Z",
      scope,
    },
    payload: { summary: "concurrency" },
  });
  const draft = createApprovalRequest({
    ...scope,
    id: approvalRequestId(`approval_${id}`),
    requesterId: requester.id,
    namedApproverId: approver.id,
    package: packageValue,
    now: "2026-08-06T12:00:00.000Z",
  });
  return {
    approver,
    requester,
    packageValue,
    request: {
      ...draft,
      state: "open" as const,
      version: aggregateVersion(2),
      updatedAt: "2026-08-06T12:01:00.000Z",
    },
  };
}

Deno.test("simultaneous approval decisions accept one exact aggregate version", async () => {
  const fixture = await approvalFixture("memory");
  const repository = new InMemoryWorkManagementRepository();
  await repository.saveApprovalRequest(fixture.request, 0);
  const decide = (decision: string) =>
    repository.run(async (transaction) => {
      const current = await transaction.findApprovalRequest(
        scope,
        fixture.request.id,
      );
      assert(current !== undefined);
      const next = approveApprovalRequest(current, {
        actor: fixture.approver,
        expectedPackage: fixture.packageValue,
        decisionId: approvalDecisionId(decision),
        now: "2026-08-06T12:02:00.000Z",
      });
      await transaction.saveApprovalRequest(next, current.version);
    });
  const results = await Promise.allSettled([
    decide("decision_one"),
    decide("decision_two"),
  ]);
  assertEquals(
    results.filter((result) => result.status === "fulfilled").length,
    1,
  );
  assertEquals(
    results.filter((result) => result.status === "rejected").length,
    1,
  );
});

const databaseUrl = mai106DatabaseUrl();
Deno.test({
  name:
    "PostgreSQL simultaneous approval decisions serialize on the exact version",
  ignore: databaseUrl === undefined,
  async fn() {
    const pool = createMai106Pool(databaseUrl!);
    await new PostgresMigrationRunner(pool).apply([
      ...platformMigrations,
      ...workManagementMigrations,
    ]);
    const runner = new PostgresTransactionRunner(pool);
    const fixture = await approvalFixture(`pg-${Date.now()}`);
    await runner.run(async (transaction) => {
      await new PostgresWorkManagementRepository(transaction)
        .saveApprovalRequest(fixture.request, 0);
    });
    const decide = (decision: string) =>
      runner.run(async (transaction) => {
        const repository = new PostgresWorkManagementRepository(transaction);
        const current = await repository.findApprovalRequest(
          scope,
          fixture.request.id,
        );
        assert(current !== undefined);
        const next = approveApprovalRequest(current, {
          actor: fixture.approver,
          expectedPackage: fixture.packageValue,
          decisionId: approvalDecisionId(decision),
          now: new Date().toISOString(),
        });
        await repository.saveApprovalRequest(next, current.version);
      });
    const results = await Promise.allSettled([
      decide("decision_one"),
      decide("decision_two"),
    ]);
    assertEquals(
      results.filter((result) => result.status === "fulfilled").length,
      1,
    );
    assertEquals(
      results.filter((result) => result.status === "rejected").length,
      1,
    );
    await pool.end();
  },
});
