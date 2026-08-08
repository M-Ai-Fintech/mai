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
import type {
  GovernanceCommandContext,
} from "../../src/deal_governance/service_contracts.ts";
import type {
  ErasureGateEvidencePort,
  TrustedErasureGateEvidence,
} from "../../src/deal_governance/trusted_evidence.ts";

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
  erasureGateEvidence?: ErasureGateEvidencePort,
): DealGovernanceTestComposition {
  return createInMemoryDealGovernanceTestComposition({
    authorization: { authorize: () => true },
    clock,
    ...(erasureExecutor === undefined ? {} : { erasureExecutor }),
    ...(erasureGateEvidence === undefined ? {} : { erasureGateEvidence }),
  });
}

export function trustedErasureGateEvidence(
  clock: MutableTestClock,
  options: {
    readonly policyApproved?: boolean;
    readonly infrastructureApproved?: boolean;
    readonly featureEnabled?: boolean;
    readonly expiresAt?: string;
  } = {},
): ErasureGateEvidencePort {
  return {
    resolve: ({ context, scope, requestId, categories }) => {
      const expiresAt = options.expiresAt ?? new Date(
        Date.parse(clock.now()) + 60 * 60 * 1000,
      ).toISOString();
      const approval = (approved: boolean, reference: string) => ({
        approved,
        reference,
        version: "test-2026.1",
        issuedAt: clock.now(),
        expiresAt,
      });
      const feature = {
        enabled: options.featureEnabled ?? true,
        reference: "feature:physical-erasure",
        version: "test-2026.1",
        issuedAt: clock.now(),
        expiresAt,
      };
      return {
        evidenceId: "evidence_test-erasure-gates",
        scope,
        requestId,
        categories: [...categories],
        execution: {
          actorId: context.actor.id,
          correlationId: context.request.correlationId,
        },
        policy: approval(
          options.policyApproved ?? true,
          "policy:test-2026.1",
        ),
        infrastructure: approval(
          options.infrastructureApproved ?? true,
          "infrastructure:test-2026.1",
        ),
        feature,
      } satisfies TrustedErasureGateEvidence;
    },
  };
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
