import { assert, assertEquals, assertStringIncludes } from "@std/assert";
import type {
  Clock,
  IdempotencyClaim,
  IdempotencyClaimResult,
  PostgresTransactionRunner,
  TransactionHandle,
  TransactionQueryResult,
} from "../../src/platform/persistence/v1.ts";
import { IdempotencyRepository } from "../../src/platform/persistence/v1.ts";
import { FinancialRiskApplication } from "../../src/financial_risk/application.ts";
import {
  PostgresFinancialRiskRepository,
} from "../../src/financial_risk/postgres_repository.ts";
import { PostgresFinancialRiskJobPort } from "../../src/financial_risk/job_port.ts";
import {
  commandDigest,
  queuedJob,
} from "../../src/financial_risk/application_support.ts";
import { createCommandClaim } from "../../src/financial_risk/application_internal.ts";
import { InMemoryFinancialRiskRepository } from "../../src/financial_risk/repository.ts";
import type { FinancialRiskEffects } from "../../src/financial_risk/effects.ts";
import { financialRiskMigration } from "../../src/financial_risk/migrations/index.ts";
import {
  computeRequest,
  FakeFinancialRiskAuthorization,
  FakeFinancialRiskInference,
  financialRiskScope,
  MODEL_RESULT,
  RecordingReferenceVerifier,
} from "./support.ts";

Deno.test("financial-risk persistence reconstructs immutable payloads and appends effects", async () => {
  const result = await financialRiskResult();
  const runner = new RecordingTransactionRunner(
    JSON.parse(JSON.stringify(result)),
  );
  const effects = new RecordingFinancialRiskEffects();
  const repository = new PostgresFinancialRiskRepository(
    runner as unknown as PostgresTransactionRunner,
    effects,
    new FakeDurableIdempotencyRepository(),
  );

  await repository.append(result);
  const latest = await repository.findLatest(
    result.scope,
    result.assessmentId,
  );

  assertEquals(effects.results, [result.resultId]);
  assertEquals(latest?.state, "completed");
  assertEquals(latest?.createdAt instanceof Date, true);
  assertEquals(
    latest?.references.evidenceBasis.basisDigest,
    result.references.evidenceBasis.basisDigest,
  );
  const select = runner.queries.find((query) =>
    query.sql.includes("ORDER BY version")
  );
  if (select === undefined) {
    throw new Error("Expected scoped latest-result query.");
  }
  assertStringIncludes(select.sql, "tenant_id=$1");
  assertEquals(select.parameters.slice(0, 3), [
    result.scope.tenantId,
    result.scope.workspaceId,
    result.scope.dealId,
  ]);
});

Deno.test("financial-risk migration owns only semantic financial-risk tables", () => {
  assertEquals(financialRiskMigration.owner, "financial_risk");
  assertEquals(financialRiskMigration.schema, "financial_risk");
  for (const statement of financialRiskMigration.statements) {
    assertEquals(statement.schema, "financial_risk");
    assertEquals(statement.sql.includes("MAI-"), false);
  }
});

Deno.test("financial-risk job port enqueues through the platform job repository", async () => {
  const runner = new JobRecordingTransactionRunner();
  const port = new PostgresFinancialRiskJobPort(
    runner as unknown as PostgresTransactionRunner,
  );
  const request = computeRequest();

  await port.enqueue(
    queuedJob(
      request,
      financialRiskScope(),
      request.references,
      fakeClock.now(),
    ),
  );

  assertEquals(
    runner.queries.some((query) =>
      query.sql.includes("INSERT INTO platform.jobs")
    ),
    true,
  );
});

Deno.test("financial-risk queue claim, job insert, and completion share one transaction", async () => {
  const runner = new JobRecordingTransactionRunner();
  const port = new PostgresFinancialRiskJobPort(
    runner as unknown as PostgresTransactionRunner,
  );
  const request = computeRequest();
  const job = queuedJob(
    request,
    financialRiskScope(),
    request.references,
    fakeClock.now(),
  );
  const claim = createCommandClaim(
    request,
    financialRiskScope(),
    await commandDigest(request),
  );

  assertEquals(await port.claimAndEnqueue(claim, job), { status: "claimed" });
  assertEquals(runner.runs, 1);
  const statements = runner.queries.map((query) => query.sql);
  const claimIndex = statements.findIndex((sql) =>
    sql.includes("INSERT INTO platform.idempotency_records")
  );
  const jobIndex = statements.findIndex((sql) =>
    sql.includes("INSERT INTO platform.jobs")
  );
  const completeIndex = statements.findIndex((sql) =>
    sql.includes("UPDATE platform.idempotency_records")
  );
  assert(claimIndex >= 0 && claimIndex < jobIndex && jobIndex < completeIndex);
});

class RecordingTransactionRunner {
  readonly queries: RecordedQuery[] = [];

  constructor(private readonly payload: unknown) {}

  async run<TResult>(
    callback: (transaction: TransactionHandle) => Promise<TResult> | TResult,
  ): Promise<TResult> {
    return await callback(new RecordingTransaction(this.queries, this.payload));
  }
}

class JobRecordingTransactionRunner {
  readonly queries: RecordedQuery[] = [];
  runs = 0;

  async run<TResult>(
    callback: (transaction: TransactionHandle) => Promise<TResult> | TResult,
  ): Promise<TResult> {
    this.runs++;
    return await callback(new JobRecordingTransaction(this.queries));
  }
}

class JobRecordingTransaction implements TransactionHandle {
  readonly metadata = {};

  constructor(private readonly queries: RecordedQuery[]) {}

  query<TRow = Record<string, unknown>>(
    text: string,
    parameters: readonly unknown[] = [],
  ): Promise<TransactionQueryResult<TRow>> {
    this.queries.push({ sql: text, parameters });
    return Promise.resolve({ rows: [], rowCount: 1 });
  }
}

interface RecordedQuery {
  readonly sql: string;
  readonly parameters: readonly unknown[];
}

class RecordingTransaction implements TransactionHandle {
  readonly metadata = {};

  constructor(
    private readonly queries: RecordedQuery[],
    private readonly payload: unknown,
  ) {}

  query<TRow = Record<string, unknown>>(
    text: string,
    parameters: readonly unknown[] = [],
  ): Promise<TransactionQueryResult<TRow>> {
    this.queries.push({ sql: text, parameters });
    const rows = text.includes("SELECT payload")
      ? [{ payload: this.payload }]
      : [];
    return Promise.resolve({ rows: rows as TRow[], rowCount: 1 });
  }
}

class RecordingFinancialRiskEffects implements FinancialRiskEffects {
  readonly results: string[] = [];

  append(
    _transaction: TransactionHandle,
    input: Parameters<FinancialRiskEffects["append"]>[1],
  ): Promise<void> {
    this.results.push(input.result.resultId);
    return Promise.resolve();
  }
}

class FakeDurableIdempotencyRepository extends IdempotencyRepository {
  completeCalls = 0;

  constructor(
    private readonly outcome: IdempotencyClaimResult = { status: "claimed" },
  ) {
    super(fakeClock);
  }

  override claim(
    _transaction: TransactionHandle,
    _claim: IdempotencyClaim,
  ): Promise<IdempotencyClaimResult> {
    return Promise.resolve(this.outcome);
  }

  override complete(
    _transaction: TransactionHandle,
    _claim: IdempotencyClaim,
    _resultReference: string,
  ): Promise<void> {
    this.completeCalls++;
    return Promise.resolve();
  }
}

async function financialRiskResult() {
  const application = new FinancialRiskApplication(
    new FakeFinancialRiskAuthorization(),
    new RecordingReferenceVerifier(),
    new FakeFinancialRiskInference(MODEL_RESULT),
    new InMemoryFinancialRiskRepository(),
  );
  return (await application.compute(computeRequest())).result;
}

const fakeClock: Clock = { now: () => new Date("2026-08-10T12:00:00.000Z") };
