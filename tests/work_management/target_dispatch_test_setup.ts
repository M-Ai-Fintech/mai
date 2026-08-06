import type {
  AuditEventDraft,
  AuditEventId,
} from "../../src/audit_activity/model.ts";
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
  PostgresTransactionRunner,
  type TransactionHandle,
} from "../../src/platform/persistence/v1.ts";
import type {
  ApprovalAuthoritySnapshotPort,
  ApprovalEvidencePort,
  ApprovalTargetPort,
} from "../../src/work_management/approval_package_factory.ts";
import { createPostgresWorkManagementComposition } from "../../src/work_management/composition.ts";
import { WorkManagementAuthorityDeniedError } from "../../src/work_management/command_unit_of_work.ts";
import type { WorkManagementEvent } from "../../src/work_management/events.ts";
import {
  actor,
  aggregateVersion,
  deal,
  targetCommandType,
  tenant,
  type WorkScope,
  workspace,
} from "../../src/work_management/ids.ts";
import type {
  EvidenceSnapshotReference,
  TargetReference,
} from "../../src/work_management/model.ts";
import type { WorkManagementAuditPort } from "../../src/work_management/transactional_effects.ts";
export const scope: WorkScope = {
  tenantId: tenant("tenant_dispatch-pg"),
  workspaceId: workspace("workspace_dispatch-pg"),
  dealId: deal("deal_dispatch-pg"),
};
export const requester = actorRef("actor_dispatch-requester");
export const approver = actorRef("actor_dispatch-approver");

export function composition(
  runner: PostgresTransactionRunner,
  outbox?: Pick<OutboxRepository, "append">,
  ports?: CountingApprovalPorts,
) {
  return createPostgresWorkManagementComposition({
    mode: "commands",
    transactions: runner,
    audit: new RecordingAuditPort(),
    ...(outbox === undefined ? {} : { outbox }),
    authorization: {
      authorize: allow,
      transactionSafe: true,
      transactionMode: "postgres_transaction_local",
    },
    clock: { now: () => "2026-08-06T12:00:00.000Z" },
    targets: ports ?? new ExactTargetPort(),
    evidence: ports ?? new EmptyEvidencePort(),
    authority: ports ?? new NamedAuthorityPort(),
  });
}

export class CountingApprovalPorts
  implements
    ApprovalTargetPort,
    ApprovalEvidencePort,
    ApprovalAuthoritySnapshotPort {
  readonly transactionSafe = true as const;
  readonly transactionMode = "postgres_transaction_local" as const;
  readonly calls = { target: 0, evidence: 0, authority: 0 };

  constructor(private readonly denyAmount = false) {}

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
        applicableLimits: this.denyAmount
          ? [{ name: "amount_minor_ceiling", value: 1 }]
          : [],
        humanOnly: true as const,
      },
      facts: authorityFacts(input.target, input.scope),
    });
  }
}

export function compositionWithMode(
  runner: PostgresTransactionRunner,
  mode: "disabled" | "read_only" | "commands",
  ports: CountingApprovalPorts,
) {
  return createPostgresWorkManagementComposition({
    mode,
    transactions: runner,
    audit: new RecordingAuditPort(),
    authorization: {
      authorize: allow,
      transactionSafe: true,
      transactionMode: "postgres_transaction_local",
    },
    clock: { now: () => "2026-08-06T12:00:00.000Z" },
    targets: ports,
    evidence: ports,
    authority: ports,
  });
}

export async function assertDenied(
  operation: () => Promise<unknown>,
): Promise<WorkManagementAuthorityDeniedError> {
  try {
    await operation();
  } catch (error) {
    if (error instanceof WorkManagementAuthorityDeniedError) return error;
    throw error;
  }
  throw new Error("Expected a governed authority denial.");
}

export function evidenceDigest(
  error: WorkManagementAuthorityDeniedError,
): string {
  if ("denialDigest" in error.evidence) return error.evidence.denialDigest;
  return error.evidence.digest;
}

export class FailingTargetOutbox implements Pick<OutboxRepository, "append"> {
  readonly transactionSafe = true as const;
  readonly transactionMode = "postgres_transaction_local" as const;
  private readonly delegate = new OutboxRepository();

  append(transaction: TransactionHandle, event: OutboxEvent): Promise<void> {
    if (event.eventType === "work_management.target_command_ready") {
      return Promise.reject(new Error("target-dispatch-failure"));
    }
    return this.delegate.append(transaction, event);
  }
}

export class ExactTargetPort implements ApprovalTargetPort {
  readonly transactionSafe = true as const;
  readonly transactionMode = "postgres_transaction_local" as const;
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

export class EmptyEvidencePort implements ApprovalEvidencePort {
  readonly transactionSafe = true as const;
  readonly transactionMode = "postgres_transaction_local" as const;
  validate(
    _scope: WorkScope,
    values: readonly EvidenceSnapshotReference[],
  ): Promise<readonly EvidenceSnapshotReference[]> {
    return Promise.resolve(values);
  }
}

export class NamedAuthorityPort implements ApprovalAuthoritySnapshotPort {
  readonly transactionSafe = true as const;
  readonly transactionMode = "postgres_transaction_local" as const;
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

export function authorityFacts(target: TargetReference, scope: WorkScope) {
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

export class RecordingAuditPort implements WorkManagementAuditPort {
  readonly transactionSafe = true as const;
  readonly transactionMode = "postgres_transaction_local" as const;
  private readonly repository = new PostgresAuditEventRepository();

  async append(transaction: TransactionHandle, event: WorkManagementEvent) {
    const draft = await auditDraft(event);
    await this.repository.append(transaction, draft);
    return draft.eventId;
  }
}

export async function auditDraft(
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

export function target(suffix: string): TargetReference {
  return {
    aggregateType: "evidence",
    aggregateId: `evidence_${suffix}`,
    expectedVersion: aggregateVersion(1),
    scope,
  };
}

export function actorRef(value: string) {
  return { id: actor(value), kind: "human" as const, state: "active" as const };
}

export function command<Id extends string>(
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

export function allow(): AuthorizationDecision {
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
