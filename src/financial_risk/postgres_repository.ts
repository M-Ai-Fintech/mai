import type {
  Clock,
  IdempotencyClaim,
  IdempotencyClaimResult,
  PostgresTransactionRunner,
  TransactionHandle,
} from "../platform/persistence/v1.ts";
import type { AggregateVersion } from "../platform/api/v1.ts";
import {
  IdempotencyRepository as DurableIdempotencyRepository,
} from "../platform/persistence/v1.ts";
import type { IdempotencyRepository } from "../platform/persistence/v1.ts";
import type {
  FinancialRiskIdempotencyClaim,
  FinancialRiskIdempotencyClaimResult,
  FinancialRiskRepository,
} from "./repository.ts";
import { FinancialRiskRepositoryConflictError } from "./repository.ts";
import {
  createFinancialRiskResult,
  type FinancialRiskResult,
  type FinancialRiskScope,
} from "./model.ts";
import type { FinancialRiskAssessmentId } from "./ids.ts";
import {
  type FinancialRiskEffects,
  PostgresFinancialRiskEffects,
} from "./effects.ts";

const TARGET_TYPE = "financial-risk-assessment";

export class PostgresFinancialRiskRepository
  implements FinancialRiskRepository {
  private readonly idempotency: IdempotencyRepository;

  constructor(
    private readonly transactions: PostgresTransactionRunner,
    private readonly effects: FinancialRiskEffects =
      new PostgresFinancialRiskEffects(),
    idempotency?: IdempotencyRepository,
    private readonly clock: Clock = systemClock,
  ) {
    this.idempotency = idempotency ??
      new DurableIdempotencyRepository(this.clock);
  }

  async claimIdempotency(
    claim: FinancialRiskIdempotencyClaim,
  ): Promise<FinancialRiskIdempotencyClaimResult> {
    const durable = await this.transactions.run((transaction) =>
      this.idempotency.claim(transaction, durableClaim(claim, this.clock.now()))
    );
    return mapClaimResult(durable, claim.idempotencyKey);
  }

  completeIdempotency(
    claim: FinancialRiskIdempotencyClaim,
    resultId: string,
  ): Promise<void> {
    return this.transactions.run((transaction) =>
      this.idempotency.complete(
        transaction,
        durableClaim(claim, this.clock.now()),
        resultId,
      )
    );
  }

  failIdempotency(
    claim: FinancialRiskIdempotencyClaim,
    failureCode: "STALE_VERSION" | "VERSION_CONFLICT",
  ): Promise<void> {
    return this.transactions.run((transaction) =>
      this.idempotency.fail(
        transaction,
        durableClaim(claim, this.clock.now()),
        failureCode,
      )
    );
  }

  async commitResult(
    claim: FinancialRiskIdempotencyClaim,
    result: FinancialRiskResult,
    expectedVersion: AggregateVersion,
  ): Promise<void> {
    try {
      await this.transactions.run(async (transaction) => {
        const latest = await findLatestResultForUpdate(
          transaction,
          result.scope,
          result.assessmentId,
        );
        assertCommitVersion(latest, result, expectedVersion);
        await insertResult(transaction, result);
        await appendEffects(this.effects, transaction, result);
        await this.idempotency.complete(
          transaction,
          durableClaim(claim, this.clock.now()),
          result.resultId,
        );
      });
    } catch (error) {
      if (isUniqueVersionViolation(error)) {
        throw new FinancialRiskRepositoryConflictError(
          "VERSION_CONFLICT",
          `Financial-risk assessment "${result.assessmentId}" was concurrently committed; expected version "${expectedVersion}".`,
        );
      }
      throw error;
    }
  }

  append(result: FinancialRiskResult): Promise<void> {
    return this.transactions.run(async (transaction) => {
      await insertResult(transaction, result);
      await appendEffects(this.effects, transaction, result);
    });
  }

  findById(
    scope: FinancialRiskScope,
    resultId: string,
  ): Promise<FinancialRiskResult | undefined> {
    return this.transactions.run((transaction) =>
      findResult(transaction, scope, resultId)
    );
  }

  findLatest(
    scope: FinancialRiskScope,
    assessmentId: FinancialRiskAssessmentId,
  ): Promise<FinancialRiskResult | undefined> {
    return this.transactions.run((transaction) =>
      findLatestResult(transaction, scope, assessmentId)
    );
  }

  listHistory(
    scope: FinancialRiskScope,
    assessmentId: FinancialRiskAssessmentId,
  ): Promise<readonly FinancialRiskResult[]> {
    return this.transactions.run((transaction) =>
      listResults(transaction, scope, assessmentId)
    );
  }
}

async function insertResult(
  transaction: TransactionHandle,
  result: FinancialRiskResult,
): Promise<void> {
  await transaction.query(
    `INSERT INTO financial_risk.results (
       result_id, assessment_id, tenant_id, workspace_id, deal_id,
       aggregate_type, version, state, actor_id, correlation_id,
       idempotency_key, operation_id, job_id, supersedes_result_id,
       payload, created_at, updated_at
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)`,
    [
      result.resultId,
      result.assessmentId,
      result.scope.tenantId,
      result.scope.workspaceId,
      result.scope.dealId,
      result.aggregateType,
      result.version,
      result.state,
      result.actor.id,
      result.correlationId,
      result.idempotencyKey,
      result.execution.operationId,
      result.execution.jobId,
      result.supersedesResultId ?? null,
      JSON.stringify(result),
      result.createdAt,
      result.updatedAt,
    ],
  );
}

async function appendEffects(
  effects: FinancialRiskEffects,
  transaction: TransactionHandle,
  result: FinancialRiskResult,
): Promise<void> {
  await effects.append(transaction, {
    context: {
      actorId: result.actor.id,
      tenantId: result.scope.tenantId,
      workspaceId: result.scope.workspaceId,
      dealId: result.scope.dealId,
      correlationId: result.correlationId,
      origin: "job",
    },
    scope: result.scope,
    result,
  });
}

async function findResult(
  transaction: TransactionHandle,
  scope: FinancialRiskScope,
  resultId: string,
): Promise<FinancialRiskResult | undefined> {
  const query = await transaction.query<{ payload: unknown }>(
    `SELECT payload FROM financial_risk.results
     WHERE tenant_id=$1 AND workspace_id=$2 AND deal_id=$3 AND result_id=$4`,
    scopeValues(scope).concat(resultId),
  );
  return query.rows[0] === undefined
    ? undefined
    : rowResult(query.rows[0].payload);
}

async function findLatestResult(
  transaction: TransactionHandle,
  scope: FinancialRiskScope,
  assessmentId: FinancialRiskAssessmentId,
): Promise<FinancialRiskResult | undefined> {
  const query = await transaction.query<{ payload: unknown }>(
    `SELECT payload FROM financial_risk.results
     WHERE tenant_id=$1 AND workspace_id=$2 AND deal_id=$3 AND assessment_id=$4
     ORDER BY version DESC LIMIT 1`,
    scopeValues(scope).concat(assessmentId),
  );
  return query.rows[0] === undefined
    ? undefined
    : rowResult(query.rows[0].payload);
}

async function findLatestResultForUpdate(
  transaction: TransactionHandle,
  scope: FinancialRiskScope,
  assessmentId: FinancialRiskAssessmentId,
): Promise<FinancialRiskResult | undefined> {
  const query = await transaction.query<{ payload: unknown }>(
    `SELECT payload FROM financial_risk.results
     WHERE tenant_id=$1 AND workspace_id=$2 AND deal_id=$3 AND assessment_id=$4
     ORDER BY version DESC LIMIT 1 FOR UPDATE`,
    scopeValues(scope).concat(assessmentId),
  );
  return query.rows[0] === undefined
    ? undefined
    : rowResult(query.rows[0].payload);
}

async function listResults(
  transaction: TransactionHandle,
  scope: FinancialRiskScope,
  assessmentId: FinancialRiskAssessmentId,
): Promise<readonly FinancialRiskResult[]> {
  const query = await transaction.query<{ payload: unknown }>(
    `SELECT payload FROM financial_risk.results
     WHERE tenant_id=$1 AND workspace_id=$2 AND deal_id=$3 AND assessment_id=$4
     ORDER BY version, result_id`,
    scopeValues(scope).concat(assessmentId),
  );
  return Object.freeze(query.rows.map((row) => rowResult(row.payload)));
}

function rowResult(payload: unknown): FinancialRiskResult {
  const record = parsePayload(payload);
  const references = record.references;
  if (!isRecord(references) || !isRecord(references.evidenceBasis)) {
    throw new Error(
      `Financial-risk result payload "${
        JSON.stringify(payload)
      }" is invalid; expected exact references.`,
    );
  }
  return createFinancialRiskResult({
    ...record,
    references: {
      ...references,
      evidenceBasis: {
        ...references.evidenceBasis,
        capturedAt: dateValue(references.evidenceBasis.capturedAt),
      },
    },
    createdAt: dateValue(record.createdAt),
    updatedAt: dateValue(record.updatedAt),
  } as unknown as FinancialRiskResult);
}

function durableClaim(
  claim: FinancialRiskIdempotencyClaim,
  now: Date,
): IdempotencyClaim {
  return {
    tenantId: claim.scope.tenantId,
    actorId: claim.actorId,
    commandType: claim.commandType,
    targetType: TARGET_TYPE,
    targetId: durableTargetId(claim),
    idempotencyKey: claim.idempotencyKey,
    payloadDigest: claim.payloadDigest,
    expiresAt: new Date(now.getTime() + 900_000),
  };
}

function durableTargetId(claim: FinancialRiskIdempotencyClaim): string {
  return [
    claim.scope.workspaceId,
    claim.scope.dealId,
    claim.assessmentId,
  ].join(":");
}

function mapClaimResult(
  result: IdempotencyClaimResult,
  idempotencyKey: FinancialRiskIdempotencyClaim["idempotencyKey"],
): FinancialRiskIdempotencyClaimResult {
  if (result.status === "claimed") return { status: "claimed" };
  if (result.status === "in_progress" || result.status === "abandoned") {
    return { status: "in_progress" };
  }
  if (result.status !== "replay") {
    throw new Error(
      `Idempotency key "${idempotencyKey}" returned an unknown state; expected a durable replay or in-progress state.`,
    );
  }
  if (result.state === "failed") {
    if (
      result.errorReference !== "STALE_VERSION" &&
      result.errorReference !== "VERSION_CONFLICT"
    ) {
      throw new Error(
        `Idempotency key "${idempotencyKey}" failed with "${
          String(result.errorReference)
        }"; expected the supported stale-version failure code.`,
      );
    }
    return {
      status: "failed",
      failureCode: result.errorReference,
    };
  }
  if (result.resultReference === undefined) {
    throw new Error(
      `Idempotency key "${idempotencyKey}" completed without a result reference; expected a durable financial-risk result.`,
    );
  }
  return { status: "replayed", resultId: result.resultReference };
}

function parsePayload(value: unknown): Record<string, unknown> {
  const parsed = typeof value === "string" ? JSON.parse(value) : value;
  if (isRecord(parsed)) return parsed;
  throw new Error(
    `Financial-risk persistence payload "${
      String(value)
    }" is invalid; expected a JSON object.`,
  );
}

function dateValue(value: unknown): Date {
  const date = value instanceof Date
    ? new Date(value)
    : new Date(String(value));
  if (!Number.isNaN(date.getTime())) return date;
  throw new Error(
    `Financial-risk persistence timestamp "${
      String(value)
    }" is invalid; expected an ISO date.`,
  );
}

function scopeValues(scope: FinancialRiskScope): string[] {
  return [scope.tenantId, scope.workspaceId, scope.dealId];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function assertCommitVersion(
  latest: FinancialRiskResult | undefined,
  result: FinancialRiskResult,
  expectedVersion: AggregateVersion,
): void {
  if (latest === undefined && expectedVersion !== 1) {
    throw new FinancialRiskRepositoryConflictError(
      "STALE_VERSION",
      `Expected financial-risk initial version "${expectedVersion}" but no result exists; expected initial version "1".`,
    );
  }
  if (latest !== undefined && latest.version !== expectedVersion) {
    throw new FinancialRiskRepositoryConflictError(
      "STALE_VERSION",
      `Expected financial-risk version "${expectedVersion}" but current version is "${latest.version}".`,
    );
  }
  const nextVersion = latest === undefined ? 1 : latest.version + 1;
  if (result.version === nextVersion) return;
  throw new FinancialRiskRepositoryConflictError(
    "VERSION_CONFLICT",
    `Financial-risk result version "${result.version}" does not follow current version "${
      latest?.version ?? 0
    }"; expected "${nextVersion}".`,
  );
}

function isUniqueVersionViolation(error: unknown): boolean {
  if (!isRecord(error) || error.code !== "23505") return false;
  const detail = `${String(error.constraint ?? "")} ${
    String(error.detail ?? "")
  }`;
  return /assessment_id.*version|version.*assessment_id/i.test(detail);
}

const systemClock: Clock = { now: () => new Date() };
