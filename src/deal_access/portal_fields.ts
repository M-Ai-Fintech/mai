import type { FieldClassification } from "../platform/authz/v1.ts";

export type PortalFieldName =
  | "public_reference"
  | "title"
  | "status"
  | "document_version"
  | "submission_prompt";

const FIELD_CLASSIFICATIONS: Readonly<
  Record<PortalFieldName, FieldClassification>
> = {
  public_reference: "public",
  title: "public",
  status: "external_shareable",
  document_version: "external_shareable",
  submission_prompt: "external_shareable",
};

export function portalFieldClassification(
  field: PortalFieldName,
): FieldClassification {
  return FIELD_CLASSIFICATIONS[field];
}
