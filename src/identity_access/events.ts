import type { AggregateVersion } from "../shared/contracts/aggregate_version.ts";
import type { WorkspaceId } from "../shared/contracts/identifiers.ts";
import type {
  AdministrationContext,
  IdentityAccessAggregate,
  IdentityAccessEvent,
} from "./contracts.ts";

export function createIdentityAccessEvent(input: {
  readonly aggregate: IdentityAccessAggregate;
  readonly eventId: string;
  readonly eventType: string;
  readonly context: AdministrationContext;
  readonly payload?: Readonly<Record<string, unknown>>;
}): IdentityAccessEvent {
  const workspaceId = workspaceOf(input.aggregate);
  return Object.freeze({
    eventId: input.eventId,
    tenantId: input.aggregate.tenantId,
    ...(workspaceId === undefined ? {} : { workspaceId }),
    aggregateType: input.aggregate.aggregateType,
    aggregateId: input.aggregate.id,
    aggregateVersion: input.aggregate.version,
    eventType: input.eventType,
    schemaVersion: 1,
    payload: Object.freeze({
      aggregateType: input.aggregate.aggregateType,
      aggregateId: input.aggregate.id,
      aggregateVersion: input.aggregate.version,
      ...(input.payload ?? {}),
    }),
    correlationId: input.context.correlationId,
    occurredAt: new Date(input.context.now),
    availableAt: new Date(input.context.now),
  });
}

function workspaceOf(
  aggregate: IdentityAccessAggregate,
): WorkspaceId | undefined {
  if (aggregate.aggregateType === "workspace") return aggregate.id;
  return "workspaceId" in aggregate ? aggregate.workspaceId : undefined;
}

export function aggregateVersionNumber(version: AggregateVersion): number {
  return version;
}
