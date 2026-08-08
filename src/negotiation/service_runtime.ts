import type { Action, ActorReference } from "../platform/authz/v1.ts";
import type { AggregateVersion } from "../platform/api/v1.ts";
import {
  authorizeNegotiationAction,
  denyNegotiationAuthorization,
  type NegotiationAuthorizationInput,
  type NegotiationAuthorizationPort,
} from "./authorization.ts";
import {
  type ConsumedNegotiationAuthority,
  consumeNegotiationAuthority,
  type NegotiationAuthorityInput,
} from "./authority.ts";
import { type NegotiationEffects, NoopNegotiationEffects } from "./effects.ts";
import type { NegotiationDeliveryFeatureGate } from "./jobs.ts";
import { NegotiationError, type NegotiationRound } from "./model.ts";
import type {
  NegotiationAuthorityCommandInput,
  NegotiationCommandInput,
  NegotiationCommandResult,
  NegotiationServiceDependencies,
} from "./service.ts";
import {
  appendEffects,
  assertActiveActor,
  authorityProofFromChanges,
  commandIdentity,
  recordMutation,
} from "./service_support.ts";
import type { NegotiationScope } from "./ids.ts";
import type { NegotiationTransaction } from "./repository.ts";
import { protectedRoundNotFound } from "./repository.ts";

export class NegotiationServiceRuntime {
  protected readonly dependencies: NegotiationServiceDependencies;
  protected readonly effects: NegotiationEffects;
  protected readonly authority: {
    consume(
      input: NegotiationAuthorityInput,
    ): Promise<ConsumedNegotiationAuthority>;
  };
  protected readonly authorization: NegotiationAuthorizationPort;
  protected readonly featureGate: NegotiationDeliveryFeatureGate;

  constructor(dependencies: NegotiationServiceDependencies) {
    this.dependencies = dependencies;
    this.effects = dependencies.effects ?? new NoopNegotiationEffects();
    this.authority = dependencies.authority ?? {
      consume: consumeNegotiationAuthority,
    };
    this.authorization = dependencies.authorization ??
      denyNegotiationAuthorization;
    this.featureGate = dependencies.deliveryFeatureGate ??
      { deliveryEnabled: () => false };
  }

  protected async consumeAuthority(
    input: NegotiationAuthorityCommandInput,
    commandType: string,
    targetAggregateType: NegotiationAuthorityInput["targetAggregateType"],
    targetId: string,
    targetVersion: AggregateVersion,
  ): Promise<ConsumedNegotiationAuthority> {
    if (
      input.expectedProposalVersion !== undefined &&
      input.expectedProposalVersion !== targetVersion
    ) {
      throw new NegotiationError(
        "STALE_VERSION",
        `Authority target version "${input.expectedProposalVersion}" does not match current version "${targetVersion}".`,
      );
    }
    const authority = await this.authority.consume({
      ...input.authority,
      scope: input.scope,
      targetAggregateType,
      targetId,
      expectedVersion: targetVersion,
      commandType,
      actorId: input.actor.id,
      idempotencyKey: input.idempotencyKey,
      consumedAt: this.dependencies.clock.now(),
    });
    if (
      authority.actor.id !== input.actor.id ||
      authority.actor.kind !== "human" || authority.actor.state !== "active"
    ) {
      throw new NegotiationError(
        "HUMAN_AUTHORITY_REQUIRED",
        "Negotiation authority did not resolve to the exact active human command actor.",
      );
    }
    return authority;
  }

  protected authorize(
    input: NegotiationAuthorizationInput,
  ): Promise<void> {
    return authorizeNegotiationAction(this.authorization, input).then(() => {});
  }

  protected mutate(
    input: NegotiationCommandInput,
    commandType: string,
    payload: Readonly<Record<string, unknown>>,
    action: Action,
    resource: {
      readonly kind: ReturnType<
        typeof import("../platform/authz/v1.ts").resourceKind
      >;
      readonly id: string;
    },
    callback: (round: NegotiationRound, transaction: NegotiationTransaction) =>
      | Partial<NegotiationRound>
      | Promise<Partial<NegotiationRound>>,
    authorityPayload?: unknown,
    withJob = false,
    humanOnly = false,
    identityPayload: unknown = payload,
  ): Promise<NegotiationCommandResult> {
    return this.runMutation(
      input,
      commandType,
      payload,
      action,
      resource,
      callback,
      authorityPayload,
      withJob,
      humanOnly,
      identityPayload,
    );
  }

  private async runMutation(
    input: NegotiationCommandInput,
    commandType: string,
    payload: Readonly<Record<string, unknown>>,
    action: Action,
    resource: {
      readonly kind: ReturnType<
        typeof import("../platform/authz/v1.ts").resourceKind
      >;
      readonly id: string;
    },
    callback: (round: NegotiationRound, transaction: NegotiationTransaction) =>
      | Partial<NegotiationRound>
      | Promise<Partial<NegotiationRound>>,
    authorityPayload: unknown = undefined,
    withJob = false,
    humanOnly = false,
    identityPayload: unknown = payload,
  ): Promise<NegotiationCommandResult> {
    assertActiveActor(input.actor, commandType);
    const now = this.dependencies.clock.now();
    await this.authorize({
      context: input.context,
      actor: input.actor,
      scope: input.scope,
      resource,
      action,
      humanOnly,
      now,
    });
    const identity = await commandIdentity(
      input.scope,
      input.actor,
      commandType,
      input.roundId,
      input.idempotencyKey,
      authorityPayload === undefined
        ? { payload: identityPayload }
        : { payload: identityPayload, authorityPayload },
      now,
    );
    return this.dependencies.unitOfWork.run(identity, async (transaction) => {
      const round = await transaction.findRound(input.scope, input.roundId);
      if (round === undefined) throw protectedRoundNotFound(input.roundId);
      if (round.status === "closed" || round.status === "cancelled") {
        throw new NegotiationError(
          "INVALID_TRANSITION",
          `Negotiation round "${round.roundId}" is terminal in status "${round.status}"; ordinary mutations are not permitted.`,
        );
      }
      const changes = await callback(round, transaction);
      const next = recordMutation(
        round,
        changes,
        input.actor,
        commandType,
        payload,
        this.dependencies.clock.now(),
        authorityProofFromChanges(round, changes),
      );
      await transaction.replaceRound(next, input.expectedVersion);
      await appendEffects(
        this.effects,
        transaction,
        next,
        input.actor,
        withJob,
      );
      return next;
    });
  }
}

export function assertScopeMatches(
  first: NegotiationScope,
  second: NegotiationScope,
): void {
  if (
    first.tenantId === second.tenantId &&
    first.workspaceId === second.workspaceId &&
    first.dealId === second.dealId
  ) return;
  throw new NegotiationError(
    "SCOPE_MISMATCH",
    "Negotiation scopes must match exactly.",
  );
}

export type { ActorReference };
