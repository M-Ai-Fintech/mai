import type { DealScope } from "./contracts.ts";
import { parseStoredDeal } from "./read_model.ts";
import type { DealId } from "./ids.ts";
import type {
  CompatibilityRoutingMode,
  DealReconciliationRecord,
  DealReconciliationStore,
  LegacyMappingIssue,
  RoutingChange,
} from "./legacy_contracts.ts";
import type { DealTransactionRunner } from "./repository.ts";
import type { TransactionHandle } from "../platform/persistence/v1.ts";

/**
 * Stores reconciliation and routing state in memory for isolated tests and
 * dry-run diagnostics; it is never selected by production composition.
 *
 * @example const store = new InMemoryDealReconciliationStore()
 */
export class InMemoryDealReconciliationStore
  implements DealReconciliationStore {
  private readonly records = new Map<string, DealReconciliationRecord>();
  private readonly routing = new Map<string, RoutingChange[]>();

  find(input: {
    readonly scope: DealScope;
    readonly legacySource: string;
    readonly legacyDealId: string;
  }): Promise<DealReconciliationRecord | undefined> {
    return Promise.resolve(
      this.records.get(
        recordKey(input.scope, input.legacySource, input.legacyDealId),
      ),
    );
  }

  findByAuthoritativeId(input: {
    readonly scope: DealScope;
    readonly authoritativeDealId: DealId;
  }): Promise<DealReconciliationRecord | undefined> {
    return Promise.resolve(
      [...this.records.values()].find((record) =>
        sameScope(record.scope, input.scope) &&
        record.authoritativeDealId === input.authoritativeDealId
      ),
    );
  }

  save(record: DealReconciliationRecord): Promise<void> {
    this.records.set(
      recordKey(record.scope, record.legacySource, record.legacyDealId),
      record,
    );
    return Promise.resolve();
  }

  route(change: RoutingChange): Promise<DealReconciliationRecord> {
    const key = recordKey(
      change.scope,
      change.legacySource,
      change.legacyDealId,
    );
    const current = this.records.get(key);
    if (current === undefined) {
      throw new Error(
        `Reconciliation record "${change.legacyDealId}" cannot route; expected an existing reconciled record in the requested scope.`,
      );
    }
    if (current.routingMode !== change.previousMode) {
      throw new Error(
        `Reconciliation routing for "${change.legacyDealId}" is stale at "${current.routingMode}"; expected "${change.previousMode}".`,
      );
    }
    assertRouteStatus(current, change.nextMode, change.legacyDealId);
    const updated = routedRecord(current, change);
    this.records.set(key, updated);
    const history = this.routing.get(key) ?? [];
    history.push(change);
    this.routing.set(key, history);
    return Promise.resolve(updated);
  }

  listRoutingChanges(input: {
    readonly scope: DealScope;
    readonly legacySource: string;
    readonly legacyDealId: string;
  }): Promise<readonly RoutingChange[]> {
    return Promise.resolve([
      ...(this.routing.get(
        recordKey(input.scope, input.legacySource, input.legacyDealId),
      ) ?? []),
    ]);
  }
}

/**
 * Persists reconciliation records and routing history inside PostgreSQL.
 *
 * The store writes only migration metadata; authoritative Deal writes remain
 * owned by PostgresDealRepository transactions.
 *
 * @example const record = await store.find({ scope, legacySource, legacyDealId })
 */
export class PostgresDealReconciliationStore
  implements DealReconciliationStore {
  constructor(private readonly transactions: DealTransactionRunner) {}

  find(input: {
    readonly scope: DealScope;
    readonly legacySource: string;
    readonly legacyDealId: string;
  }): Promise<DealReconciliationRecord | undefined> {
    return this.transactions.run((transaction) =>
      findRecord(transaction, input)
    );
  }

  findByAuthoritativeId(input: {
    readonly scope: DealScope;
    readonly authoritativeDealId: DealId;
  }): Promise<DealReconciliationRecord | undefined> {
    return this.transactions.run(async (transaction) => {
      const result = await transaction.query<ReconciliationRow>(
        `${recordSelect}
         WHERE tenant_id = $1 AND workspace_id = $2 AND authoritative_deal_id = $3`,
        [
          input.scope.tenantId,
          input.scope.workspaceId,
          input.authoritativeDealId,
        ],
      );
      return result.rows[0] === undefined
        ? undefined
        : toRecord(result.rows[0]);
    });
  }

  save(record: DealReconciliationRecord): Promise<void> {
    return this.transactions.run((transaction) =>
      saveRecord(transaction, record)
    );
  }

  route(change: RoutingChange): Promise<DealReconciliationRecord> {
    return this.transactions.run((transaction) =>
      routeRecord(transaction, change)
    );
  }

  listRoutingChanges(input: {
    readonly scope: DealScope;
    readonly legacySource: string;
    readonly legacyDealId: string;
  }): Promise<readonly RoutingChange[]> {
    return this.transactions.run(async (transaction) => {
      const result = await transaction.query<RoutingRow>(
        `SELECT routing_event_id AS "routingEventId", tenant_id AS "tenantId",
           workspace_id AS "workspaceId", legacy_source AS "legacySource",
           legacy_record_id AS "legacyDealId", authoritative_deal_id AS "authoritativeDealId",
           previous_mode AS "previousMode", next_mode AS "nextMode", actor_id AS "actorId",
           correlation_id AS "correlationId", reason, changed_at AS "changedAt"
         FROM deal_management.reconciliation_routing_history
         WHERE tenant_id = $1 AND workspace_id = $2 AND legacy_source = $3
           AND legacy_record_id = $4 ORDER BY changed_at, routing_event_id`,
        [
          input.scope.tenantId,
          input.scope.workspaceId,
          input.legacySource,
          input.legacyDealId,
        ],
      );
      return result.rows.map(toRoutingChange);
    });
  }
}

interface ReconciliationRow {
  readonly recordId: string;
  readonly tenantId: string;
  readonly workspaceId: string;
  readonly legacySource: string;
  readonly legacyDealId: string;
  readonly authoritativeDealId: string | null;
  readonly sourceFingerprint: string | null;
  readonly intendedDocument: unknown;
  readonly status: DealReconciliationRecord["status"];
  readonly routingMode: CompatibilityRoutingMode;
  readonly issue: unknown;
  readonly updatedAt: Date | string;
}

interface RoutingRow {
  readonly routingEventId: string;
  readonly tenantId: string;
  readonly workspaceId: string;
  readonly legacySource: string;
  readonly legacyDealId: string;
  readonly authoritativeDealId: string | null;
  readonly previousMode: CompatibilityRoutingMode;
  readonly nextMode: CompatibilityRoutingMode;
  readonly actorId: string;
  readonly correlationId: string;
  readonly reason: string;
  readonly changedAt: Date | string;
}

const recordSelect = `SELECT record_id AS "recordId", tenant_id AS "tenantId",
  workspace_id AS "workspaceId", legacy_source AS "legacySource",
  legacy_record_id AS "legacyDealId", authoritative_deal_id AS "authoritativeDealId",
  source_fingerprint AS "sourceFingerprint", intended_document AS "intendedDocument",
  status, routing_mode AS "routingMode", issue, updated_at AS "updatedAt"
  FROM deal_management.reconciliation_records`;

async function findRecord(
  transaction: TransactionHandle,
  input: {
    readonly scope: DealScope;
    readonly legacySource: string;
    readonly legacyDealId: string;
  },
): Promise<DealReconciliationRecord | undefined> {
  const result = await transaction.query<ReconciliationRow>(
    `${recordSelect}
     WHERE tenant_id = $1 AND workspace_id = $2 AND legacy_source = $3
       AND legacy_record_id = $4`,
    [
      input.scope.tenantId,
      input.scope.workspaceId,
      input.legacySource,
      input.legacyDealId,
    ],
  );
  return result.rows[0] === undefined ? undefined : toRecord(result.rows[0]);
}

async function saveRecord(
  transaction: TransactionHandle,
  record: DealReconciliationRecord,
): Promise<void> {
  await transaction.query(
    `INSERT INTO deal_management.reconciliation_records (
       record_id, tenant_id, workspace_id, legacy_source, legacy_record_id,
       authoritative_deal_id, source_fingerprint, intended_document, status,
       routing_mode, issue, created_at, updated_at
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $12)
     ON CONFLICT (tenant_id, workspace_id, legacy_source, legacy_record_id)
     DO UPDATE SET authoritative_deal_id = EXCLUDED.authoritative_deal_id,
       source_fingerprint = EXCLUDED.source_fingerprint,
       intended_document = EXCLUDED.intended_document, status = EXCLUDED.status,
       routing_mode = EXCLUDED.routing_mode, issue = EXCLUDED.issue,
       updated_at = EXCLUDED.updated_at`,
    [
      record.recordId,
      record.scope.tenantId,
      record.scope.workspaceId,
      record.legacySource,
      record.legacyDealId,
      record.authoritativeDealId ?? null,
      record.sourceFingerprint ?? null,
      record.intendedDeal === undefined
        ? null
        : JSON.stringify(record.intendedDeal),
      record.status,
      record.routingMode,
      record.issue === undefined ? null : JSON.stringify(record.issue),
      record.updatedAt,
    ],
  );
}

async function routeRecord(
  transaction: TransactionHandle,
  change: RoutingChange,
): Promise<DealReconciliationRecord> {
  const current = await findRecord(transaction, change);
  if (current === undefined) {
    throw new Error(
      `Reconciliation record "${change.legacyDealId}" cannot route; expected an existing record in the requested scope.`,
    );
  }
  if (current.routingMode !== change.previousMode) {
    throw new Error(
      `Reconciliation routing for "${change.legacyDealId}" is stale at "${current.routingMode}"; expected "${change.previousMode}".`,
    );
  }
  assertRouteStatus(current, change.nextMode, change.legacyDealId);
  const updated = routedRecord(current, change);
  await saveRecord(transaction, updated);
  await transaction.query(
    `INSERT INTO deal_management.reconciliation_routing_history (
       routing_event_id, tenant_id, workspace_id, legacy_source, legacy_record_id,
       authoritative_deal_id, previous_mode, next_mode, actor_id, correlation_id,
       reason, changed_at
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
    [
      `routing_${crypto.randomUUID().replaceAll("-", "")}`,
      change.scope.tenantId,
      change.scope.workspaceId,
      change.legacySource,
      change.legacyDealId,
      change.authoritativeDealId ?? current.authoritativeDealId ?? null,
      change.previousMode,
      change.nextMode,
      change.actorId,
      change.correlationId,
      change.reason,
      change.changedAt,
    ],
  );
  return updated;
}

function assertRouteStatus(
  record: DealReconciliationRecord,
  nextMode: CompatibilityRoutingMode,
  legacyDealId: string,
): void {
  const expectedStatus = nextMode === "legacy" ? "verified" : "rollback_routed";
  if (record.status === expectedStatus) return;
  throw new Error(
    `Reconciliation route for "${legacyDealId}" cannot enter "${nextMode}" from status "${record.status}"; expected status "${expectedStatus}".`,
  );
}

function toRecord(row: ReconciliationRow): DealReconciliationRecord {
  const intendedDeal = row.intendedDocument === null
    ? undefined
    : parseStoredDeal(row.intendedDocument);
  return {
    recordId: row.recordId,
    scope: {
      tenantId: row.tenantId as DealScope["tenantId"],
      workspaceId: row.workspaceId as DealScope["workspaceId"],
    },
    legacySource: row.legacySource,
    legacyDealId: row.legacyDealId,
    ...(row.authoritativeDealId === null
      ? {}
      : { authoritativeDealId: row.authoritativeDealId as DealId }),
    ...(row.sourceFingerprint === null
      ? {}
      : { sourceFingerprint: row.sourceFingerprint }),
    ...(intendedDeal === undefined ? {} : { intendedDeal }),
    status: row.status,
    routingMode: row.routingMode,
    ...(row.issue === null
      ? {}
      : { issue: parseIssue(row.issue, row.legacyDealId) }),
    updatedAt: new Date(row.updatedAt).toISOString(),
  };
}

function toRoutingChange(row: RoutingRow): RoutingChange {
  return {
    scope: {
      tenantId: row.tenantId as DealScope["tenantId"],
      workspaceId: row.workspaceId as DealScope["workspaceId"],
    },
    legacySource: row.legacySource,
    legacyDealId: row.legacyDealId,
    ...(row.authoritativeDealId === null
      ? {}
      : { authoritativeDealId: row.authoritativeDealId as DealId }),
    previousMode: row.previousMode,
    nextMode: row.nextMode,
    actorId: row.actorId,
    correlationId: row.correlationId,
    reason: row.reason,
    changedAt: new Date(row.changedAt).toISOString(),
  };
}

function parseIssue(value: unknown, legacyDealId: string): LegacyMappingIssue {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(
      `Reconciliation issue for "${legacyDealId}" is invalid; expected a JSON object.`,
    );
  }
  return value as LegacyMappingIssue;
}

function routedRecord(
  record: DealReconciliationRecord,
  change: RoutingChange,
): DealReconciliationRecord {
  return {
    ...record,
    authoritativeDealId: change.authoritativeDealId ??
      record.authoritativeDealId,
    status: change.nextMode === "legacy" ? "rollback_routed" : "verified",
    routingMode: change.nextMode,
    updatedAt: change.changedAt,
  };
}

function recordKey(
  scope: DealScope,
  source: string,
  legacyDealId: string,
): string {
  return `${scope.tenantId}\u0000${scope.workspaceId}\u0000${source}\u0000${legacyDealId}`;
}

function sameScope(left: DealScope, right: DealScope): boolean {
  return left.tenantId === right.tenantId &&
    left.workspaceId === right.workspaceId;
}
