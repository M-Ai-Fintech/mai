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

export type TrustedAuthorityFailureKind =
  | "governed_denial"
  | "invalid_trusted_response"
  | "dependency_failure";

export class GovernedAuthorityDenialError extends WorkManagementError {
  readonly kind = "governed_denial" as const;

  constructor(
    readonly reason: AuthorityDenialReason,
    message: string,
  ) {
    super("HUMAN_AUTHORITY_REQUIRED", message);
    this.name = "GovernedAuthorityDenialError";
  }
}

export class InvalidTrustedAuthorityResponseError extends WorkManagementError {
  readonly kind = "invalid_trusted_response" as const;

  constructor(message: string) {
    super("REFERENCE_MISMATCH", message);
    this.name = "InvalidTrustedAuthorityResponseError";
  }
}

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
  assertExactFields(value, denialFields());
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
  const reasons = parseReasons(body.reasons);
  const scope = parseScope(body.scope);
  const parsed = {
    schemaVersion: exactOne(body.schemaVersion),
    denialId,
    denialDigest,
    stage: parseStage(body.stage),
    scope,
    requesterId: identifier(body.requesterId, "requester ID"),
    namedApproverId: identifier(body.namedApproverId, "named approver ID"),
    requestedAction: identifier(body.requestedAction, "requested action"),
    ...optionalIdentifier(body, "resolvedAction", "resolved action"),
    ...optionalIdentifier(body, "targetAggregateType", "target aggregate type"),
    ...optionalIdentifier(body, "targetAggregateId", "target aggregate ID"),
    ...optionalPositiveInteger(body, "expectedTargetVersion", "target version"),
    ...optionalIdentifier(body, "policyVersion", "policy version"),
    ...optionalIdentifier(body, "snapshotReference", "snapshot reference"),
    ...optionalIdentifier(
      body,
      "authorizationSnapshotReference",
      "authorization snapshot reference",
    ),
    ...optionalInstant(body, "effectiveAt", "effective time"),
    ...optionalInstant(body, "expiresAt", "expiry time"),
    reasons,
    evaluatedAt: instant(body.evaluatedAt, "evaluated time"),
    idempotencyIdentity: identifier(
      body.idempotencyIdentity,
      "idempotency identity",
    ),
    ...optionalIdentifier(body, "packageReference", "package reference"),
  } as AuthorityDenial;
  assertTargetFields(parsed);
  return deepFreeze({
    ...parsed,
    denialId,
    denialDigest,
  });
}

function denialFields(): readonly string[] {
  return [
    "schemaVersion",
    "denialId",
    "denialDigest",
    "stage",
    "scope",
    "requesterId",
    "namedApproverId",
    "requestedAction",
    "resolvedAction",
    "targetAggregateType",
    "targetAggregateId",
    "expectedTargetVersion",
    "policyVersion",
    "snapshotReference",
    "authorizationSnapshotReference",
    "effectiveAt",
    "expiresAt",
    "reasons",
    "evaluatedAt",
    "idempotencyIdentity",
    "packageReference",
  ];
}

function assertExactFields(
  value: Record<string, unknown>,
  expected: readonly string[],
): void {
  const unexpected = Object.keys(value).find((key) => !expected.includes(key));
  if (unexpected !== undefined) {
    throw invalid(unexpected, "only approved fields");
  }
}

function parseScope(value: unknown): WorkScope {
  if (!isRecord(value)) {
    throw invalid(value, "tenant, workspace, and Deal scope");
  }
  assertExactFields(value, ["tenantId", "workspaceId", "dealId"]);
  return Object.freeze({
    tenantId: identifier(value.tenantId, "tenant ID") as WorkScope["tenantId"],
    workspaceId: identifier(
      value.workspaceId,
      "workspace ID",
    ) as WorkScope["workspaceId"],
    dealId: identifier(value.dealId, "Deal ID") as WorkScope["dealId"],
  });
}

function parseReasons(value: unknown): readonly AuthorityDenialReason[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw invalid(value, "one or more supported denial reasons");
  }
  const reasons = value.map((reason) => {
    if (
      typeof reason !== "string" ||
      !AUTHORITY_DENIAL_REASONS.includes(reason as AuthorityDenialReason)
    ) {
      throw invalid(reason, "a supported denial reason");
    }
    return reason as AuthorityDenialReason;
  });
  if (new Set(reasons).size !== reasons.length) {
    throw invalid(reasons, "unique denial reasons");
  }
  return Object.freeze(reasons);
}

function parseStage(value: unknown): AuthorityDenialStage {
  if (value === "pre_package" || value === "limit_evaluation") return value;
  throw invalid(value, "pre_package or limit_evaluation");
}

function exactOne(value: unknown): 1 {
  if (value === 1) return 1;
  throw invalid(value, "authority denial schema version 1");
}

function identifier(value: unknown, label: string): string {
  if (
    typeof value === "string" && value.trim().length > 0 && value.length <= 256
  ) return value;
  throw invalid(value, `${label} with 1-256 characters`);
}

function optionalIdentifier(
  value: Record<string, unknown>,
  key: string,
  label: string,
): Record<string, string> {
  return value[key] === undefined
    ? {}
    : { [key]: identifier(value[key], label) };
}

function optionalPositiveInteger(
  value: Record<string, unknown>,
  key: string,
  label: string,
): Record<string, number> {
  if (value[key] === undefined) return {};
  if (Number.isSafeInteger(value[key]) && Number(value[key]) > 0) {
    return { [key]: Number(value[key]) };
  }
  throw invalid(value[key], `${label} as a positive safe integer`);
}

function optionalInstant(
  value: Record<string, unknown>,
  key: string,
  label: string,
): Record<string, string> {
  return value[key] === undefined ? {} : { [key]: instant(value[key], label) };
}

function instant(value: unknown, label: string): string {
  if (typeof value !== "string" || new Date(value).toISOString() !== value) {
    throw invalid(value, `${label} as a canonical ISO-8601 UTC instant`);
  }
  return value;
}

function assertTargetFields(value: AuthorityDenial): void {
  const fields = [
    value.targetAggregateType,
    value.targetAggregateId,
    value.expectedTargetVersion,
  ];
  if (
    fields.some((field) => field !== undefined) &&
    fields.some((field) => field === undefined)
  ) {
    throw invalid(fields, "all target identity fields together or none");
  }
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
