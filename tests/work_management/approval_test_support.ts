import { assertEquals } from "@std/assert";
import {
  action,
  authoritySnapshotReference,
  type AuthorizationDecision,
  field,
} from "../../src/platform/authz/v1.ts";
import { parseIdempotencyKey } from "../../src/platform/api/v1.ts";
import type {
  ApprovalAuthoritySnapshotPort,
  ApprovalEvidencePort,
  ApprovalTargetPort,
} from "../../src/work_management/approval_package_factory.ts";
import { createInMemoryWorkManagementTestComposition } from "../../src/work_management/composition.ts";
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
import type {
  EvidenceSnapshotReference,
  TargetReference,
} from "../../src/work_management/model.ts";

export const scope: WorkScope = {
  tenantId: tenant("tenant_approval-service"),
  workspaceId: workspace("workspace_approval-service"),
  dealId: deal("deal_approval-service"),
};

export const requester = {
  id: actor("actor_requester-service"),
  kind: "human" as const,
  state: "active" as const,
};

export const approver = {
  id: actor("actor_approver-service"),
  kind: "human" as const,
  state: "active" as const,
};

export const context = {
  actorId: requester.id,
  ...scope,
  correlationId:
    "cor_approval_service" as import("../../src/platform/api/v1.ts").CorrelationId,
  origin: "http" as const,
};

export function composition(
  authority: ApprovalAuthoritySnapshotPort = new NamedAuthorityPort(
    approver.id,
  ),
) {
  return createInMemoryWorkManagementTestComposition({
    authorization: { authorize: allow },
    clock: { now: () => "2026-08-06T12:00:00.000Z" },
    targets: new ExactTargetPort(),
    evidence: new ScopedEvidencePort(),
    authority,
  });
}

export async function openRequest(
  service:
    import("../../src/work_management/application_service.ts").WorkManagementService,
  suffix: string,
) {
  const draft = await service.createApprovalRequest({
    ...command(
      approvalRequestId(`approval_${suffix}`),
      `create-${suffix}`,
      requester,
    ),
    namedApproverId: approver.id,
    target: target(),
    evidence: [],
    payload: {},
  });
  return await service.openApprovalRequest({
    ...command(draft.id, `open-${suffix}`, requester, draft.version),
  });
}

export class ExactTargetPort implements ApprovalTargetPort {
  validate(
    expectedScope: WorkScope,
    value: TargetReference,
  ): Promise<TargetReference> {
    assertEquals(value.scope, expectedScope);
    return Promise.resolve(
      Object.freeze({ ...value, scope: Object.freeze({ ...value.scope }) }),
    );
  }

  currentVersion(value: TargetReference) {
    return Promise.resolve(value.expectedVersion);
  }
}

export class StaleTargetPort extends ExactTargetPort {
  override currentVersion() {
    return Promise.resolve(aggregateVersion(2));
  }
}

export class ScopedEvidencePort implements ApprovalEvidencePort {
  validate(
    _scope: WorkScope,
    values: readonly EvidenceSnapshotReference[],
  ): Promise<readonly EvidenceSnapshotReference[]> {
    if (values.some((value) => value.sourceId === "cross-deal")) {
      return Promise.reject(
        new Error(
          "Evidence reference is cross-Deal; expected exact Deal scope.",
        ),
      );
    }
    return Promise.resolve(
      Object.freeze(values.map((value) => Object.freeze({ ...value }))),
    );
  }
}

export class NamedAuthorityPort implements ApprovalAuthoritySnapshotPort {
  constructor(
    private readonly snapshotActorId:
      import("../../src/work_management/ids.ts").ActorId,
    private readonly requirementTarget?: TargetReference,
  ) {}

  resolve(input: Parameters<ApprovalAuthoritySnapshotPort["resolve"]>[0]) {
    const snapshot = {
      snapshotId: "authority-snapshot-v1",
      actorId: this.snapshotActorId,
      actorKind: "human" as const,
      policyVersion: "policy-v1",
      capturedAt: "2026-08-06T12:00:00.000Z",
      scope: input.scope,
    };
    return Promise.resolve({
      requirement: {
        commandType: targetCommandType("approve_evidence"),
        target: this.requirementTarget ?? input.target,
        namedApproverId: this.snapshotActorId,
        policyVersion: snapshot.policyVersion,
        snapshotReference: snapshot.snapshotId,
        scope: input.scope,
        effectiveAt: "2026-08-06T11:00:00.000Z",
        expiresAt: "2026-08-06T13:00:00.000Z",
        applicableLimits: [{ name: "max_amount", value: 1_000_000 }],
        humanOnly: true as const,
      },
      snapshot,
    });
  }
}

export function target(): TargetReference {
  return {
    aggregateType: "evidence",
    aggregateId: "evidence_one",
    expectedVersion: aggregateVersion(1),
    scope,
  };
}

export function command<Id extends string>(
  id: Id,
  key: string,
  commandActor: typeof requester | typeof approver | {
    readonly id: import("../../src/work_management/ids.ts").ActorId;
    readonly kind: "ai";
    readonly state: "active";
  },
  expectedVersion?: number,
) {
  const parsed = parseIdempotencyKey(`idem_${key}`);
  if (!parsed.ok) throw new Error(`Invalid test idempotency key "${key}".`);
  return {
    context: { ...context, actorId: commandActor.id },
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
    authoritySnapshotReference: authoritySnapshotReference(
      "authority-snapshot-v1",
    ),
  };
}

export function restrictiveProjection(): AuthorizationDecision {
  return {
    outcome: "allow",
    reasonCode: "ALLOWED",
    allowedActions: [action("open")],
    approvedScope: undefined as never,
    fieldMask: {
      include: [
        field("id"),
        field("workflow_state"),
        field("package_payload"),
        field("evidence_references"),
        field("requester_id"),
        field("named_approver_id"),
        field("authority_snapshot"),
        field("target"),
      ],
      omit: [field("requester_id"), field("named_approver_id")],
      redact: [],
      approvedClassifications: [
        { name: field("id"), classification: "public" },
        { name: field("workflow_state"), classification: "restricted" },
      ],
    },
  };
}
