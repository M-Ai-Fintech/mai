import type {
  AllowedAuthorizationDecision,
  FieldClassification,
  FieldMask,
} from "../platform/authz/v1.ts";
import {
  field,
  projectAuthorizedDto,
  type ProjectionSchema,
} from "../platform/authz/v1.ts";
import type { FinancialRiskResult } from "./model.ts";

interface FinancialRiskProjectionSource {
  readonly aggregateType: FinancialRiskResult["aggregateType"];
  readonly resultId: string;
  readonly assessmentId: string;
  readonly scope: FinancialRiskResult["scope"];
  readonly version: number;
  readonly state: FinancialRiskResult["state"];
  readonly outputs?: FinancialRiskResult["outputs"];
  readonly provenance: FinancialRiskResult["provenance"];
  readonly references: Readonly<Record<string, unknown>>;
  readonly actor: FinancialRiskResult["actor"];
  readonly correlationId: string;
  readonly idempotencyKey: string;
  readonly execution: FinancialRiskResult["execution"];
  readonly supersedesResultId?: string;
  readonly reason?: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export const FINANCIAL_RISK_PROJECTION_FIELDS = Object.freeze({
  aggregateType: field("aggregate_type"),
  resultId: field("result_id"),
  assessmentId: field("assessment_id"),
  scope: field("scope"),
  version: field("version"),
  state: field("state"),
  outputs: field("outputs"),
  provenance: field("provenance"),
  references: field("references"),
  actor: field("actor"),
  correlationId: field("correlation_id"),
  idempotencyKey: field("idempotency_key"),
  execution: field("execution"),
  supersedesResultId: field("supersedes_result_id"),
  reason: field("reason"),
  createdAt: field("created_at"),
  updatedAt: field("updated_at"),
});

const FINANCIAL_RISK_CLASSIFICATIONS: Readonly<
  Record<keyof typeof FINANCIAL_RISK_PROJECTION_FIELDS, FieldClassification>
> = Object.freeze({
  aggregateType: "public",
  resultId: "restricted",
  assessmentId: "restricted",
  scope: "restricted",
  version: "public",
  state: "restricted",
  outputs: "restricted",
  provenance: "internal_audit",
  references: "unrestricted_evidence",
  actor: "internal_audit",
  correlationId: "internal_audit",
  idempotencyKey: "internal_audit",
  execution: "internal_audit",
  supersedesResultId: "restricted",
  reason: "restricted",
  createdAt: "public",
  updatedAt: "public",
});

export const FINANCIAL_RISK_PROJECTION_FIELD_MASK: FieldMask = Object.freeze({
  include: Object.freeze(Object.values(FINANCIAL_RISK_PROJECTION_FIELDS)),
  omit: Object.freeze([]),
  redact: Object.freeze([]),
  approvedClassifications: Object.freeze(
    Object.entries(FINANCIAL_RISK_PROJECTION_FIELDS).map(([key, name]) => ({
      name,
      classification: FINANCIAL_RISK_CLASSIFICATIONS[
        key as keyof typeof FINANCIAL_RISK_CLASSIFICATIONS
      ],
    })),
  ),
});

const PROJECTION_SCHEMA: ProjectionSchema<FinancialRiskProjectionSource> =
  Object.freeze(
    Object.fromEntries(
      Object.entries(FINANCIAL_RISK_PROJECTION_FIELDS).map(([key, name]) => [
        key,
        {
          field: name,
          sourceKey: key as keyof FinancialRiskProjectionSource,
          classification: FINANCIAL_RISK_CLASSIFICATIONS[
            key as keyof typeof FINANCIAL_RISK_CLASSIFICATIONS
          ],
        },
      ]),
    ) as ProjectionSchema<FinancialRiskProjectionSource>,
  );

export function projectFinancialRiskResult(
  result: FinancialRiskResult,
  authorization: AllowedAuthorizationDecision,
): Readonly<Record<string, unknown>> {
  return projectAuthorizedDto(
    serializedResult(result),
    PROJECTION_SCHEMA,
    safeFieldMask(authorization.fieldMask),
    [],
  );
}

export function financialRiskFieldGranted(
  authorization: AllowedAuthorizationDecision,
  key: keyof typeof FINANCIAL_RISK_PROJECTION_FIELDS,
): boolean {
  const name = FINANCIAL_RISK_PROJECTION_FIELDS[key];
  const classification = FINANCIAL_RISK_CLASSIFICATIONS[key];
  return authorization.fieldMask.include.includes(name) &&
    !authorization.fieldMask.omit.includes(name) &&
    !authorization.fieldMask.redact.includes(name) &&
    authorization.fieldMask.approvedClassifications.some((approved) =>
      approved.name === name && approved.classification === classification
    );
}

function serializedResult(
  result: FinancialRiskResult,
): FinancialRiskProjectionSource {
  return {
    aggregateType: result.aggregateType,
    resultId: result.resultId,
    assessmentId: result.assessmentId,
    scope: result.scope,
    version: result.version,
    state: result.state,
    ...(result.outputs === undefined ? {} : { outputs: result.outputs }),
    provenance: result.provenance,
    references: {
      ...result.references,
      evidenceBasis: {
        ...result.references.evidenceBasis,
        capturedAt: result.references.evidenceBasis.capturedAt.toISOString(),
      },
    },
    actor: result.actor,
    correlationId: result.correlationId,
    idempotencyKey: result.idempotencyKey,
    execution: result.execution,
    ...(result.supersedesResultId === undefined
      ? {}
      : { supersedesResultId: result.supersedesResultId }),
    ...(result.reason === undefined ? {} : { reason: result.reason }),
    createdAt: result.createdAt.toISOString(),
    updatedAt: result.updatedAt.toISOString(),
  };
}

function safeFieldMask(fieldMask: FieldMask): FieldMask {
  return {
    ...fieldMask,
    include: fieldMask.include.filter((name) =>
      !fieldMask.omit.includes(name) && !fieldMask.redact.includes(name)
    ),
  };
}
