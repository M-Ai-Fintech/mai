import type { AggregateVersion, RequestContext } from "../platform/api/v1.ts";
import type { FactId, FactVersionId, InvalidationId } from "./ids.ts";
import type { EvidenceScope, Fact, FactStatus } from "./model.ts";
import { assertFactStatusTransition } from "./fact.ts";
import type { AuthoritySnapshot } from "../audit_activity/v1.ts";

export interface TransitionFactStatusCommand {
  readonly context: RequestContext;
  readonly scope: EvidenceScope;
  readonly factId: FactId;
  readonly factVersionId: FactVersionId;
  readonly expectedAggregateVersion: AggregateVersion;
  readonly targetStatus: "approved" | "superseded";
  readonly idempotencyKey: string;
  readonly payloadDigest: string;
  readonly replacementFactVersionId?: FactVersionId;
  readonly rationale?: string;
}

export type FactCommandAuthorizationResult =
  | {
    readonly allowed: true;
    readonly authoritySnapshot: AuthoritySnapshot;
    readonly policyDecisionId?: string;
  }
  | {
    readonly allowed: false;
  };

export type AllowedFactCommandAuthorization = Extract<
  FactCommandAuthorizationResult,
  { allowed: true }
>;

export interface FactCommandAuthorizationPort {
  authorize(
    context: RequestContext,
    scope: EvidenceScope,
    factId: FactId,
  ): Promise<FactCommandAuthorizationResult>;
}

export interface FactTransitionStore {
  transition(
    command: TransitionFactStatusCommand,
    auth: AllowedFactCommandAuthorization,
  ): Promise<FactTransitionResult>;
}

export interface FactTransitionResult {
  readonly fact: Fact;
  readonly factVersionId: FactVersionId;
  readonly invalidationId: InvalidationId;
  readonly replayed: boolean;
}

export class FactCommandConflict extends Error {
  constructor(code: string, target: string) {
    super(`Fact command target "${target}" failed with "${code}".`);
    this.name = "FactCommandConflict";
  }
}

export class AtomicFactCommandService {
  constructor(
    private readonly authorization: FactCommandAuthorizationPort,
    private readonly store: FactTransitionStore,
  ) {}

  async transition(
    command: TransitionFactStatusCommand,
  ): Promise<FactTransitionResult> {
    const authResult = await this.authorization.authorize(
      command.context,
      command.scope,
      command.factId,
    );
    if (!authResult.allowed) {
      throw new FactCommandConflict("FORBIDDEN", command.factId);
    }
    const normalizedRationale = command.rationale?.trim();
    if (command.targetStatus === "superseded") {
      if (
        normalizedRationale === undefined || normalizedRationale.length === 0
      ) {
        throw new FactCommandConflict("MISSING_RATIONALE", command.factId);
      }
      if (normalizedRationale.length > 1024) {
        throw new FactCommandConflict("INVALID_RATIONALE", command.factId);
      }
    }
    assertDigest(command.payloadDigest);
    assertKey(command.idempotencyKey);
    const normalizedCommand: TransitionFactStatusCommand =
      normalizedRationale !== command.rationale
        ? { ...command, rationale: normalizedRationale }
        : command;
    return await this.store.transition(normalizedCommand, authResult);
  }
}

export function assertFactTransition(
  from: FactStatus,
  to: "approved" | "superseded",
): void {
  assertFactStatusTransition(from, to);
}

function assertDigest(digest: string): void {
  if (/^[0-9a-f]{64}$/.test(digest)) return;
  throw new FactCommandConflict("INVALID_PAYLOAD_DIGEST", digest);
}

function assertKey(key: string): void {
  if (key.trim() && key.length <= 256) return;
  throw new FactCommandConflict("INVALID_IDEMPOTENCY_KEY", key);
}
