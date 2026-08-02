import {
  type ActorId,
  parseActorId,
  parseDealId,
  parseTenantId,
  parseWorkspaceId,
} from "../shared/contracts/identifiers.ts";
import type { RequestOrigin } from "../shared/contracts/request_context.ts";
import type {
  AuditActorKind,
  AuditProvenance,
  AuditScope,
  AuthoritySnapshot,
  EvidenceReference,
  EvidenceSnapshot,
} from "./model.ts";

export function parseAuthoritySnapshot(
  value: unknown,
  subject: string,
): AuthoritySnapshot {
  const record = parseJsonObject(value, "authority snapshot", subject);
  return {
    snapshotId: parseText(record.snapshotId, "snapshot ID", subject),
    actorId: parseActorIdentifier(record.actorId, subject),
    actorKind: parseActorKind(record.actorKind, subject),
    policyVersion: parseText(record.policyVersion, "policy version", subject),
    scope: parseAuditScope(record.scope, subject),
    capturedAt: parseTimestamp(record.capturedAt, "captured at", subject),
  };
}

export function parseEvidenceSnapshot(
  value: unknown,
  subject: string,
): EvidenceSnapshot {
  const record = parseJsonObject(value, "evidence snapshot", subject);
  return {
    capturedAt: parseTimestamp(
      record.capturedAt,
      "evidence captured at",
      subject,
    ),
    references: parseEvidenceReferences(record.references, subject),
  };
}

export function parseAuditProvenance(
  value: unknown,
  subject: string,
): AuditProvenance {
  const record = parseJsonObject(value, "audit provenance", subject);
  const operationReference = parseOptionalText(
    record.operationReference,
    "operation reference",
    subject,
  );
  const toolReference = parseOptionalText(
    record.toolReference,
    "tool reference",
    subject,
  );
  const modelReference = parseOptionalText(
    record.modelReference,
    "model reference",
    subject,
  );
  const promptDigest = parseOptionalDigest(
    record.promptDigest,
    "prompt digest",
    subject,
  );
  return {
    actorId: parseActorIdentifier(record.actorId, subject),
    actorKind: parseActorKind(record.actorKind, subject),
    origin: parseRequestOrigin(record.origin, subject),
    ...(operationReference === undefined ? {} : { operationReference }),
    ...(toolReference === undefined ? {} : { toolReference }),
    ...(modelReference === undefined ? {} : { modelReference }),
    ...(promptDigest === undefined ? {} : { promptDigest }),
  };
}

function parseAuditScope(value: unknown, subject: string): AuditScope {
  const record = parseJsonObject(value, "authority scope", subject);
  const workspaceId = parseOptionalIdentifier(
    record.workspaceId,
    "workspace ID",
    subject,
    parseWorkspaceId,
  );
  const dealId = parseOptionalIdentifier(
    record.dealId,
    "deal ID",
    subject,
    parseDealId,
  );
  return {
    tenantId: parseIdentifier(
      record.tenantId,
      "tenant ID",
      subject,
      parseTenantId,
    ),
    ...(workspaceId === undefined ? {} : { workspaceId }),
    ...(dealId === undefined ? {} : { dealId }),
  };
}

function parseEvidenceReferences(
  value: unknown,
  subject: string,
): readonly EvidenceReference[] {
  if (!Array.isArray(value)) {
    throw invalidValue(value, "evidence references", subject, "an array");
  }
  return value.map((reference, index) =>
    parseEvidenceReference(reference, `${subject} reference ${index}`)
  );
}

function parseEvidenceReference(
  value: unknown,
  subject: string,
): EvidenceReference {
  const record = parseJsonObject(value, "evidence reference", subject);
  const checksum = parseOptionalDigest(record.checksum, "checksum", subject);
  return {
    sourceType: parseText(record.sourceType, "evidence source type", subject),
    sourceId: parseText(record.sourceId, "evidence source ID", subject),
    sourceVersion: parseText(
      record.sourceVersion,
      "evidence source version",
      subject,
    ),
    ...(checksum === undefined ? {} : { checksum }),
  };
}

function parseIdentifier<TIdentifier extends string>(
  value: unknown,
  label: string,
  subject: string,
  parser: (
    value: unknown,
  ) => { readonly ok: boolean; readonly value?: TIdentifier },
): TIdentifier {
  const parsed = parser(value);
  if (parsed.ok && parsed.value !== undefined) return parsed.value;
  throw invalidValue(value, label, subject, "a valid scoped identifier");
}

function parseOptionalIdentifier<TIdentifier extends string>(
  value: unknown,
  label: string,
  subject: string,
  parser: (
    value: unknown,
  ) => { readonly ok: boolean; readonly value?: TIdentifier },
): TIdentifier | undefined {
  if (value === undefined) return undefined;
  return parseIdentifier(value, label, subject, parser);
}

function parseActorIdentifier(value: unknown, subject: string): ActorId {
  return parseIdentifier(value, "actor ID", subject, parseActorId);
}

function parseText(value: unknown, label: string, subject: string): string {
  if (typeof value === "string" && value.trim() && value.length <= 128) {
    return value;
  }
  throw invalidValue(value, label, subject, "1-128 non-whitespace characters");
}

function parseOptionalText(
  value: unknown,
  label: string,
  subject: string,
): string | undefined {
  if (value === undefined) return undefined;
  return parseText(value, label, subject);
}

function parseActorKind(value: unknown, subject: string): AuditActorKind {
  if (value === "human" || value === "agent" || value === "system") {
    return value;
  }
  throw invalidValue(value, "actor kind", subject, "human, agent, or system");
}

function parseRequestOrigin(value: unknown, subject: string): RequestOrigin {
  if (value === "http" || value === "job" || value === "internal") {
    return value;
  }
  throw invalidValue(
    value,
    "request origin",
    subject,
    "http, job, or internal",
  );
}

function parseOptionalDigest(
  value: unknown,
  label: string,
  subject: string,
): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value === "string" && /^[0-9a-f]{64}$/.test(value)) return value;
  throw invalidValue(value, label, subject, "a lowercase SHA-256 hex digest");
}

function parseTimestamp(value: unknown, label: string, subject: string): Date {
  const parsed = value instanceof Date
    ? new Date(value.getTime())
    : typeof value === "string"
    ? new Date(value)
    : undefined;
  if (parsed !== undefined && !Number.isNaN(parsed.getTime())) return parsed;
  throw invalidValue(value, label, subject, "a valid ISO timestamp");
}

function parseJsonObject(
  value: unknown,
  label: string,
  subject: string,
): Readonly<Record<string, unknown>> {
  let parsed: unknown = value;
  if (typeof value === "string") {
    try {
      parsed = JSON.parse(value) as unknown;
    } catch {
      throw invalidValue(value, label, subject, "a JSON object");
    }
  }
  if (isRecord(parsed)) return parsed;
  throw invalidValue(value, label, subject, "a JSON object");
}

function invalidValue(
  value: unknown,
  label: string,
  subject: string,
  expected: string,
): Error {
  return new Error(
    `Audit ${label} "${
      String(value)
    }" for "${subject}" is invalid; expected ${expected}.`,
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
