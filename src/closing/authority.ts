import type { ActorReference } from "../platform/authz/v1.ts";
import type { IdempotencyKey } from "../platform/api/v1.ts";
import {
  type AuthorityProofReference,
  type AuthorityProofResolver,
  validateAuthorityProtectedTargetCommand,
} from "../work_management/v1.ts";
import { ClosingError, type ClosingScope } from "./model.ts";

export interface ClosingAuthorityInput {
  readonly protectedCommand: unknown;
  readonly resolver: AuthorityProofResolver;
  readonly scope: ClosingScope;
  readonly targetId: string;
  readonly expectedVersion: number;
  readonly commandType: string;
  readonly actorId: string;
  readonly idempotencyKey: IdempotencyKey;
  readonly consumedAt: string;
}

export interface ConsumedClosingAuthority {
  readonly actor: ActorReference;
  readonly proof: AuthorityProofReference;
  readonly dispatchId: string;
  readonly idempotencyIdentity: string;
}

export async function consumeClosingAuthority(
  input: ClosingAuthorityInput,
): Promise<ConsumedClosingAuthority> {
  const command = await validateAuthorityProtectedTargetCommand(
    input.protectedCommand,
    input.resolver,
    input.consumedAt,
  );
  const dispatch = command.dispatch;
  assertAuthorityBinding(input, dispatch);
  return Object.freeze({
    actor: Object.freeze({ ...dispatch.actor }),
    proof: command.authorityProof,
    dispatchId: dispatch.dispatchId,
    idempotencyIdentity: dispatch.idempotencyIdentity,
  });
}

function assertAuthorityBinding(
  input: ClosingAuthorityInput,
  dispatch: {
    readonly dispatchId: string;
    readonly tenantId: string;
    readonly workspaceId: string;
    readonly dealId: string;
    readonly targetAggregateType: string;
    readonly targetAggregateId: string;
    readonly expectedTargetVersion: number;
    readonly commandType: string;
    readonly actor: ActorReference;
    readonly idempotencyIdentity: string;
  },
): void {
  const scopeMatches = dispatch.tenantId === input.scope.tenantId &&
    dispatch.workspaceId === input.scope.workspaceId &&
    dispatch.dealId === input.scope.dealId;
  const identityParts = dispatch.idempotencyIdentity.split("|");
  const identityMatches = identityParts.at(-1) === input.idempotencyKey;
  if (
    scopeMatches && dispatch.targetAggregateType === "closing_workspace" &&
    dispatch.targetAggregateId === input.targetId &&
    dispatch.expectedTargetVersion === input.expectedVersion &&
    dispatch.commandType === input.commandType &&
    dispatch.actor.id === input.actorId && identityMatches
  ) return;
  throw new ClosingError(
    "SCOPE_MISMATCH",
    `Closing authority dispatch "${dispatch.dispatchId}" does not match the exact scope, actor, command, target version, or idempotency key; expected a closing workspace proof.`,
  );
}
