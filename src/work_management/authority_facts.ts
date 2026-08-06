import type { TargetCommandType, WorkScope } from "./ids.ts";
import {
  assertScope,
  assertTargetReference,
  assertText,
  stableSerialize,
  type TargetReference,
  WorkManagementError,
} from "./model.ts";

export interface AuthorityMoneyFact {
  readonly minorUnits: number;
  readonly currency: string;
}

export interface AuthorityMandateFact {
  readonly mandateId: string;
  readonly version: string;
  readonly active: boolean;
  readonly scope: WorkScope;
}

export interface AuthorityFactSource {
  readonly sourceId: string;
  readonly sourceVersion: string;
  readonly capturedAt: string;
}

export interface AuthorityFacts {
  readonly target: TargetReference;
  readonly scope: WorkScope;
  readonly amount?: AuthorityMoneyFact;
  readonly percentageBasisPoints?: number;
  readonly mandate?: AuthorityMandateFact;
  readonly category?: string;
  readonly source: AuthorityFactSource;
}

export interface TrustedAuthorityFactQuery {
  readonly scope: WorkScope;
  readonly target: TargetReference;
  readonly commandType: TargetCommandType;
  readonly policyVersion: string;
  readonly snapshotReference: string;
}

export interface TrustedAuthorityFactPort {
  resolve(query: TrustedAuthorityFactQuery): Promise<unknown>;
}

/** Resolves and deeply validates facts from a server-owned source. */
export async function resolveTrustedAuthorityFacts(
  query: TrustedAuthorityFactQuery,
  port: TrustedAuthorityFactPort,
): Promise<AuthorityFacts> {
  const facts = parseAuthorityFacts(await port.resolve(query));
  assertScope(query.scope, facts.scope, "Trusted authority facts");
  assertScope(
    query.scope,
    facts.target.scope,
    "Trusted authority facts target",
  );
  if (stableSerialize(query.target) === stableSerialize(facts.target)) {
    return facts;
  }
  throw new WorkManagementError(
    "REFERENCE_MISMATCH",
    `Trusted authority facts target "${facts.target.aggregateId}" does not match validated target "${query.target.aggregateId}" at version "${query.target.expectedVersion}"; expected one exact target reference.`,
  );
}

/** Parses persisted or external authority facts without trusting JSON shape. */
export function parseAuthorityFacts(value: unknown): AuthorityFacts {
  const record = objectRecord(value, "Authority facts");
  exactKeys(record, [
    "target",
    "scope",
    "amount",
    "percentageBasisPoints",
    "mandate",
    "category",
    "source",
  ], "Authority facts");
  const target = parseTarget(record.target);
  const scope = parseScope(record.scope, "Authority facts scope");
  const facts: AuthorityFacts = {
    target,
    scope,
    ...(record.amount === undefined
      ? {}
      : { amount: parseMoney(record.amount) }),
    ...(record.percentageBasisPoints === undefined
      ? {}
      : { percentageBasisPoints: basisPoints(record.percentageBasisPoints) }),
    ...(record.mandate === undefined
      ? {}
      : { mandate: parseMandate(record.mandate) }),
    ...(record.category === undefined
      ? {}
      : { category: nonEmptyText(record.category, "Authority category") }),
    source: parseSource(record.source),
  };
  assertScope(scope, target.scope, "Authority facts target");
  if (facts.mandate !== undefined) {
    assertScope(scope, facts.mandate.scope, "Authority mandate");
  }
  return deepFreezeFacts(facts);
}

function parseTarget(value: unknown): TargetReference {
  const record = objectRecord(value, "Authority facts target");
  exactKeys(record, [
    "aggregateType",
    "aggregateId",
    "expectedVersion",
    "scope",
  ], "Authority facts target");
  const target: TargetReference = {
    aggregateType: nonEmptyText(record.aggregateType, "Target aggregate type"),
    aggregateId: nonEmptyText(record.aggregateId, "Target aggregate ID"),
    expectedVersion: positiveInteger(
      record.expectedVersion,
      "Target version",
    ) as TargetReference["expectedVersion"],
    scope: parseScope(record.scope, "Target scope"),
  };
  assertTargetReference(target);
  return target;
}

function parseMoney(value: unknown): AuthorityMoneyFact {
  const record = objectRecord(value, "Authority amount");
  exactKeys(record, ["minorUnits", "currency"], "Authority amount");
  const currency = nonEmptyText(record.currency, "Authority currency");
  if (!/^[A-Z]{3}$/.test(currency)) {
    invalid("Authority currency", currency, "an uppercase ISO-4217 code");
  }
  return Object.freeze({
    minorUnits: nonNegativeInteger(
      record.minorUnits,
      "Authority amount minor units",
    ),
    currency,
  });
}

function parseMandate(value: unknown): AuthorityMandateFact {
  const record = objectRecord(value, "Authority mandate");
  exactKeys(
    record,
    ["mandateId", "version", "active", "scope"],
    "Authority mandate",
  );
  if (typeof record.active !== "boolean") {
    invalid("Authority mandate active flag", record.active, "a boolean");
  }
  return Object.freeze({
    mandateId: nonEmptyText(record.mandateId, "Authority mandate ID"),
    version: nonEmptyText(record.version, "Authority mandate version"),
    active: record.active,
    scope: parseScope(record.scope, "Authority mandate scope"),
  });
}

function parseSource(value: unknown): AuthorityFactSource {
  const record = objectRecord(value, "Authority fact source");
  exactKeys(
    record,
    ["sourceId", "sourceVersion", "capturedAt"],
    "Authority fact source",
  );
  return Object.freeze({
    sourceId: nonEmptyText(record.sourceId, "Authority fact source ID"),
    sourceVersion: nonEmptyText(
      record.sourceVersion,
      "Authority fact source version",
    ),
    capturedAt: canonicalInstant(
      record.capturedAt,
      "Authority fact capture time",
    ),
  });
}

function parseScope(value: unknown, label: string): WorkScope {
  const record = objectRecord(value, label);
  exactKeys(record, ["tenantId", "workspaceId", "dealId"], label);
  const scope = {
    tenantId: nonEmptyText(
      record.tenantId,
      `${label} tenant ID`,
    ) as WorkScope["tenantId"],
    workspaceId: nonEmptyText(
      record.workspaceId,
      `${label} workspace ID`,
    ) as WorkScope["workspaceId"],
    dealId: nonEmptyText(
      record.dealId,
      `${label} deal ID`,
    ) as WorkScope["dealId"],
  };
  return Object.freeze(scope);
}

function basisPoints(value: unknown): number {
  const result = nonNegativeInteger(value, "Authority percentage basis points");
  if (result <= 10_000) return result;
  return invalid(
    "Authority percentage basis points",
    value,
    "an integer from 0 through 10000",
  );
}

function positiveInteger(value: unknown, label: string): number {
  if (Number.isSafeInteger(value) && Number(value) > 0) return Number(value);
  return invalid(label, value, "a positive safe integer");
}

function nonNegativeInteger(value: unknown, label: string): number {
  if (Number.isSafeInteger(value) && Number(value) >= 0) return Number(value);
  return invalid(label, value, "a non-negative safe integer");
}

function nonEmptyText(value: unknown, label: string): string {
  if (typeof value !== "string") return invalid(label, value, "non-empty text");
  assertText(value, label, 128);
  return value;
}

function canonicalInstant(value: unknown, label: string): string {
  const text = nonEmptyText(value, label);
  const parsed = Date.parse(text);
  if (Number.isFinite(parsed) && new Date(parsed).toISOString() === text) {
    return text;
  }
  return invalid(label, value, "a canonical ISO-8601 UTC instant");
}

function objectRecord(value: unknown, label: string): Record<string, unknown> {
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return invalid(label, value, "an object");
}

function exactKeys(
  record: Record<string, unknown>,
  allowed: readonly string[],
  label: string,
): void {
  const unexpected = Object.keys(record).find((key) => !allowed.includes(key));
  if (unexpected === undefined) return;
  invalid(`${label} field`, unexpected, `one of ${allowed.join(", ")}`);
}

function invalid(label: string, value: unknown, expected: string): never {
  throw new WorkManagementError(
    "INVALID_INPUT",
    `${label} "${String(value)}" is invalid; expected ${expected}.`,
  );
}

function deepFreezeFacts(facts: AuthorityFacts): AuthorityFacts {
  return Object.freeze({
    ...facts,
    target: Object.freeze({
      ...facts.target,
      scope: Object.freeze({ ...facts.target.scope }),
    }),
    scope: Object.freeze({ ...facts.scope }),
    source: Object.freeze({ ...facts.source }),
    ...(facts.amount === undefined
      ? {}
      : { amount: Object.freeze({ ...facts.amount }) }),
    ...(facts.mandate === undefined ? {} : {
      mandate: Object.freeze({
        ...facts.mandate,
        scope: Object.freeze({ ...facts.mandate.scope }),
      }),
    }),
  });
}
