import { payloadDigest } from "../platform/persistence/v1.ts";
import type { ActorId, TargetCommandType, WorkScope } from "./ids.ts";
import type { AuthorityEvaluation } from "./authority_evaluation.ts";
import { WorkManagementError } from "./model.ts";

export const AUTHORITY_DENIAL_REASONS = [
  "NAMED_APPROVER_MISMATCH",
  "POLICY_VERSION_MISMATCH",
  "SNAPSHOT_REFERENCE_MISMATCH",
  "REQUESTED_ACTION_MISMATCH",
  "TARGET_TYPE_MISMATCH",
  "TARGET_ID_MISMATCH",
  "TARGET_VERSION_MISMATCH",
  "AUTHORITY_NOT_YET_EFFECTIVE",
  "AUTHORITY_EXPIRED",
  "AUTHORIZATION_SNAPSHOT_MISMATCH",
  "HUMAN_ONLY_AUTHORITY_REQUIRED",
  "AMOUNT_CEILING_EXCEEDED",
  "CURRENCY_MISMATCH",
  "PERCENTAGE_CEILING_EXCEEDED",
  "MANDATE_MISSING",
  "MANDATE_INACTIVE",
  "MANDATE_ID_MISMATCH",
  "MANDATE_VERSION_MISMATCH",
  "CATEGORY_MISMATCH",
  "DEAL_SCOPE_MISMATCH",
] as const;

export type AuthorityDenialReason = typeof AUTHORITY_DENIAL_REASONS[number];
export type AuthorityDenialStage = "pre_package" | "limit_evaluation";

export interface AuthorityDenial {
  readonly schemaVersion: 1;
  readonly denialId: string;
  readonly denialDigest: string;
  readonly stage: AuthorityDenialStage;
  readonly scope: WorkScope;
  readonly requesterId: ActorId;
  readonly namedApproverId: ActorId;
  readonly requestedAction: TargetCommandType;
  readonly resolvedAction?: TargetCommandType;
  readonly targetAggregateType?: string;
  readonly targetAggregateId?: string;
  readonly expectedTargetVersion?: number;
  readonly policyVersion?: string;
  readonly snapshotReference?: string;
  readonly authorizationSnapshotReference?: string;
  readonly effectiveAt?: string;
  readonly expiresAt?: string;
  readonly reasons: readonly AuthorityDenialReason[];
  readonly evaluatedAt: string;
  readonly idempotencyIdentity: string;
  readonly packageReference?: string;
}

export interface AuthorityDenialInput
  extends Omit<AuthorityDenial, "denialId" | "denialDigest" | "schemaVersion"> {
  readonly packageReference?: string;
}

export class AuthorityDenialError extends WorkManagementError {
  constructor(readonly evidence: AuthorityDenial | AuthorityEvaluation) {
    super(
      "HUMAN_AUTHORITY_REQUIRED",
      denialMessage(evidence.reasons),
    );
    this.name = "AuthorityDenialError";
  }
}

function denialMessage(reasons: readonly string[]): string {
  const details = reasons.map((reason) => {
    if (reason === "NAMED_APPROVER_MISMATCH") {
      return "named approver does not match";
    }
    if (reason === "REQUESTED_ACTION_MISMATCH") {
      return "requested approval action does not match the server-approved command";
    }
    if (reason === "TARGET_ID_MISMATCH") {
      return "target differs from the governed target";
    }
    return reason.toLowerCase().replaceAll("_", " ");
  });
  return `Approval authority denied the command; ${
    details.join("; ")
  }; reasons: ${reasons.join(", ")}.`;
}

export async function createAuthorityDenial(
  input: AuthorityDenialInput,
): Promise<AuthorityDenial> {
  const body = { schemaVersion: 1 as const, ...input };
  const denialDigest = await payloadDigest(body);
  return deepFreeze({
    ...body,
    denialId: `authority_denial_v1_${denialDigest}`,
    denialDigest,
  });
}

export async function parseAuthorityDenial(
  value: unknown,
): Promise<AuthorityDenial> {
  if (!isRecord(value)) throw invalid(value, "an authority denial object");
  const { denialId, denialDigest, ...body } = value;
  if (typeof denialId !== "string" || typeof denialDigest !== "string") {
    throw invalid(value, "denialId and denialDigest");
  }
  const expected = await payloadDigest(body);
  if (
    expected !== denialDigest || denialId !== `authority_denial_v1_${expected}`
  ) {
    throw invalid(value, "an exact denial digest and ID");
  }
  const reasons = body.reasons;
  if (
    !Array.isArray(reasons) || reasons.length === 0 ||
    reasons.some((reason) =>
      !AUTHORITY_DENIAL_REASONS.includes(reason as AuthorityDenialReason)
    )
  ) throw invalid(reasons, "supported authority denial reasons");
  return deepFreeze({
    ...(body as Omit<AuthorityDenial, "denialId" | "denialDigest">),
    denialId,
    denialDigest,
  });
}

function deepFreeze(value: AuthorityDenial): AuthorityDenial {
  Object.freeze(value.scope);
  Object.freeze(value.reasons);
  return Object.freeze(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function invalid(value: unknown, expected: string): WorkManagementError {
  return new WorkManagementError(
    "INVALID_INPUT",
    `Authority denial value "${
      String(value)
    }" is invalid; expected ${expected}.`,
  );
}

export function denialReasonFromMessage(
  message: string,
): AuthorityDenialReason | undefined {
  const normalized = message.toLowerCase();
  if (normalized.includes("named approver") || normalized.includes("actor")) {
    return "NAMED_APPROVER_MISMATCH";
  }
  if (normalized.includes("policy")) return "POLICY_VERSION_MISMATCH";
  if (normalized.includes("authorization reference")) {
    return "AUTHORIZATION_SNAPSHOT_MISMATCH";
  }
  if (normalized.includes("target")) return "TARGET_ID_MISMATCH";
  if (normalized.includes("snapshot")) return "SNAPSHOT_REFERENCE_MISMATCH";
  if (normalized.includes("requested approval action")) {
    return "REQUESTED_ACTION_MISMATCH";
  }
  if (normalized.includes("scope")) return "DEAL_SCOPE_MISMATCH";
  if (normalized.includes("not yet effective")) {
    return "AUTHORITY_NOT_YET_EFFECTIVE";
  }
  if (normalized.includes("expired")) return "AUTHORITY_EXPIRED";
  if (normalized.includes("human")) return "HUMAN_ONLY_AUTHORITY_REQUIRED";
  return undefined;
}
