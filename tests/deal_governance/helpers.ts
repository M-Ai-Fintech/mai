import type { ActorReference } from "../../src/platform/authz/v1.ts";
import type { RequestContext } from "../../src/platform/api/v1.ts";
import { parseIdempotencyKey } from "../../src/shared/contracts/identifiers.ts";
import {
  actor,
  deal,
  tenant,
  workspace,
} from "../../src/work_management/ids.ts";
import {
  createInMemoryDealGovernanceTestComposition,
  type DealGovernanceTestComposition,
} from "../../src/deal_governance/composition.ts";
import type { GovernanceCommandContext } from "../../src/deal_governance/service_contracts.ts";

export const TEST_TENANT = tenant("tenant_governance-test");
export const TEST_WORKSPACE = workspace("workspace_governance-test");
export const TEST_DEAL = deal("deal_governance-test");

export interface MutableTestClock {
  readonly now: () => string;
  set(value: string): void;
}

export function testClock(
  initial = "2026-08-07T12:00:00.000Z",
): MutableTestClock {
  let current = initial;
  return {
    now: () => current,
    set: (value: string) => current = value,
  };
}

export function testComposition(
  clock: MutableTestClock,
  erasureExecutor?: Parameters<
    typeof createInMemoryDealGovernanceTestComposition
  >[0]["erasureExecutor"],
): DealGovernanceTestComposition {
  return createInMemoryDealGovernanceTestComposition({
    authorization: { authorize: () => true },
    clock,
    ...(erasureExecutor === undefined ? {} : { erasureExecutor }),
  });
}

export function humanContext(
  actorName = "actor_requester",
  clock: MutableTestClock = testClock(),
): GovernanceCommandContext {
  const actorId = actor(actorName);
  const request: RequestContext = {
    actorId,
    tenantId: TEST_TENANT,
    workspaceId: TEST_WORKSPACE,
    dealId: TEST_DEAL,
    correlationId: `cor_${
      actorName.replace("actor_", "")
    }` as RequestContext["correlationId"],
    origin: "internal",
  };
  const reference: ActorReference = {
    id: actorId,
    kind: "human",
    state: "active",
  };
  return { actor: reference, request, now: clock.now() };
}

export function idempotency(value: string) {
  const result = parseIdempotencyKey(
    value.startsWith("idem_") ? value : `idem_${value}`,
  );
  if (result.ok) return result.value;
  throw new Error(
    `Test idempotency key "${value}" was invalid; expected an idem_ identifier.`,
  );
}

export function commandContext(
  clock: MutableTestClock,
  actorName = "actor_requester",
): GovernanceCommandContext {
  return humanContext(actorName, clock);
}
