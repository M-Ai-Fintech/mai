import type { TransactionHandle } from "../platform/persistence/v1.ts";
import type { AggregateVersion } from "../platform/api/v1.ts";
import type { TransitionFactStatusCommand } from "./fact_commands.ts";
import type { Fact, FactVersion } from "./model.ts";
import {
  auditEventDigest,
  type AuditEventDraft,
  type AuditEventId,
  type AuthoritySnapshot,
  PostgresAuditEventRepository,
} from "../audit_activity/v1.ts";
import type {
  ActorId,
  CorrelationId,
  DealId,
  TenantId,
  WorkspaceId,
} from "../shared/contracts/identifiers.ts";

export async function appendFactTransitionAudit(
  transaction: TransactionHandle,
  command: TransitionFactStatusCommand,
  authSnapshot: AuthoritySnapshot,
  factBefore: Fact,
  factAfter: Fact,
  version: FactVersion,
  replacement: FactVersion | undefined,
  occurredAt: Date,
): Promise<void> {
  const repo = new PostgresAuditEventRepository();
  const eventId = `evidence_audit-${
    crypto.randomUUID().replaceAll("-", "")
  }` as AuditEventId;
  const draft: AuditEventDraft = {
    eventId,
    tenantId: command.scope.tenantId as TenantId,
    ...(command.scope.workspaceId
      ? { workspaceId: command.scope.workspaceId as WorkspaceId }
      : {}),
    ...(command.scope.dealId ? { dealId: command.scope.dealId as DealId } : {}),
    actorId: command.context.actorId as ActorId,
    actorKind: authSnapshot.actorKind ?? "human",
    origin: command.context.origin ?? "http",
    correlationId: command.context.correlationId as CorrelationId,
    aggregateType: "EvidenceFact",
    aggregateId: command.factId,
    aggregateVersion: factAfter.aggregateVersion as AggregateVersion,
    eventType: "evidence.fact-status-transitioned",
    schemaVersion: 1,
    authoritySnapshot: authSnapshot,
    evidenceSnapshot: {
      capturedAt: occurredAt,
      references: version.citationIds.map((citationId) => ({
        sourceType: "citation",
        sourceId: citationId,
        sourceVersion: "1",
      })),
    },
    provenance: {
      actorId: command.context.actorId as ActorId,
      actorKind: authSnapshot.actorKind ?? "human",
      origin: command.context.origin ?? "http",
    },
    payload: {
      factId: command.factId,
      factVersionId: version.factVersionId,
      replacementFactVersionId: replacement?.factVersionId ?? null,
      commandType: "fact-status",
      idempotencyKey: command.idempotencyKey,
      beforeAggregateVersion: factBefore.aggregateVersion,
      afterAggregateVersion: factAfter.aggregateVersion,
      beforeFactStatus: factBefore.status,
      afterFactStatus: factAfter.status,
      previousCurrentFactVersionId: factBefore.currentFactVersionId ?? null,
      resultingCurrentFactVersionId: factAfter.currentFactVersionId ?? null,
      rationale: command.rationale ?? null,
      outcome: "success",
    },
    classifications: {
      factId: "internal",
      factVersionId: "internal",
      replacementFactVersionId: "internal",
      commandType: "internal",
      idempotencyKey: "internal",
      beforeAggregateVersion: "internal",
      afterAggregateVersion: "internal",
      beforeFactStatus: "internal",
      afterFactStatus: "internal",
      previousCurrentFactVersionId: "internal",
      resultingCurrentFactVersionId: "internal",
      rationale: "internal",
      outcome: "internal",
    },
    contentDigest: "",
    occurredAt,
  };
  const digest = await auditEventDigest(draft);
  await repo.append(transaction, { ...draft, contentDigest: digest });
}
