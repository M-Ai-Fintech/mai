import type { AggregateVersion } from "../shared/contracts/aggregate_version.ts";
import type { WorkspaceId } from "../shared/contracts/identifiers.ts";
import { type OutboxEvent, OutboxRepository } from "../platform/events/v1.ts";
import { type TransactionHandle } from "../platform/persistence/v1.ts";
import type {
  IdentityAccessAggregate,
  IdentityAccessEvent,
  IdentityAccessRepository,
  IdentityAccessWriteOperation,
  TenantScope,
} from "./contracts.ts";
import { IdentityAccessError } from "./errors.ts";

export interface IdentityAccessTransactionRunner {
  run<TResult>(
    callback: (transaction: TransactionHandle) => Promise<TResult> | TResult,
  ): Promise<TResult>;
}

export class PostgresIdentityAccessRepository
  implements IdentityAccessRepository {
  constructor(
    private readonly transactions: IdentityAccessTransactionRunner,
    private readonly outbox = new OutboxRepository(),
  ) {}

  find(
    scope: TenantScope,
    aggregateType: IdentityAccessAggregate["aggregateType"],
    aggregateId: string,
  ): Promise<IdentityAccessAggregate | undefined> {
    return this.transactions.run((transaction) =>
      this.findInTransaction(transaction, scope, aggregateType, aggregateId)
    );
  }

  list(
    scope: TenantScope,
    aggregateType: IdentityAccessAggregate["aggregateType"],
  ): Promise<readonly IdentityAccessAggregate[]> {
    return this.transactions.run((transaction) =>
      this.listInTransaction(transaction, scope, aggregateType)
    );
  }

  save(
    aggregate: IdentityAccessAggregate,
    expectedVersion: AggregateVersion | number | undefined,
    event: IdentityAccessEvent,
  ): Promise<void> {
    return this.saveBatch([{ aggregate, expectedVersion, event }]);
  }

  saveBatch(
    operations: readonly IdentityAccessWriteOperation[],
  ): Promise<void> {
    return this.transactions.run(async (transaction) => {
      for (const operation of operations) {
        await this.persistAggregate(transaction, operation);
      }
    });
  }

  private async findInTransaction(
    transaction: TransactionHandle,
    scope: TenantScope,
    aggregateType: IdentityAccessAggregate["aggregateType"],
    aggregateId: string,
  ): Promise<IdentityAccessAggregate | undefined> {
    const table = tableFor(aggregateType);
    const result = await transaction.query<{ document: unknown }>(
      `SELECT document FROM ${table.name}
       WHERE tenant_id = $1 AND aggregate_id = $2 ${
        workspacePredicate(scope, true)
      }`,
      scopeParameters(scope, aggregateId),
    );
    return result.rows[0] === undefined
      ? undefined
      : deserializeAggregate(result.rows[0].document, aggregateType);
  }

  private async listInTransaction(
    transaction: TransactionHandle,
    scope: TenantScope,
    aggregateType: IdentityAccessAggregate["aggregateType"],
  ): Promise<readonly IdentityAccessAggregate[]> {
    const table = tableFor(aggregateType);
    const result = await transaction.query<{ document: unknown }>(
      `SELECT document FROM ${table.name}
       WHERE tenant_id = $1 ${workspacePredicate(scope, false)}
       ORDER BY aggregate_id`,
      scopeParameters(scope),
    );
    return result.rows.map(({ document }) =>
      deserializeAggregate(document, aggregateType)
    );
  }

  private async persistAggregate(
    transaction: TransactionHandle,
    operation: IdentityAccessWriteOperation,
  ): Promise<void> {
    assertEvent(operation.aggregate, operation.event);
    const table = tableFor(operation.aggregate.aggregateType);
    const scope = scopeOf(operation.aggregate);
    const existing = await currentVersion(
      transaction,
      table,
      scope,
      operation.aggregate.id,
    );
    if (existing === undefined) {
      assertCreateVersion(operation);
      await insertAggregate(transaction, table, operation.aggregate);
    } else {
      assertUpdateVersion(operation, existing);
      await updateAggregate(
        transaction,
        table,
        operation.aggregate,
        operation.expectedVersion!,
      );
    }
    await insertHistory(transaction, table, operation);
    await this.outbox.append(transaction, toOutboxEvent(operation.event));
  }
}

interface TableDefinition {
  readonly name: string;
  readonly history: string;
  readonly schema: "iam" | "access";
}

function tableFor(
  type: IdentityAccessAggregate["aggregateType"],
): TableDefinition {
  if (type === "role_policy") {
    return {
      name: "access.role_policies",
      history: "access.aggregate_history",
      schema: "access",
    };
  }
  if (type === "permission_grant") {
    return {
      name: "access.permission_grants",
      history: "access.aggregate_history",
      schema: "access",
    };
  }
  if (type === "restriction") {
    return {
      name: "access.restrictions",
      history: "access.aggregate_history",
      schema: "access",
    };
  }
  const name = {
    institution: "iam.institutions",
    workspace: "iam.workspaces",
    user_identity: "iam.user_identities",
    membership: "iam.memberships",
    invitation: "iam.invitations",
    revocation: "iam.revocations",
  }[type];
  return { name, history: "iam.aggregate_history", schema: "iam" };
}

function scopeOf(aggregate: IdentityAccessAggregate): TenantScope {
  return {
    tenantId: aggregate.tenantId,
    ...(workspaceOf(aggregate) === undefined
      ? {}
      : { workspaceId: workspaceOf(aggregate) }),
  };
}

function workspaceOf(
  aggregate: IdentityAccessAggregate,
): WorkspaceId | undefined {
  if (aggregate.aggregateType === "workspace") return aggregate.id;
  return "workspaceId" in aggregate ? aggregate.workspaceId : undefined;
}

function workspacePredicate(
  scope: TenantScope,
  aggregateIdPresent: boolean,
): string {
  return scope.workspaceId === undefined
    ? "AND workspace_id IS NULL"
    : `AND workspace_id = $${aggregateIdPresent ? 3 : 2}`;
}

function scopeParameters(scope: TenantScope, aggregateId?: string): unknown[] {
  return aggregateId === undefined
    ? [
      scope.tenantId,
      ...(scope.workspaceId === undefined ? [] : [scope.workspaceId]),
    ]
    : [
      scope.tenantId,
      aggregateId,
      ...(scope.workspaceId === undefined ? [] : [scope.workspaceId]),
    ];
}

async function currentVersion(
  transaction: TransactionHandle,
  table: TableDefinition,
  scope: TenantScope,
  aggregateId: string,
): Promise<number | undefined> {
  const result = await transaction.query<{ version: number | string }>(
    `SELECT version FROM ${table.name}
     WHERE tenant_id = $1 AND aggregate_id = $2 ${
      workspacePredicate(scope, true)
    }`,
    scopeParameters(scope, aggregateId),
  );
  const version = result.rows[0]?.version;
  return version === undefined ? undefined : Number(version);
}

async function insertAggregate(
  transaction: TransactionHandle,
  table: TableDefinition,
  aggregate: IdentityAccessAggregate,
): Promise<void> {
  const values = aggregateValues(aggregate);
  await transaction.query(
    `INSERT INTO ${table.name} (${values.columns.join(", ")})
     VALUES (${values.columns.map((_, index) => `$${index + 1}`).join(", ")})`,
    values.parameters,
  );
}

async function updateAggregate(
  transaction: TransactionHandle,
  table: TableDefinition,
  aggregate: IdentityAccessAggregate,
  expectedVersion: AggregateVersion | number,
): Promise<void> {
  const workspaceId = workspaceOf(aggregate);
  const scopeParameters = workspaceId === undefined
    ? [aggregate.tenantId, aggregate.id]
    : [aggregate.tenantId, aggregate.id, workspaceId];
  const versionIndex = scopeParameters.length + 1;
  const stateIndex = versionIndex + 1;
  const documentIndex = stateIndex + 1;
  const updatedAtIndex = documentIndex + 1;
  const expectedVersionIndex = updatedAtIndex + 1;
  const result = await transaction.query(
    `UPDATE ${table.name}
     SET version = $${versionIndex}, state = $${stateIndex},
         document = $${documentIndex}, updated_at = $${updatedAtIndex}
     WHERE tenant_id = $1 AND aggregate_id = $2 ${
      workspacePredicate(scopeOf(aggregate), true)
    }
       AND version = $${expectedVersionIndex}`,
    [
      ...scopeParameters,
      aggregate.version,
      aggregateState(aggregate),
      JSON.stringify(aggregate),
      aggregate.updatedAt,
      expectedVersion,
    ],
  );
  if (result.rowCount === 1) return;
  throw new IdentityAccessError(
    "VERSION_CONFLICT",
    `aggregate "${aggregate.id}" update lost its expected version "${expectedVersion}".`,
  );
}

async function insertHistory(
  transaction: TransactionHandle,
  table: TableDefinition,
  operation: IdentityAccessWriteOperation,
): Promise<void> {
  await transaction.query(
    `INSERT INTO ${table.history} (
       tenant_id, workspace_id, aggregate_type, aggregate_id, version,
       event_type, document, recorded_at
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [
      operation.aggregate.tenantId,
      workspaceOf(operation.aggregate) ?? null,
      operation.aggregate.aggregateType,
      operation.aggregate.id,
      operation.aggregate.version,
      operation.event.eventType,
      JSON.stringify(operation.aggregate),
      operation.event.occurredAt,
    ],
  );
}

function aggregateValues(aggregate: IdentityAccessAggregate): {
  readonly columns: readonly string[];
  readonly parameters: readonly unknown[];
} {
  const common = [
    "aggregate_id",
    "tenant_id",
    "workspace_id",
    "version",
    "state",
    "document",
    "created_at",
    "updated_at",
  ];
  const parameters: unknown[] = [
    aggregate.id,
    aggregate.tenantId,
    workspaceOf(aggregate) ?? null,
    aggregate.version,
    aggregateState(aggregate),
    JSON.stringify(aggregate),
    aggregate.createdAt,
    aggregate.updatedAt,
  ];
  appendSpecificValues(aggregate, common, parameters);
  return { columns: common, parameters };
}

function appendSpecificValues(
  aggregate: IdentityAccessAggregate,
  columns: string[],
  parameters: unknown[],
): void {
  if (aggregate.aggregateType === "user_identity") {
    columns.push("provider_subject");
    parameters.push(aggregate.providerSubject);
  }
  if (aggregate.aggregateType === "invitation") {
    columns.push("token_digest", "expires_at");
    parameters.push(aggregate.tokenDigest, aggregate.expiresAt);
  }
  if (aggregate.aggregateType === "revocation") {
    columns.push("target_type", "target_id");
    parameters.push(aggregate.targetType, aggregate.targetId);
  }
  if (aggregate.aggregateType === "permission_grant") {
    columns.push("identity_id", "access_kind", "expires_at");
    parameters.push(
      aggregate.identityId,
      aggregate.access,
      aggregate.expiresAt ?? null,
    );
  }
}

function aggregateState(aggregate: IdentityAccessAggregate): string {
  return aggregate.state;
}

function assertCreateVersion(operation: IdentityAccessWriteOperation): void {
  if (operation.expectedVersion === undefined) return;
  throw new IdentityAccessError(
    "VERSION_CONFLICT",
    `aggregate "${operation.aggregate.id}" does not exist; expected create without version.`,
  );
}

function assertUpdateVersion(
  operation: IdentityAccessWriteOperation,
  storedVersion: number,
): void {
  const expected = operation.expectedVersion;
  if (
    expected !== undefined && Number(expected) === storedVersion &&
    Number(operation.aggregate.version) === storedVersion + 1
  ) return;
  throw new IdentityAccessError(
    "VERSION_CONFLICT",
    `aggregate "${operation.aggregate.id}" expected version "${expected}" but stored version is "${storedVersion}".`,
  );
}

function assertEvent(
  aggregate: IdentityAccessAggregate,
  event: IdentityAccessEvent,
): void {
  if (
    event.tenantId === aggregate.tenantId &&
    event.workspaceId === workspaceOf(aggregate) &&
    event.aggregateId === aggregate.id &&
    event.aggregateType === aggregate.aggregateType &&
    event.aggregateVersion === aggregate.version
  ) return;
  throw new IdentityAccessError(
    "INVALID_INPUT",
    `event "${event.eventId}" does not match aggregate "${aggregate.id}".`,
  );
}

function deserializeAggregate(
  document: unknown,
  aggregateType: IdentityAccessAggregate["aggregateType"],
): IdentityAccessAggregate {
  const parsed = typeof document === "string" ? JSON.parse(document) : document;
  if (!isAggregateDocument(parsed) || parsed.aggregateType !== aggregateType) {
    throw new Error(
      `Stored aggregate document "${
        String(document)
      }" has unexpected type; expected "${aggregateType}".`,
    );
  }
  return parsed as unknown as IdentityAccessAggregate;
}

function isAggregateDocument(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function toOutboxEvent(event: IdentityAccessEvent): OutboxEvent {
  return {
    eventId: event.eventId,
    tenantId: event.tenantId,
    ...(event.workspaceId === undefined
      ? {}
      : { workspaceId: event.workspaceId }),
    aggregateType: event.aggregateType,
    aggregateId: event.aggregateId,
    aggregateVersion: event.aggregateVersion,
    eventType: event.eventType,
    schemaVersion: event.schemaVersion,
    payload: event.payload,
    correlationId: event.correlationId,
    occurredAt: event.occurredAt,
    availableAt: event.availableAt,
  };
}
