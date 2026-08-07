import { type OutboxEvent, OutboxRepository } from "../platform/events/v1.ts";
import type { TransactionHandle } from "../platform/persistence/v1.ts";
import {
  GovernanceIdempotencyConflictError,
  GovernanceInvariantError,
  GovernanceVersionConflictError,
} from "./errors.ts";
import type {
  DealGovernanceAggregate,
  GovernanceEvent,
  GovernanceScope,
} from "./model.ts";
import type { LegalHold, RetentionAssignment } from "./retention.ts";
import type { DeletionRequest } from "./deletion.ts";
import type { ErasureManifest, ErasureOrchestration } from "./orchestration.ts";
import type {
  CommandClaim,
  CommandIdentity,
  DealGovernanceRepository,
  DealGovernanceStore,
} from "./repository.ts";

export class PostgresDealGovernanceRepository
  implements DealGovernanceRepository {
  constructor(private readonly transactions: DealGovernanceTransactionRunner) {}

  transaction<T>(
    callback: (store: DealGovernanceStore) => Promise<T>,
  ): Promise<T> {
    return this.transactions.run((transaction) =>
      callback(new PostgresDealGovernanceStore(transaction))
    );
  }
}

export interface DealGovernanceTransactionRunner {
  run<TResult>(
    callback: (transaction: TransactionHandle) => Promise<TResult> | TResult,
  ): Promise<TResult>;
}

class PostgresDealGovernanceStore implements DealGovernanceStore {
  private readonly outbox = new OutboxRepository();

  constructor(private readonly transaction: TransactionHandle) {}

  async findGovernance(
    scope: GovernanceScope,
  ): Promise<DealGovernanceAggregate | undefined> {
    return await this.findDocument<DealGovernanceAggregate>(
      "governance_aggregates",
      scope,
    );
  }

  async saveGovernance(
    aggregate: DealGovernanceAggregate,
    expectedVersion?: number,
  ): Promise<void> {
    await this.saveDocument(
      "governance_aggregates",
      aggregate,
      expectedVersion,
    );
  }

  async findRetention(
    scope: GovernanceScope,
  ): Promise<RetentionAssignment | undefined> {
    return await this.findDocument<RetentionAssignment>(
      "retention_assignments",
      scope,
    );
  }

  async saveRetention(
    assignment: RetentionAssignment,
    expectedVersion?: number,
  ): Promise<void> {
    await this.saveDocument(
      "retention_assignments",
      assignment,
      expectedVersion,
    );
  }

  async findHold(
    scope: GovernanceScope,
    id: string,
  ): Promise<LegalHold | undefined> {
    return await this.findDocumentById<LegalHold>("legal_holds", scope, id);
  }

  async listHolds(scope: GovernanceScope): Promise<LegalHold[]> {
    const result = await this.transaction.query<JsonRow>(
      `SELECT document FROM deal_governance.legal_holds
       WHERE tenant_id = $1 AND workspace_id = $2 AND deal_id = $3 ORDER BY aggregate_id`,
      scopeValues(scope),
    );
    return result.rows.map((row) => documentValue<LegalHold>(row.document));
  }

  async saveHold(hold: LegalHold, expectedVersion?: number): Promise<void> {
    await this.saveDocument("legal_holds", hold, expectedVersion);
  }

  async findDeletionRequest(
    scope: GovernanceScope,
    id: string,
  ): Promise<DeletionRequest | undefined> {
    return await this.findDocumentById<DeletionRequest>(
      "deletion_requests",
      scope,
      id,
    );
  }

  async saveDeletionRequest(
    request: DeletionRequest,
    expectedVersion?: number,
  ): Promise<void> {
    await this.saveDocument("deletion_requests", request, expectedVersion);
  }

  async findOrchestration(
    scope: GovernanceScope,
    id: string,
  ): Promise<ErasureOrchestration | undefined> {
    return await this.findDocumentById<ErasureOrchestration>(
      "orchestrations",
      scope,
      id,
    );
  }

  async saveOrchestration(
    orchestration: ErasureOrchestration,
    expectedVersion?: number,
  ): Promise<void> {
    await this.saveDocument("orchestrations", orchestration, expectedVersion);
  }

  async findManifest(
    scope: GovernanceScope,
    id: string,
  ): Promise<ErasureManifest | undefined> {
    const result = await this.transaction.query<JsonRow>(
      `SELECT document FROM deal_governance.erasure_manifests
       WHERE tenant_id = $1 AND workspace_id = $2 AND deal_id = $3 AND manifest_id = $4`,
      [...scopeValues(scope), id],
    );
    const row = result.rows[0];
    return row === undefined
      ? undefined
      : documentValue<ErasureManifest>(row.document);
  }

  async saveManifest(manifest: ErasureManifest): Promise<void> {
    const result = await this.transaction.query(
      `INSERT INTO deal_governance.erasure_manifests (
         manifest_id, tenant_id, workspace_id, deal_id, request_id,
         orchestration_id, document, status, generated_at
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        manifest.id,
        manifest.scope.tenantId,
        manifest.scope.workspaceId,
        manifest.scope.dealId,
        manifest.requestId,
        manifest.orchestrationId,
        JSON.stringify(manifest),
        manifest.status,
        manifest.generatedAt,
      ],
    );
    if (result.rowCount === 1) return;
    throw new GovernanceInvariantError(
      `Erasure manifest "${manifest.id}" was not inserted; expected one immutable manifest row.`,
    );
  }

  async listEvents(
    scope: GovernanceScope,
  ): Promise<readonly GovernanceEvent[]> {
    const result = await this.transaction.query<GovernanceEventRow>(
      `SELECT event_id AS "eventId", tenant_id AS "tenantId",
         workspace_id AS "workspaceId", deal_id AS "dealId",
         actor_id AS "actorId", actor_kind AS "actorKind",
         correlation_id AS "correlationId", aggregate_version AS "aggregateVersion",
         event_type AS "eventType", schema_version AS "schemaVersion",
         payload, occurred_at AS "occurredAt"
       FROM deal_governance.history
       WHERE tenant_id = $1 AND workspace_id = $2 AND deal_id = $3
       ORDER BY position`,
      scopeValues(scope),
    );
    return result.rows.map(toEvent);
  }

  async claimCommand(
    identity: CommandIdentity,
    digest: string,
  ): Promise<CommandClaim> {
    const inserted = await this.transaction.query(
      `INSERT INTO deal_governance.command_claims (
         tenant_id, workspace_id, deal_id, actor_id, command_type,
         target_id, idempotency_key, payload_digest, state
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'in_progress')
       ON CONFLICT (tenant_id, workspace_id, deal_id, actor_id, command_type, target_id, idempotency_key)
       DO NOTHING`,
      [
        identity.scope.tenantId,
        identity.scope.workspaceId,
        identity.scope.dealId,
        identity.actorId,
        identity.commandType,
        identity.targetId,
        identity.idempotencyKey,
        digest,
      ],
    );
    if (inserted.rowCount === 1) return { state: "claimed" };
    const current = await this.transaction.query<CommandRow>(
      `SELECT payload_digest AS "payloadDigest", state, result
       FROM deal_governance.command_claims
       WHERE tenant_id = $1 AND workspace_id = $2 AND deal_id = $3
         AND actor_id = $4 AND command_type = $5 AND target_id = $6
         AND idempotency_key = $7`,
      [
        identity.scope.tenantId,
        identity.scope.workspaceId,
        identity.scope.dealId,
        identity.actorId,
        identity.commandType,
        identity.targetId,
        identity.idempotencyKey,
      ],
    );
    const row = current.rows[0];
    if (row === undefined) {
      throw new GovernanceInvariantError(
        `Governance command "${identity.commandType}" claim disappeared; expected a durable idempotency record.`,
      );
    }
    if (row.payloadDigest !== digest) {
      throw new GovernanceIdempotencyConflictError(identity.idempotencyKey);
    }
    return row.state === "completed"
      ? { state: "replay", result: row.result }
      : { state: "in_progress" };
  }

  async completeCommand(
    identity: CommandIdentity,
    digest: string,
    result: unknown,
  ): Promise<void> {
    const updated = await this.transaction.query(
      `UPDATE deal_governance.command_claims SET state = 'completed', result = $8
       WHERE tenant_id = $1 AND workspace_id = $2 AND deal_id = $3
         AND actor_id = $4 AND command_type = $5 AND target_id = $6
         AND idempotency_key = $7 AND payload_digest = $9 AND state = 'in_progress'`,
      [
        identity.scope.tenantId,
        identity.scope.workspaceId,
        identity.scope.dealId,
        identity.actorId,
        identity.commandType,
        identity.targetId,
        identity.idempotencyKey,
        JSON.stringify(result),
        digest,
      ],
    );
    if (updated.rowCount === 1) return;
    throw new GovernanceInvariantError(
      `Governance command "${identity.commandType}" key "${identity.idempotencyKey}" could not complete; expected a matching claim.`,
    );
  }

  async appendEvent(event: GovernanceEvent): Promise<void> {
    await this.transaction.query(
      `INSERT INTO deal_governance.history (
         event_id, tenant_id, workspace_id, deal_id, actor_id, actor_kind,
         correlation_id, aggregate_version, event_type, schema_version,
         payload, occurred_at
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
      [
        event.eventId,
        event.scope.tenantId,
        event.scope.workspaceId,
        event.scope.dealId,
        event.actorId,
        event.actorKind,
        event.correlationId,
        event.aggregateVersion,
        event.eventType,
        event.schemaVersion,
        JSON.stringify(event.payload),
        event.occurredAt,
      ],
    );
  }

  appendOutbox(event: OutboxEvent): Promise<void> {
    return this.outbox.append(this.transaction, event);
  }

  private async findDocument<T>(
    table: TableName,
    scope: GovernanceScope,
  ): Promise<T | undefined> {
    const result = await this.transaction.query<JsonRow>(
      `SELECT document FROM deal_governance.${table}
       WHERE tenant_id = $1 AND workspace_id = $2 AND deal_id = $3
       ORDER BY version DESC LIMIT 1`,
      scopeValues(scope),
    );
    const row = result.rows[0];
    return row === undefined ? undefined : documentValue<T>(row.document);
  }

  private async findDocumentById<T>(
    table: TableName,
    scope: GovernanceScope,
    id: string,
  ): Promise<T | undefined> {
    const result = await this.transaction.query<JsonRow>(
      `SELECT document FROM deal_governance.${table}
       WHERE tenant_id = $1 AND workspace_id = $2 AND deal_id = $3 AND aggregate_id = $4`,
      [...scopeValues(scope), id],
    );
    const row = result.rows[0];
    return row === undefined ? undefined : documentValue<T>(row.document);
  }

  private async saveDocument(
    table: TableName,
    value: VersionedDocument,
    expectedVersion: number | undefined,
  ): Promise<void> {
    if (expectedVersion === undefined) {
      await this.transaction.query(
        `INSERT INTO deal_governance.${table} (
           aggregate_id, tenant_id, workspace_id, deal_id, version, state,
           document, created_at, updated_at
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          value.id,
          value.scope.tenantId,
          value.scope.workspaceId,
          value.scope.dealId,
          value.version,
          stateOf(value),
          JSON.stringify(value),
          value.createdAt,
          value.updatedAt,
        ],
      );
      return;
    }
    const result = await this.transaction.query(
      `UPDATE deal_governance.${table}
       SET version = $5, state = $6, document = $7, updated_at = $8
       WHERE tenant_id = $1 AND workspace_id = $2 AND deal_id = $3
         AND aggregate_id = $4 AND version = $9`,
      [
        value.scope.tenantId,
        value.scope.workspaceId,
        value.scope.dealId,
        value.id,
        value.version,
        stateOf(value),
        JSON.stringify(value),
        value.updatedAt,
        expectedVersion,
      ],
    );
    if (result.rowCount === 1) return;
    throw new GovernanceVersionConflictError(
      expectedVersion,
      expectedVersion + 1,
      value.id,
    );
  }
}

type TableName =
  | "governance_aggregates"
  | "retention_assignments"
  | "legal_holds"
  | "deletion_requests"
  | "orchestrations";

interface VersionedDocument {
  readonly id: string;
  readonly scope: GovernanceScope;
  readonly version: number;
  readonly createdAt: string;
  readonly updatedAt: string;
}

interface JsonRow {
  readonly document: unknown;
}

interface CommandRow {
  readonly payloadDigest: string;
  readonly state: "in_progress" | "completed";
  readonly result: unknown;
}

interface GovernanceEventRow {
  readonly eventId: string;
  readonly tenantId: string;
  readonly workspaceId: string;
  readonly dealId: string;
  readonly actorId: string;
  readonly actorKind: GovernanceEvent["actorKind"];
  readonly correlationId: string;
  readonly aggregateVersion: string | number;
  readonly eventType: string;
  readonly schemaVersion: number;
  readonly payload: Readonly<Record<string, unknown>>;
  readonly occurredAt: string | Date;
}

function stateOf(value: VersionedDocument): string {
  const state = (value as { readonly state?: unknown }).state;
  return typeof state === "string" ? state : "active";
}

function scopeValues(scope: GovernanceScope): readonly string[] {
  return [scope.tenantId, scope.workspaceId, scope.dealId];
}

function documentValue<T>(value: unknown): T {
  if (typeof value === "string") return JSON.parse(value) as T;
  return value as T;
}

function toEvent(row: GovernanceEventRow): GovernanceEvent {
  return {
    eventId: row.eventId,
    scope: {
      tenantId: row.tenantId as GovernanceScope["tenantId"],
      workspaceId: row.workspaceId as GovernanceScope["workspaceId"],
      dealId: row.dealId as GovernanceScope["dealId"],
    },
    actorId: row.actorId as GovernanceEvent["actorId"],
    actorKind: row.actorKind,
    correlationId: row.correlationId,
    aggregateVersion: Number(
      row.aggregateVersion,
    ) as GovernanceEvent["aggregateVersion"],
    eventType: row.eventType,
    schemaVersion: 1,
    payload: row.payload,
    occurredAt: row.occurredAt instanceof Date
      ? row.occurredAt.toISOString()
      : row.occurredAt,
  };
}
