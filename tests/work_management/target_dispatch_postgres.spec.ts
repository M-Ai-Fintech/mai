import { assertEquals, assertRejects } from "@std/assert";
import type {
  AuditEventDraft,
  AuditEventId,
} from "../../src/audit_activity/model.ts";
import { auditActivityMigrations } from "../../src/audit_activity/migrations/index.ts";
import { PostgresAuditEventRepository } from "../../src/audit_activity/repository.ts";
import {
  action,
  type AuthorizationDecision,
} from "../../src/platform/authz/v1.ts";
import { parseIdempotencyKey } from "../../src/platform/api/v1.ts";
import {
  type OutboxEvent,
  OutboxRepository,
} from "../../src/platform/events/v1.ts";
import {
  payloadDigest,
  platformMigrations,
  PostgresMigrationRunner,
  PostgresTransactionRunner,
  type TransactionHandle,
} from "../../src/platform/persistence/v1.ts";
import type {
  ApprovalAuthoritySnapshotPort,
  ApprovalEvidencePort,
  ApprovalTargetPort,
} from "../../src/work_management/approval_package_factory.ts";
import { createPostgresWorkManagementTestComposition } from "../../src/work_management/composition.ts";
import type { WorkManagementEvent } from "../../src/work_management/events.ts";
import {
  actor,
  aggregateVersion,
  approvalRequestId,
  deal,
  targetCommandType,
  tenant,
  type WorkScope,
  workspace,
} from "../../src/work_management/ids.ts";
import { workManagementMigrations } from "../../src/work_management/migrations/index.ts";
import type {
  EvidenceSnapshotReference,
  TargetReference,
} from "../../src/work_management/model.ts";
import type { WorkManagementAuditPort } from "../../src/work_management/transactional_effects.ts";
import {
  createPostgresIntegrationTestPool,
  ensureWorkManagementTestRoles,
  postgresIntegrationTestDatabaseUrl,
} from "../platform/support/postgres.ts";

const databaseUrl = postgresIntegrationTestDatabaseUrl();
const scope: WorkScope = {
  tenantId: tenant("tenant_dispatch-pg"),
  workspaceId: workspace("workspace_dispatch-pg"),
  dealId: deal("deal_dispatch-pg"),
};
const requester = actorRef("actor_dispatch-requester");
const approver = actorRef("actor_dispatch-approver");

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

function composition(
  runner: PostgresTransactionRunner,
  outbox?: Pick<OutboxRepository, "append">,
  ports?: CountingApprovalPorts,
) {
  return createPostgresWorkManagementTestComposition({
    mode: "commands",
    transactions: runner,
    audit: new RecordingAuditPort(),
    ...(outbox === undefined ? {} : { outbox }),
    authorization: {
      authorize: allow,
      transactionSafe: true,
      transactionMode: "postgres_integration_local",
    },
    clock: { now: () => "2026-08-06T12:00:00.000Z" },
    targets: ports ?? new ExactTargetPort(),
    evidence: ports ?? new EmptyEvidencePort(),
    authority: ports ?? new NamedAuthorityPort(),
  });
}

class CountingApprovalPorts
  implements
    ApprovalTargetPort,
    ApprovalEvidencePort,
    ApprovalAuthoritySnapshotPort {
  readonly transactionSafe = true as const;
  readonly transactionMode = "postgres_integration_local" as const;
  readonly calls = { target: 0, evidence: 0, authority: 0 };

  validate(
    _scope: WorkScope,
    value: TargetReference,
  ): Promise<TargetReference>;
  validate(
    _scope: WorkScope,
    value: readonly EvidenceSnapshotReference[],
  ): Promise<readonly EvidenceSnapshotReference[]>;
  validate(
    _scope: WorkScope,
    value: TargetReference | readonly EvidenceSnapshotReference[],
  ): Promise<TargetReference | readonly EvidenceSnapshotReference[]> {
    if (Array.isArray(value)) this.calls.evidence += 1;
    else this.calls.target += 1;
    return Promise.resolve(value);
  }

  currentVersion(value: TargetReference) {
    return Promise.resolve(value.expectedVersion);
  }

  resolve(input: Parameters<ApprovalAuthoritySnapshotPort["resolve"]>[0]) {
    this.calls.authority += 1;
    const snapshot = {
      snapshotId: `authority-replay-${this.calls.authority}`,
      actorId: approver.id,
      actorKind: "human" as const,
      policyVersion: `policy-replay-${this.calls.authority}`,
      capturedAt: `2026-08-06T12:00:0${this.calls.authority}.000Z`,
      scope: input.scope,
    };
    return Promise.resolve({
      snapshot,
      requirement: {
        commandType: targetCommandType("approve_evidence"),
        target: input.target,
        namedApproverId: approver.id,
        policyVersion: snapshot.policyVersion,
        snapshotReference: snapshot.snapshotId,
        scope: input.scope,
        effectiveAt: "2026-08-06T11:00:00.000Z",
        expiresAt: "2026-08-06T13:00:00.000Z",
        applicableLimits: [],
        humanOnly: true as const,
      },
      facts: authorityFacts(input.target, input.scope),
    });
  }
}

class FailingTargetOutbox implements Pick<OutboxRepository, "append"> {
  private readonly delegate = new OutboxRepository();

  append(transaction: TransactionHandle, event: OutboxEvent): Promise<void> {
    if (event.eventType === "work_management.target_command_ready") {
      return Promise.reject(new Error("target-dispatch-failure"));
    }
    return this.delegate.append(transaction, event);
  }
}

class ExactTargetPort implements ApprovalTargetPort {
  readonly transactionSafe = true as const;
  readonly transactionMode = "postgres_integration_local" as const;
  validate(
    _scope: WorkScope,
    value: TargetReference,
  ): Promise<TargetReference> {
    return Promise.resolve(value);
  }

  currentVersion(value: TargetReference) {
    return Promise.resolve(value.expectedVersion);
  }
}

class EmptyEvidencePort implements ApprovalEvidencePort {
  readonly transactionSafe = true as const;
  readonly transactionMode = "postgres_integration_local" as const;
  validate(
    _scope: WorkScope,
    values: readonly EvidenceSnapshotReference[],
  ): Promise<readonly EvidenceSnapshotReference[]> {
    return Promise.resolve(values);
  }
}

class NamedAuthorityPort implements ApprovalAuthoritySnapshotPort {
  readonly transactionSafe = true as const;
  readonly transactionMode = "postgres_integration_local" as const;
  resolve(input: Parameters<ApprovalAuthoritySnapshotPort["resolve"]>[0]) {
    const snapshot = {
      snapshotId: "authority-dispatch-v1",
      actorId: approver.id,
      actorKind: "human" as const,
      policyVersion: "policy-dispatch-v1",
      capturedAt: "2026-08-06T12:00:00.000Z",
      scope: input.scope,
    };
    return Promise.resolve({
      requirement: {
        commandType: targetCommandType("approve_evidence"),
        target: input.target,
        namedApproverId: approver.id,
        policyVersion: snapshot.policyVersion,
        snapshotReference: snapshot.snapshotId,
        scope: input.scope,
        effectiveAt: "2026-08-06T11:00:00.000Z",
        expiresAt: "2026-08-06T13:00:00.000Z",
        applicableLimits: [{ name: "amount_minor_ceiling", value: 1_000_000 }],
        humanOnly: true as const,
      },
      facts: authorityFacts(input.target, input.scope),
      snapshot,
    });
  }
}

function authorityFacts(target: TargetReference, scope: WorkScope) {
  return {
    target,
    scope,
    amount: { minorUnits: 10, currency: "USD" },
    source: {
      sourceId: "trusted-test-authority-facts",
      sourceVersion: "1",
      capturedAt: "2026-08-06T12:00:00.000Z",
    },
  };
}

class RecordingAuditPort implements WorkManagementAuditPort {
  private readonly repository = new PostgresAuditEventRepository();

  async append(transaction: TransactionHandle, event: WorkManagementEvent) {
    const draft = await auditDraft(event);
    await this.repository.append(transaction, draft);
    return draft.eventId;
  }
}

async function auditDraft(
  event: WorkManagementEvent,
): Promise<AuditEventDraft> {
  const eventId = `audit_${event.eventId}` as AuditEventId;
  const actorKind = event.actorKind === "human" ? "human" : "system";
  return {
    eventId,
    tenantId: event.tenantId,
    workspaceId: event.workspaceId,
    dealId: event.dealId,
    actorId: event.actorId,
    actorKind,
    origin: "http",
    correlationId: event.correlationId,
    aggregateType: event.aggregateType,
    aggregateId: event.aggregateId,
    aggregateVersion: event.aggregateVersion,
    eventType: event.eventType,
    schemaVersion: 1,
    authoritySnapshot: {
      snapshotId: `authority_${event.eventId}`,
      actorId: event.actorId,
      actorKind,
      policyVersion: "test-policy-v1",
      scope: {
        tenantId: event.tenantId,
        workspaceId: event.workspaceId,
        dealId: event.dealId,
      },
      capturedAt: event.occurredAt,
    },
    evidenceSnapshot: { capturedAt: event.occurredAt, references: [] },
    provenance: { actorId: event.actorId, actorKind, origin: "http" },
    payload: { workEventId: event.eventId, state: String(event.payload.state) },
    classifications: { workEventId: "internal", state: "internal" },
    contentDigest: await payloadDigest(event.payload),
    occurredAt: event.occurredAt,
  };
}

function target(suffix: string): TargetReference {
  return {
    aggregateType: "evidence",
    aggregateId: `evidence_${suffix}`,
    expectedVersion: aggregateVersion(1),
    scope,
  };
}

function actorRef(value: string) {
  return { id: actor(value), kind: "human" as const, state: "active" as const };
}

function command<Id extends string>(
  id: Id,
  key: string,
  commandActor: typeof requester,
  expectedVersion?: number,
) {
  const parsed = parseIdempotencyKey(`idem_${key}`);
  if (!parsed.ok) throw new Error(`Invalid test idempotency key "${key}".`);
  return {
    context: {
      actorId: commandActor.id,
      ...scope,
      correlationId:
        "cor_dispatch_pg" as import("../../src/platform/api/v1.ts").CorrelationId,
      origin: "http" as const,
    },
    actor: commandActor,
    scope,
    id,
    idempotencyKey: parsed.value,
    ...(expectedVersion === undefined ? {} : { expectedVersion }),
  };
}

function allow(): AuthorizationDecision {
  return {
    outcome: "allow",
    reasonCode: "ALLOWED",
    allowedActions: [action("approve")],
    approvedScope: undefined as never,
    fieldMask: {
      include: [],
      omit: [],
      redact: [],
      approvedClassifications: [],
    },
  };
}

async function migrate(
  pool: ReturnType<typeof createPostgresIntegrationTestPool>,
) {
  await ensureWorkManagementTestRoles(pool);
  await new PostgresMigrationRunner(pool).apply([
    ...platformMigrations,
    ...auditActivityMigrations,
    ...workManagementMigrations,
  ]);
  await resetDispatchContext(pool);
  await activateCommands(pool, `dispatch-${Date.now()}`);
}

async function resetDispatchContext(
  pool: ReturnType<typeof createPostgresIntegrationTestPool>,
): Promise<void> {
  await pool.query(`
    TRUNCATE TABLE
      work_management.tasks_current,
      work_management.workstreams_current,
      work_management.approval_requests_current,
      work_management.aggregate_history,
      work_management.approval_decision_history,
      work_management.command_results,
      work_management.target_command_dispatches,
      work_management.authority_evaluations,
      work_management.command_preparations,
      work_management.membership_reconciliation_resolutions,
      work_management.membership_reconciliation_findings,
      work_management.membership_reconciliation_scans,
      work_management.membership_reconciliation_activation,
      work_management.membership_rollout_events,
      work_management.membership_operator_actor_bindings,
      work_management.membership_operator_actor_binding_events,
      platform.idempotency_records,
      platform.outbox,
      platform.inbox,
      audit_activity.audit_events,
      audit_activity.redaction_overlays
    RESTART IDENTITY CASCADE
  `);
  await pool.query(
    `INSERT INTO work_management.membership_reconciliation_activation
      (activation_id, mode, unresolved_blocking_count, recorded_at)
      VALUES (TRUE, 'read_only', 0, now())`,
  );
}

async function activateCommands(
  pool: ReturnType<typeof createPostgresIntegrationTestPool>,
  suffix: string,
): Promise<void> {
  const scanId = `scan_${suffix}`;
  await pool.query(
    `INSERT INTO work_management.membership_operator_actor_bindings
      (session_role, actor_id) VALUES (current_user, $1)
      ON CONFLICT (session_role, actor_id) DO NOTHING`,
    ["test:dispatch-suite"],
  );
  await pool.query(
    `INSERT INTO work_management.membership_operator_actor_binding_events
      (event_id, session_role, actor_id, action, recorded_at)
     VALUES ($1, current_user, $2, 'bind', now())
     ON CONFLICT (event_id) DO NOTHING`,
    [`binding_event_dispatch_${suffix}`, "test:dispatch-suite"],
  );
  await pool.query(
    "SELECT work_management.scan_membership_authority($1,$2)",
    [scanId, new Date().toISOString()],
  );
  await pool.query(
    "SELECT set_config('work_management.operator_actor',$1,false)",
    ["test:dispatch-suite"],
  );
  await pool.query(
    "SELECT work_management.set_membership_rollout_mode($1,'commands',$2,$3,$4)",
    [
      `activate_${suffix}`,
      scanId,
      "test:dispatch-suite",
      new Date().toISOString(),
    ],
  );
}

async function dispatchCounts(
  pool: ReturnType<typeof createPostgresIntegrationTestPool>,
  requestId: string,
) {
  const values = [scope.tenantId, scope.workspaceId, scope.dealId, requestId];
  const results = await Promise.all([
    pool.query(
      "SELECT count(*)::int AS count FROM work_management.approval_decision_history WHERE tenant_id=$1 AND workspace_id=$2 AND deal_id=$3 AND approval_request_id=$4",
      values,
    ),
    pool.query(
      "SELECT count(*)::int AS count FROM work_management.target_command_dispatches WHERE tenant_id=$1 AND workspace_id=$2 AND deal_id=$3 AND approval_request_id=$4",
      values,
    ),
    pool.query(
      "SELECT count(*)::int AS count FROM platform.outbox WHERE tenant_id=$1 AND workspace_id=$2 AND deal_id=$3 AND aggregate_id=$4 AND event_type='work_management.target_command_ready'",
      values,
    ),
    pool.query(
      "SELECT count(*)::int AS count FROM work_management.aggregate_history WHERE tenant_id=$1 AND workspace_id=$2 AND deal_id=$3 AND aggregate_id=$4 AND event_type='approval.approved'",
      values,
    ),
  ]);
  return {
    decisions: results[0].rows[0].count,
    dispatches: results[1].rows[0].count,
    targetOutbox: results[2].rows[0].count,
    approvalEvents: results[3].rows[0].count,
  };
}

async function approvalCreationCounts(
  pool: ReturnType<typeof createPostgresIntegrationTestPool>,
  requestId: string,
  key: string,
) {
  const values = [scope.tenantId, scope.workspaceId, scope.dealId, requestId];
  const targetId = `${scope.workspaceId}|${scope.dealId}|${requestId}`;
  const queries = await Promise.all([
    pool.query(
      "SELECT count(*)::int AS count FROM work_management.approval_requests_current WHERE tenant_id=$1 AND workspace_id=$2 AND deal_id=$3 AND approval_request_id=$4",
      values,
    ),
    pool.query(
      "SELECT count(*)::int AS count FROM work_management.aggregate_history WHERE tenant_id=$1 AND workspace_id=$2 AND deal_id=$3 AND aggregate_id=$4",
      values,
    ),
    pool.query(
      "SELECT count(*)::int AS count FROM audit_activity.audit_events WHERE tenant_id=$1 AND workspace_id=$2 AND deal_id=$3 AND aggregate_id=$4",
      values,
    ),
    pool.query(
      "SELECT count(*)::int AS count FROM platform.outbox WHERE tenant_id=$1 AND workspace_id=$2 AND deal_id=$3 AND aggregate_id=$4",
      values,
    ),
    pool.query(
      "SELECT count(*)::int AS count FROM platform.idempotency_records WHERE tenant_id=$1 AND actor_id=$2 AND command_type='create_approval_request' AND target_id=$3 AND idempotency_key=$4",
      [scope.tenantId, requester.id, targetId, key],
    ),
    pool.query(
      "SELECT count(*)::int AS count FROM work_management.command_results WHERE tenant_id=$1 AND workspace_id=$2 AND deal_id=$3 AND aggregate_id=$4",
      values,
    ),
  ]);
  return {
    aggregate: queries[0].rows[0].count,
    history: queries[1].rows[0].count,
    audit: queries[2].rows[0].count,
    outbox: queries[3].rows[0].count,
    idempotency: queries[4].rows[0].count,
    results: queries[5].rows[0].count,
  };
}
