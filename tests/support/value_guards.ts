/**
 * Narrows an untyped tool result to an object before assertions inspect it.
 *
 * @example const result = requireRecord(await tool.execute(input, context));
 */
export function requireRecord(value: unknown): Record<string, unknown> {
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  throw new TypeError(
    `Expected an object-shaped tool result, received ${JSON.stringify(value)}.`,
  );
}

/**
 * Narrows an untyped tool field to an array before assertions inspect it.
 *
 * @example const files = requireArray(result.files, "files");
 */
export function requireArray(value: unknown, field: string): unknown[] {
  if (Array.isArray(value)) return value;
  throw new TypeError(
    `Expected '${field}' to be an array, received ${JSON.stringify(value)}.`,
  );
}
