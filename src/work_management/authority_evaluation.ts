import { payloadDigest } from "../platform/persistence/v1.ts";
import {
  assertAuthorityEffective,
  assertExactPackage,
  assertScope,
  stableSerialize,
  WorkManagementError,
} from "./model.ts";
import type { ApprovalPackage } from "./model.ts";
import type { AuthorityFacts } from "./authority_facts.ts";
import {
  type AuthorityEvaluationReason,
  type AuthorityLimitResult,
  evaluateAuthorityLimits,
  parseTypedAuthorityLimits,
  type TypedAuthorityLimit,
} from "./authority_limits.ts";
import {
  assertEvaluationIdentity,
  evaluationBodyFromRecord,
  evaluationReasons,
  evaluationRecord,
  freezeEvaluation,
  parseEvaluationFields,
} from "./authority_evaluation_parser.ts";

export interface AuthorityEvaluationRequirement {
  readonly packageId: string;
  readonly packageVersion: number;
  readonly packageDigest: string;
}

export interface AuthorityEvaluationWindow {
  readonly effectiveAt: string;
  readonly expiresAt: string;
}

export interface AuthorityEvaluation {
  readonly schemaVersion: 1;
  readonly evaluationId: string;
  readonly requirement: AuthorityEvaluationRequirement;
  readonly policyVersion: string;
  readonly snapshotReference: string;
  readonly commandType: string;
  readonly targetAggregateType: string;
  readonly targetAggregateId: string;
  readonly expectedTargetVersion: number;
  readonly approverId: string;
  readonly scope: ApprovalPackage["target"]["scope"];
  readonly facts: AuthorityFacts;
  readonly limits: readonly TypedAuthorityLimit[];
  readonly limitResults: readonly AuthorityLimitResult[];
  readonly outcome: "allowed" | "denied";
  readonly reasons: readonly AuthorityEvaluationReason[];
  readonly window: AuthorityEvaluationWindow;
  readonly evaluatedAt: string;
  readonly digest: string;
}

export interface AuthorityEvaluationInput {
  readonly package: ApprovalPackage;
  readonly expectedPackage: ApprovalPackage;
  readonly facts: AuthorityFacts;
  readonly evaluatedAt: string;
}

/** Evaluates every authority limit and emits a digest-bound immutable record. */
export async function evaluateApprovalAuthority(
  input: AuthorityEvaluationInput,
): Promise<AuthorityEvaluation> {
  validateBindings(input);
  const limits = parseTypedAuthorityLimits(
    input.package.authority.applicableLimits,
  );
  const limitResults = evaluateAuthorityLimits(limits, input.facts);
  const windowReason = authorityWindowReason(input);
  const reasons = evaluationReasons(limitResults, windowReason);
  const body = evaluationBody(input, limits, limitResults, reasons);
  const digest = await payloadDigest(body);
  return freezeEvaluation({
    ...body,
    evaluationId: `authority_evaluation_v1_${digest}`,
    digest,
  });
}

/** Deeply validates a persisted authority evaluation and recomputes its digest. */
export async function parseAuthorityEvaluation(
  value: unknown,
): Promise<AuthorityEvaluation> {
  const record = evaluationRecord(value);
  const parsed = parseEvaluationFields(record);
  const expectedDigest = await payloadDigest(evaluationBodyFromRecord(parsed));
  assertEvaluationIdentity(parsed, expectedDigest);
  return freezeEvaluation(parsed);
}

function validateBindings(input: AuthorityEvaluationInput): void {
  assertExactPackage(input.expectedPackage, input.package);
  assertScope(
    input.package.target.scope,
    input.facts.scope,
    "Authority evaluation",
  );
  if (
    stableSerialize(input.package.target) !==
      stableSerialize(input.facts.target)
  ) {
    throw new WorkManagementError(
      "REFERENCE_MISMATCH",
      `Authority evaluation facts target "${input.facts.target.aggregateId}" does not match package target "${input.package.target.aggregateId}"; expected exact aggregate, scope, and version.`,
    );
  }
}

function authorityWindowReason(
  input: AuthorityEvaluationInput,
): AuthorityEvaluationReason | undefined {
  try {
    assertAuthorityEffective(
      input.package.authority,
      input.evaluatedAt,
      input.package.id,
    );
    return undefined;
  } catch (error) {
    if (
      error instanceof WorkManagementError &&
      error.code === "HUMAN_AUTHORITY_REQUIRED"
    ) {
      return "AUTHORITY_WINDOW_INACTIVE";
    }
    throw error;
  }
}

function evaluationBody(
  input: AuthorityEvaluationInput,
  limits: readonly TypedAuthorityLimit[],
  limitResults: readonly AuthorityLimitResult[],
  reasons: readonly AuthorityEvaluationReason[],
) {
  const packageValue = input.package;
  return {
    schemaVersion: 1 as const,
    requirement: {
      packageId: packageValue.id,
      packageVersion: packageValue.version,
      packageDigest: packageValue.contentDigest,
    },
    policyVersion: packageValue.authority.policyVersion,
    snapshotReference: packageValue.authority.snapshotReference,
    commandType: packageValue.authority.commandType,
    targetAggregateType: packageValue.target.aggregateType,
    targetAggregateId: packageValue.target.aggregateId,
    expectedTargetVersion: Number(packageValue.target.expectedVersion),
    approverId: packageValue.authority.namedApproverId,
    scope: packageValue.target.scope,
    facts: input.facts,
    limits,
    limitResults,
    outcome: reasons[0] === "AUTHORITY_ALLOWED"
      ? "allowed" as const
      : "denied" as const,
    reasons,
    window: {
      effectiveAt: packageValue.authority.effectiveAt,
      expiresAt: packageValue.authority.expiresAt,
    },
    evaluatedAt: canonicalInstant(
      input.evaluatedAt,
      "Authority evaluation time",
    ),
  };
}

function canonicalInstant(value: string, label: string): string {
  const parsed = Date.parse(value);
  if (Number.isFinite(parsed) && new Date(parsed).toISOString() === value) {
    return value;
  }
  throw new WorkManagementError(
    "INVALID_INPUT",
    `Authority evaluation value "${value}" is invalid; expected ${label} as a canonical ISO-8601 UTC instant.`,
  );
}
