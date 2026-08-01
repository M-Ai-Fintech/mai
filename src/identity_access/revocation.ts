import {
  assertHumanAdministrator,
  assertReason,
  assertTenantScope,
} from "./errors.ts";
import { aggregateBase, nextAggregateVersion } from "./aggregate.ts";
import type {
  AdministrationContext,
  RevocableAggregate,
  Revocation,
} from "./contracts.ts";
import type { RevocationId } from "./ids.ts";

export function revokeAggregate<TAggregate extends RevocableAggregate>(
  aggregate: TAggregate,
  input: {
    readonly revocationId: RevocationId;
    readonly reason: string;
    readonly context: AdministrationContext;
    readonly expectedVersion: number;
  },
): { readonly aggregate: TAggregate; readonly revocation: Revocation } {
  assertHumanAdministrator(input.context);
  assertTenantScope(input.context, aggregate.tenantId);
  assertReason(input.reason);
  const updated = nextAggregateVersion(
    aggregate,
    input.expectedVersion,
    input.context,
  );
  const revoked = Object.freeze({
    ...aggregate,
    ...updated,
    state: "revoked" as const,
  }) as unknown as TAggregate;
  const revocation = Object.freeze({
    aggregateType: "revocation" as const,
    id: input.revocationId,
    targetType: aggregate.aggregateType,
    targetId: aggregate.id,
    targetVersion: revoked.version,
    sponsorActorId: input.context.actorId,
    reason: input.reason,
    state: "terminal" as const,
    ...aggregateBase(input.context),
  });
  return { aggregate: revoked, revocation };
}
