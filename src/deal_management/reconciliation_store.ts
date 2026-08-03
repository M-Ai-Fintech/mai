import type { Deal, DealScope } from "./contracts.ts";
import { canonicalJson } from "./migration_identity.ts";
import type { DealId } from "./ids.ts";
import type {
  CompatibilityRoutingMode,
  DealReconciliationRecord,
  DealReconciliationStore,
  ReconciliationEvidenceResult,
  RoutingChange,
} from "./legacy_contracts.ts";
import type { DealTransactionRunner } from "./repository.ts";
import type { TransactionHandle } from "../platform/persistence/v1.ts";
import {
  recordKey,
  routedRecord,
  sameScope,
  toRecord,
  toRoutingChange,
} from "./reconciliation_store_rows.ts";
import type {
  ReconciliationRow,
  RoutingRow,
} from "./reconciliation_store_rows.ts";

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

  verifyAndMarkReconciliation(
    input: AtomicVerificationInput,
    validate: AtomicVerificationCallback,
  ): Promise<DealReconciliationRecord> {
    return this.transactions.run(async (transaction) => {
      const current = await findRecordForVerification(transaction, input);
      assertVerificationPreconditions(current, input);
      const verification = await validate(transaction, current);
      if (!verification.ok) {
        throw new AtomicVerificationMismatchError(
          input.legacyDealId,
          verification,
        );
      }
      const updated = await markVerified(transaction, current, input);
      return updated;
    });
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

/** Carries exact mismatch codes without disguising infrastructure failures. */
export class AtomicVerificationMismatchError extends Error {
  constructor(
    legacyDealId: string,
    readonly evidence: Extract<ReconciliationEvidenceResult, { ok: false }>,
  ) {
    super(
      `Reconciliation evidence for "${legacyDealId}" failed exact verification; expected an unchanged applied record and authoritative Deal.`,
    );
    this.name = "AtomicVerificationMismatchError";
  }
}

export interface AtomicVerificationInput {
  readonly scope: DealScope;
  readonly legacySource: string;
  readonly legacyDealId: string;
  readonly authoritativeDealId: DealId;
  readonly sourceFingerprint: string;
  readonly intendedDeal: Deal;
  readonly actorId: string;
  readonly correlationId: string;
  readonly now: string;
}

export type AtomicVerificationCallback = (
  transaction: TransactionHandle,
  current: DealReconciliationRecord,
) => Promise<ReconciliationEvidenceResult>;

const recordSelect = `SELECT record_id AS "recordId", tenant_id AS "tenantId",
  workspace_id AS "workspaceId", legacy_source AS "legacySource",
  legacy_record_id AS "legacyDealId", authoritative_deal_id AS "authoritativeDealId",
  source_fingerprint AS "sourceFingerprint", intended_document AS "intendedDocument",
  status, routing_mode AS "routingMode", issue, updated_at AS "updatedAt"
  FROM deal_management.reconciliation_records`;

async function findRecordForVerification(
  transaction: TransactionHandle,
  input: AtomicVerificationInput,
): Promise<DealReconciliationRecord | undefined> {
  const result = await transaction.query<ReconciliationRow>(
    recordSelect +
      " WHERE tenant_id = $1 AND workspace_id = $2 AND legacy_source = $3 " +
      "AND legacy_record_id = $4 FOR UPDATE",
    [
      input.scope.tenantId,
      input.scope.workspaceId,
      input.legacySource,
      input.legacyDealId,
    ],
  );
  return result.rows[0] === undefined ? undefined : toRecord(result.rows[0]);
}

function assertVerificationPreconditions(
  current: DealReconciliationRecord | undefined,
  input: AtomicVerificationInput,
): asserts current is DealReconciliationRecord {
  if (current === undefined) {
    throw new Error(
      'Reconciliation record "' + input.legacyDealId +
        '" was not found; expected an applied record in the requested scope.',
    );
  }
  if (current.status !== "applied" || current.routingMode !== "legacy") {
    throw new Error(
      'Reconciliation record "' + input.legacyDealId +
        '" is stale; expected status applied and legacy routing.',
    );
  }
  if (current.authoritativeDealId !== input.authoritativeDealId) {
    throw new Error(
      'Reconciliation record "' + input.legacyDealId +
        '" has a mismatched authoritative Deal identity; expected the mapped identity.',
    );
  }
  if (current.sourceFingerprint !== input.sourceFingerprint) {
    throw new Error(
      'Reconciliation record "' + input.legacyDealId +
        '" has a mismatched source fingerprint; expected the applied fingerprint.',
    );
  }
  if (
    current.intendedDeal === undefined ||
    canonicalJson(current.intendedDeal) !== canonicalJson(input.intendedDeal)
  ) {
    throw new Error(
      'Reconciliation record "' + input.legacyDealId +
        '" has a mismatched intended document; expected the applied document.',
    );
  }
}

async function markVerified(
  transaction: TransactionHandle,
  current: DealReconciliationRecord,
  input: AtomicVerificationInput,
): Promise<DealReconciliationRecord> {
  const result = await transaction.query(
    "UPDATE deal_management.reconciliation_records " +
      "SET status = 'verified', routing_mode = 'authoritative', issue = NULL, updated_at = $7 " +
      "WHERE tenant_id = $1 AND workspace_id = $2 AND legacy_source = $3 " +
      "AND legacy_record_id = $4 AND status = 'applied' AND routing_mode = 'legacy' " +
      "AND authoritative_deal_id = $5 AND source_fingerprint = $6",
    [
      input.scope.tenantId,
      input.scope.workspaceId,
      input.legacySource,
      input.legacyDealId,
      input.authoritativeDealId,
      input.sourceFingerprint,
      input.now,
    ],
  );
  if (result.rowCount !== 1) {
    throw new Error(
      'Reconciliation record "' + input.legacyDealId +
        '" became stale before atomic verification could commit; expected one applied row.',
    );
  }
  return {
    ...current,
    status: "verified",
    routingMode: "authoritative",
    updatedAt: input.now,
    issue: undefined,
  };
}

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
    recordValues(record),
  );
}

function recordValues(record: DealReconciliationRecord): unknown[] {
  return [
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
  ];
}

async function routeRecord(
  transaction: TransactionHandle,
  change: RoutingChange,
): Promise<DealReconciliationRecord> {
  const current = await findRecordForRouting(transaction, change);
  if (current === undefined) {
    throw new Error(
      `Reconciliation record "${change.legacyDealId}" cannot route; expected an existing record in the requested scope.`,
    );
  }
  assertCurrentRoute(current, change);
  const updated = routedRecord(current, change);
  await saveRecord(transaction, updated);
  await insertRoutingHistory(transaction, current, change);
  return updated;
}

function assertCurrentRoute(
  current: DealReconciliationRecord,
  change: RoutingChange,
): void {
  if (current.routingMode !== change.previousMode) {
    throw new Error(
      `Reconciliation routing for "${change.legacyDealId}" is stale at "${current.routingMode}"; expected "${change.previousMode}".`,
    );
  }
  assertRouteStatus(current, change.nextMode, change.legacyDealId);
}

async function insertRoutingHistory(
  transaction: TransactionHandle,
  current: DealReconciliationRecord,
  change: RoutingChange,
): Promise<void> {
  await transaction.query(
    `INSERT INTO deal_management.reconciliation_routing_history (
       routing_event_id, tenant_id, workspace_id, legacy_source, legacy_record_id,
       authoritative_deal_id, previous_mode, next_mode, actor_id, correlation_id,
       reason, changed_at
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
    routingValues(current, change),
  );
}

function routingValues(
  current: DealReconciliationRecord,
  change: RoutingChange,
): unknown[] {
  return [
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
  ];
}

async function findRecordForRouting(
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
       AND legacy_record_id = $4 FOR UPDATE`,
    [
      input.scope.tenantId,
      input.scope.workspaceId,
      input.legacySource,
      input.legacyDealId,
    ],
  );
  return result.rows[0] === undefined ? undefined : toRecord(result.rows[0]);
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
