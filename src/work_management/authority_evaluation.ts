import { payloadDigest } from "../platform/persistence/v1.ts";
import type { ApprovalPackage } from "./model.ts";
import { deepFreezeAuthorityRecord } from "./authority_immutability.ts";
import {
  assertAuthorityEffective,
  assertExactPackage,
  assertScope,
  stableSerialize,
  WorkManagementError,
} from "./model.ts";
import type { AuthorityFacts } from "./authority_facts.ts";
import { parseAuthorityFacts } from "./authority_facts.ts";
import {
  type AuthorityEvaluationReason,
  type AuthorityLimitResult,
  evaluateAuthorityLimits,
  parseTypedAuthorityLimits,
  type TypedAuthorityLimit,
} from "./authority_limits.ts";

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

function evaluationReasons(
  results: readonly AuthorityLimitResult[],
  windowReason?: AuthorityEvaluationReason,
): readonly AuthorityEvaluationReason[] {
  const denied = results.filter((result) => !result.satisfied).map((result) =>
    result.reason
  );
  if (windowReason !== undefined) denied.push(windowReason);
  return Object.freeze(
    denied.length === 0 ? ["AUTHORITY_ALLOWED"] : [...new Set(denied)],
  );
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

function evaluationRecord(value: unknown): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw invalidRecord(value, "an object");
  }
  const record = value as Record<string, unknown>;
  const expected = [...evaluationBodyKeys(), "evaluationId", "digest"];
  const unexpected = Object.keys(record).find((key) => !expected.includes(key));
  if (unexpected !== undefined) {
    throw invalidRecord(unexpected, `only ${expected.join(", ")}`);
  }
  return record;
}

function parseEvaluationFields(
  record: Record<string, unknown>,
): AuthorityEvaluation {
  const requirement = parseRequirement(record.requirement);
  const facts = parseAuthorityFacts(record.facts);
  const limits = parsePersistedLimits(record.limits);
  const limitResults = parseLimitResults(record.limitResults, limits);
  const reasons = parseReasons(record.reasons);
  const evaluation: AuthorityEvaluation = {
    schemaVersion: exactOne(record.schemaVersion),
    evaluationId: text(record.evaluationId, "Authority evaluation ID"),
    requirement,
    policyVersion: text(record.policyVersion, "Authority policy version"),
    snapshotReference: text(
      record.snapshotReference,
      "Authority snapshot reference",
    ),
    commandType: text(record.commandType, "Authority command type"),
    targetAggregateType: text(
      record.targetAggregateType,
      "Authority target aggregate type",
    ),
    targetAggregateId: text(
      record.targetAggregateId,
      "Authority target aggregate ID",
    ),
    expectedTargetVersion: positiveInteger(
      record.expectedTargetVersion,
      "Authority target version",
    ),
    approverId: text(record.approverId, "Authority approver ID"),
    scope: parseAuthorityFacts({
      target: facts.target,
      scope: record.scope,
      source: facts.source,
    }).scope,
    facts,
    limits,
    limitResults,
    outcome: outcome(record.outcome),
    reasons,
    window: parseWindow(record.window),
    evaluatedAt: canonicalInstant(
      record.evaluatedAt,
      "Authority evaluation time",
    ),
    digest: digest(record.digest),
  };
  assertEvaluationSemantics(evaluation);
  return evaluation;
}

function parseRequirement(value: unknown): AuthorityEvaluationRequirement {
  const record = strictObject(value, [
    "packageId",
    "packageVersion",
    "packageDigest",
  ], "Authority requirement proof");
  return Object.freeze({
    packageId: text(record.packageId, "Authority package ID"),
    packageVersion: positiveInteger(
      record.packageVersion,
      "Authority package version",
    ),
    packageDigest: digest(record.packageDigest),
  });
}

function parsePersistedLimits(value: unknown): readonly TypedAuthorityLimit[] {
  if (!Array.isArray(value)) {
    throw invalidRecord(value, "an authority limit array");
  }
  const generic = value.map((entry) => {
    const record = strictObject(entry, undefined, "Typed authority limit");
    switch (record.kind) {
      case "amount_minor_ceiling":
        return { name: record.kind, value: record.minorUnits as number };
      case "currency":
        return { name: record.kind, value: record.currency as string };
      case "percentage_bps_ceiling":
        return { name: record.kind, value: record.basisPoints as number };
      case "mandate_required":
        return { name: record.kind, value: record.required as boolean };
      case "mandate_id":
        return { name: record.kind, value: record.mandateId as string };
      case "mandate_version":
        return { name: record.kind, value: record.version as string };
      case "category":
        return { name: record.kind, value: record.category as string };
      case "deal_scope":
        return { name: record.kind, value: record.dealId as string };
      default:
        throw invalidRecord(
          record.kind,
          "a supported typed authority limit kind",
        );
    }
  });
  return parseTypedAuthorityLimits(generic);
}

function parseLimitResults(
  value: unknown,
  limits: readonly TypedAuthorityLimit[],
): readonly AuthorityLimitResult[] {
  if (!Array.isArray(value) || value.length !== limits.length) {
    throw invalidRecord(value, "one result for every authority limit");
  }
  return Object.freeze(value.map((entry, index) => {
    const record = strictObject(
      entry,
      ["limit", "satisfied", "reason"],
      "Authority limit result",
    );
    if (stableSerialize(record.limit) !== stableSerialize(limits[index])) {
      throw invalidRecord(record.limit, "the corresponding immutable limit");
    }
    if (typeof record.satisfied !== "boolean") {
      throw invalidRecord(record.satisfied, "a boolean result");
    }
    return Object.freeze({
      limit: limits[index],
      satisfied: record.satisfied,
      reason: reason(record.reason),
    });
  }));
}

function parseReasons(value: unknown): readonly AuthorityEvaluationReason[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw invalidRecord(value, "a non-empty reason array");
  }
  return Object.freeze(value.map(reason));
}

function reason(value: unknown): AuthorityEvaluationReason {
  const allowed: readonly AuthorityEvaluationReason[] = [
    "AUTHORITY_ALLOWED",
    "AUTHORITY_WINDOW_INACTIVE",
    "AMOUNT_FACT_MISSING",
    "AMOUNT_CEILING_EXCEEDED",
    "CURRENCY_FACT_MISSING",
    "CURRENCY_MISMATCH",
    "PERCENTAGE_FACT_MISSING",
    "PERCENTAGE_CEILING_EXCEEDED",
    "MANDATE_FACT_MISSING",
    "MANDATE_INACTIVE",
    "MANDATE_ID_MISMATCH",
    "MANDATE_VERSION_MISMATCH",
    "CATEGORY_FACT_MISSING",
    "CATEGORY_MISMATCH",
    "DEAL_SCOPE_MISMATCH",
  ];
  if (
    typeof value === "string" &&
    allowed.includes(value as AuthorityEvaluationReason)
  ) return value as AuthorityEvaluationReason;
  throw invalidRecord(value, "a supported authority evaluation reason");
}

function parseWindow(value: unknown): AuthorityEvaluationWindow {
  const record = strictObject(
    value,
    ["effectiveAt", "expiresAt"],
    "Authority evaluation window",
  );
  const window = {
    effectiveAt: canonicalInstant(
      record.effectiveAt,
      "Authority effective time",
    ),
    expiresAt: canonicalInstant(record.expiresAt, "Authority expiry time"),
  };
  if (window.effectiveAt < window.expiresAt) return Object.freeze(window);
  throw invalidRecord(value, "an ordered authority window");
}

function assertEvaluationSemantics(value: AuthorityEvaluation): void {
  assertScope(value.scope, value.facts.scope, "Persisted authority evaluation");
  const expectedResults = evaluateAuthorityLimits(value.limits, value.facts);
  if (
    stableSerialize(expectedResults) !== stableSerialize(value.limitResults)
  ) {
    throw invalidRecord(
      value.limitResults,
      "limit results recomputed from the immutable facts and limits",
    );
  }
  const evaluatedAt = Date.parse(value.evaluatedAt);
  const effectiveAt = Date.parse(value.window.effectiveAt);
  const expiresAt = Date.parse(value.window.expiresAt);
  const windowReason = evaluatedAt < effectiveAt || evaluatedAt >= expiresAt
    ? "AUTHORITY_WINDOW_INACTIVE" as const
    : undefined;
  const expectedReasons = evaluationReasons(expectedResults, windowReason);
  const expectedOutcome = expectedReasons[0] === "AUTHORITY_ALLOWED"
    ? "allowed"
    : "denied";
  if (
    value.outcome !== expectedOutcome ||
    stableSerialize(value.reasons) !== stableSerialize(expectedReasons)
  ) {
    throw invalidRecord(
      value.outcome,
      "an outcome and reasons matching every limit result",
    );
  }
}

function evaluationBodyFromRecord(value: AuthorityEvaluation) {
  const { evaluationId: _id, digest: _digest, ...body } = value;
  return body;
}

function assertEvaluationIdentity(
  value: AuthorityEvaluation,
  expectedDigest: string,
): void {
  const expectedId = `authority_evaluation_v1_${expectedDigest}`;
  if (value.digest === expectedDigest && value.evaluationId === expectedId) {
    return;
  }
  throw new WorkManagementError(
    "REFERENCE_MISMATCH",
    `Authority evaluation "${value.evaluationId}" digest "${value.digest}" is invalid; expected ID "${expectedId}" and digest "${expectedDigest}".`,
  );
}

function freezeEvaluation(value: AuthorityEvaluation): AuthorityEvaluation {
  return deepFreezeAuthorityRecord(structuredClone(value));
}

function strictObject(
  value: unknown,
  keys: readonly string[] | undefined,
  label: string,
): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw invalidRecord(value, `${label} object`);
  }
  const record = value as Record<string, unknown>;
  if (keys === undefined) return record;
  const unexpected = Object.keys(record).find((key) => !keys.includes(key));
  if (unexpected !== undefined) {
    throw invalidRecord(unexpected, `${label} fields ${keys.join(", ")}`);
  }
  return record;
}

function exactOne(value: unknown): 1 {
  if (value === 1) return 1;
  throw invalidRecord(value, "authority evaluation schema version 1");
}

function outcome(value: unknown): "allowed" | "denied" {
  if (value === "allowed" || value === "denied") return value;
  throw invalidRecord(value, "allowed or denied");
}

function text(value: unknown, label: string): string {
  if (
    typeof value === "string" && value.trim().length > 0 && value.length <= 256
  ) return value;
  throw invalidRecord(value, `${label} with 1-256 characters`);
}

function digest(value: unknown): string {
  if (typeof value === "string" && /^[0-9a-f]{64}$/.test(value)) return value;
  throw invalidRecord(value, "a lowercase SHA-256 digest");
}

function positiveInteger(value: unknown, label: string): number {
  if (Number.isSafeInteger(value) && Number(value) > 0) return Number(value);
  throw invalidRecord(value, `${label} as a positive safe integer`);
}

function canonicalInstant(value: unknown, label: string): string {
  const result = text(value, label);
  const parsed = Date.parse(result);
  if (Number.isFinite(parsed) && new Date(parsed).toISOString() === result) {
    return result;
  }
  throw invalidRecord(value, `${label} as a canonical ISO-8601 UTC instant`);
}

function invalidRecord(value: unknown, expected: string): WorkManagementError {
  return new WorkManagementError(
    "INVALID_INPUT",
    `Authority evaluation value "${
      String(value)
    }" is invalid; expected ${expected}.`,
  );
}

function evaluationBodyKeys(): readonly string[] {
  return [
    "schemaVersion",
    "requirement",
    "policyVersion",
    "snapshotReference",
    "commandType",
    "targetAggregateType",
    "targetAggregateId",
    "expectedTargetVersion",
    "approverId",
    "scope",
    "facts",
    "limits",
    "limitResults",
    "outcome",
    "reasons",
    "window",
    "evaluatedAt",
  ];
}
