import type { ActorReference } from "../platform/authz/v1.ts";
import type { AggregateVersion, CorrelationId } from "../platform/api/v1.ts";
import type { WorkScope } from "./ids.ts";
import type { ApprovalRequest } from "./model.ts";
import type { AuthorityProofReference } from "./authority_proof.ts";

export interface TargetCommandDispatch extends WorkScope {
  readonly dispatchId: string;
  readonly approvalRequestId: ApprovalRequest["id"];
  readonly approvalRequestVersion: AggregateVersion;
  readonly decisionId: NonNullable<ApprovalRequest["decision"]>["id"];
  readonly outcome: "approved";
  readonly targetAggregateType: string;
  readonly targetAggregateId: string;
  readonly expectedTargetVersion: AggregateVersion;
  readonly packageId: ApprovalRequest["package"]["id"];
  readonly packageVersion: number;
  readonly packageDigest: string;
  readonly authoritySnapshotReference: string;
  readonly actor: ActorReference;
  readonly commandType: string;
  readonly correlationId: CorrelationId;
  readonly causationId: string;
  readonly idempotencyIdentity: string;
  readonly recordedAt: string;
  readonly authorityProof?: AuthorityProofReference;
}

/** Builds the foreign-context command envelope without executing it. */
export function targetCommandDispatch(input: {
  readonly dispatchId: string;
  readonly request: ApprovalRequest;
  readonly actor: ActorReference;
  readonly commandType: string;
  readonly correlationId: CorrelationId;
  readonly causationId: string;
  readonly idempotencyIdentity: string;
  readonly recordedAt: string;
  readonly authorityProof?: AuthorityProofReference;
}): TargetCommandDispatch | undefined {
  const decision = input.request.decision;
  if (decision?.outcome !== "approved") return;
  const packageValue = input.request.package;
  return Object.freeze({
    dispatchId: input.dispatchId,
    tenantId: input.request.tenantId,
    workspaceId: input.request.workspaceId,
    dealId: input.request.dealId,
    approvalRequestId: input.request.id,
    approvalRequestVersion: input.request.version,
    decisionId: decision.id,
    outcome: "approved",
    targetAggregateType: packageValue.target.aggregateType,
    targetAggregateId: packageValue.target.aggregateId,
    expectedTargetVersion: packageValue.target.expectedVersion,
    packageId: packageValue.id,
    packageVersion: packageValue.version,
    packageDigest: packageValue.contentDigest,
    authoritySnapshotReference: packageValue.authority.snapshotReference,
    actor: Object.freeze({ ...input.actor }),
    commandType: input.commandType,
    correlationId: input.correlationId,
    causationId: input.causationId,
    idempotencyIdentity: input.idempotencyIdentity,
    recordedAt: input.recordedAt,
    ...(input.authorityProof === undefined
      ? {}
      : { authorityProof: Object.freeze({ ...input.authorityProof }) }),
  });
}

export function parseTargetCommandDispatch(
  value: unknown,
): TargetCommandDispatch {
  if (!isTargetCommandDispatch(value)) {
    throw new Error(
      `Target command dispatch "${
        String(value)
      }" is invalid; expected the complete immutable dispatch shape.`,
    );
  }
  return Object.freeze(structuredClone(value));
}

function isTargetCommandDispatch(
  value: unknown,
): value is TargetCommandDispatch {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }
  const candidate = value as Record<string, unknown>;
  const allowedKeys = [
    "dispatchId",
    "tenantId",
    "workspaceId",
    "dealId",
    "approvalRequestId",
    "approvalRequestVersion",
    "decisionId",
    "outcome",
    "targetAggregateType",
    "targetAggregateId",
    "expectedTargetVersion",
    "packageId",
    "packageVersion",
    "packageDigest",
    "authoritySnapshotReference",
    "actor",
    "commandType",
    "correlationId",
    "causationId",
    "idempotencyIdentity",
    "recordedAt",
    "authorityProof",
  ];
  if (Object.keys(candidate).some((key) => !allowedKeys.includes(key))) {
    return false;
  }
  const strings = [
    "dispatchId",
    "tenantId",
    "workspaceId",
    "dealId",
    "approvalRequestId",
    "decisionId",
    "targetAggregateType",
    "targetAggregateId",
    "packageId",
    "packageDigest",
    "authoritySnapshotReference",
    "commandType",
    "correlationId",
    "causationId",
    "idempotencyIdentity",
    "recordedAt",
  ];
  return strings.every((key) =>
    typeof candidate[key] === "string" &&
    (candidate[key] as string).length > 0
  ) &&
    candidate.outcome === "approved" &&
    positiveVersion(candidate.approvalRequestVersion) &&
    positiveVersion(candidate.expectedTargetVersion) &&
    positiveVersion(candidate.packageVersion) &&
    isActor(candidate.actor) &&
    (candidate.authorityProof === undefined ||
      isAuthorityProofReference(candidate.authorityProof));
}

function positiveVersion(value: unknown): boolean {
  return Number.isSafeInteger(value) && Number(value) > 0;
}

function isActor(value: unknown): value is ActorReference {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }
  const record = value as Record<string, unknown>;
  return Object.keys(record).length === 3 &&
    typeof record.id === "string" && record.id.length > 0 &&
    (record.kind === "human" || record.kind === "ai" ||
      record.kind === "service" || record.kind === "external") &&
    (record.state === "active" || record.state === "inactive" ||
      record.state === "revoked");
}

function isAuthorityProofReference(
  value: unknown,
): value is AuthorityProofReference {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }
  const record = value as Record<string, unknown>;
  return Object.keys(record).length === 5 &&
    typeof record.proofId === "string" &&
    record.proofVersion === 1 &&
    typeof record.evaluationId === "string" &&
    typeof record.evaluationDigest === "string" &&
    /^[0-9a-f]{64}$/.test(record.evaluationDigest) &&
    typeof record.proofDigest === "string" &&
    /^[0-9a-f]{64}$/.test(record.proofDigest);
}
