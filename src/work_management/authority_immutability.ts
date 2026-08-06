/** Recursively freezes one JSON-shaped authority record. */
export function deepFreezeAuthorityRecord<T>(value: T): T {
  if (typeof value !== "object" || value === null || Object.isFrozen(value)) {
    return value;
  }
  Object.freeze(value);
  for (const child of Object.values(value as Record<string, unknown>)) {
    deepFreezeAuthorityRecord(child);
  }
  return value;
}
