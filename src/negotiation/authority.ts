import type { ActorReference } from "../platform/authz/v1.ts";
import type { IdempotencyKey } from "../platform/api/v1.ts";
import { validateAuthorityProtectedTargetCommand } from "../work_management/authority_consumer_contract.ts";
import type {
  AuthorityProofReference,
  AuthorityProofResolver,
} from "../work_management/authority_proof.ts";
import { NegotiationError } from "./model.ts";
import type { NegotiationScope } from "./ids.ts";

export interface NegotiationAuthorityInput {
  readonly protectedCommand: unknown;
  readonly resolver: AuthorityProofResolver;
  readonly scope: NegotiationScope;
  readonly targetAggregateType:
    | "negotiation_round"
    | "negotiation_proposal"
    | "negotiation_delivery";
  readonly targetId: string;
  readonly expectedVersion: number;
  readonly commandType: string;
  readonly actorId: string;
  readonly idempotencyKey: IdempotencyKey;
  readonly consumedAt: string;
}

export interface ConsumedNegotiationAuthority {
  readonly actor: ActorReference;
  readonly proof: AuthorityProofReference;
  readonly dispatchId: string;
  readonly idempotencyIdentity: string;
}

/**
 * Negotiation consumes an immutable Work Management proof. It never creates
 * or interprets approval authority locally, and it binds the proof to the
 * exact negotiation target, version, actor, command, and idempotency key.
 */
export async function consumeNegotiationAuthority(
  input: NegotiationAuthorityInput,
): Promise<ConsumedNegotiationAuthority> {
  let command: Awaited<
    ReturnType<typeof validateAuthorityProtectedTargetCommand>
  >;
  try {
    command = await validateAuthorityProtectedTargetCommand(
      input.protectedCommand,
      input.resolver,
      input.consumedAt,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new NegotiationError("HUMAN_AUTHORITY_REQUIRED", message);
  }
  const dispatch = command.dispatch;
  const identityParts = dispatch.idempotencyIdentity.split("|");
  const scopeMatches = dispatch.tenantId === input.scope.tenantId &&
    dispatch.workspaceId === input.scope.workspaceId &&
    dispatch.dealId === input.scope.dealId;
  const identityMatches = identityParts.at(-1) === input.idempotencyKey;
  const targetMatches =
    dispatch.targetAggregateType === input.targetAggregateType &&
    dispatch.targetAggregateId === input.targetId &&
    dispatch.expectedTargetVersion === input.expectedVersion;
  const commandMatches = dispatch.commandType === input.commandType;
  const actorMatches = dispatch.actor.id === input.actorId &&
    dispatch.actor.kind === "human" && dispatch.actor.state === "active";
  if (
    scopeMatches && targetMatches && commandMatches && actorMatches &&
    identityMatches
  ) {
    return Object.freeze({
      actor: Object.freeze({ ...dispatch.actor }),
      proof: command.authorityProof,
      dispatchId: dispatch.dispatchId,
      idempotencyIdentity: dispatch.idempotencyIdentity,
    });
  }
  throw new NegotiationError(
    "REFERENCE_MISMATCH",
    `Negotiation authority dispatch "${dispatch.dispatchId}" does not match the exact scope, actor, command, target version, or idempotency key; expected a bound human proof.`,
  );
}
