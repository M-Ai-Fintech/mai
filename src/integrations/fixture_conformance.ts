import {
  type CapabilitySnapshot,
  type IntegrationAdapter,
  type IntegrationByteSource,
  type IntegrationCapability,
  type IntegrationFailureCode,
  type IntegrationResult,
  type IntegrationScope,
  type ProviderDocumentPage,
} from "./contracts.ts";
import {
  createNormalizedIntegrationFailure,
  normalizeIntegrationFailure,
} from "./failures.ts";

export interface FixtureConformancePage {
  readonly cursor?: string;
  readonly documentIds: readonly string[];
  readonly nextCursor?: string;
}

export interface FixtureConformancePlan {
  readonly scope: IntegrationScope;
  readonly connectorAccountId: string;
  readonly providerWorkspaceId: string;
  readonly pages: readonly FixtureConformancePage[];
  readonly downloadDocumentId: string;
  readonly expectedContent: Uint8Array;
  readonly missingDocumentId: string;
  readonly deniedCapability: IntegrationCapability;
  readonly unavailableCapability: IntegrationCapability;
  readonly expectedMissingFailure?: IntegrationFailureCode;
}

export interface FixtureConformanceCheck {
  readonly name: string;
  readonly status: "passed" | "failed";
  readonly detail: string;
}

export interface FixtureConformanceEvidence {
  readonly provider: "fixture";
  readonly environment: "fixture";
  readonly source: "fixture";
  readonly synthetic: true;
  readonly readiness: "fixture-only";
  readonly scope: IntegrationScope;
  readonly checks: readonly FixtureConformanceCheck[];
  readonly passed: boolean;
  readonly observedAt: Date;
}

/**
 * Runs deterministic conformance checks against an explicitly injected fixture.
 *
 * @example await runFixtureConformance(fixtureAdapter, { scope, providerWorkspaceId: "room_fixture", pages, downloadDocumentId: "doc-1", expectedContent, missingDocumentId: "missing", deniedCapability: "permissions", unavailableCapability: "create_folder" })
 */
export async function runFixtureConformance(
  adapter: IntegrationAdapter,
  plan: FixtureConformancePlan,
): Promise<FixtureConformanceEvidence> {
  const checks: FixtureConformanceCheck[] = [];
  checks.push(
    await runCheck(
      "fixture-identity",
      () => assertFixtureIdentity(adapter, plan),
    ),
  );
  if (checks[0].status === "failed") return evidence(plan.scope, checks);
  checks.push(
    await runCheck(
      "capability-discovery",
      () => capabilityCheck(adapter, plan),
    ),
  );
  checks.push(await runCheck("health", () => healthCheck(adapter, plan)));
  checks.push(
    await runCheck("pagination", () => paginationCheck(adapter, plan)),
  );
  checks.push(await runCheck("download", () => downloadCheck(adapter, plan)));
  checks.push(
    await runCheck("failure-normalization", () => failureCheck(adapter, plan)),
  );
  checks.push(
    await runCheck(
      "denied-capability",
      () => deniedCapabilityCheck(adapter, plan),
    ),
  );
  checks.push(
    await runCheck(
      "unavailable-capability",
      () => unavailableCapabilityCheck(adapter, plan),
    ),
  );
  return evidence(plan.scope, checks);
}

/**
 * Denies unsupported fixture capabilities before invoking an adapter operation.
 *
 * @example await invokeCapability(snapshot, "permissions", () => adapter.documents.listDocuments(request))
 */
export async function invokeCapability<TResult>(
  snapshot: CapabilitySnapshot,
  capability: IntegrationCapability,
  operation: () => Promise<IntegrationResult<TResult>>,
): Promise<IntegrationResult<TResult>> {
  const observation = snapshot.observations.find((entry) =>
    entry.capability === capability
  );
  if (observation === undefined) {
    return {
      ok: false,
      failure: createNormalizedIntegrationFailure({
        provider: snapshot.provider,
        operation: capability,
        code: "UNAVAILABLE",
      }),
    };
  }
  if (observation.status === "denied") {
    return {
      ok: false,
      failure: createNormalizedIntegrationFailure({
        provider: snapshot.provider,
        operation: capability,
        code: "AUTHORIZATION_DENIED",
      }),
    };
  }
  if (observation.status === "unavailable") {
    return {
      ok: false,
      failure: createNormalizedIntegrationFailure({
        provider: snapshot.provider,
        operation: capability,
        code: "UNAVAILABLE",
      }),
    };
  }
  try {
    return await operation();
  } catch (error: unknown) {
    return {
      ok: false,
      failure: normalizeIntegrationFailure({
        provider: snapshot.provider,
        operation: capability,
        error,
      }),
    };
  }
}

function assertFixtureIdentity(
  adapter: IntegrationAdapter,
  plan: FixtureConformancePlan,
): void {
  if (
    adapter.provider !== "fixture" || adapter.environment !== "fixture" ||
    adapter.lifecycle !== "enabled" || !sameScope(adapter.scope, plan.scope) ||
    adapter.connectorAccountId !== plan.connectorAccountId ||
    adapter.providerWorkspaceId !== plan.providerWorkspaceId
  ) throw new Error("fixture identity mismatch");
}

async function capabilityCheck(
  adapter: IntegrationAdapter,
  plan: FixtureConformancePlan,
): Promise<void> {
  const snapshot = await adapter.discoverCapabilities();
  if (
    snapshot.provider !== "fixture" || snapshot.environment !== "fixture" ||
    snapshot.source !== "fixture" || !snapshot.configured ||
    !sameScope(snapshot.scope, plan.scope)
  ) throw new Error("fixture capability metadata mismatch");
  if (snapshot.observations.length !== snapshot.requested.length) {
    throw new Error("fixture capability observations are incomplete");
  }
}

async function healthCheck(
  adapter: IntegrationAdapter,
  plan: FixtureConformancePlan,
): Promise<void> {
  const health = await adapter.checkHealth();
  if (
    health.provider !== "fixture" || health.environment !== "fixture" ||
    !sameScope(health.scope, plan.scope) || health.state !== "healthy"
  ) throw new Error("fixture health is not healthy");
}

async function paginationCheck(
  adapter: IntegrationAdapter,
  plan: FixtureConformancePlan,
): Promise<void> {
  for (const expected of plan.pages) {
    const result = await documentOperation(
      adapter,
      "list_documents",
      () =>
        adapter.documents.listDocuments({
          scope: plan.scope,
          providerWorkspaceId: plan.providerWorkspaceId,
          cursor: expected.cursor,
        }),
    );
    if (!result.ok) throw new Error("fixture list failed");
    assertPage(result.value, expected);
  }
}

async function downloadCheck(
  adapter: IntegrationAdapter,
  plan: FixtureConformancePlan,
): Promise<void> {
  const result = await documentOperation(
    adapter,
    "download_document",
    () =>
      adapter.documents.downloadDocument({
        scope: plan.scope,
        providerWorkspaceId: plan.providerWorkspaceId,
        providerDocumentId: plan.downloadDocumentId,
      }),
  );
  if (!result.ok) throw new Error("fixture download failed");
  const actual = await collectBytes(result.value);
  if (!sameBytes(actual, plan.expectedContent)) {
    throw new Error("fixture download content mismatch");
  }
}

async function failureCheck(
  adapter: IntegrationAdapter,
  plan: FixtureConformancePlan,
): Promise<void> {
  const result = await documentOperation(
    adapter,
    "download_document",
    () =>
      adapter.documents.downloadDocument({
        scope: plan.scope,
        providerWorkspaceId: plan.providerWorkspaceId,
        providerDocumentId: plan.missingDocumentId,
      }),
  );
  if (result.ok) {
    throw new Error("fixture missing document unexpectedly succeeded");
  }
  const expected = plan.expectedMissingFailure ?? "NOT_FOUND";
  if (
    result.failure.code !== expected || result.failure.provider !== "fixture"
  ) {
    throw new Error("fixture failure was not normalized");
  }
}

async function deniedCapabilityCheck(
  adapter: IntegrationAdapter,
  plan: FixtureConformancePlan,
): Promise<void> {
  const snapshot = await adapter.discoverCapabilities();
  const result = await invokeCapability(
    snapshot,
    plan.deniedCapability,
    () => Promise.reject(new Error("denied provider call")),
  );
  if (result.ok) throw new Error("denied capability unexpectedly succeeded");
  if (result.failure.code !== "AUTHORIZATION_DENIED") {
    throw new Error("denied capability was not explicit");
  }
}

async function unavailableCapabilityCheck(
  adapter: IntegrationAdapter,
  plan: FixtureConformancePlan,
): Promise<void> {
  const snapshot = await adapter.discoverCapabilities();
  const result = await invokeCapability(
    snapshot,
    plan.unavailableCapability,
    () => Promise.reject(new Error("unavailable provider call")),
  );
  if (result.ok) {
    throw new Error("unavailable capability unexpectedly succeeded");
  }
  if (result.failure.code !== "UNAVAILABLE") {
    throw new Error("unavailable capability was not explicit");
  }
}

function assertPage(
  page: ProviderDocumentPage,
  expected: FixtureConformancePage,
): void {
  const ids = page.documents.map(({ providerDocumentId }) =>
    providerDocumentId
  );
  if (
    JSON.stringify(ids) !== JSON.stringify(expected.documentIds) ||
    page.nextCursor !== expected.nextCursor
  ) throw new Error("fixture page is not deterministic");
}

async function documentOperation<TResult>(
  adapter: IntegrationAdapter,
  operation: string,
  request: () => Promise<IntegrationResult<TResult>>,
): Promise<IntegrationResult<TResult>> {
  try {
    return await request();
  } catch (error: unknown) {
    return {
      ok: false,
      failure: normalizeIntegrationFailure({
        provider: adapter.provider,
        operation,
        error,
      }),
    };
  }
}

async function collectBytes(
  source: IntegrationByteSource,
): Promise<Uint8Array> {
  if (source instanceof Uint8Array) return Uint8Array.from(source);
  const chunks: Uint8Array[] = [];
  if (source instanceof ReadableStream) {
    const reader = source.getReader();
    while (true) {
      const next = await reader.read();
      if (next.done) break;
      chunks.push(next.value);
    }
  } else {
    for await (const chunk of source) chunks.push(chunk);
  }
  return concatBytes(chunks);
}

function concatBytes(chunks: readonly Uint8Array[]): Uint8Array {
  const result = new Uint8Array(
    chunks.reduce((sum, chunk) => sum + chunk.length, 0),
  );
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }
  return result;
}

function sameBytes(left: Uint8Array, right: Uint8Array): boolean {
  return left.length === right.length &&
    left.every((value, index) => value === right[index]);
}

async function runCheck(
  name: string,
  check: () => void | Promise<void>,
): Promise<FixtureConformanceCheck> {
  try {
    await check();
    return { name, status: "passed", detail: "fixture check passed" };
  } catch {
    return { name, status: "failed", detail: "fixture check failed" };
  }
}

function evidence(
  scope: IntegrationScope,
  checks: readonly FixtureConformanceCheck[],
): FixtureConformanceEvidence {
  return Object.freeze({
    provider: "fixture",
    environment: "fixture",
    source: "fixture",
    synthetic: true,
    readiness: "fixture-only",
    scope: Object.freeze({ ...scope }),
    checks: Object.freeze([...checks]),
    passed: checks.every(({ status }) => status === "passed"),
    observedAt: new Date("2026-08-08T12:00:00.000Z"),
  });
}

function sameScope(left: IntegrationScope, right: IntegrationScope): boolean {
  return left.tenantId === right.tenantId &&
    left.workspaceId === right.workspaceId && left.dealId === right.dealId;
}
