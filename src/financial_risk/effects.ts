import { OutboxRepository } from "../platform/events/v1.ts";
import {
  payloadDigest,
  type TransactionHandle,
} from "../platform/persistence/v1.ts";
import type { RequestContext } from "../platform/api/v1.ts";
import type { FinancialRiskResult, FinancialRiskScope } from "./model.ts";

export interface FinancialRiskEffectInput {
  readonly context: RequestContext;
  readonly scope: FinancialRiskScope;
  readonly result: FinancialRiskResult;
}

export interface FinancialRiskEffects {
  append(
    transaction: TransactionHandle,
    input: FinancialRiskEffectInput,
  ): Promise<void>;
}

export class PostgresFinancialRiskEffects implements FinancialRiskEffects {
  constructor(private readonly outbox = new OutboxRepository()) {}

  async append(
    transaction: TransactionHandle,
    input: FinancialRiskEffectInput,
  ): Promise<void> {
    const result = input.result;
    const eventId = await eventIdentity(result);
    await transaction.query(
      `INSERT INTO financial_risk.audit_events (
         event_id, tenant_id, workspace_id, deal_id, actor_id,
         aggregate_type, aggregate_id, aggregate_version, event_type,
         basis_digest, payload, occurred_at
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       ON CONFLICT (event_id) DO NOTHING`,
      [
        eventId,
        input.scope.tenantId,
        input.scope.workspaceId,
        input.scope.dealId,
        result.actor.id,
        result.aggregateType,
        result.resultId,
        result.version,
        `financial_risk.${result.state}`,
        result.references.evidenceBasis.basisDigest,
        JSON.stringify({
          assessmentId: result.assessmentId,
          resultId: result.resultId,
          state: result.state,
          provenance: result.provenance,
          correlationId: result.correlationId,
        }),
        result.createdAt,
      ],
    );
    await this.outbox.append(transaction, {
      eventId,
      tenantId: input.scope.tenantId,
      workspaceId: input.scope.workspaceId,
      dealId: input.scope.dealId,
      aggregateType: result.aggregateType,
      aggregateId: result.resultId,
      aggregateVersion: result.version,
      eventType: `financial_risk.${result.state}`,
      schemaVersion: 1,
      payload: {
        assessmentId: result.assessmentId,
        resultId: result.resultId,
        state: result.state,
      },
      correlationId: input.context.correlationId,
      occurredAt: result.createdAt,
      availableAt: result.createdAt,
    });
  }
}

function eventIdentity(result: FinancialRiskResult): Promise<string> {
  return payloadDigest({
    tenantId: result.scope.tenantId,
    workspaceId: result.scope.workspaceId,
    dealId: result.scope.dealId,
    aggregateType: result.aggregateType,
    resultId: result.resultId,
    state: result.state,
    version: result.version,
  }).then((digest) => `financial-risk-${digest}`);
}
