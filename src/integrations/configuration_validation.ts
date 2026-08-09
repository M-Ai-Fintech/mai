const INLINE_CREDENTIAL_KEY =
  /(api[-_]?key|authorization|credential|password|private[-_]?key|secret|token|value)/i;

/**
 * Rejects credential-shaped keys at every nested configuration level.
 *
 * @example rejectInlineCredentialKeys({ secretRef: { value: "raw-secret" } })
 */
export function rejectInlineCredentialKeys(value: unknown): void {
  if (Array.isArray(value)) {
    for (const child of value) rejectInlineCredentialKeys(child);
    return;
  }
  if (!isRecord(value)) return;
  for (const [key, child] of Object.entries(value)) {
    if (INLINE_CREDENTIAL_KEY.test(key) && key !== "secretRef") {
      throw new Error(
        "Provider configuration contains an inline credential field; expected a secret reference locator; field=<redacted>.",
      );
    }
    rejectInlineCredentialKeys(child);
  }
}

/**
 * Rejects keys outside a caller-owned strict object shape.
 *
 * @example assertKnownKeys({ provider: "papermark" }, new Set(["provider"]), "provider configuration")
 */
export function assertKnownKeys(
  value: Record<string, unknown>,
  allowed: ReadonlySet<string>,
  label: string,
): void {
  const unknown = Object.keys(value).find((key) => !allowed.has(key));
  if (unknown === undefined) return;
  throw new Error(
    `${label} field is not recognized; expected the strict ${label} shape; field=<redacted>.`,
  );
}

/**
 * Narrows unknown input to a non-array record for strict parsing.
 *
 * @example assertRecord({ provider: "papermark" }, "provider configuration")
 */
export function assertRecord(
  value: unknown,
  label: string,
): asserts value is Record<string, unknown> {
  if (isRecord(value)) return;
  throw new Error(
    `${label} is invalid; expected an object with explicit fields.`,
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
