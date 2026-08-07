import { type OutboxEvent, OutboxRepository } from "../platform/events/v1.ts";
import type { TransactionHandle } from "../platform/persistence/v1.ts";
import type { PostgresTransactionRunner } from "../platform/persistence/transaction.ts";
import {
  DealAccessIdempotencyConflictError,
  DealAccessInvariantError,
  DealAccessVersionConflictError,
} from "./errors.ts";
import type { DealAccessEvent } from "./events.ts";
import type {
  DealAccessScope,
  DealParticipation,
  ExternalGrant,
  PortalReceipt,
  PortalSubmission,
} from "./model.ts";
import type {
  CommandClaim,
  CommandIdentity,
  DealAccessRepository,
  DealAccessStore,
  SessionInvalidationRecord,
  SessionInvalidationTarget,
} from "./repository.ts";
import { PostgresSessionInvalidationStore } from "./repository_postgres_session_invalidations.ts";
import {
  type GrantRow,
  grantSelect,
  grantValues,
  type ParticipationRow,
  participationValues,
  type ReceiptRow,
  type SubmissionRow,
  submissionValues,
  toGrant,
  toParticipation,
  toReceipt,
  toSubmission,
} from "./repository_postgres_rows.ts";

export class PostgresDealAccessRepository implements DealAccessRepository {
  constructor(private readonly transactions: PostgresTransactionRunner) {}

  transaction<T>(callback: (store: DealAccessStore) => Promise<T>): Promise<T> {
    return this.transactions.run((transaction) =>
      callback(new PostgresDealAccessStore(transaction))
    );
  }
}

class PostgresDealAccessStore implements DealAccessStore {
  private readonly outbox = new OutboxRepository();
  private readonly invalidations: PostgresSessionInvalidationStore;

  constructor(private readonly transaction: TransactionHandle) {
    this.invalidations = new PostgresSessionInvalidationStore(transaction);
  }

  async findParticipation(
    scope: DealAccessScope,
    id: string,
  ): Promise<DealParticipation | undefined> {
    const result = await this.transaction.query<ParticipationRow>(
      `SELECT participation_id AS "participationId", tenant_id AS "tenantId",
         workspace_id AS "workspaceId", deal_id AS "dealId",
         invitation_id AS "invitationId", participant_id AS "participantId",
         participant_kind AS "participantKind",
         invitation_token_digest AS "invitationTokenDigest", state, version,
         created_at AS "createdAt", updated_at AS "updatedAt"
       FROM deal_access.participations
       WHERE tenant_id = $1 AND workspace_id = $2 AND deal_id = $3
         AND participation_id = $4`,
      [scope.tenantId, scope.workspaceId, scope.dealId, id],
    );
    const row = result.rows[0];
    return row === undefined ? undefined : toParticipation(row);
  }

  async findGrant(
    scope: DealAccessScope,
    id: string,
  ): Promise<ExternalGrant | undefined> {
    const result = await this.transaction.query<GrantRow>(
      grantSelect("grant_id = $4"),
      [
        scope.tenantId,
        scope.workspaceId,
        scope.dealId,
        id,
      ],
    );
    const row = result.rows[0];
    return row === undefined ? undefined : toGrant(row);
  }

  async findGrants(
    scope: DealAccessScope,
    participationId: string,
  ): Promise<ExternalGrant[]> {
    const result = await this.transaction.query<GrantRow>(
      `${grantSelect("participation_id = $4")} ORDER BY grant_id`,
      [scope.tenantId, scope.workspaceId, scope.dealId, participationId],
    );
    return result.rows.map(toGrant);
  }

  async findSubmission(
    scope: DealAccessScope,
    id: string,
  ): Promise<PortalSubmission | undefined> {
    const result = await this.transaction.query<SubmissionRow>(
      `SELECT submission_id AS "submissionId", tenant_id AS "tenantId",
         workspace_id AS "workspaceId", deal_id AS "dealId",
         delivery_id AS "deliveryId",
         delivery_attempt_count AS "deliveryAttemptCount",
         last_delivery_error AS "lastDeliveryError",
         delivery_completed_at AS "deliveryCompletedAt", grant_id AS "grantId",
         object_id AS "objectId", payload, state, version,
         created_at AS "createdAt", updated_at AS "updatedAt"
       FROM deal_access.portal_submissions
       WHERE tenant_id = $1 AND workspace_id = $2 AND deal_id = $3
         AND submission_id = $4`,
      [scope.tenantId, scope.workspaceId, scope.dealId, id],
    );
    const row = result.rows[0];
    return row === undefined ? undefined : toSubmission(row);
  }

  async findReceipt(
    scope: DealAccessScope,
    id: string,
  ): Promise<PortalReceipt | undefined> {
    const result = await this.transaction.query<ReceiptRow>(
      `SELECT receipt_id AS "receiptId", state,
         received_at AS "receivedAt", submission_reference AS "submissionReference"
       FROM deal_access.portal_receipts
       WHERE tenant_id = $1 AND workspace_id = $2 AND deal_id = $3
         AND receipt_id = $4`,
      [scope.tenantId, scope.workspaceId, scope.dealId, id],
    );
    const row = result.rows[0];
    return row === undefined ? undefined : toReceipt(row);
  }

  async listExpiredGrants(
    scope: DealAccessScope,
    now: string,
  ): Promise<ExternalGrant[]> {
    const result = await this.transaction.query<GrantRow>(
      `${
        grantSelect("state = 'active' AND expires_at <= $4")
      } ORDER BY expires_at, grant_id`,
      [scope.tenantId, scope.workspaceId, scope.dealId, now],
    );
    return result.rows.map(toGrant);
  }

  async saveParticipation(
    aggregate: DealParticipation,
    expectedVersion?: number,
  ): Promise<void> {
    if (expectedVersion === undefined) {
      await this.transaction.query(
        `INSERT INTO deal_access.participations (
           participation_id, tenant_id, workspace_id, deal_id, invitation_id,
           participant_id, participant_kind, invitation_token_digest, state,
           version, created_at, updated_at
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
        participationValues(aggregate),
      );
      return;
    }
    const result = await this.transaction.query(
      `UPDATE deal_access.participations
       SET state = $5, version = $6, updated_at = $7
       WHERE tenant_id = $1 AND workspace_id = $2 AND deal_id = $3
         AND participation_id = $4 AND version = $8`,
      [
        aggregate.scope.tenantId,
        aggregate.scope.workspaceId,
        aggregate.scope.dealId,
        aggregate.id,
        aggregate.state,
        aggregate.version,
        aggregate.updatedAt,
        expectedVersion,
      ],
    );
    assertUpdated(result.rowCount, expectedVersion, aggregate.version);
  }

  async saveGrant(
    aggregate: ExternalGrant,
    expectedVersion?: number,
  ): Promise<void> {
    if (expectedVersion === undefined) {
      await this.transaction.query(
        `INSERT INTO deal_access.external_grants (
           grant_id, tenant_id, workspace_id, deal_id, participation_id,
           purpose, sponsor_actor_id, sponsor_kind, expires_at, state,
           object_scopes, actions, fields, version, created_at, updated_at
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)`,
        grantValues(aggregate),
      );
      return;
    }
    const result = await this.transaction.query(
      `UPDATE deal_access.external_grants
       SET state = $5, version = $6, updated_at = $7
       WHERE tenant_id = $1 AND workspace_id = $2 AND deal_id = $3
         AND grant_id = $4 AND version = $8`,
      [
        aggregate.scope.tenantId,
        aggregate.scope.workspaceId,
        aggregate.scope.dealId,
        aggregate.id,
        aggregate.state,
        aggregate.version,
        aggregate.updatedAt,
        expectedVersion,
      ],
    );
    assertUpdated(result.rowCount, expectedVersion, aggregate.version);
  }

  async saveSubmission(
    aggregate: PortalSubmission,
    expectedVersion?: number,
  ): Promise<void> {
    if (expectedVersion === undefined) {
      await this.transaction.query(
        `INSERT INTO deal_access.portal_submissions (
           submission_id, tenant_id, workspace_id, deal_id, delivery_id,
           delivery_attempt_count, last_delivery_error, delivery_completed_at,
           grant_id, object_id, payload, state, version, created_at, updated_at
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
        submissionValues(aggregate),
      );
      return;
    }
    const result = await this.transaction.query(
      `UPDATE deal_access.portal_submissions
       SET state = $5, version = $6, updated_at = $7,
           last_delivery_error = $8, delivery_completed_at = $9
       WHERE tenant_id = $1 AND workspace_id = $2 AND deal_id = $3
         AND submission_id = $4 AND version = $10`,
      [
        aggregate.scope.tenantId,
        aggregate.scope.workspaceId,
        aggregate.scope.dealId,
        aggregate.id,
        aggregate.state,
        aggregate.version,
        aggregate.updatedAt,
        aggregate.lastDeliveryError ?? null,
        aggregate.deliveryCompletedAt ?? null,
        expectedVersion,
      ],
    );
    assertUpdated(result.rowCount, expectedVersion, aggregate.version);
  }

  async recordSubmissionDeliveryAttempt(
    scope: DealAccessScope,
    submissionId: string,
  ): Promise<void> {
    const result = await this.transaction.query(
      `UPDATE deal_access.portal_submissions
       SET delivery_attempt_count = delivery_attempt_count + 1,
           last_delivery_error = NULL
       WHERE tenant_id = $1 AND workspace_id = $2 AND deal_id = $3
         AND submission_id = $4 AND state = 'queued'`,
      [scope.tenantId, scope.workspaceId, scope.dealId, submissionId],
    );
    if (result.rowCount === 1) return;
    const current = await this.findSubmission(scope, submissionId);
    if (current?.state === "accepted") return;
    throw new DealAccessInvariantError(
      `Submission "${submissionId}" delivery attempt was not recorded in scope "${scope.dealId}"; expected a queued submission.`,
    );
  }

  async recordSubmissionDeliveryFailure(
    scope: DealAccessScope,
    submissionId: string,
    error: string,
  ): Promise<void> {
    const result = await this.transaction.query(
      `UPDATE deal_access.portal_submissions
       SET last_delivery_error = $5
       WHERE tenant_id = $1 AND workspace_id = $2 AND deal_id = $3
         AND submission_id = $4 AND state = 'queued'`,
      [
        scope.tenantId,
        scope.workspaceId,
        scope.dealId,
        submissionId,
        error.slice(0, 1000),
      ],
    );
    if (result.rowCount === 1) return;
    const current = await this.findSubmission(scope, submissionId);
    if (current?.state === "accepted") return;
    throw new DealAccessInvariantError(
      `Submission "${submissionId}" delivery failure was not recorded in scope "${scope.dealId}"; expected a queued submission.`,
    );
  }

  async saveReceipt(
    scope: DealAccessScope,
    submissionId: string,
    receipt: PortalReceipt,
  ): Promise<void> {
    await this.transaction.query(
      `INSERT INTO deal_access.portal_receipts (
         receipt_id, tenant_id, workspace_id, deal_id, submission_id,
         state, received_at, submission_reference
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        receipt.id,
        scope.tenantId,
        scope.workspaceId,
        scope.dealId,
        submissionId,
        receipt.state,
        receipt.receivedAt,
        receipt.submissionReference,
      ],
    );
  }

  recordSessionInvalidation(record: SessionInvalidationRecord): Promise<void> {
    return this.invalidations.record(record);
  }

  listPendingSessionInvalidations(
    scope: DealAccessScope,
    target?: SessionInvalidationTarget,
  ): Promise<SessionInvalidationRecord[]> {
    return this.invalidations.listPending(scope, target);
  }

  recordSessionInvalidationAttempt(
    scope: DealAccessScope,
    invalidationId: string,
  ): Promise<void> {
    return this.invalidations.recordAttempt(scope, invalidationId);
  }

  markSessionInvalidationFailure(
    scope: DealAccessScope,
    invalidationId: string,
    error: string,
  ): Promise<void> {
    return this.invalidations.markFailure(scope, invalidationId, error);
  }

  completeSessionInvalidation(
    scope: DealAccessScope,
    invalidationId: string,
    completedAt: string,
  ): Promise<void> {
    return this.invalidations.complete(scope, invalidationId, completedAt);
  }

  async claimCommand(
    identity: CommandIdentity,
    digest: string,
  ): Promise<CommandClaim> {
    await this.transaction.query(
      `INSERT INTO deal_access.command_claims (
         tenant_id, workspace_id, deal_id, actor_id, command_type, target_id,
         idempotency_key, payload_digest, state, created_at
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'in_progress', CURRENT_TIMESTAMP)
       ON CONFLICT DO NOTHING`,
      commandValues(identity, digest),
    );
    const result = await this.transaction.query<CommandRow>(
      `SELECT payload_digest AS "payloadDigest", state, result
       FROM deal_access.command_claims
       WHERE tenant_id = $1 AND workspace_id = $2 AND deal_id = $3
         AND actor_id = $4 AND command_type = $5 AND target_id = $6
         AND idempotency_key = $7`,
      commandKeyValues(identity),
    );
    const row = result.rows[0];
    if (row === undefined) {
      throw new DealAccessInvariantError(
        "Deal Access command claim disappeared; expected a durable claim row.",
      );
    }
    if (row.payloadDigest !== digest) {
      throw new DealAccessIdempotencyConflictError(identity.idempotencyKey);
    }
    return row.state === "completed"
      ? { state: "replay", result: row.result }
      : { state: "claimed" };
  }

  async completeCommand(
    identity: CommandIdentity,
    digest: string,
    result: unknown,
  ): Promise<void> {
    const updated = await this.transaction.query(
      `UPDATE deal_access.command_claims
       SET state = 'completed', result = $8, completed_at = CURRENT_TIMESTAMP
       WHERE tenant_id = $1 AND workspace_id = $2 AND deal_id = $3
         AND actor_id = $4 AND command_type = $5 AND target_id = $6
         AND idempotency_key = $7 AND payload_digest = $9 AND state = 'in_progress'`,
      [...commandKeyValues(identity), JSON.stringify(result), digest],
    );
    if (updated.rowCount === 1) return;
    throw new DealAccessInvariantError(
      `Deal Access command "${identity.commandType}" key "${identity.idempotencyKey}" could not complete; expected one matching claim.`,
    );
  }

  async appendEvent(event: DealAccessEvent): Promise<void> {
    await this.transaction.query(
      `INSERT INTO deal_access.audit_events (
         event_id, tenant_id, workspace_id, deal_id, actor_id, aggregate_type,
         aggregate_id, aggregate_version, event_type, payload, correlation_id,
         occurred_at, available_at
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
      [
        event.eventId,
        event.scope.tenantId,
        event.scope.workspaceId,
        event.scope.dealId,
        event.actorId,
        event.aggregateType,
        event.aggregateId,
        event.aggregateVersion,
        event.eventType,
        JSON.stringify(event.payload),
        event.correlationId,
        event.occurredAt,
        event.availableAt,
      ],
    );
  }

  appendOutbox(event: OutboxEvent): Promise<void> {
    return this.outbox.append(this.transaction, event);
  }
}

interface CommandRow {
  payloadDigest: string;
  state: "in_progress" | "completed";
  result: unknown;
}

function commandValues(identity: CommandIdentity, digest: string): unknown[] {
  return [...commandKeyValues(identity), digest];
}

function commandKeyValues(identity: CommandIdentity): unknown[] {
  return [
    identity.scope.tenantId,
    identity.scope.workspaceId,
    identity.scope.dealId,
    identity.actorId,
    identity.commandType,
    identity.targetId,
    identity.idempotencyKey,
  ];
}

function assertUpdated(
  rowCount: number | null,
  expected: number,
  current: number,
): void {
  if (rowCount === 1) return;
  throw new DealAccessVersionConflictError(expected, current);
}
