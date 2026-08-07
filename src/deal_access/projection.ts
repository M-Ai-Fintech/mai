import {
  type AllowedAuthorizationDecision,
  field,
  projectAuthorizedDto,
  type ProjectionSchema,
} from "../platform/authz/v1.ts";
import type { PortalObjectSnapshot } from "./model.ts";
import type { PortalFieldName } from "./portal_fields.ts";

export interface PortalObjectProjection {
  readonly reference?: string;
  readonly title?: string;
  readonly status?: string;
  readonly documentVersion?: number;
  readonly submissionPrompt?: string;
  readonly allowedActions: readonly string[];
}

export function projectPortalObject(
  snapshot: PortalObjectSnapshot,
  decision: AllowedAuthorizationDecision,
  requestedFields: readonly PortalFieldName[],
): PortalObjectProjection {
  const projection = projectAuthorizedDto(
    snapshot,
    portalProjectionSchema(),
    decision.fieldMask,
    decision.allowedActions,
  );
  return {
    ...(requestedFields.includes("public_reference") &&
        projection.reference !== undefined
      ? { reference: String(projection.reference) }
      : {}),
    ...(requestedFields.includes("title") && projection.title !== undefined
      ? { title: String(projection.title) }
      : {}),
    ...(requestedFields.includes("status") && projection.status !== undefined
      ? { status: String(projection.status) }
      : {}),
    ...(requestedFields.includes("document_version") &&
        projection.documentVersion !== undefined
      ? { documentVersion: Number(projection.documentVersion) }
      : {}),
    ...(requestedFields.includes("submission_prompt") &&
        projection.submissionPrompt !== undefined
      ? { submissionPrompt: String(projection.submissionPrompt) }
      : {}),
    allowedActions: decision.allowedActions.map(String),
  };
}

function portalProjectionSchema(): ProjectionSchema<PortalObjectSnapshot> {
  return {
    reference: {
      field: field("public_reference"),
      sourceKey: "publicReference",
      classification: "public",
    },
    title: {
      field: field("title"),
      sourceKey: "title",
      classification: "public",
    },
    status: {
      field: field("status"),
      sourceKey: "status",
      classification: "external_shareable",
    },
    documentVersion: {
      field: field("document_version"),
      sourceKey: "documentVersion",
      classification: "external_shareable",
    },
    submissionPrompt: {
      field: field("submission_prompt"),
      sourceKey: "submissionPrompt",
      classification: "external_shareable",
    },
  };
}
