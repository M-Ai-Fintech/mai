import type { ActorReference } from "../platform/authz/v1.ts";
import type { AggregateVersion, CorrelationId } from "../platform/api/v1.ts";
import {
  parseActorId,
  parseCorrelationId,
  parseDealId,
  parseIdempotencyKey,
  parseTenantId,
  parseWorkspaceId,
} from "../platform/api/v1.ts";
import {
  approvalDecisionId,
  approvalPackageId,
  approvalRequestId,
  targetCommandType,
} from "./ids.ts";
import type { WorkScope } from "./ids.ts";
import { type ApprovalRequest, WorkManagementError } from "./model.ts";
import {
  type AuthorityProofReference,
  parseAuthorityProofReference,
} from "./authority_proof.ts";

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
    throw new WorkManagementError(
      "INVALID_INPUT",
      `Target command dispatch "${
        String(value)
      }" is invalid; expected the complete immutable dispatch shape.`,
    );
  }
  return Object.freeze(structuredClone(value));
}

/** Verifies the digest relation for persisted authority-proof references. */
export async function parseTargetCommandDispatchVerified(
  value: unknown,
): Promise<TargetCommandDispatch> {
  const dispatch = parseTargetCommandDispatch(value);
  if (dispatch.authorityProof !== undefined) {
    await parseAuthorityProofReference(dispatch.authorityProof);
  }
  return dispatch;
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
  try {
    requiredPrefixed(
      candidate.dispatchId,
      "work_target_command_",
      "dispatch ID",
    );
    requiredScope(candidate);
    approvalRequestId(
      requiredText(candidate.approvalRequestId, "approval request ID"),
    );
    approvalDecisionId(requiredText(candidate.decisionId, "decision ID"));
    approvalPackageId(requiredText(candidate.packageId, "package ID"));
    targetCommandType(requiredText(candidate.commandType, "command type"));
    requiredSelector(candidate.targetAggregateType, "target aggregate type");
    requiredSelector(candidate.targetAggregateId, "target aggregate ID");
    requiredText(
      candidate.authoritySnapshotReference,
      "authority snapshot reference",
    );
    requiredPrefixed(candidate.causationId, "work_event_", "causation ID");
    if (!isDigest(candidate.packageDigest)) {
      throw invalid("package digest", "SHA-256 hex");
    }
    if (!isCanonicalInstant(candidate.recordedAt)) {
      throw invalid("recordedAt", "canonical ISO timestamp");
    }
    if (candidate.outcome !== "approved") throw invalid("outcome", "approved");
    if (!positiveVersion(candidate.approvalRequestVersion)) {
      throw invalid("approval request version", "positive integer");
    }
    if (!positiveVersion(candidate.expectedTargetVersion)) {
      throw invalid("target version", "positive integer");
    }
    if (!positiveVersion(candidate.packageVersion)) {
      throw invalid("package version", "positive integer");
    }
    if (!isActor(candidate.actor)) {
      throw invalid("actor", "active actor reference");
    }
    requiredIdentity(candidate.idempotencyIdentity, candidate);
    if (
      candidate.authorityProof !== undefined &&
      !isAuthorityProofReference(candidate.authorityProof)
    ) {
      throw invalid("authority proof", "complete proof reference");
    }
    return true;
  } catch {
    return false;
  }
}

function requiredScope(candidate: Record<string, unknown>): void {
  const tenant = candidate.tenantId;
  const workspace = candidate.workspaceId;
  const deal = candidate.dealId;
  if (
    !parseTenantId(tenant).ok || !parseWorkspaceId(workspace).ok ||
    !parseDealId(deal).ok
  ) {
    throw new Error("invalid dispatch scope");
  }
  if (!isCorrelation(candidate.correlationId)) {
    throw new Error("invalid correlation ID");
  }
}

function isCorrelation(value: unknown): value is string {
  return parseCorrelationId(value).ok;
}

function requiredText(value: unknown, label: string): string {
  if (
    typeof value === "string" &&
    /^[A-Za-z][A-Za-z0-9_.:|/-]{0,255}$/.test(value)
  ) return value;
  throw invalid(label, "bounded canonical text");
}

function requiredSelector(value: unknown, label: string): string {
  if (
    typeof value === "string" &&
    /^[a-z][a-z0-9]*(?:[_-][a-z0-9]+)*$/.test(value) && value.length <= 128
  ) return value;
  throw invalid(label, "lowercase semantic selector");
}

function requiredPrefixed(
  value: unknown,
  prefix: string,
  label: string,
): string {
  if (
    typeof value === "string" && value.startsWith(prefix) &&
    /^[A-Za-z0-9_.:-]+$/.test(value.slice(prefix.length)) &&
    value.length <= 255
  ) return value;
  throw invalid(label, `bounded value with prefix ${prefix}`);
}

function requiredIdentity(
  value: unknown,
  candidate: Record<string, unknown>,
): void {
  if (typeof value !== "string" || value.length > 512) {
    throw invalid(
      "idempotency identity",
      "scope-, actor-, command-, request-, and key-bound identity",
    );
  }
  const parts = value.split("|");
  const [
    tenantId,
    workspaceId,
    dealId,
    actorId,
    sourceCommand,
    requestId,
    key,
  ] = parts;
  const actor = candidate.actor as Record<string, unknown>;
  if (
    parts.length === 7 &&
    parseTenantId(tenantId).ok &&
    parseWorkspaceId(workspaceId).ok &&
    parseDealId(dealId).ok &&
    parseActorId(actorId).ok &&
    parseIdempotencyKey(key).ok &&
    tenantId === candidate.tenantId &&
    workspaceId === candidate.workspaceId &&
    dealId === candidate.dealId &&
    actorId === actor.id &&
    sourceCommand === "approve_approval_request" &&
    requestId === candidate.approvalRequestId
  ) return;
  throw invalid(
    "idempotency identity",
    "scope-, actor-, source-command-, request-, and key-bound identity",
  );
}

function isDigest(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{64}$/.test(value);
}

function isCanonicalInstant(value: unknown): value is string {
  if (
    typeof value !== "string" ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value)
  ) return false;
  return new Date(value).toISOString() === value;
}

function invalid(label: string, expected: string): Error {
  return new WorkManagementError(
    "INVALID_INPUT",
    `Target command ${label} is invalid; expected ${expected}.`,
  );
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
    parseActorId(record.id).ok &&
    record.kind === "human" &&
    record.state === "active";
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
    /^authority_proof_v1_[0-9a-f]{64}$/.test(record.proofId) &&
    record.proofVersion === 1 &&
    typeof record.evaluationId === "string" &&
    /^[A-Za-z][A-Za-z0-9_.:-]{0,255}$/.test(record.evaluationId) &&
    typeof record.evaluationDigest === "string" &&
    /^[0-9a-f]{64}$/.test(record.evaluationDigest) &&
    typeof record.proofDigest === "string" &&
    /^[0-9a-f]{64}$/.test(record.proofDigest) &&
    record.proofId === `authority_proof_v1_${record.proofDigest}`;
}
