import {
  assertPreparedPayloadIdentity,
  discloseStoredReplay,
  type PreparedCommandFacts,
  type StoredCommandEnvelope,
} from "./transaction_replay_policy.ts";
import { assertWorkManagementPortPhase } from "./transaction_port_policy.ts";

export interface PreparedCommandIdentity {
  readonly commandId: string;
  readonly idempotencyKey: string;
  readonly payloadDigest: string;
}

export interface PreparedCommandRequest<Input> {
  readonly identity: PreparedCommandIdentity;
  readonly input: Input;
  readonly now: string;
}

export interface PreparedFinalization<Plan> {
  readonly facts: PreparedCommandFacts;
  readonly plan: Plan;
}

export type PreparationClaim<Body> =
  | {
    readonly status: "claimed";
    readonly ownerToken: string;
    readonly recovered?: boolean;
  }
  | { readonly status: "in_progress" }
  | {
    readonly status: "replay";
    readonly envelope: StoredCommandEnvelope<Body>;
  };

export interface DurablePreparedCommandStore<Plan, Body> {
  /** Short committed transaction; it must not retain a row lock on return. */
  claim(
    identity: PreparedCommandIdentity,
    now: string,
  ): Promise<PreparationClaim<Body>>;
  /** Short committed transaction storing immutable prepared facts and plan. */
  savePrepared(
    identity: PreparedCommandIdentity,
    ownerToken: string,
    prepared: PreparedFinalization<Plan>,
  ): Promise<void>;
  /** One atomic local-only transaction for aggregate/effects/result/completion. */
  finalize(
    identity: PreparedCommandIdentity,
    ownerToken: string,
    prepared: PreparedFinalization<Plan>,
  ): Promise<StoredCommandEnvelope<Body>>;
  /** Short transaction retaining recoverable failure evidence without effects. */
  failPreparation(
    identity: PreparedCommandIdentity,
    ownerToken: string,
    safeFailureCode: string,
  ): Promise<void>;
}

export interface CurrentReplayAuthorizer<Input> {
  authorize(input: Input): Promise<"allow" | "deny">;
}

export interface ExternalCommandPreparer<Input, Plan> {
  prepare(input: Input): Promise<PreparedFinalization<Plan>>;
}

export class PreparedCommandInProgressError extends Error {
  readonly code = "IDEMPOTENCY_IN_PROGRESS" as const;

  constructor(readonly idempotencyKey: string) {
    super(
      `Command idempotency key "${idempotencyKey}" is in progress; expected the durable preparation owner to finish or its lease to become recoverable.`,
    );
    this.name = "PreparedCommandInProgressError";
  }
}

/**
 * Runs external adapters only after a durable claim and before atomic finalize.
 *
 * @example await executePreparedCommand(request, dependencies)
 */
export async function executePreparedCommand<Input, Plan, Body>(
  request: PreparedCommandRequest<Input>,
  dependencies: {
    readonly store: DurablePreparedCommandStore<Plan, Body>;
    readonly replayAuthorization: CurrentReplayAuthorizer<Input>;
    readonly preparer: ExternalCommandPreparer<Input, Plan>;
  },
): Promise<StoredCommandEnvelope<Body>> {
  assertWorkManagementPortPhase("authorization", "replay_authorization");
  const disclosure = await dependencies.replayAuthorization.authorize(
    request.input,
  );
  if (disclosure === "deny") {
    return discloseStoredReplay(disclosure, deniedEnvelope());
  }
  const claim = await dependencies.store.claim(request.identity, request.now);
  if (claim.status === "replay") {
    return discloseStoredReplay(disclosure, claim.envelope);
  }
  if (claim.status === "in_progress") {
    throw new PreparedCommandInProgressError(request.identity.idempotencyKey);
  }
  try {
    assertWorkManagementPortPhase("authorization", "external_prepare");
    assertWorkManagementPortPhase("target", "external_prepare");
    assertWorkManagementPortPhase("evidence", "external_prepare");
    assertWorkManagementPortPhase("authority", "external_prepare");
    const prepared = await dependencies.preparer.prepare(request.input);
    assertPreparedPayloadIdentity(
      request.identity.payloadDigest,
      prepared.facts.payloadDigest,
    );
    await dependencies.store.savePrepared(
      request.identity,
      claim.ownerToken,
      prepared,
    );
    return await dependencies.store.finalize(
      request.identity,
      claim.ownerToken,
      prepared,
    );
  } catch (error) {
    await dependencies.store.failPreparation(
      request.identity,
      claim.ownerToken,
      safeFailureCode(error),
    );
    throw error;
  }
}

function deniedEnvelope(): StoredCommandEnvelope<never> {
  return { status: 404, headers: {}, body: undefined as never };
}

function safeFailureCode(error: unknown): string {
  if (
    typeof error === "object" && error !== null && "code" in error &&
    typeof error.code === "string" && /^[A-Z][A-Z0-9_]{0,63}$/.test(error.code)
  ) return error.code;
  return "PREPARATION_FAILED";
}
