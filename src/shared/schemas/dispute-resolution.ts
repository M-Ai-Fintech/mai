import { z } from "zod";

/**
 * Version shared by the API wire payload and the persistence JSON value.
 * MAI-129 owns physical migration of legacy stored values.
 */
export const DISPUTE_RESOLUTION_SCHEMA_VERSION = 1 as const;

/**
 * Product and legal references currently identify these arbitration bodies.
 * B3 is retained only as a legacy alias for the canonical CAM-B3 value.
 */
export const CANONICAL_ARBITRATION_INSTITUTIONS = [
  "CAM-CCBC",
  "CAM-B3",
  "CCI",
  "FGV",
] as const;

/** Legacy values found in Contract Analysis, Term Sheet, and SPA schemas. */
export const LEGACY_DISPUTE_RESOLUTION_VALUES = [
  "B3",
  "CAM-B3",
  "CAM-CCBC",
  "CCI",
  "FGV",
  "Judicial-Court",
  "Other",
] as const;

export const canonicalArbitrationInstitutionSchema = z.enum(
  CANONICAL_ARBITRATION_INSTITUTIONS,
);

export type CanonicalArbitrationInstitution = z.infer<
  typeof canonicalArbitrationInstitutionSchema
>;

const suppliedInstitutionNameSchema = z.string().trim().min(1).refine(
  (name) => name.toLowerCase() !== "other",
  "Expected the supplied institution name instead of the Other placeholder.",
);

/** The arbitration institution is either reviewed/canonical or explicitly named. */
export const arbitrationInstitutionSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("canonical"),
    name: canonicalArbitrationInstitutionSchema,
  }).strict(),
  z.object({
    type: z.literal("other"),
    name: suppliedInstitutionNameSchema,
  }).strict(),
]);

export type ArbitrationInstitution = z.infer<
  typeof arbitrationInstitutionSchema
>;

export const arbitrationDisputeResolutionSchema = z.object({
  type: z.literal("arbitration"),
  institution: arbitrationInstitutionSchema,
}).strict();

export type ArbitrationDisputeResolution = z.infer<
  typeof arbitrationDisputeResolutionSchema
>;

export const courtLitigationDisputeResolutionSchema = z.object({
  type: z.literal("court"),
  jurisdiction: z.string().trim().min(1),
  forum: z.string().trim().min(1),
}).strict();

export type CourtLitigationDisputeResolution = z.infer<
  typeof courtLitigationDisputeResolutionSchema
>;

/** Authoritative mechanism contract. Arbitration and court are distinct variants. */
export const disputeResolutionMechanismSchema = z.discriminatedUnion("type", [
  arbitrationDisputeResolutionSchema,
  courtLitigationDisputeResolutionSchema,
]);

export const disputeResolutionSchema = disputeResolutionMechanismSchema;

export type DisputeResolutionMechanism = z.infer<
  typeof disputeResolutionMechanismSchema
>;

export type DisputeResolution = DisputeResolutionMechanism;

/**
 * Versioned API and persistence representation. Keep both consumers on this
 * envelope so migrations cannot create a second authoritative wire shape.
 */
export const versionedDisputeResolutionSchema = z.object({
  schemaVersion: z.literal(DISPUTE_RESOLUTION_SCHEMA_VERSION),
  mechanism: disputeResolutionMechanismSchema,
}).strict();

export const disputeResolutionApiSchema = versionedDisputeResolutionSchema;
export const disputeResolutionPersistenceSchema =
  versionedDisputeResolutionSchema;

export type VersionedDisputeResolution = z.infer<
  typeof versionedDisputeResolutionSchema
>;

export interface LegacyDisputeResolutionContext {
  readonly otherInstitutionName?: unknown;
  readonly institutionName?: unknown;
  readonly jurisdiction?: unknown;
  readonly forum?: unknown;
}

type LegacyResolutionKind = CanonicalArbitrationInstitution | "court" | "other";

type LegacyDisputeResolutionRecord = {
  readonly [key: string]: unknown;
};

const LEGACY_RESOLUTION_MAPPINGS: Readonly<
  Record<string, LegacyResolutionKind>
> = {
  "b3": "CAM-B3",
  "cam-b3": "CAM-B3",
  "cam-ccbc": "CAM-CCBC",
  "cci": "CCI",
  "fgv": "FGV",
  "judicial-court": "court",
  "other": "other",
};

export function serializeDisputeResolution(
  mechanism: DisputeResolutionMechanism,
): VersionedDisputeResolution {
  return versionedDisputeResolutionSchema.parse({
    schemaVersion: DISPUTE_RESOLUTION_SCHEMA_VERSION,
    mechanism,
  });
}

export function parseDisputeResolution(
  value: unknown,
): DisputeResolutionMechanism {
  const parsed = versionedDisputeResolutionSchema.safeParse(value);
  if (!parsed.success) throw invalidVersionedPayload(value);
  return parsed.data.mechanism;
}

export const parseSerializedDisputeResolution = parseDisputeResolution;

export function normalizeLegacyDisputeResolution(
  value: unknown,
  context: LegacyDisputeResolutionContext = {},
): DisputeResolutionMechanism {
  const canonical = disputeResolutionMechanismSchema.safeParse(value);
  if (canonical.success) return canonical.data;

  const fields = readLegacyFields(value, context);
  const kind = legacyResolutionKind(fields.value);
  if (kind === "court") return buildCourtResolution(fields);
  if (kind === "other") return buildOtherArbitration(fields);
  return buildCanonicalArbitration(kind);
}

export const adaptLegacyDisputeResolution = normalizeLegacyDisputeResolution;

interface LegacyResolutionFields extends LegacyDisputeResolutionContext {
  readonly value: unknown;
}

function readLegacyFields(
  value: unknown,
  context: LegacyDisputeResolutionContext,
): LegacyResolutionFields {
  if (typeof value === "string") return { value, ...context };
  if (!isRecord(value)) throw invalidLegacyInput(value);

  const label = readLegacyLabel(value);
  return {
    value: label,
    otherInstitutionName: value.otherInstitutionName ??
      context.otherInstitutionName,
    institutionName: value.institutionName ?? context.institutionName,
    jurisdiction: value.jurisdiction ?? context.jurisdiction,
    forum: value.forum ?? context.forum,
  };
}

function readLegacyLabel(value: LegacyDisputeResolutionRecord): unknown {
  const labels = [
    value.value,
    value.arbitrationChamber,
    value.disputeResolutionMethod,
  ].filter((label) => label !== undefined);
  if (labels.length !== 1) throw ambiguousLegacyInput(value);
  return labels[0];
}

function legacyResolutionKind(value: unknown): LegacyResolutionKind {
  if (typeof value !== "string") {
    throw invalidLegacyLabel(value);
  }
  const normalized = value.trim().toLowerCase();
  const kind = LEGACY_RESOLUTION_MAPPINGS[normalized];
  if (!kind) throw unknownLegacyLabel(value);
  return kind;
}

function buildCanonicalArbitration(
  institution: CanonicalArbitrationInstitution,
): ArbitrationDisputeResolution {
  return {
    type: "arbitration",
    institution: { type: "canonical", name: institution },
  };
}

function buildOtherArbitration(
  fields: LegacyResolutionFields,
): ArbitrationDisputeResolution {
  const suppliedName = fields.otherInstitutionName ?? fields.institutionName;
  const name = requireText(suppliedName, "otherInstitutionName", fields.value);
  const parsed = arbitrationInstitutionSchema.safeParse({
    type: "other",
    name,
  });
  if (!parsed.success) throw invalidOtherInstitution(name);
  return { type: "arbitration", institution: parsed.data };
}

function buildCourtResolution(
  fields: LegacyResolutionFields,
): CourtLitigationDisputeResolution {
  return {
    type: "court",
    jurisdiction: requireText(
      fields.jurisdiction,
      "jurisdiction",
      fields.value,
    ),
    forum: requireText(fields.forum, "forum", fields.value),
  };
}

function requireText(value: unknown, field: string, source: unknown): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(
      `Cannot normalize legacy ${
        String(source)
      }: expected non-empty ${field}, received ${describe(value)}.`,
    );
  }
  return value.trim();
}

function isRecord(value: unknown): value is LegacyDisputeResolutionRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function invalidVersionedPayload(value: unknown): Error {
  return new Error(
    `Invalid dispute-resolution payload ${
      describe(value)
    }: expected schemaVersion ${DISPUTE_RESOLUTION_SCHEMA_VERSION} and a canonical mechanism.`,
  );
}

function invalidLegacyInput(value: unknown): Error {
  return new Error(
    `Invalid legacy dispute-resolution input ${
      describe(value)
    }: expected a legacy string or an object with exactly one of value, arbitrationChamber, or disputeResolutionMethod.`,
  );
}

function ambiguousLegacyInput(value: unknown): Error {
  return new Error(
    `Ambiguous legacy dispute-resolution input ${
      describe(value)
    }: provide exactly one legacy mechanism field.`,
  );
}

function invalidLegacyLabel(value: unknown): Error {
  return new Error(
    `Invalid legacy dispute-resolution value ${
      describe(value)
    }: expected one of ${LEGACY_DISPUTE_RESOLUTION_VALUES.join(", ")}.`,
  );
}

function unknownLegacyLabel(value: string): Error {
  return new Error(
    `Unknown legacy dispute-resolution value ${
      describe(value)
    }: expected one of ${LEGACY_DISPUTE_RESOLUTION_VALUES.join(", ")}.`,
  );
}

function invalidOtherInstitution(value: string): Error {
  return new Error(
    `Invalid other arbitration institution ${
      describe(value)
    }: expected a supplied name other than the Other placeholder.`,
  );
}

function describe(value: unknown): string {
  const serialized = JSON.stringify(value);
  return serialized === undefined ? String(value) : serialized;
}
