import type {
  ContentClassification,
  ContentPayload,
  RecipientScope,
  RedactionOverlay,
  RedactionPolicy,
} from "./model.ts";
import { assertRecipientPurpose } from "./recipients.ts";

export interface RedactedContent {
  readonly content: ContentPayload;
  readonly overlay: RedactionOverlay;
}

export function redactContentForRecipient(
  content: ContentPayload,
  classifications: ContentClassification,
  policy: RedactionPolicy,
  audience: RecipientScope,
): RedactedContent {
  if (policy.audienceType !== audience.audienceType) {
    throw new Error(
      `Redaction policy audience "${policy.audienceType}" does not match recipient audience "${audience.audienceType}".`,
    );
  }
  assertRecipientPurpose(audience, policy.purpose);
  const restrictedFields = Object.entries(classifications)
    .filter(([, classification]) => classification === "restricted")
    .map(([field]) => field);
  const rulePaths = new Set(policy.rules.map((rule) => rule.fieldPath));
  const missing = restrictedFields.filter((field) => !rulePaths.has(field));
  if (missing.length > 0) {
    throw new Error(
      `Restricted field "${
        missing[0]
      }" has no redaction rule; expected restricted fields to be removed before recipient output.`,
    );
  }
  const sanitized = cloneContent(content);
  for (const fieldPath of rulePaths) removePath(sanitized, fieldPath);
  const overlay: RedactionOverlay = Object.freeze({
    overlayId: `redaction_${policy.policyId}`,
    policyId: policy.policyId,
    audience,
    fields: Object.freeze([...rulePaths]),
    appliedAt: new Date(),
  });
  return {
    content: Object.freeze(sanitized) as ContentPayload,
    overlay,
  };
}

function cloneContent(content: ContentPayload): Record<string, unknown> {
  return JSON.parse(JSON.stringify(content)) as Record<string, unknown>;
}

function removePath(content: Record<string, unknown>, path: string): void {
  const parts = path.split(".");
  let current: Record<string, unknown> = content;
  for (const part of parts.slice(0, -1)) {
    const next = current[part];
    if (!isRecord(next)) return;
    current = next;
  }
  delete current[parts.at(-1)!];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
