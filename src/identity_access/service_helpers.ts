import type { AggregateVersion } from "../shared/contracts/aggregate_version.ts";
import type { AdministrationContext, TenantScope } from "./contracts.ts";
import { idempotencyKey } from "./ids.ts";
import type { CommandIdempotencyClaim } from "./idempotency.ts";

export function scopeFromContext(context: AdministrationContext): TenantScope {
  return {
    tenantId: context.tenantId,
    ...(context.workspaceId === undefined
      ? {}
      : { workspaceId: context.workspaceId }),
  };
}

export function payloadVersion(payload: unknown): AggregateVersion | undefined {
  if (!isRecord(payload) || typeof payload.expectedVersion !== "number") {
    return undefined;
  }
  return payload.expectedVersion as AggregateVersion;
}

export function commandEventType(commandType: string): string {
  if (commandType.endsWith(".suspend")) return `${commandType}ed`;
  if (commandType.endsWith(".revoke")) return `${commandType}d`;
  return commandType;
}

export function notFound(type: string, id: string): Error {
  return new Error(
    `${type} "${id}" was not found in tenant/workspace scope.`,
  );
}

export function createCommandClaim(
  commandType: string,
  targetType: string,
  targetId: string,
  payload: unknown,
  context: AdministrationContext,
  commandKey?: string,
): CommandIdempotencyClaim {
  return {
    tenantId: context.tenantId,
    actorId: context.actorId,
    commandType,
    targetType,
    targetId,
    idempotencyKey: idempotencyKey(commandKey ?? targetId),
    payload,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
