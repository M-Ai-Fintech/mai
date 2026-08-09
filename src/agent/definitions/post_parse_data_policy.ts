const prohibitedFieldSegments = new Set([
  "credential",
  "credentials",
  "password",
  "secret",
  "secrets",
  "token",
  "tokens",
]);

const prohibitedFieldCompounds = new Set([
  "accesskey",
  "accesskeys",
  "apikey",
  "apikeys",
  "privatekey",
  "privatekeys",
  "providerclient",
  "providerclients",
  "rawclient",
  "rawclients",
]);

const prohibitedFieldPairs = [
  ["access", "key"],
  ["api", "key"],
  ["private", "key"],
  ["provider", "client"],
  ["raw", "client"],
] as const;

export type PostParseDataPolicyViolation =
  | "cycle"
  | "accessor"
  | "prohibited_field"
  | "unsupported_value";

export class PostParseDataPolicyError extends Error {
  override readonly name = "PostParseDataPolicyError";

  constructor(
    readonly path: string,
    readonly violation: PostParseDataPolicyViolation,
    readonly valueKind: string,
    detail: string,
  ) {
    super(
      `Governed durable data rejected at ${path}: ${detail}; received ${valueKind}.`,
    );
  }
}

/**
 * Converts parsed governed values into frozen plain data for durable use.
 *
 * ```ts
 * const safe = canonicalizePostParseData({ context: { query: "review" } });
 * ```
 */
export function canonicalizePostParseData(
  value: unknown,
  rootPath = "$",
): unknown {
  return canonicalizeValue(value, rootPath, new WeakSet<object>());
}

/** Canonicalizes a top-level governed record required by proposal contracts. */
export function canonicalizePostParseRecord(
  value: unknown,
  rootPath = "$",
): Readonly<Record<string, unknown>> {
  const canonical = canonicalizePostParseData(value, rootPath);
  if (!isPlainRecord(canonical)) {
    throw policyError(
      rootPath,
      "unsupported_value",
      canonical,
      "expected a plain record at the durable boundary",
    );
  }
  return canonical;
}

export const canonicalizeGovernedData = canonicalizePostParseData;
export const canonicalizeGovernedRecord = canonicalizePostParseRecord;
export { PostParseDataPolicyError as GovernedDataPolicyError };

function canonicalizeValue(
  value: unknown,
  path: string,
  active: WeakSet<object>,
): unknown {
  if (
    value === null || typeof value === "string" || typeof value === "boolean"
  ) {
    return value;
  }
  if (typeof value === "number") return canonicalizeNumber(value, path);
  if (typeof value !== "object") {
    throw policyError(
      path,
      "unsupported_value",
      value,
      "expected JSON-compatible data",
    );
  }
  if (active.has(value)) {
    throw policyError(
      path,
      "cycle",
      value,
      "cyclic data is not durable",
    );
  }
  active.add(value);
  try {
    return isArrayValue(value, path)
      ? canonicalizeArray(value, path, active)
      : canonicalizeObject(value, path, active);
  } finally {
    active.delete(value);
  }
}

function isArrayValue(
  value: object,
  path: string,
): value is readonly unknown[] {
  try {
    return Array.isArray(value);
  } catch {
    throw policyError(
      path,
      "unsupported_value",
      value,
      "the object could not be identified as durable data",
    );
  }
}

function canonicalizeNumber(value: number, path: string): number {
  if (!Number.isFinite(value)) {
    throw policyError(
      path,
      "unsupported_value",
      value,
      "expected a finite number",
    );
  }
  return Object.is(value, -0) ? 0 : value;
}

function canonicalizeArray(
  value: readonly unknown[],
  path: string,
  active: WeakSet<object>,
): readonly unknown[] {
  const length = safeArrayLength(value, path);
  const result: unknown[] = [];
  for (let index = 0; index < length; index++) {
    const childPath = `${path}[${index}]`;
    const descriptor = ownDescriptor(value, String(index), childPath);
    assertDataProperty(descriptor, childPath, value);
    result.push(canonicalizeValue(descriptor.value, childPath, active));
  }
  for (const key of arrayOwnKeys(value, path)) {
    if (typeof key === "symbol") {
      throw policyError(
        `${path}[${String(key)}]`,
        "unsupported_value",
        value,
        "symbol property keys are not durable data",
      );
    }
    if (key === "length" || isArrayIndex(key, length)) continue;
    throw policyError(
      pathForKey(path, key),
      "unsupported_value",
      value,
      "arrays may contain only indexed data",
    );
  }
  return Object.freeze(result);
}

function arrayOwnKeys(
  value: object,
  path: string,
): readonly (string | symbol)[] {
  try {
    return Reflect.ownKeys(value);
  } catch {
    throw policyError(
      path,
      "unsupported_value",
      value,
      "array properties could not be inspected safely",
    );
  }
}

function safeArrayLength(value: readonly unknown[], path: string): number {
  try {
    const descriptor = Object.getOwnPropertyDescriptor(value, "length");
    if (descriptor === undefined) throw new Error("missing length");
    if (descriptor.get !== undefined || descriptor.set !== undefined) {
      throw policyError(
        `${path}.length`,
        "accessor",
        value,
        "accessor properties are not durable data",
      );
    }
    const length = descriptor.value;
    if (!Number.isSafeInteger(length) || length < 0) {
      throw new Error("invalid length");
    }
    return length;
  } catch (error) {
    if (error instanceof PostParseDataPolicyError) throw error;
    throw policyError(
      path,
      "unsupported_value",
      value,
      "expected an ordinary finite array",
    );
  }
}

function canonicalizeObject(
  value: object,
  path: string,
  active: WeakSet<object>,
): Readonly<Record<string, unknown>> {
  if (!isPlainRecord(value)) {
    throw policyError(
      path,
      "unsupported_value",
      value,
      "expected a plain object, not a class or client instance",
    );
  }
  const result: Record<string, unknown> = {};
  for (const key of ownKeys(value, path)) {
    const childPath = pathForKey(path, key);
    const descriptor = ownDescriptor(value, key, childPath);
    assertDataProperty(descriptor, childPath, value);
    assertSafeFieldName(key, childPath, descriptor.value);
    Object.defineProperty(result, key, {
      configurable: true,
      enumerable: true,
      value: canonicalizeValue(descriptor.value, childPath, active),
      writable: true,
    });
  }
  return Object.freeze(result);
}

function ownKeys(value: object, path: string): readonly string[] {
  try {
    return Reflect.ownKeys(value).map((key) => {
      if (typeof key === "symbol") {
        throw policyError(
          `${path}[${String(key)}]`,
          "unsupported_value",
          value,
          "symbol property keys are not durable data",
        );
      }
      return key;
    });
  } catch (error) {
    if (error instanceof PostParseDataPolicyError) throw error;
    throw policyError(
      path,
      "unsupported_value",
      value,
      "object properties could not be inspected safely",
    );
  }
}

function ownDescriptor(
  value: object,
  key: string,
  path: string,
): PropertyDescriptor {
  try {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (descriptor === undefined) throw new Error("missing descriptor");
    return descriptor;
  } catch {
    throw policyError(
      path,
      "unsupported_value",
      value,
      "property could not be inspected safely",
    );
  }
}

function assertDataProperty(
  descriptor: PropertyDescriptor,
  path: string,
  value: unknown,
): asserts descriptor is PropertyDescriptor & { readonly value: unknown } {
  if (descriptor.get !== undefined || descriptor.set !== undefined) {
    throw policyError(
      path,
      "accessor",
      value,
      "accessor properties are not durable data",
    );
  }
  if (!descriptor.enumerable) {
    throw policyError(
      path,
      "unsupported_value",
      value,
      "non-enumerable properties are not durable data",
    );
  }
}

function assertSafeFieldName(
  key: string,
  path: string,
  value: unknown,
): void {
  const segments = normalizeFieldName(key);
  if (isProhibitedField(segments)) {
    throw policyError(
      path,
      "prohibited_field",
      value,
      `field name "${key}" is credential- or client-shaped`,
    );
  }
}

function normalizeFieldName(key: string): readonly string[] {
  return key
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1_$2")
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .toLowerCase()
    .split("_")
    .filter((segment) => segment.length > 0);
}

function isProhibitedField(segments: readonly string[]): boolean {
  if (segments.some((segment) => prohibitedFieldSegments.has(segment))) {
    return true;
  }
  if (segments.some((segment) => prohibitedFieldCompounds.has(segment))) {
    return true;
  }
  return prohibitedFieldPairs.some(([first, second]) =>
    segments.some((segment, index) =>
      segment === first &&
      (segments[index + 1] === second || segments[index + 1] === `${second}s`)
    )
  );
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }
  try {
    const prototype = Object.getPrototypeOf(value);
    return prototype === null || prototype === Object.prototype;
  } catch {
    return false;
  }
}

function isArrayIndex(key: string, length: number): boolean {
  const index = Number(key);
  return Number.isInteger(index) && index >= 0 && index < length &&
    String(index) === key;
}

function pathForKey(path: string, key: string): string {
  return /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(key)
    ? `${path}.${key}`
    : `${path}[${JSON.stringify(key)}]`;
}

function policyError(
  path: string,
  violation: PostParseDataPolicyViolation,
  value: unknown,
  detail: string,
): PostParseDataPolicyError {
  return new PostParseDataPolicyError(
    path,
    violation,
    describeValue(value),
    detail,
  );
}

function describeValue(value: unknown): string {
  if (value === null) return "null";
  const type = typeof value;
  if (type !== "object") return type;
  try {
    if (Array.isArray(value)) return "array";
  } catch {
    return "uninspectable object";
  }
  try {
    const prototype = Object.getPrototypeOf(value);
    if (prototype === null || prototype === Object.prototype) {
      return "plain object";
    }
    const constructor = Object.getOwnPropertyDescriptor(
      prototype,
      "constructor",
    )
      ?.value;
    return typeof constructor === "function" && constructor.name
      ? `object instance ${constructor.name}`
      : "non-plain object";
  } catch {
    return "uninspectable object";
  }
}
