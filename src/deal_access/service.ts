import { payloadDigest } from "../platform/persistence/v1.ts";
import {
  digestInvitationToken,
  verifyInvitationToken,
} from "./capabilities.ts";
import {
  type DealParticipation,
  type ExternalGrant,
  type PortalSubmission,
} from "./model.ts";
import {
  DealAccessAuthorizationError,
  DealAccessIdempotencyConflictError,
  DealAccessInvariantError,
} from "./errors.ts";
import type { DealAccessRepository } from "./repository.ts";
import {
  activateParticipation,
  expireGrant,
  offboardGrant,
  offboardParticipation,
  revokeGrant,
} from "./lifecycle.ts";
import { DEAL_ACCESS_ACTION, DEAL_ACCESS_RESOURCE } from "./policy.ts";
import type { PortalObjectLoader } from "./portal.ts";
import { DealAccessSessionInvalidationCoordinator } from "./session_invalidation.ts";
import {
  processQueuedSubmission as processPortalSubmission,
  submitPortalData as submitPortalDataCommand,
} from "./service_portal.ts";
import type {
  AcceptInvitationCommand,
  DealAccessAuthorizationPort,
  DealAccessClock,
  DealAccessIdFactory,
  ExpireGrantsInput,
  ExternalSessionInvalidator,
  InvitationResult,
  InviteParticipantCommand,
  OffboardParticipantCommand,
  QueuedSubmissionDelivery,
  QueuedSubmissionInput,
  RetrySessionInvalidationsInput,
  RevokeGrantCommand,
  SessionInvalidationRetryResult,
  SubmissionResult,
  SubmitPortalDataCommand,
} from "./service_contracts.ts";
import {
  assertActorMatchesContext,
  assertExternalActor,
  assertHumanActor,
  assertHumanSponsorCommand,
  commandIdentity,
  commandIdentityFor,
  commandPayload,
  commandScope,
  createInvitation,
  persistInvitation,
  persistLifecycle,
} from "./service_support.ts";

export type {
  AcceptInvitationCommand,
  DealAccessAuthorizationInput,
  DealAccessAuthorizationPort,
  DealAccessClock,
  DealAccessCommandContext,
  DealAccessIdFactory,
  ExpireGrantsInput,
  ExternalSessionInvalidator,
  InvitationResult,
  InviteParticipantCommand,
  OffboardParticipantCommand,
  QueuedSubmissionDelivery,
  QueuedSubmissionInput,
  RetrySessionInvalidationsInput,
  RevokeGrantCommand,
  SessionInvalidationRetryResult,
  SubmissionResult,
  SubmitPortalDataCommand,
} from "./service_contracts.ts";

export class DealAccessService {
  private readonly repository: DealAccessRepository;
  private readonly ids: DealAccessIdFactory;
  private readonly clock: DealAccessClock;
  private readonly invalidations: DealAccessSessionInvalidationCoordinator;
  private readonly authorization: DealAccessAuthorizationPort;

  constructor(
    input: {
      readonly repository: DealAccessRepository;
      readonly authorization: DealAccessAuthorizationPort;
      readonly ids: DealAccessIdFactory;
      readonly clock: DealAccessClock;
      readonly sessions: ExternalSessionInvalidator;
    },
  ) {
    this.repository = input.repository;
    this.authorization = input.authorization;
    this.ids = input.ids;
    this.clock = input.clock;
    this.invalidations = new DealAccessSessionInvalidationCoordinator(
      input.repository,
      input.sessions,
      input.clock,
    );
  }

  async inviteParticipant(
    command: InviteParticipantCommand,
  ): Promise<InvitationResult> {
    assertActorMatchesContext(command.actor, command.context);
    assertHumanSponsorCommand(command);
    const scope = commandScope(command.context);
    await this.authorizeAdministrative(
      command.actor,
      command.context,
      scope,
      DEAL_ACCESS_ACTION.invite,
    );
    const invitationTokenDigest = await digestInvitationToken(
      command.invitationToken,
    );
    const digest = await payloadDigest(
      commandPayload(command, invitationTokenDigest),
    );
    const identity = commandIdentity(command, scope);
    return this.repository.transaction(async (store) => {
      const claim = await store.claimCommand(identity, digest);
      if (claim.state === "replay") return claim.result as InvitationResult;
      if (claim.state === "in_progress") {
        throw new DealAccessIdempotencyConflictError(command.idempotencyKey);
      }
      const result = createInvitation(
        command,
        scope,
        this.ids,
        invitationTokenDigest,
        this.clock.now(),
      );
      await persistInvitation(
        store,
        result,
        command,
        this.ids,
        this.clock.now(),
      );
      await store.completeCommand(identity, digest, result);
      return result;
    });
  }

  async acceptInvitation(
    command: AcceptInvitationCommand,
  ): Promise<DealParticipation> {
    assertExternalActor(command.actor);
    assertActorMatchesContext(command.actor, command.context);
    const scope = commandScope(command.context);
    const digest = await payloadDigest(command);
    const identity = commandIdentityFor(
      command,
      scope,
      command.participationId,
    );
    return this.repository.transaction(async (store) => {
      const claim = await store.claimCommand(identity, digest);
      if (claim.state === "replay") return claim.result as DealParticipation;
      if (claim.state === "in_progress") {
        throw new DealAccessIdempotencyConflictError(command.idempotencyKey);
      }
      const participation = await store.findParticipation(
        scope,
        command.participationId,
      );
      if (
        participation === undefined ||
        participation.participantId !== command.actor.id
      ) {
        throw new DealAccessAuthorizationError("PROTECTED_NOT_FOUND");
      }
      if (
        participation.state !== "invited" ||
        !(await verifyInvitationToken(
          command.invitationToken,
          participation.invitationTokenDigest,
        ))
      ) {
        throw new DealAccessAuthorizationError("PROTECTED_NOT_FOUND");
      }
      const grants = await store.findGrants(scope, participation.id);
      const grant = grants.find((candidate) =>
        candidate.state === "active" &&
        Date.parse(candidate.expiresAt) > Date.parse(this.clock.now())
      );
      if (grant === undefined) {
        throw new DealAccessAuthorizationError("PROTECTED_NOT_FOUND");
      }
      const active = activateParticipation(
        participation,
        command.expectedVersion,
        this.clock.now(),
      );
      await store.saveParticipation(active, command.expectedVersion);
      await persistLifecycle(
        store,
        active,
        command.context,
        command.actor.id,
        this.ids,
        "participation_accepted",
        this.clock.now(),
      );
      await store.completeCommand(identity, digest, active);
      return active;
    });
  }

  submitPortalData(
    command: SubmitPortalDataCommand,
    loader: PortalObjectLoader,
  ): Promise<SubmissionResult> {
    return submitPortalDataCommand({
      repository: this.repository,
      ids: this.ids,
      clock: this.clock,
      command,
      loader,
    });
  }

  async revokeGrant(command: RevokeGrantCommand): Promise<ExternalGrant> {
    assertHumanActor(command.actor);
    assertActorMatchesContext(command.actor, command.context);
    const scope = commandScope(command.context);
    await this.authorizeAdministrative(
      command.actor,
      command.context,
      scope,
      DEAL_ACCESS_ACTION.revoke,
    );
    const digest = await payloadDigest(command);
    const identity = commandIdentityFor(command, scope, command.grantId);
    const result = await this.repository.transaction(async (store) => {
      const claim = await store.claimCommand(identity, digest);
      if (claim.state === "replay") return claim.result as ExternalGrant;
      if (claim.state === "in_progress") {
        throw new DealAccessIdempotencyConflictError(command.idempotencyKey);
      }
      const grant = await store.findGrant(scope, command.grantId);
      if (grant === undefined) {
        throw new DealAccessAuthorizationError("PROTECTED_NOT_FOUND");
      }
      const revoked = revokeGrant(
        grant,
        command.expectedVersion,
        this.clock.now(),
      );
      await store.saveGrant(revoked, command.expectedVersion);
      await persistLifecycle(
        store,
        revoked,
        command.context,
        command.actor.id,
        this.ids,
        "external_grant_revoked",
        this.clock.now(),
      );
      await store.recordSessionInvalidation({
        invalidationId: this.ids.nextEventId("grant_session_invalidation"),
        scope,
        grantId: revoked.id,
        reason: "revoked",
        state: "pending",
        attemptCount: 0,
      });
      await store.completeCommand(identity, digest, revoked);
      return revoked;
    });
    await this.invalidations.flush(scope, {
      grantId: result.id,
      reason: "revoked",
    });
    return result;
  }

  async offboardParticipant(
    command: OffboardParticipantCommand,
  ): Promise<DealParticipation> {
    assertHumanActor(command.actor);
    assertActorMatchesContext(command.actor, command.context);
    const scope = commandScope(command.context);
    await this.authorizeAdministrative(
      command.actor,
      command.context,
      scope,
      DEAL_ACCESS_ACTION.offboard,
    );
    const digest = await payloadDigest(command);
    const identity = commandIdentityFor(
      command,
      scope,
      command.participationId,
    );
    const result = await this.repository.transaction(async (store) => {
      const claim = await store.claimCommand(identity, digest);
      if (claim.state === "replay") return claim.result as DealParticipation;
      if (claim.state === "in_progress") {
        throw new DealAccessIdempotencyConflictError(command.idempotencyKey);
      }
      const participation = await store.findParticipation(
        scope,
        command.participationId,
      );
      if (participation === undefined) {
        throw new DealAccessAuthorizationError("PROTECTED_NOT_FOUND");
      }
      const grants = await store.findGrants(scope, participation.id);
      const firstGrant = grants[0];
      if (firstGrant === undefined) {
        throw new DealAccessInvariantError(
          `Participation "${participation.id}" has no grant; expected an external grant before offboarding.`,
        );
      }
      const offboarded = offboardParticipation(
        participation,
        firstGrant,
        command.expectedParticipationVersion,
        firstGrant.version,
        this.clock.now(),
      );
      await store.saveParticipation(
        offboarded.participation,
        command.expectedParticipationVersion,
      );
      await store.saveGrant(offboarded.grant, firstGrant.version);
      for (const grant of grants.slice(1)) {
        await store.saveGrant(
          offboardGrant(grant, grant.version, this.clock.now()),
          grant.version,
        );
      }
      await persistLifecycle(
        store,
        offboarded.participation,
        command.context,
        command.actor.id,
        this.ids,
        "participation_offboarded",
        this.clock.now(),
      );
      await store.recordSessionInvalidation({
        invalidationId: this.ids.nextEventId(
          "participation_session_invalidation",
        ),
        scope,
        participationId: offboarded.participation.id,
        reason: "offboarded",
        state: "pending",
        attemptCount: 0,
      });
      await store.completeCommand(identity, digest, offboarded.participation);
      return offboarded.participation;
    });
    await this.invalidations.flush(scope, {
      participationId: result.id,
      reason: "offboarded",
    });
    return result;
  }

  async expireGrants(input: ExpireGrantsInput): Promise<number> {
    const scope = commandScope(input.context);
    const expired = await this.repository.transaction(async (store) => {
      const grants = await store.listExpiredGrants(scope, this.clock.now());
      for (const grant of grants) {
        const updated = expireGrant(grant, grant.version, this.clock.now());
        await store.saveGrant(updated, grant.version);
        await persistLifecycle(
          store,
          updated,
          input.context,
          input.context.actorId,
          this.ids,
          "external_grant_expired",
          this.clock.now(),
        );
        await store.recordSessionInvalidation({
          invalidationId: this.ids.nextEventId("grant_session_invalidation"),
          scope,
          grantId: updated.id,
          reason: "expired",
          state: "pending",
          attemptCount: 0,
        });
      }
      return grants;
    });
    await this.invalidations.flush(scope, { reason: "expired" });
    return expired.length;
  }

  retrySessionInvalidations(
    input: RetrySessionInvalidationsInput,
  ): Promise<SessionInvalidationRetryResult> {
    if (input.context.origin === "http") {
      return Promise.reject(new DealAccessAuthorizationError("INTERNAL_ONLY"));
    }
    const scope = commandScope(input.context);
    return this.invalidations.retry(scope);
  }

  processQueuedSubmission(
    input: QueuedSubmissionInput,
    delivery: QueuedSubmissionDelivery,
  ): Promise<PortalSubmission> {
    return processPortalSubmission({
      repository: this.repository,
      clock: this.clock,
      request: input,
      delivery,
    });
  }

  private async authorizeAdministrative(
    actor: InviteParticipantCommand["actor"],
    request: InviteParticipantCommand["context"],
    scope: ReturnType<typeof commandScope>,
    commandAction: typeof DEAL_ACCESS_ACTION[keyof typeof DEAL_ACCESS_ACTION],
  ): Promise<void> {
    const decision = await this.authorization.authorize({
      context: { actor, request, now: this.clock.now() },
      scope,
      resource: { kind: DEAL_ACCESS_RESOURCE, id: scope.dealId },
      action: commandAction,
      requestedFields: [],
      humanOnly: true,
    });
    if (decision.outcome === "allow") return;
    throw new DealAccessAuthorizationError(decision.reasonCode);
  }
}
