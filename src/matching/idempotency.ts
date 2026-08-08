import type {
  ActorId,
  IdempotencyKey,
} from "../shared/contracts/identifiers.ts";
import {
  type IdempotencyClaim,
  IdempotencyConflictError,
  IdempotencyRepository,
  payloadDigest,
} from "../platform/persistence/v1.ts";
import type { TransactionHandle } from "../platform/persistence/v1.ts";
import { MatchingError } from "./errors.ts";
import type { MatchingScope } from "./model.ts";
import type { MatchingRuntime } from "./runtime.ts";

export interface MatchingIdempotencyInput {
  readonly scope: MatchingScope;
  readonly actorId: ActorId;
  readonly idempotencyKey: IdempotencyKey;
  readonly commandType: string;
  readonly targetType: string;
  readonly targetId: string;
  readonly payload: unknown;
  readonly now: Date;
}

export type MatchingIdempotencyResult =
  | { readonly status: "claimed"; readonly claim: IdempotencyClaim }
  | { readonly status: "replay"; readonly resultReference: string };

export interface MatchingIdempotency {
  claim(
    transaction: TransactionHandle,
    input: MatchingIdempotencyInput,
  ): Promise<MatchingIdempotencyResult>;
  complete(
    transaction: TransactionHandle,
    claim: IdempotencyClaim,
    resultReference: string,
  ): Promise<void>;
}

export async function claimMatchingMutation(
  runtime: MatchingRuntime,
  transaction: TransactionHandle,
  input: MatchingIdempotencyInput,
): Promise<MatchingIdempotencyResult> {
  return await runtime.idempotency.claim(transaction, input);
}

export async function completeMatchingMutation(
  runtime: MatchingRuntime,
  transaction: TransactionHandle,
  result: MatchingIdempotencyResult,
  resultReference: string,
): Promise<void> {
  if (result.status === "replay") return;
  await runtime.idempotency.complete(
    transaction,
    result.claim,
    resultReference,
  );
}

export function replayReference(
  result: MatchingIdempotencyResult,
  targetId: string,
): string | undefined {
  if (result.status === "claimed") return undefined;
  if (result.resultReference === targetId) return result.resultReference;
  throw new MatchingError(
    "IDEMPOTENCY_CONFLICT",
    `Matching idempotency replay referenced "${result.resultReference}"; expected target "${targetId}".`,
    targetId,
  );
}

export class RecordingMatchingIdempotency implements MatchingIdempotency {
  private readonly claims = new Map<string, RecordingClaim>();

  async claim(
    _transaction: TransactionHandle,
    input: MatchingIdempotencyInput,
  ): Promise<MatchingIdempotencyResult> {
    const claim = await createClaim(input);
    const key = claimKey(claim);
    const previous = this.claims.get(key);
    if (previous === undefined) {
      this.claims.set(key, { claim, state: "in_progress" });
      return { status: "claimed", claim };
    }
    assertSameDigest(previous.claim, claim);
    if (previous.state === "in_progress") {
      throw inProgressConflict(claim);
    }
    if (previous.resultReference === undefined) {
      throw matchingConflict(claim, "has no terminal result reference");
    }
    return { status: "replay", resultReference: previous.resultReference };
  }

  complete(
    _transaction: TransactionHandle,
    claim: IdempotencyClaim,
    resultReference: string,
  ): Promise<void> {
    const key = claimKey(claim);
    const current = this.claims.get(key);
    if (current === undefined || current.state !== "in_progress") {
      throw new MatchingError(
        "IDEMPOTENCY_CONFLICT",
        `Matching idempotency key "${claim.idempotencyKey}" could not complete; expected one in-progress claim.`,
        claim.targetId,
      );
    }
    this.claims.set(key, { ...current, state: "completed", resultReference });
    return Promise.resolve();
  }
}

export class PostgresMatchingIdempotency implements MatchingIdempotency {
  constructor(private readonly repository: IdempotencyRepository) {}

  async claim(
    transaction: TransactionHandle,
    input: MatchingIdempotencyInput,
  ): Promise<MatchingIdempotencyResult> {
    const claim = await createClaim(input);
    let result;
    try {
      result = await this.repository.claim(transaction, claim);
    } catch (error) {
      if (error instanceof IdempotencyConflictError) {
        throw matchingConflict(claim, "payload changed");
      }
      throw error;
    }
    if (result.status === "claimed") return { status: "claimed", claim };
    if (
      result.status === "replay" &&
      result.state === "completed" &&
      result.resultReference !== undefined
    ) {
      return { status: "replay", resultReference: result.resultReference };
    }
    throw inProgressConflict(claim);
  }

  async complete(
    transaction: TransactionHandle,
    claim: IdempotencyClaim,
    resultReference: string,
  ): Promise<void> {
    try {
      await this.repository.complete(transaction, claim, resultReference);
    } catch (error) {
      if (error instanceof IdempotencyConflictError) {
        throw matchingConflict(claim, "completion payload changed");
      }
      throw error;
    }
  }
}

async function createClaim(
  input: MatchingIdempotencyInput,
): Promise<IdempotencyClaim> {
  const digest = await payloadDigest({
    commandType: input.commandType,
    targetType: input.targetType,
    targetId: input.targetId,
    scope: input.scope,
    payload: input.payload,
  });
  return {
    tenantId: input.scope.tenantId,
    actorId: input.actorId,
    commandType: "matching.mutation",
    targetType: "matching_scope",
    targetId: `${input.scope.workspaceId}:${input.scope.dealId}`,
    idempotencyKey: input.idempotencyKey,
    payloadDigest: digest,
    expiresAt: new Date(input.now.getTime() + 86_400_000),
  };
}

interface RecordingClaim {
  readonly claim: IdempotencyClaim;
  readonly state: "in_progress" | "completed";
  readonly resultReference?: string;
}

function claimKey(claim: IdempotencyClaim): string {
  return [
    claim.tenantId,
    claim.actorId,
    claim.commandType,
    claim.targetType,
    claim.targetId,
    claim.idempotencyKey,
  ].join(":");
}

function assertSameDigest(
  previous: IdempotencyClaim,
  current: IdempotencyClaim,
): void {
  if (previous.payloadDigest === current.payloadDigest) return;
  throw matchingConflict(current, "payload changed");
}

function inProgressConflict(claim: IdempotencyClaim): MatchingError {
  return matchingConflict(claim, "another command is still in progress");
}

function matchingConflict(
  claim: IdempotencyClaim,
  reason: string,
): MatchingError {
  return new MatchingError(
    "IDEMPOTENCY_CONFLICT",
    `Matching idempotency key "${claim.idempotencyKey}" ${reason}; expected the original terminal command result.`,
    claim.targetId,
  );
}
