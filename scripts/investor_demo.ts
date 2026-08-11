import pg from "pg";
import { createExecutableApiServer } from "../src/api/server.ts";
import {
  PostgresDealAuthorization,
  PostgresIdentityAccessAuthentication,
} from "../src/api/deal_management_bootstrap.ts";
import {
  authorityConstraintId,
  createDealManagementComposition,
  dealEventId,
  dealId,
  type DealManagementCompositionResult,
  dealPartyId,
  dealRoleId,
  mandateId,
} from "../src/deal_management/v1.ts";
import type {
  DemoReadinessResult,
  DemoResetTarget,
  DemoScreenFamily,
  DemoShellReadModel,
} from "../src/demo_readiness/contracts.ts";
import {
  demoReadinessResultSchema,
  demoScreenReadModelSchema,
  demoShellReadModelSchema,
  parseDemoEnvelope,
} from "../src/demo_readiness/api_contracts.ts";
import { demoScope } from "../src/demo_readiness/runner.ts";
import { assertSafeDemoDatabaseUrl } from "../src/demo_readiness/reset.ts";
import {
  type DemoPersistedRecordCounts,
  GuardedDemoDatabase,
  persistedRecordCounts,
  prepareDemoDatabase,
  receiptCorrelationIds,
  receiptCount,
  receiptEventIds,
  resetDemoDatabase,
  seedDemoIdentity,
} from "./investor_demo_database.ts";

const target: DemoResetTarget = {
  environment: "local-demo",
  databaseName: "mai_demo_readiness",
};
const families: readonly DemoScreenFamily[] = [
  "command-center",
  "deals-portfolio",
  "deal-overview",
  "documents-vdr",
  "diligence-decision-room",
  "valuation-lab",
  "matching-universe",
  "negotiation-room",
  "tasks-approvals",
  "deal-activity-audit",
  "deliverables-exports",
];

if (import.meta.main) await runInvestorDemo();

async function runInvestorDemo(): Promise<void> {
  const databaseUrl = configuredDemoDatabaseUrl();
  const database = GuardedDemoDatabase.open(databaseUrl, target);
  const pool = database.pool;
  try {
    await prepareDemoDatabase(database);
    const first = await executeDemoRun(database);
    const second = await executeDemoRun(database);
    assertIdenticalRuns(first, second);
    console.log(JSON.stringify(terminalEvidence(first)));
  } finally {
    await pool.end();
  }
}

function terminalEvidence(
  run: DemoRunEvidence,
): Readonly<Record<string, unknown>> {
  return {
    status: "passed",
    repeatable: true,
    runs: 2,
    datasetDigest: run.result.datasetDigest,
    screens: run.screens,
    shell: run.shell,
    persistedRecords: run.persistedRecords,
    guards: {
      auditReceipts: run.auditReceipts,
      auditCorrelationIds: run.auditCorrelationIds,
      auditEventIds: run.auditEventIds,
      idempotentReplay: run.idempotentReplay,
      anonymousDenied: run.anonymousDenied,
      crossScopeDenied: run.crossScopeDenied,
      dealOpened: run.dealOpened,
      missingDealDenied: run.missingDealDenied,
    },
    evidence: run.result,
  };
}

interface DemoRunEvidence {
  readonly result: DemoReadinessResult;
  readonly screens: readonly DemoScreenFamily[];
  readonly shell: DemoShellReadModel;
  readonly persistedRecords: DemoPersistedRecordCounts;
  readonly auditReceipts: number;
  readonly auditCorrelationIds: readonly string[];
  readonly auditEventIds: readonly string[];
  readonly idempotentReplay: true;
  readonly crossScopeDenied: true;
  readonly anonymousDenied: true;
  readonly dealOpened: true;
  readonly missingDealDenied: true;
}

async function executeDemoRun(
  database: GuardedDemoDatabase,
): Promise<DemoRunEvidence> {
  await resetDemoDatabase(database);
  await seedDemoIdentity(database, fixedNow().toISOString());
  const pool = database.pool;
  const dealManagement = demoDealManagement(pool);
  const router = createExecutableApiServer(database.executableEnvironment(), {
    dealManagement,
    waveH: {},
  });
  try {
    const missingDealDenied = await deniedBeforeDealExists(router.handle);
    const dealOpened = await createAndOpenDemoDeal(router.handle);
    const result = await executeWorkflow(router.handle);
    const idempotentReplay = await replayWorkflow(router.handle, result);
    const screens = await traverseScreens(router.handle);
    const shell = await traverseShell(router.handle);
    const anonymousDenied = await deniedWithoutIdentity(router.handle);
    const crossScopeDenied = await deniedAcrossDealScope(router.handle);
    return {
      result,
      screens,
      shell,
      persistedRecords: await persistedRecordCounts(pool),
      auditReceipts: await receiptCount(pool),
      auditCorrelationIds: await receiptCorrelationIds(pool),
      auditEventIds: await receiptEventIds(pool),
      idempotentReplay,
      anonymousDenied,
      crossScopeDenied,
      dealOpened,
      missingDealDenied,
    };
  } finally {
    if (router.dealManagement.kind === "configured") {
      await router.dealManagement.composition.close();
    }
  }
}

async function deniedBeforeDealExists(
  handle: (request: Request) => Promise<Response>,
): Promise<true> {
  const response = await handle(
    request("/api/v1/demo-readiness/execute", "POST", {
      "Idempotency-Key": "idem_investor-demo-execute",
    }),
  );
  if (response.status === 404) return true;
  throw new Error(
    `Missing Deal demo execution returned ${response.status}; expected permission-safe 404 after authorization.`,
  );
}

function demoDealManagement(pool: pg.Pool): DealManagementCompositionResult {
  return createDealManagementComposition({
    pool,
    poolOwnership: "borrowed",
    authentication: new PostgresIdentityAccessAuthentication(pool),
    authorization: new PostgresDealAuthorization(pool),
    ids: {
      nextDealId: () => dealId("deal_serra-azul"),
      nextDealPartyId: () => dealPartyId("party_investor-demo"),
      nextDealRoleId: () => dealRoleId("dealrole_investor-demo"),
      nextMandateId: () => mandateId("mandate_investor-demo"),
      nextAuthorityConstraintId: () =>
        authorityConstraintId("constraint_investor-demo"),
      nextEventId: () => dealEventId("event_investor-demo-created"),
    },
    clock: { now: () => fixedNow().toISOString() },
  });
}

async function createAndOpenDemoDeal(
  handle: (request: Request) => Promise<Response>,
): Promise<true> {
  const created = await handle(request("/api/v1/deals", "POST", {
    "Content-Type": "application/json",
    "Idempotency-Key": "idem_investor-demo-create",
  }, {
    name: "Serra Azul synthetic sell-side mandate",
    dealType: "sell-side",
    confidentiality: "sensitive",
    currency: "BRL",
  }));
  if (created.status !== 201) {
    throw await responseFailure("create-deal", created);
  }
  const opened = await handle(
    request(`/api/v1/deals/${demoScope.dealId}`, "GET"),
  );
  if (opened.status === 200) return true;
  throw await responseFailure("open-deal", opened);
}

async function executeWorkflow(
  handle: (request: Request) => Promise<Response>,
): Promise<DemoReadinessResult> {
  const response = await handle(
    request("/api/v1/demo-readiness/execute", "POST", {
      "Idempotency-Key": "idem_investor-demo-execute",
    }),
  );
  if (response.status !== 201) throw await responseFailure("execute", response);
  return parseDemoEnvelope(await response.json(), demoReadinessResultSchema);
}

async function replayWorkflow(
  handle: (request: Request) => Promise<Response>,
  expected: DemoReadinessResult,
): Promise<true> {
  const response = await handle(
    request("/api/v1/demo-readiness/execute", "POST", {
      "Idempotency-Key": "idem_investor-demo-execute",
    }),
  );
  if (response.status !== 201) throw await responseFailure("replay", response);
  const replayed = parseDemoEnvelope(
    await response.json(),
    demoReadinessResultSchema,
  );
  if (JSON.stringify(replayed) === JSON.stringify(expected)) return true;
  throw new Error(
    `Demo idempotent replay returned digest "${replayed.datasetDigest}"; expected the exact persisted result "${expected.datasetDigest}".`,
  );
}

async function traverseScreens(
  handle: (request: Request) => Promise<Response>,
): Promise<readonly DemoScreenFamily[]> {
  const visited: DemoScreenFamily[] = [];
  for (const family of families) {
    const path =
      `/api/v1/demo-readiness/deals/${demoScope.dealId}/screens/${family}`;
    const response = await handle(request(path, "GET"));
    if (response.status !== 200) throw await responseFailure(family, response);
    const screen = parseDemoEnvelope(
      await response.json(),
      demoScreenReadModelSchema,
    );
    if (screen.family !== family) {
      throw new Error(
        `Demo screen "${family}" returned "${screen.family}"; expected the exact typed family.`,
      );
    }
    visited.push(family);
  }
  return visited;
}

async function traverseShell(
  handle: (request: Request) => Promise<Response>,
): Promise<DemoShellReadModel> {
  const path = `/api/v1/demo-readiness/deals/${demoScope.dealId}/shell`;
  const response = await handle(request(path, "GET"));
  if (response.status !== 200) throw await responseFailure("shell", response);
  const shell = parseDemoEnvelope(
    await response.json(),
    demoShellReadModelSchema,
  );
  if (shell.deal.id === demoScope.dealId) return shell;
  throw new Error(
    `Demo shell returned Deal "${shell.deal.id}"; expected "${demoScope.dealId}".`,
  );
}

async function deniedWithoutIdentity(
  handle: (request: Request) => Promise<Response>,
): Promise<true> {
  const response = await handle(request(screenPath("documents-vdr"), "GET", {
    Authorization: "",
  }));
  if (response.status === 401) return true;
  throw new Error(
    `Anonymous demo read returned ${response.status}; expected 401 before protected loading.`,
  );
}

async function deniedAcrossDealScope(
  handle: (request: Request) => Promise<Response>,
): Promise<true> {
  const response = await handle(request(screenPath("documents-vdr"), "GET", {
    "X-Deal-Id": "deal_other-scope",
  }));
  if (response.status === 403) return true;
  throw new Error(
    `Cross-Deal demo read returned ${response.status}; expected protected denial.`,
  );
}

function screenPath(family: DemoScreenFamily): string {
  return `/api/v1/demo-readiness/deals/${demoScope.dealId}/screens/${family}`;
}

function request(
  path: string,
  method: string,
  overrides: Readonly<Record<string, string>> = {},
  body?: unknown,
): Request {
  return new Request(`http://localhost${path}`, {
    method,
    headers: {
      Authorization: "Bearer session_investor-demo",
      "X-Deal-Id": demoScope.dealId,
      "X-Correlation-Id": "cor_investor-demo",
      ...overrides,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

function configuredDemoDatabaseUrl(): string {
  const value = Deno.env.get("DATABASE_URL") ??
    Deno.env.get("POSTGRES_INTEGRATION_TEST_DATABASE_URL");
  if (value === undefined) {
    throw new Error(
      "Demo database configuration is missing; expected DATABASE_URL for mai_demo_readiness.",
    );
  }
  assertSafeDemoDatabaseUrl(value, target);
  return value;
}

function fixedNow(): Date {
  return new Date("2026-08-10T12:00:00.000Z");
}

function assertIdenticalRuns(
  first: DemoRunEvidence,
  second: DemoRunEvidence,
): void {
  assertCompleteRun(first);
  assertCompleteRun(second);
  if (JSON.stringify(first) === JSON.stringify(second)) return;
  throw new Error(
    `Investor demo digest "${first.result.datasetDigest}" changed after reset; expected identical PostgreSQL/API evidence.`,
  );
}

function assertCompleteRun(run: DemoRunEvidence): void {
  if (
    run.auditReceipts === 1 && run.anonymousDenied && run.crossScopeDenied &&
    run.dealOpened && run.missingDealDenied && run.idempotentReplay &&
    run.result.labels.persistence === "postgres_context_records" &&
    run.result.authority.agentDecisionRejected &&
    run.result.citations.length === run.result.documentVersions.length &&
    run.auditCorrelationIds.join(",") === "cor_investor-demo" &&
    run.auditEventIds.join(",") === run.result.auditEventId &&
    run.shell.permissions.join(",") === "workspace,deal" &&
    hasExpectedPersistence(run.persistedRecords)
  ) return;
  throw new Error(
    `Demo run retained ${run.auditReceipts} audit receipts; expected one receipt plus anonymous and cross-scope denial.`,
  );
}

function hasExpectedPersistence(counts: DemoPersistedRecordCounts): boolean {
  return counts.documents === 4 && counts.documentVersions === 4 &&
    counts.processingRuns === 4 && counts.derivedArtifacts === 4 &&
    counts.citations === 4 && counts.evidenceRecords === 4 &&
    counts.calculations === 1 && counts.findings === 1 &&
    counts.decisionRequests === 1 && counts.decisionRecords === 1 &&
    counts.deliverables === 1 && counts.sourceSnapshots === 1 &&
    counts.deliverableVersions === 1 && counts.workflowSnapshots === 1;
}

async function responseFailure(
  label: string,
  response: Response,
): Promise<Error> {
  const body = await response.text();
  return new Error(
    `Demo step "${label}" returned ${response.status}: ${body.slice(0, 300)}`,
  );
}
