import type { ActorReference } from "../platform/authz/v1.ts";
import type { RequestContext } from "../platform/api/v1.ts";
import {
  type IdempotencyClaim,
  IdempotencyRepository,
  payloadDigest,
} from "../platform/persistence/v1.ts";
import type { TransactionHandle } from "../platform/persistence/v1.ts";
import { ValuationError } from "./errors.ts";
import type { ValuationScope } from "./basis.ts";

export type CommandClaim =
  | { readonly status: "claimed"; readonly claim: IdempotencyClaim }
  | { readonly status: "replay"; readonly reference: string };

export async function claimValuationCommand(input: {
  readonly transaction: TransactionHandle;
  readonly idempotency: IdempotencyRepository;
  readonly context: RequestContext;
  readonly idempotencyKey: import("../platform/api/v1.ts").IdempotencyKey;
  readonly commandType: string;
  readonly targetType: string;
  readonly targetId: string;
  readonly payload: unknown;
  readonly now: Date;
}): Promise<CommandClaim> {
  const claim = await createClaim(input);
  const result = await input.idempotency.claim(input.transaction, claim);
  if (result.status === "claimed") return { status: "claimed", claim };
  if (result.status === "replay" && result.resultReference !== undefined) {
    return { status: "replay", reference: result.resultReference };
  }
  throw new ValuationError(
    "IDEMPOTENCY_IN_PROGRESS",
    `Valuation command "${input.commandType}" for target "${input.targetId}" has no replayable terminal result; expected the original request to finish first.`,
  );
}

async function createClaim(input: {
  readonly context: RequestContext;
  readonly idempotencyKey: import("../platform/api/v1.ts").IdempotencyKey;
  readonly commandType: string;
  readonly targetType: string;
  readonly targetId: string;
  readonly payload: unknown;
  readonly now: Date;
}): Promise<IdempotencyClaim> {
  return {
    tenantId: input.context.tenantId,
    actorId: input.context.actorId,
    commandType: input.commandType,
    targetType: input.targetType,
    targetId: input.targetId,
    idempotencyKey: input.idempotencyKey,
    payloadDigest: await payloadDigest(input.payload),
    expiresAt: new Date(input.now.getTime() + 86_400_000),
  };
}

export function assertActorContext(
  actor: ActorReference,
  context: RequestContext,
): void {
  if (actor.id === context.actorId && actor.state === "active") return;
  throw new ValuationError(
    "ACTOR_DENIED",
    `Valuation actor "${actor.id}" does not match active request actor "${context.actorId}"; expected the command actor to be bound to the request context.`,
  );
}

export function requiredScope(context: RequestContext): ValuationScope {
  if (context.workspaceId !== undefined && context.dealId !== undefined) {
    return {
      tenantId: context.tenantId,
      workspaceId: context.workspaceId,
      dealId: context.dealId,
    };
  }
  throw new ValuationError(
    "INVALID_INPUT",
    `Valuation request context for tenant "${context.tenantId}" has no workspace/deal scope; expected both identifiers for a protected valuation aggregate.`,
  );
}

export function commandPayload(
  command: Readonly<Record<string, unknown>>,
): Readonly<Record<string, unknown>> {
  const payload = { ...command };
  delete payload.context;
  delete payload.idempotencyKey;
  delete payload.actor;
  return normalizeCommandPayload(payload) as Readonly<Record<string, unknown>>;
}

function normalizeCommandPayload(value: unknown): unknown {
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(normalizeCommandPayload);
  if (!isRecord(value)) return value;
  return Object.fromEntries(
    Object.entries(value)
      .filter(([, child]) => child !== undefined)
      .map(([key, child]) => [key, normalizeCommandPayload(child)]),
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
