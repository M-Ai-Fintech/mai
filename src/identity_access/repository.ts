import type { AggregateVersion } from "../shared/contracts/aggregate_version.ts";
import type {
  IdentityAccessAggregate,
  IdentityAccessEvent,
  IdentityAccessRepository,
  IdentityAccessWriteOperation,
  TenantScope,
} from "./contracts.ts";
import { IdentityAccessError } from "./errors.ts";

export class InMemoryIdentityAccessRepository
  implements IdentityAccessRepository {
  private readonly aggregates = new Map<string, IdentityAccessAggregate>();
  private readonly recordedEvents: IdentityAccessEvent[] = [];

  find(
    scope: TenantScope,
    aggregateType: IdentityAccessAggregate["aggregateType"],
    aggregateId: string,
  ): Promise<IdentityAccessAggregate | undefined> {
    const aggregate = this.aggregates.get(
      key(aggregateType, scope.tenantId, aggregateId),
    );
    return Promise.resolve(
      aggregate !== undefined && matchesScope(aggregate, scope)
        ? aggregate
        : undefined,
    );
  }

  list(
    scope: TenantScope,
    aggregateType: IdentityAccessAggregate["aggregateType"],
  ): Promise<readonly IdentityAccessAggregate[]> {
    return Promise.resolve(
      [...this.aggregates.values()].filter((aggregate) =>
        aggregate.aggregateType === aggregateType &&
        matchesScope(aggregate, scope)
      ),
    );
  }

  async save(
    aggregate: IdentityAccessAggregate,
    expectedVersion: AggregateVersion | number | undefined,
    event: IdentityAccessEvent,
  ): Promise<void> {
    await this.saveBatch([{ aggregate, expectedVersion, event }]);
  }

  saveBatch(
    operations: readonly IdentityAccessWriteOperation[],
  ): Promise<void> {
    return Promise.resolve().then(() => {
      const snapshot = new Map(this.aggregates);
      const eventCount = this.recordedEvents.length;
      try {
        for (const operation of operations) this.validateAndStore(operation);
      } catch (error) {
        this.restore(snapshot, eventCount);
        throw error;
      }
    });
  }

  events(): readonly IdentityAccessEvent[] {
    return Object.freeze([...this.recordedEvents]);
  }

  private validateAndStore(operation: IdentityAccessWriteOperation): void {
    const { aggregate, expectedVersion, event } = operation;
    assertEventMatchesAggregate(aggregate, event);
    const aggregateKey = key(
      aggregate.aggregateType,
      aggregate.tenantId,
      aggregate.id,
    );
    const existing = this.aggregates.get(aggregateKey);
    if (existing === undefined) {
      if (expectedVersion !== undefined) {
        throw new IdentityAccessError(
          "VERSION_CONFLICT",
          `aggregate "${aggregate.id}" does not exist; expected create without version.`,
        );
      }
    } else {
      if (expectedVersion === undefined) {
        throw new IdentityAccessError(
          "VERSION_CONFLICT",
          `aggregate "${aggregate.id}" already exists; expected version "${existing.version}".`,
        );
      }
      if (aggregate.version === existing.version) {
        throw new IdentityAccessError(
          "VERSION_CONFLICT",
          `aggregate "${aggregate.id}" already exists at version "${existing.version}".`,
        );
      }
      if (
        existing.version !== expectedVersion ||
        aggregate.version !== expectedVersion + 1
      ) {
        throw new IdentityAccessError(
          "VERSION_CONFLICT",
          `aggregate "${aggregate.id}" expected version "${expectedVersion}" but stored version is "${existing.version}".`,
        );
      }
    }
    this.aggregates.set(aggregateKey, aggregate);
    this.recordedEvents.push(event);
  }

  private restore(
    snapshot: Map<string, IdentityAccessAggregate>,
    eventCount: number,
  ): void {
    this.aggregates.clear();
    for (const [aggregateKey, aggregate] of snapshot) {
      this.aggregates.set(aggregateKey, aggregate);
    }
    this.recordedEvents.length = eventCount;
  }
}

function key(type: string, tenantId: string, aggregateId: string): string {
  return `${type}:${tenantId}:${aggregateId}`;
}

function matchesScope(
  aggregate: IdentityAccessAggregate,
  scope: TenantScope,
): boolean {
  if (aggregate.tenantId !== scope.tenantId) return false;
  if (scope.workspaceId === undefined) {
    return aggregate.aggregateType === "workspace" ||
      !("workspaceId" in aggregate);
  }
  if (aggregate.aggregateType === "workspace") {
    return aggregate.id === scope.workspaceId;
  }
  return "workspaceId" in aggregate &&
    aggregate.workspaceId === scope.workspaceId;
}

function assertEventMatchesAggregate(
  aggregate: IdentityAccessAggregate,
  event: IdentityAccessEvent,
): void {
  if (
    event.tenantId !== aggregate.tenantId ||
    event.aggregateId !== aggregate.id ||
    event.aggregateType !== aggregate.aggregateType ||
    event.aggregateVersion !== aggregate.version
  ) {
    throw new IdentityAccessError(
      "INVALID_INPUT",
      `event "${event.eventId}" does not match aggregate "${aggregate.id}".`,
    );
  }
}
