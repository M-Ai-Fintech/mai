import type {
  Action,
  FieldClassification,
  FieldMask,
  FieldName,
} from "./vocabulary.ts";

export interface ProjectionField<Source extends object> {
  readonly field: FieldName;
  readonly sourceKey: keyof Source;
  readonly classification: FieldClassification;
  readonly redactedPlaceholder?: string;
}

export type ProjectionSchema<Source extends object> = Readonly<
  Record<string, ProjectionField<Source>>
>;

/**
 * Copies only explicitly approved source fields into a serialization-safe DTO.
 *
 * @example projectAuthorizedDto(deal, schema, decision.fieldMask, decision.allowedActions)
 */
export function projectAuthorizedDto<Source extends object>(
  source: Source,
  schema: ProjectionSchema<Source>,
  fieldMask: FieldMask,
  allowedActions: readonly Action[],
): Readonly<Record<string, unknown>> {
  const output: Record<string, unknown> = {};
  for (const [outputKey, definition] of Object.entries(schema)) {
    copyApprovedField(source, output, outputKey, definition, fieldMask);
  }
  if (allowedActions.length > 0) output.allowedActions = [...allowedActions];
  return Object.freeze(output);
}

function copyApprovedField<Source extends object>(
  source: Source,
  output: Record<string, unknown>,
  outputKey: string,
  definition: ProjectionField<Source>,
  fieldMask: FieldMask,
): void {
  // A redact obligation without a governed placeholder is an omission, never
  // permission to copy the protected source value.  This is intentionally
  // checked before the include mask so a restrictive decision cannot be
  // bypassed by requesting both include and redact for the same field.
  if (
    fieldMask.redact.includes(definition.field) &&
    definition.redactedPlaceholder === undefined
  ) return;
  if (isApprovedField(definition, fieldMask)) {
    output[outputKey] = source[definition.sourceKey];
  }
  if (
    fieldMask.redact.includes(definition.field) &&
    definition.redactedPlaceholder !== undefined
  ) {
    output[outputKey] = definition.redactedPlaceholder;
  }
}

function isApprovedField<Source extends object>(
  definition: ProjectionField<Source>,
  fieldMask: FieldMask,
): boolean {
  return fieldMask.include.includes(definition.field) &&
    fieldMask.approvedClassifications.some((approved) =>
      approved.name === definition.field &&
      approved.classification === definition.classification
    );
}
