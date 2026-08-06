import { assertEquals, assertRejects } from "@std/assert";
import { approvalRequestId } from "../../src/work_management/ids.ts";
import { PostgresTransactionRunner } from "../../src/platform/persistence/v1.ts";
import {
  createPostgresIntegrationTestPool,
  postgresIntegrationTestDatabaseUrl,
} from "../platform/support/postgres.ts";
import {
  approver,
  assertDenied,
  command,
  composition,
  compositionWithMode,
  CountingApprovalPorts,
  evidenceDigest,
  FailingTargetOutbox,
  requester,
  scope,
  target,
} from "./target_dispatch_test_setup.ts";
import {
  approvalCreationCounts,
  denialCounts,
  dispatchCounts,
  migrate,
} from "./target_dispatch_postgres_support.ts";

const databaseUrl = postgresIntegrationTestDatabaseUrl();
Deno.test({
  name:
    "PostgreSQL approval creation claims stable input before trusted ports and durably replays",
  ignore: databaseUrl === undefined,
  async fn() {
    const pool = createPostgresIntegrationTestPool(databaseUrl!);
    await migrate(pool);
    const runner = new PostgresTransactionRunner(pool);
    const suffix = `replay-${Date.now()}`;
    const requestId = approvalRequestId(`approval_${suffix}`);
    const ports = new CountingApprovalPorts();
    const input = {
      ...command(requestId, `create-${suffix}`, requester),
      namedApproverId: approver.id,
      requestedAction: "approve_evidence",
      target: target(suffix),
      evidence: [] as const,
      payload: { summary: "stable semantic input" },
    };
    const firstServices = [
      composition(runner, undefined, ports).service,
      composition(runner, undefined, ports).service,
    ];
    const concurrent = await Promise.all(
      firstServices.map((service) => service.createApprovalRequest(input)),
    );
    const restarted = await composition(runner, undefined, ports).service
      .createApprovalRequest(input);
    await assertRejects(
      () =>
        composition(runner, undefined, ports).service.createApprovalRequest({
          ...input,
          payload: { summary: "changed semantic input" },
        }),
      Error,
      "payload digest changed",
    );
    assertEquals(concurrent[0], concurrent[1]);
    assertEquals(restarted, concurrent[0]);
    assertEquals(ports.calls, { target: 1, evidence: 1, authority: 1 });
    assertEquals(
      await approvalCreationCounts(pool, requestId, input.idempotencyKey),
      {
        aggregate: 1,
        history: 1,
        audit: 1,
        outbox: 1,
        idempotency: 1,
        results: 1,
      },
    );
    await pool.end();
  },
});

Deno.test({
  name:
    "PostgreSQL production composition persists and replays an authority denial across rollout modes",
  ignore: databaseUrl === undefined,
  async fn() {
    const pool = createPostgresIntegrationTestPool(databaseUrl!);
    await migrate(pool);
    const runner = new PostgresTransactionRunner(pool);
    const suffix = `denial-${Date.now()}`;
    const requestId = approvalRequestId(`approval_${suffix}`);
    const ports = new CountingApprovalPorts(true);
    const input = {
      ...command(requestId, `create-${suffix}`, requester),
      namedApproverId: approver.id,
      requestedAction: "approve_evidence",
      target: target(suffix),
      evidence: [] as const,
      payload: { amount: 10 },
    };
    const commands = composition(runner, undefined, ports).service;
    const first = await assertDenied(() =>
      commands.createApprovalRequest(input)
    );
    assertEquals(first.evidence.reasons, ["AMOUNT_CEILING_EXCEEDED"]);
    assertEquals(ports.calls, { target: 1, evidence: 1, authority: 1 });
    for (const mode of ["commands", "read_only", "disabled"] as const) {
      const replay = compositionWithMode(runner, mode, ports).service;
      const repeated = await assertDenied(() =>
        replay.createApprovalRequest(input)
      );
      assertEquals(evidenceDigest(repeated), evidenceDigest(first));
    }
    await assertRejects(
      () =>
        compositionWithMode(runner, "read_only", ports).service
          .createApprovalRequest({
            ...input,
            payload: { amount: 11 },
          }),
      Error,
      "payload digest changed",
    );
    const counts = await denialCounts(pool, requestId, input.idempotencyKey);
    assertEquals(counts, {
      aggregate: 0,
      history: 0,
      audit: 0,
      outbox: 0,
      notification: 0,
      dispatch: 0,
      denial: 0,
      evaluation: 1,
      idempotency: 1,
    });
    await pool.end();
  },
});

Deno.test({
  name:
    "PostgreSQL approved decision atomically emits one durable target command",
  ignore: databaseUrl === undefined,
  async fn() {
    const pool = createPostgresIntegrationTestPool(databaseUrl!);
    await migrate(pool);
    const runner = new PostgresTransactionRunner(pool);
    const suffix = Date.now().toString();
    const requestId = approvalRequestId(`approval_dispatch-${suffix}`);
    const service = composition(runner).service;
    const draft = await service.createApprovalRequest({
      ...command(requestId, `create-${suffix}`, requester),
      namedApproverId: approver.id,
      requestedAction: "approve_evidence",
      target: target(suffix),
      evidence: [],
      payload: { summary: "dispatch" },
    });
    const opened = await service.openApprovalRequest({
      ...command(requestId, `open-${suffix}`, requester, draft.version),
    });
    const approved = await service.decideApprovalRequest({
      ...command(requestId, `approve-${suffix}`, approver, opened.version),
      outcome: "approved",
    });
    const replay = await composition(runner).service.decideApprovalRequest({
      ...command(requestId, `approve-${suffix}`, approver, opened.version),
      outcome: "approved",
    });
    assertEquals(replay, approved);
    assertEquals(await dispatchCounts(pool, requestId), {
      decisions: 1,
      dispatches: 1,
      targetOutbox: 1,
      approvalEvents: 1,
    });
    const proof = await pool.query<
      { readonly dispatch: Record<string, unknown> }
    >(
      "SELECT dispatch FROM work_management.target_command_dispatches WHERE approval_request_id=$1",
      [requestId],
    );
    const dispatch = proof.rows[0]?.dispatch;
    if (dispatch === undefined) {
      throw new Error("Dispatch proof row is missing.");
    }
    const authorityProof = dispatch.authorityProof;
    assertEquals(
      typeof authorityProof === "object" && authorityProof !== null &&
        typeof (authorityProof as Record<string, unknown>).proofId === "string",
      true,
    );
    await pool.end();
  },
});

Deno.test({
  name:
    "PostgreSQL target-command outbox failure rolls back decision and all companion writes",
  ignore: databaseUrl === undefined,
  async fn() {
    const pool = createPostgresIntegrationTestPool(databaseUrl!);
    await migrate(pool);
    const runner = new PostgresTransactionRunner(pool);
    const suffix = (Date.now() + 1).toString();
    const requestId = approvalRequestId(`approval_dispatch-fail-${suffix}`);
    const service = composition(runner).service;
    const draft = await service.createApprovalRequest({
      ...command(requestId, `create-fail-${suffix}`, requester),
      namedApproverId: approver.id,
      requestedAction: "approve_evidence",
      target: target(suffix),
      evidence: [],
      payload: { summary: "rollback" },
    });
    const opened = await service.openApprovalRequest({
      ...command(requestId, `open-fail-${suffix}`, requester, draft.version),
    });
    await assertRejects(
      () =>
        composition(runner, new FailingTargetOutbox()).service
          .decideApprovalRequest({
            ...command(
              requestId,
              `approve-fail-${suffix}`,
              approver,
              opened.version,
            ),
            outcome: "approved",
          }),
      Error,
      "target-dispatch-failure",
    );
    assertEquals(await dispatchCounts(pool, requestId), {
      decisions: 0,
      dispatches: 0,
      targetOutbox: 0,
      approvalEvents: 0,
    });
    const current = await pool.query(
      "SELECT state, version::int AS version FROM work_management.approval_requests_current WHERE tenant_id=$1 AND workspace_id=$2 AND deal_id=$3 AND approval_request_id=$4",
      [scope.tenantId, scope.workspaceId, scope.dealId, requestId],
    );
    assertEquals(current.rows[0], { state: "open", version: 2 });
    await pool.end();
  },
});
