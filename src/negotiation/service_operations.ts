import type { IdempotencyKey } from "../platform/api/v1.ts";
import {
  NEGOTIATION_ACTION,
  NEGOTIATION_RESOURCE,
  negotiationResource,
} from "./authorization.ts";
import { createMandate } from "./mandate.ts";
import {
  createBatna,
  createInternalPosition,
  createNegotiationRound,
  type NegotiationRound,
} from "./model.ts";
import type {
  NegotiationAuthorityCommandInput,
  NegotiationCommandInput,
  NegotiationCommandResult,
  NegotiationReadInput,
  NegotiationServiceDependencies,
} from "./service.ts";
import { NegotiationServiceProposalOperations } from "./service_proposal_operations.ts";
import {
  appendEffects,
  assertActiveActor,
  assertHumanActor,
  commandIdentity,
  invalidateApprovals,
  nextVersion,
  recordCreation,
  withInternal,
} from "./service_support.ts";
import { assertRoundTransition } from "./transitions.ts";
import { assertScopeMatches } from "./service_runtime.ts";
import { protectedRoundNotFound } from "./repository.ts";
import type { ActorReference } from "../platform/authz/v1.ts";

export class NegotiationServiceOperations
  extends NegotiationServiceProposalOperations {
  constructor(dependencies: NegotiationServiceDependencies) {
    super(dependencies);
  }

  async createRound(input: {
    readonly context: NegotiationCommandInput["context"];
    readonly scope: NegotiationCommandInput["scope"];
    readonly roundId: string;
    readonly negotiationId: string;
    readonly number: number;
    readonly actor: ActorReference;
    readonly idempotencyKey: IdempotencyKey;
  }): Promise<NegotiationCommandResult> {
    assertActiveActor(input.actor, "create a negotiation round");
    const now = this.dependencies.clock.now();
    await this.authorize({
      context: input.context,
      actor: input.actor,
      scope: input.scope,
      resource: negotiationResource(NEGOTIATION_RESOURCE.round, input.roundId),
      action: NEGOTIATION_ACTION.createRound,
      now,
    });
    const round = recordCreation(
      createNegotiationRound({
        roundId: input.roundId,
        negotiationId: input.negotiationId,
        scope: input.scope,
        number: input.number,
        openedBy: input.actor.id,
        now,
      }),
      input.actor,
      now,
    );
    const identity = await commandIdentity(
      input.scope,
      input.actor,
      "negotiation_create_round",
      input.roundId,
      input.idempotencyKey,
      { round },
      now,
    );
    return this.dependencies.unitOfWork.run(identity, async (transaction) => {
      await transaction.insertRound(round);
      await appendEffects(this.effects, transaction, round, input.actor);
      return round;
    });
  }

  async getRound(input: NegotiationReadInput): Promise<NegotiationRound> {
    const now = this.dependencies.clock.now();
    await this.authorize({
      context: input.context,
      actor: input.actor,
      scope: input.scope,
      resource: negotiationResource(NEGOTIATION_RESOURCE.round, input.roundId),
      action: NEGOTIATION_ACTION.readRound,
      now,
    });
    const round = await this.dependencies.unitOfWork.read((transaction) =>
      transaction.findRound(input.scope, input.roundId)
    );
    if (round === undefined) throw protectedRoundNotFound(input.roundId);
    return round;
  }

  openRound(input: NegotiationCommandInput): Promise<NegotiationCommandResult> {
    return this.mutate(
      input,
      "negotiation_open_round",
      { to: "open" },
      NEGOTIATION_ACTION.mutateRound,
      negotiationResource(NEGOTIATION_RESOURCE.round, input.roundId),
      (round) => {
        assertRoundTransition(round.status, "open");
        return { status: "open" };
      },
    );
  }

  closeRound(
    input: NegotiationCommandInput,
  ): Promise<NegotiationCommandResult> {
    assertHumanActor(input.actor, "close a negotiation round");
    return this.mutate(
      input,
      "negotiation_close_round",
      { to: "closed" },
      NEGOTIATION_ACTION.mutateRound,
      negotiationResource(NEGOTIATION_RESOURCE.round, input.roundId),
      (round) => {
        assertRoundTransition(round.status, "closed");
        return { status: "closed" };
      },
    );
  }

  cancelRound(
    input: NegotiationCommandInput,
  ): Promise<NegotiationCommandResult> {
    assertHumanActor(input.actor, "cancel a negotiation round");
    return this.mutate(
      input,
      "negotiation_cancel_round",
      { to: "cancelled" },
      NEGOTIATION_ACTION.mutateRound,
      negotiationResource(NEGOTIATION_RESOURCE.round, input.roundId),
      (round) => {
        assertRoundTransition(round.status, "cancelled");
        return { status: "cancelled" };
      },
    );
  }

  addInternalPosition(
    input: NegotiationCommandInput,
    positionInput: Omit<
      Parameters<typeof createInternalPosition>[0],
      "scope" | "createdBy" | "now"
    >,
  ): Promise<NegotiationCommandResult> {
    const position = createInternalPosition({
      ...positionInput,
      scope: input.scope,
      createdBy: input.actor.id,
      now: this.dependencies.clock.now(),
    });
    return this.mutate(
      input,
      "negotiation_record_internal_position",
      { positionId: position.positionId, side: position.side },
      NEGOTIATION_ACTION.mutateRound,
      negotiationResource(NEGOTIATION_RESOURCE.round, input.roundId),
      (round) => ({
        internal: withInternal(round.internal, {
          positions: [...(round.internal?.positions ?? []), position],
          positionVersion: nextInternalVersion(round.internal?.positionVersion),
        }),
        approvals: invalidateApprovals(round.approvals),
      }),
      undefined,
      false,
      false,
      positionInput,
    );
  }

  recordBatna(
    input: NegotiationCommandInput,
    batnaInput: Omit<Parameters<typeof createBatna>[0], "recordedBy" | "now">,
  ): Promise<NegotiationCommandResult> {
    const batna = createBatna({
      ...batnaInput,
      recordedBy: input.actor.id,
      now: this.dependencies.clock.now(),
    });
    return this.mutate(
      input,
      "negotiation_record_batna",
      { side: batna.side, alternativeCount: batna.alternatives.length },
      NEGOTIATION_ACTION.mutateRound,
      negotiationResource(NEGOTIATION_RESOURCE.round, input.roundId),
      (round) => ({
        internal: withInternal(round.internal, {
          batna,
          batnaVersion: nextInternalVersion(round.internal?.batnaVersion),
        }),
        approvals: invalidateApprovals(round.approvals),
      }),
      undefined,
      false,
      false,
      batnaInput,
    );
  }

  setMandate(
    input: NegotiationAuthorityCommandInput,
    mandateInput: Parameters<typeof createMandate>[0],
  ): Promise<NegotiationCommandResult> {
    assertHumanActor(input.actor, "set a negotiation mandate");
    assertScopeMatches(input.scope, mandateInput.scope);
    const mandate = createMandate(mandateInput);
    return this.mutate(
      input,
      "negotiation_set_mandate",
      {
        mandateId: mandate.mandateId,
        mandateVersion: mandate.version,
        status: mandate.status,
      },
      NEGOTIATION_ACTION.mutateRound,
      negotiationResource(NEGOTIATION_RESOURCE.round, input.roundId),
      async (round) => {
        const authority = await this.consumeAuthority(
          input,
          "negotiation_set_mandate",
          "negotiation_round",
          round.roundId,
          round.version,
        );
        const version = round.internal?.mandate === undefined
          ? mandate.version
          : nextVersion(round.internal.mandate.version);
        const authoritativeMandate = Object.freeze({ ...mandate, version });
        return {
          internal: withInternal(round.internal, {
            mandate: authoritativeMandate,
            mandateComparison: undefined,
            mandateAuthorityProofId: authority.proof.proofId,
          }),
          approvals: invalidateApprovals(round.approvals),
        };
      },
      input.authority.protectedCommand,
      false,
      true,
      mandateInput,
    );
  }
}

function nextInternalVersion(
  current: import("../platform/api/v1.ts").AggregateVersion | undefined,
): import("../platform/api/v1.ts").AggregateVersion {
  return ((current === undefined ? 0 : Number(current)) +
    1) as import("../platform/api/v1.ts").AggregateVersion;
}
