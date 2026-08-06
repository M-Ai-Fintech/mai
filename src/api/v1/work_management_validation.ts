import {
  aggregateVersion,
  targetCommandType,
} from "../../work_management/ids.ts";
import type {
  EvidenceSnapshotReference,
  TargetReference,
  WorkScope,
} from "../../work_management/v1.ts";
import { WorkManagementValidationError } from "./work_management_contracts.ts";

const FORBIDDEN_APPROVAL_FIELDS = Object.freeze([
  "requesterId",
  "package",
  "authority",
  "authoritySnapshot",
  "commandType",
  "policyVersion",
  "decisionId",
  "currentTargetVersion",
  "eventId",
]);

export interface ParsedApprovalCreation {
  readonly requestedAction: ReturnType<typeof targetCommandType>;
  readonly target: TargetReference;
  readonly evidence: readonly EvidenceSnapshotReference[];
  readonly payload: Readonly<Record<string, unknown>>;
  readonly claimedDigest?: string;
}

/** Parses selectors only; identity and authority evidence remain server-owned. */
export function parseApprovalCreation(
  body: Record<string, unknown>,
  scope: WorkScope,
): ParsedApprovalCreation {
  rejectClientAuthorityFields(body);
  rejectUnknownApprovalFields(body);
  const targetValue = requiredObject(body.target, "target");
  rejectUnknownFields(targetValue, [
    "aggregateType",
    "aggregateId",
    "expectedVersion",
  ], "target");
  const target: TargetReference = Object.freeze({
    aggregateType: requiredString(
      targetValue.aggregateType,
      "target.aggregateType",
    ),
    aggregateId: requiredString(targetValue.aggregateId, "target.aggregateId"),
    expectedVersion: aggregateVersion(requiredInteger(
      targetValue.expectedVersion,
      "target.expectedVersion",
    )),
    scope: Object.freeze({ ...scope }),
  });
  const evidence = parseEvidence(body.evidence);
  const payload = parseJsonObject(body.payload, "payload");
  const claimedDigest = body.contentDigest === undefined
    ? undefined
    : requiredDigest(body.contentDigest, "contentDigest");
  const requestedAction = targetCommandType(
    requiredSelector(body.action, "action"),
  );
  return Object.freeze({
    requestedAction,
    target,
    evidence,
    payload,
    ...(claimedDigest === undefined ? {} : { claimedDigest }),
  });
}

function rejectUnknownApprovalFields(body: Record<string, unknown>): void {
  rejectUnknownFields(body, [
    "id",
    "namedApproverId",
    "target",
    "evidence",
    "payload",
    "contentDigest",
    "action",
  ], "approval request");
}

function rejectUnknownFields(
  record: Record<string, unknown>,
  allowed: readonly string[],
  label: string,
): void {
  const unexpected = Object.keys(record).find((key) => !allowed.includes(key));
  if (unexpected !== undefined) {
    invalid(`${label}.${unexpected}`, "a governed field", record[unexpected]);
  }
}

export function requiredObject(
  value: unknown,
  field: string,
): Record<string, unknown> {
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return Object.fromEntries(Object.entries(value));
  }
  invalid(field, "a JSON object", value);
}

export function requiredString(value: unknown, field: string): string {
  if (
    typeof value === "string" && value.trim().length > 0 && value.length <= 500
  ) {
    return value;
  }
  invalid(field, "a bounded non-empty string", value);
}

export function requiredState<T extends string>(
  value: unknown,
  states: readonly T[],
): T {
  if (typeof value === "string" && states.some((state) => state === value)) {
    return value as T;
  }
  invalid("state", `one of ${states.join(", ")}`, value);
}

function rejectClientAuthorityFields(body: Record<string, unknown>): void {
  const present = FORBIDDEN_APPROVAL_FIELDS.find((field) =>
    body[field] !== undefined
  );
  if (present === undefined) return;
  throw new WorkManagementValidationError(
    `Field "${present}" is server-owned and cannot be supplied; expected authenticated identity and governed authority evidence.`,
  );
}

function parseEvidence(value: unknown): readonly EvidenceSnapshotReference[] {
  if (!Array.isArray(value) || value.length > 100) {
    invalid("evidence", "an array with at most 100 exact references", value);
  }
  return Object.freeze(value.map((entry, index) => {
    const item = requiredObject(entry, `evidence[${index}]`);
    rejectUnknownFields(
      item,
      ["sourceType", "sourceId", "sourceVersion", "checksum"],
      `evidence[${index}]`,
    );
    return Object.freeze({
      sourceType: requiredString(
        item.sourceType,
        `evidence[${index}].sourceType`,
      ),
      sourceId: requiredString(item.sourceId, `evidence[${index}].sourceId`),
      sourceVersion: requiredString(
        item.sourceVersion,
        `evidence[${index}].sourceVersion`,
      ),
      ...(item.checksum === undefined ? {} : {
        checksum: requiredDigest(item.checksum, `evidence[${index}].checksum`),
      }),
    });
  }));
}

function parseJsonObject(
  value: unknown,
  field: string,
): Readonly<Record<string, unknown>> {
  const record = requiredObject(value, field);
  validateJson(record, field, 0);
  return Object.freeze(structuredClone(record));
}

function validateJson(value: unknown, path: string, depth: number): void {
  if (depth > 12) invalid(path, "JSON nested at most 12 levels", value);
  if (
    value === null || typeof value === "string" || typeof value === "boolean"
  ) return;
  if (typeof value === "number" && Number.isFinite(value)) return;
  if (Array.isArray(value)) {
    if (value.length > 1_000) {
      invalid(path, "an array with at most 1000 values", value.length);
    }
    value.forEach((child, index) =>
      validateJson(child, `${path}[${index}]`, depth + 1)
    );
    return;
  }
  if (typeof value === "object") {
    const entries = Object.entries(value);
    if (entries.length > 1_000) {
      invalid(path, "an object with at most 1000 fields", entries.length);
    }
    for (const [key, child] of entries) {
      if (key === "__proto__" || key === "constructor" || key === "prototype") {
        invalid(`${path}.${key}`, "a safe JSON field name", key);
      }
      validateJson(child, `${path}.${key}`, depth + 1);
    }
    return;
  }
  invalid(path, "JSON-compatible values", value);
}

function requiredInteger(value: unknown, field: string): number {
  if (typeof value === "number" && Number.isSafeInteger(value) && value > 0) {
    return value;
  }
  invalid(field, "a positive safe integer", value);
}

function requiredSelector(value: unknown, field: string): string {
  if (
    typeof value === "string" && /^[a-z][a-z0-9]*(?:_[a-z0-9]+)*$/.test(value)
  ) {
    return value;
  }
  invalid(field, "a lower_snake_case requested action selector", value);
}

function requiredDigest(value: unknown, field: string): string {
  if (typeof value === "string" && /^[0-9a-f]{64}$/.test(value)) return value;
  invalid(field, "lowercase SHA-256 hex", value);
}

function invalid(field: string, expected: string, value: unknown): never {
  throw new WorkManagementValidationError(
    `Field "${field}" value "${
      String(value)
    }" is invalid; expected ${expected}.`,
  );
}
