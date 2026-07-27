/**
 * Returns a stable message for values caught at an unknown error boundary.
 *
 * @example
 * describeError(new Error("network unavailable")) === "network unavailable"
 */
export function describeError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
