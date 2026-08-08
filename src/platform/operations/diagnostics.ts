const SENSITIVE_NAME =
  /(password|passwd|secret|token|api[_-]?key|authorization|credential|private[_-]?key|database[_-]?url)/i;

/** Redacts sensitive values before an operational event reaches a log sink. */
export function redactDiagnostics(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redactDiagnostics);
  if (!isRecord(value)) return value;
  const result: Record<string, unknown> = {};
  for (const [key, child] of Object.entries(value)) {
    result[key] = SENSITIVE_NAME.test(key)
      ? "[REDACTED]"
      : redactDiagnostics(child);
  }
  return result;
}

/** Emits one stable JSON event without exposing exception or secret payloads. */
export function logOperationalEvent(
  event: string,
  fields: Readonly<Record<string, unknown>> = {},
): void {
  console.log(JSON.stringify(redactDiagnostics({
    event,
    occurredAt: new Date().toISOString(),
    ...fields,
  })));
}

export function safeErrorCode(error: unknown): string {
  if (!isRecord(error)) return "unknown_error";
  const code = error.code;
  return typeof code === "string" && code.length > 0 ? code : "runtime_error";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
