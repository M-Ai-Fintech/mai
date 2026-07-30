export type ValidationIssueCode = "REQUIRED" | "INVALID_TYPE" | "TOO_LONG";

export interface ValidationIssue {
  readonly field: string;
  readonly code: ValidationIssueCode;
  readonly message: string;
}

export type ValidationResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly issues: readonly ValidationIssue[] };

/**
 * Validates a required user-supplied string without normalizing its wire value.
 *
 * @example validateRequiredString("Approved", "decision")
 */
export function validateRequiredString(
  value: unknown,
  field: string,
  options: { readonly maxLength?: number } = {},
): ValidationResult<string> {
  if (typeof value !== "string") {
    return validationFailure(field, "INVALID_TYPE");
  }
  if (value.trim().length === 0) return validationFailure(field, "REQUIRED");
  if (options.maxLength !== undefined && value.length > options.maxLength) {
    return validationFailure(field, "TOO_LONG", options.maxLength);
  }
  return { ok: true, value };
}

function validationFailure(
  field: string,
  code: ValidationIssueCode,
  maxLength?: number,
): ValidationResult<never> {
  return {
    ok: false,
    issues: [{
      field,
      code,
      message: validationMessage(field, code, maxLength),
    }],
  };
}

function validationMessage(
  field: string,
  code: ValidationIssueCode,
  maxLength?: number,
): string {
  if (code === "REQUIRED") return `${field} is required.`;
  if (code === "INVALID_TYPE") return `${field} must be a string.`;
  return `${field} exceeds ${maxLength} characters.`;
}
