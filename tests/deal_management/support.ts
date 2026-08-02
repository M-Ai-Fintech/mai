import {
  type ActorId,
  type CorrelationId,
  type IdempotencyKey,
  parseActorId,
  parseCorrelationId,
  parseIdempotencyKey,
  parseRequestContext,
  parseTenantId,
  parseWorkspaceId,
  type TenantId,
  type WorkspaceId,
} from "../../src/platform/api/v1.ts";
import type { DealCommandContext } from "../../src/deal_management/v1.ts";
import {
  type AuthorityConstraintId,
  authorityConstraintId,
  dealEventId,
  type DealId,
  dealId,
  type DealIdFactory,
  type DealPartyId,
  dealPartyId,
  type DealRoleId,
  dealRoleId,
  type MandateId,
  mandateId,
} from "../../src/deal_management/v1.ts";
import {
  type AuthorizationDecision,
  field,
} from "../../src/platform/authz/v1.ts";
import type {
  DealAuthorizationInput,
  DealAuthorizationPort,
} from "../../src/deal_management/v1.ts";
import type { Deal, DealEvent } from "../../src/deal_management/v1.ts";

export class FixedDealClock {
  constructor(private current = "2026-08-02T12:00:00.000Z") {}

  now(): string {
    return this.current;
  }

  set(value: string): void {
    this.current = value;
  }
}

export class SequentialDealIdFactory implements DealIdFactory {
  private dealSequence = 0;
  private partySequence = 0;
  private roleSequence = 0;
  private mandateSequence = 0;
  private constraintSequence = 0;
  private eventSequence = 0;

  nextDealId(): DealId {
    this.dealSequence += 1;
    return dealId(`deal_fixture-${this.dealSequence}`);
  }

  nextDealPartyId(): DealPartyId {
    this.partySequence += 1;
    return dealPartyId(`party_fixture-${this.partySequence}`);
  }

  nextDealRoleId(): DealRoleId {
    this.roleSequence += 1;
    return dealRoleId(`dealrole_fixture-${this.roleSequence}`);
  }

  nextMandateId(): MandateId {
    this.mandateSequence += 1;
    return mandateId(`mandate_fixture-${this.mandateSequence}`);
  }

  nextAuthorityConstraintId(): AuthorityConstraintId {
    this.constraintSequence += 1;
    return authorityConstraintId(
      `constraint_fixture-${this.constraintSequence}`,
    );
  }

  nextEventId() {
    this.eventSequence += 1;
    return dealEventId(`event_fixture-${this.eventSequence}`);
  }
}

export function contextFor(
  tenant = "tenant_northstar",
  workspace = "workspace_alpha",
): DealCommandContext {
  return {
    actor: {
      id: requiredActorId("actor_banker"),
      kind: "human",
      state: "active",
    },
    request: requiredContext({
      actorId: "actor_banker",
      tenantId: tenant,
      workspaceId: workspace,
      correlationId: "cor_deal",
      origin: "http",
    }),
    now: "2026-08-02T12:00:00.000Z",
  };
}

export function aiContextFor(): DealCommandContext {
  const context = contextFor();
  return {
    ...context,
    actor: { ...context.actor, kind: "ai" },
  };
}

export class RecordingDealAuthorization implements DealAuthorizationPort {
  readonly calls: DealAuthorizationInput[] = [];

  constructor(private readonly permitted = true) {}

  authorize(input: DealAuthorizationInput): AuthorizationDecision {
    this.calls.push(input);
    const requested = input.requestedFields.map((item) => ({
      name: field(item.name),
      classification: item.classification,
    }));
    const allowed = input.humanOnly
      ? input.context.actor.kind === "human"
      : this.permitted;
    if (!allowed) {
      return {
        outcome: "deny",
        reasonCode: input.humanOnly
          ? "HUMAN_AUTHORITY_REQUIRED"
          : "NO_MATCHING_GRANT",
        allowedActions: [],
        approvedScope: undefined,
        fieldMask: {
          include: [],
          omit: requested.map((item) => item.name),
          redact: [],
          approvedClassifications: [],
        },
      };
    }
    return {
      outcome: "allow",
      reasonCode: "ALLOWED",
      allowedActions: [input.action],
      approvedScope: undefined as never,
      fieldMask: {
        include: requested.map((item) => item.name),
        omit: [],
        redact: [],
        approvedClassifications: requested,
      },
    };
  }
}

export class DenyingDealAuthorization implements DealAuthorizationPort {
  readonly calls: DealAuthorizationInput[] = [];

  authorize(input: DealAuthorizationInput): AuthorizationDecision {
    this.calls.push(input);
    return {
      outcome: "deny",
      reasonCode: "NO_MATCHING_GRANT",
      allowedActions: [],
      approvedScope: undefined,
      fieldMask: {
        include: [],
        omit: [field("deal")],
        redact: [],
        approvedClassifications: [],
      },
    };
  }
}

export function keyFor(value: string): IdempotencyKey {
  return requiredValue(parseIdempotencyKey(`idem_${value}`), "idempotency key");
}

export function eventFor(
  deal: Deal,
  context = contextFor(),
  eventSuffix = "commit",
): DealEvent {
  const occurredAt = new Date(context.now);
  return {
    eventId: dealEventId(`event_fixture-${eventSuffix}`),
    tenantId: deal.tenantId,
    workspaceId: deal.workspaceId,
    dealId: deal.id,
    actorId: context.actor.id,
    actorKind: context.actor.kind,
    correlationId: requiredCorrelationId(context.request.correlationId),
    aggregateVersion: deal.version,
    eventType: "DealCreated",
    schemaVersion: 1,
    payload: { dealId: deal.id },
    occurredAt,
    availableAt: occurredAt,
  };
}

export function requiredActorId(value: string): ActorId {
  return requiredValue(parseActorId(value), "actor id");
}

export function requiredTenantId(value: string): TenantId {
  return requiredValue(parseTenantId(value), "tenant id");
}

export function requiredWorkspaceId(value: string): WorkspaceId {
  return requiredValue(parseWorkspaceId(value), "workspace id");
}

export function requiredCorrelationId(value: string): CorrelationId {
  return requiredValue(parseCorrelationId(value), "correlation id");
}

function requiredContext(value: unknown) {
  return requiredValue(parseRequestContext(value), "request context");
}

function requiredValue<T>(
  result: { readonly ok: true; readonly value: T } | { readonly ok: false },
  label: string,
): T {
  if (result.ok) return result.value;
  throw new Error(`Fixture ${label} is invalid; expected a canonical value.`);
}
