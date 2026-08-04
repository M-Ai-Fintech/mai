import {
  type AggregateVersion,
  createProtectedNotFoundError,
  type ErrorEnvelope,
} from "../../platform/api/v1.ts";
import {
  field,
  type FieldClassification,
  type FieldMask,
} from "../../platform/authz/v1.ts";
import type { TransactionHandle } from "../../platform/persistence/v1.ts";
import type {
  DealAuthorizationPort,
  DealCommandContext,
  DealFieldMaskDecision,
  DealScope,
} from "../contracts.ts";
import { dealScope } from "../contracts.ts";
import { DealInvariantError } from "../errors.ts";
import { DEAL_ACTION, DEAL_RESOURCE } from "../service.ts";
import type { DealId } from "../ids.ts";
import type { DealRepository } from "../repository.ts";
import type { DealTransactionRunner } from "../repository.ts";
import {
  cloneLifecycle,
  createInitialLifecycle,
  parseStoredLifecycle,
  parseStoredLifecycleHistory,
} from "./model.ts";
import type {
  DealLifecycleAggregate,
  LifecycleHistoryRecord,
  LifecyclePersistenceMutation,
} from "./contracts.ts";

export interface LifecycleProjection {
  readonly dealId?: DealId;
  readonly version?: AggregateVersion;
  readonly state?: DealLifecycleAggregate["state"];
  readonly milestones?: readonly Readonly<Record<string, unknown>>[];
}

export interface LifecycleActivityEntry {
  readonly transitionId: string;
  readonly eventId: string;
  readonly aggregateVersion: AggregateVersion;
  readonly subjectType: LifecycleHistoryRecord["subjectType"];
  readonly subjectId: string;
  readonly previousState?: LifecycleHistoryRecord["previousState"];
  readonly nextState: LifecycleHistoryRecord["nextState"];
  readonly prerequisites: LifecycleHistoryRecord["prerequisites"];
  readonly actorId: string;
  readonly correlationId: string;
  readonly occurredAt: string;
}

export interface DealLifecycleReadProjection {
  readonly lifecycle: LifecycleProjection;
  readonly activity?: readonly LifecycleActivityEntry[];
}

export class InMemoryLifecycleStore {
  private readonly current = new Map<string, DealLifecycleAggregate>();
  private readonly history = new Map<string, LifecycleHistoryRecord[]>();

  find(
    scope: DealScope,
    dealId: DealId,
  ): Promise<DealLifecycleAggregate | undefined> {
    const value = this.current.get(lifecycleKey(scope, dealId));
    return Promise.resolve(
      value === undefined ? undefined : cloneLifecycle(value),
    );
  }

  listHistory(
    scope: DealScope,
    dealId: DealId,
  ): Promise<readonly LifecycleHistoryRecord[]> {
    const value = this.history.get(lifecycleKey(scope, dealId)) ?? [];
    return Promise.resolve(value.map(cloneLifecycleHistory));
  }

  save(mutation: LifecyclePersistenceMutation): void {
    const key = lifecycleKey(mutation.aggregate, mutation.aggregate.dealId);
    this.current.set(key, cloneLifecycle(mutation.aggregate));
    if (mutation.history === undefined) return;
    const history = this.history.get(key) ?? [];
    history.push(cloneLifecycleHistory(mutation.history));
    this.history.set(key, history);
  }
}

export class PostgresLifecycleStore {
  constructor(private readonly transactions: DealTransactionRunner) {}

  find(
    scope: DealScope,
    dealId: DealId,
  ): Promise<DealLifecycleAggregate | undefined> {
    return this.transactions.run((transaction) =>
      findLifecycleInTransaction(transaction, scope, dealId)
    );
  }

  listHistory(
    scope: DealScope,
    dealId: DealId,
  ): Promise<readonly LifecycleHistoryRecord[]> {
    return this.transactions.run((transaction) =>
      listLifecycleHistoryInTransaction(transaction, scope, dealId)
    );
  }
}

export type LifecycleReadResult =
  | {
    readonly kind: "loaded";
    readonly value: DealLifecycleReadProjection;
  }
  | {
    readonly kind: "protected_not_found";
    readonly response: ErrorEnvelope;
  };

export function requestedLifecycleFields(): readonly {
  readonly name: string;
  readonly classification: FieldClassification;
}[] {
  return [
    { name: "lifecycle", classification: "public" },
    { name: "milestones", classification: "public" },
    { name: "activity", classification: "internal_audit" },
  ];
}

export function projectLifecycle(
  aggregate: DealLifecycleAggregate,
  mask: DealFieldMaskDecision = fullLifecycleMask(),
): LifecycleProjection {
  const value: LifecycleProjection = {};
  if (fieldAllowed(mask, "lifecycle", "public")) {
    Object.assign(value, {
      dealId: aggregate.dealId,
      version: aggregate.version,
      state: aggregate.state,
    });
  }
  if (fieldAllowed(mask, "milestones", "public")) {
    Object.assign(value, {
      milestones: aggregate.milestones.map(projectMilestone),
    });
  }
  return value;
}

export function projectLifecycleActivity(
  history: readonly LifecycleHistoryRecord[],
  mask: DealFieldMaskDecision = fullLifecycleMask(),
): readonly LifecycleActivityEntry[] | undefined {
  if (!fieldAllowed(mask, "activity", "internal_audit")) return undefined;
  return history.map((record) => ({
    transitionId: record.transitionId,
    eventId: record.eventId,
    aggregateVersion: record.aggregateVersion,
    subjectType: record.subjectType,
    subjectId: record.subjectId,
    ...(record.previousState === undefined
      ? {}
      : { previousState: record.previousState }),
    nextState: record.nextState,
    prerequisites: record.prerequisites,
    actorId: record.actorId,
    correlationId: record.correlationId,
    occurredAt: record.occurredAt,
  }));
}

export async function readDealLifecycleProjection(input: {
  readonly context: DealCommandContext;
  readonly dealId: DealId;
  readonly repository: DealRepository;
  readonly authorization: DealAuthorizationPort;
}): Promise<LifecycleReadResult> {
  const scope = dealScope(input.context);
  const decision = await input.authorization.authorize({
    context: input.context,
    scope,
    resource: { kind: DEAL_RESOURCE, id: input.dealId },
    action: DEAL_ACTION.read,
    requestedFields: requestedLifecycleFields(),
  });
  if (decision.outcome === "deny") return protectedNotFound(input.context);
  const deal = await input.repository.find(scope, input.dealId);
  if (deal === undefined) return protectedNotFound(input.context);
  const lifecycle = await input.repository.findLifecycle(scope, input.dealId) ??
    createInitialLifecycle({
      dealId: deal.id,
      tenantId: deal.tenantId,
      workspaceId: deal.workspaceId,
      version: deal.version,
    });
  const history = await input.repository.listLifecycleHistory(
    scope,
    input.dealId,
  );
  const activity = projectLifecycleActivity(history, decision.fieldMask);
  return {
    kind: "loaded",
    value: {
      lifecycle: projectLifecycle(lifecycle, decision.fieldMask),
      ...(activity === undefined ? {} : { activity }),
    },
  };
}

function projectMilestone(
  milestone: DealLifecycleAggregate["milestones"][number],
): Readonly<Record<string, unknown>> {
  return {
    id: milestone.id,
    key: milestone.key,
    title: milestone.title,
    state: milestone.state,
    prerequisites: milestone.prerequisites,
    ...(milestone.dueAt === undefined ? {} : { dueAt: milestone.dueAt }),
    createdAt: milestone.createdAt,
    updatedAt: milestone.updatedAt,
    ...(milestone.completedAt === undefined
      ? {}
      : { completedAt: milestone.completedAt }),
  };
}

function fieldAllowed(
  mask: DealFieldMaskDecision,
  name: string,
  classification: FieldClassification,
): boolean {
  const requested = field(name);
  return mask.include.includes(requested) &&
    !mask.omit.includes(requested) &&
    !mask.redact.includes(requested) &&
    mask.approvedClassifications.some((approved) =>
      approved.name === requested && approved.classification === classification
    );
}

function fullLifecycleMask(): DealFieldMaskDecision {
  return {
    include: [field("lifecycle"), field("milestones"), field("activity")],
    omit: [],
    redact: [],
    approvedClassifications: [
      { name: field("lifecycle"), classification: "public" },
      { name: field("milestones"), classification: "public" },
      { name: field("activity"), classification: "internal_audit" },
    ],
  } satisfies FieldMask;
}

function protectedNotFound(context: DealCommandContext): LifecycleReadResult {
  return {
    kind: "protected_not_found",
    response: createProtectedNotFoundError(context.request.correlationId),
  };
}

export async function findLifecycleInTransaction(
  transaction: TransactionHandle,
  scope: DealScope,
  dealId: DealId,
): Promise<DealLifecycleAggregate | undefined> {
  const result = await transaction.query<StoredLifecycleRow>(
    `SELECT version, document
     FROM deal_management.lifecycle_current
     WHERE tenant_id = $1 AND workspace_id = $2 AND deal_id = $3`,
    [scope.tenantId, scope.workspaceId, dealId],
  );
  const row = result.rows[0];
  if (row === undefined) return undefined;
  const lifecycle = parseStoredLifecycle(row.document);
  assertLifecycleScope(lifecycle, row, scope, dealId);
  return lifecycle;
}

async function listLifecycleHistoryInTransaction(
  transaction: TransactionHandle,
  scope: DealScope,
  dealId: DealId,
): Promise<readonly LifecycleHistoryRecord[]> {
  const result = await transaction.query<StoredLifecycleHistoryRow>(
    lifecycleHistoryQuery,
    [scope.tenantId, scope.workspaceId, dealId],
  );
  return result.rows.map(parseLifecycleHistoryRow);
}

export function parseLifecycleHistoryRow(
  row: StoredLifecycleHistoryRow,
): LifecycleHistoryRecord {
  return parseStoredLifecycleHistory({
    ...row,
    aggregateVersion: Number(row.aggregateVersion),
    occurredAt: new Date(row.occurredAt).toISOString(),
    previousState: row.previousState ?? undefined,
  });
}

export async function persistLifecycle(
  transaction: TransactionHandle,
  mutation: LifecyclePersistenceMutation,
): Promise<void> {
  assertLifecycleMutation(mutation);
  await transaction.query(
    `INSERT INTO deal_management.lifecycle_current (
       tenant_id, workspace_id, deal_id, version, document
     ) VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (tenant_id, workspace_id, deal_id)
     DO UPDATE SET version = EXCLUDED.version, document = EXCLUDED.document`,
    [
      mutation.aggregate.tenantId,
      mutation.aggregate.workspaceId,
      mutation.aggregate.dealId,
      mutation.aggregate.version,
      JSON.stringify(mutation.aggregate),
    ],
  );
  if (mutation.history === undefined) return;
  await transaction.query(
    `INSERT INTO deal_management.lifecycle_transition_history (
       transition_id, event_id, tenant_id, workspace_id, deal_id,
       aggregate_version, subject_type, subject_id, previous_state,
       next_state, prerequisites, actor_id, correlation_id, occurred_at
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
    [
      mutation.history.transitionId,
      mutation.history.eventId,
      mutation.history.tenantId,
      mutation.history.workspaceId,
      mutation.history.dealId,
      mutation.history.aggregateVersion,
      mutation.history.subjectType,
      mutation.history.subjectId,
      mutation.history.previousState ?? null,
      mutation.history.nextState,
      JSON.stringify(mutation.history.prerequisites),
      mutation.history.actorId,
      mutation.history.correlationId,
      mutation.history.occurredAt,
    ],
  );
}

export function cloneLifecycleHistory(
  record: LifecycleHistoryRecord,
): LifecycleHistoryRecord {
  return Object.freeze({
    ...record,
    prerequisites: Object.freeze(
      record.prerequisites.map((check) => Object.freeze({ ...check })),
    ),
  });
}

interface StoredLifecycleRow {
  readonly version: string | number;
  readonly document: unknown;
}

export interface StoredLifecycleHistoryRow {
  readonly transitionId: string;
  readonly eventId: string;
  readonly tenantId: string;
  readonly workspaceId: string;
  readonly dealId: string;
  readonly aggregateVersion: string | number;
  readonly subjectType: string;
  readonly subjectId: string;
  readonly previousState: string | null;
  readonly nextState: string;
  readonly prerequisites: unknown;
  readonly actorId: string;
  readonly correlationId: string;
  readonly occurredAt: Date | string;
}

const lifecycleHistoryQuery = `
  SELECT transition_id AS "transitionId", event_id AS "eventId",
    tenant_id AS "tenantId", workspace_id AS "workspaceId",
    deal_id AS "dealId", aggregate_version AS "aggregateVersion",
    subject_type AS "subjectType", subject_id AS "subjectId",
    previous_state AS "previousState", next_state AS "nextState",
    prerequisites, actor_id AS "actorId", correlation_id AS "correlationId",
    occurred_at AS "occurredAt"
  FROM deal_management.lifecycle_transition_history
  WHERE tenant_id = $1 AND workspace_id = $2 AND deal_id = $3
  ORDER BY aggregate_version, transition_id`;

function assertLifecycleScope(
  lifecycle: DealLifecycleAggregate,
  row: StoredLifecycleRow,
  scope: DealScope,
  dealId: DealId,
): void {
  if (
    lifecycle.dealId === dealId && lifecycle.tenantId === scope.tenantId &&
    lifecycle.workspaceId === scope.workspaceId &&
    Number(lifecycle.version) === Number(row.version)
  ) return;
  throw new DealInvariantError(
    `Stored lifecycle Deal "${dealId}" does not match its scoped row; expected matching scope and version.`,
  );
}

function assertLifecycleMutation(
  mutation: LifecyclePersistenceMutation,
): void {
  const history = mutation.history;
  if (
    history === undefined ||
    history.tenantId === mutation.aggregate.tenantId &&
      history.workspaceId === mutation.aggregate.workspaceId &&
      history.dealId === mutation.aggregate.dealId &&
      history.aggregateVersion === mutation.aggregate.version
  ) return;
  throw new DealInvariantError(
    `Lifecycle history transition "${history.transitionId}" does not match Deal "${mutation.aggregate.dealId}"; expected the same scope and aggregate version.`,
  );
}

function lifecycleKey(scope: DealScope, dealId: DealId): string {
  return `${scope.tenantId}|${scope.workspaceId}|${dealId}`;
}
