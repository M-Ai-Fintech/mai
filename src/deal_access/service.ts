import type { ApprovedScopeToken } from "../platform/authz/v1.ts";
import { payloadDigest } from "../platform/persistence/v1.ts";
import {
  completePortalSubmission,
  createPortalReceipt,
  createPortalSubmission,
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
import { authorizePortalAccess } from "./policy.ts";
import type { PortalObjectLoader } from "./portal.ts";
import { portalObjectId } from "./ids.ts";
import type {
  AcceptInvitationCommand,
  DealAccessClock,
  DealAccessIdFactory,
  ExpireGrantsInput,
  ExternalSessionInvalidator,
  InvitationResult,
  InviteParticipantCommand,
  OffboardParticipantCommand,
  QueuedSubmissionDelivery,
  QueuedSubmissionInput,
  RevokeGrantCommand,
  SubmissionResult,
  SubmitPortalDataCommand,
} from "./service_contracts.ts";
import {
  assertExternalActor,
  assertHumanActor,
  assertHumanSponsorCommand,
  authorizeQueuedSubmission,
  commandIdentity,
  commandIdentityFor,
  commandPayload,
  commandScope,
  createInvitation,
  persistInvitation,
  persistLifecycle,
  persistSubmission,
} from "./service_support.ts";

export type {
  AcceptInvitationCommand,
  DealAccessClock,
  DealAccessIdFactory,
  ExpireGrantsInput,
  ExternalSessionInvalidator,
  InvitationResult,
  InviteParticipantCommand,
  OffboardParticipantCommand,
  QueuedSubmissionDelivery,
  QueuedSubmissionInput,
  RevokeGrantCommand,
  SubmissionResult,
  SubmitPortalDataCommand,
} from "./service_contracts.ts";

export class DealAccessService {
  private readonly repository: DealAccessRepository;
  private readonly ids: DealAccessIdFactory;
  private readonly clock: DealAccessClock;
  private readonly sessions: ExternalSessionInvalidator;

  constructor(
    input: {
      readonly repository: DealAccessRepository;
      readonly ids: DealAccessIdFactory;
      readonly clock: DealAccessClock;
      readonly sessions: ExternalSessionInvalidator;
    },
  ) {
    this.repository = input.repository;
    this.ids = input.ids;
    this.clock = input.clock;
    this.sessions = input.sessions;
  }

  async inviteParticipant(
    command: InviteParticipantCommand,
  ): Promise<InvitationResult> {
    assertHumanSponsorCommand(command);
    const scope = commandScope(command.context);
    const digest = await payloadDigest(commandPayload(command));
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
        participation.participantId !== command.participantId
      ) {
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

  async submitPortalData(
    command: SubmitPortalDataCommand,
    loader: PortalObjectLoader,
  ): Promise<SubmissionResult> {
    assertExternalActor(command.actor);
    const scope = commandScope(command.context);
    const digest = await payloadDigest(commandPayload(command));
    const identity = commandIdentityFor(command, scope, command.grantId);
    return this.repository.transaction(async (store) => {
      const claim = await store.claimCommand(identity, digest);
      if (claim.state === "replay") return claim.result as SubmissionResult;
      if (claim.state === "in_progress") {
        throw new DealAccessIdempotencyConflictError(command.idempotencyKey);
      }
      const grant = await store.findGrant(scope, command.grantId);
      const participation = grant === undefined
        ? undefined
        : await store.findParticipation(scope, grant.participationId);
      if (grant === undefined || participation === undefined) {
        throw new DealAccessAuthorizationError("PROTECTED_NOT_FOUND");
      }
      const decision = authorizePortalAccess({
        context: command.context,
        actor: command.actor,
        participation,
        grant,
        resource: command.object,
        action: "submit",
        purpose: command.purpose,
        sponsor: command.sponsor,
        requestedExpiry: command.requestedExpiry,
        requestedFields: command.requestedFields,
        clock: this.clock,
      });
      if (decision.outcome === "deny") {
        throw new DealAccessAuthorizationError(decision.reasonCode);
      }
      if (await loader.load(decision.approvedScope) === undefined) {
        throw new DealAccessAuthorizationError("PROTECTED_NOT_FOUND");
      }
      const submission = createPortalSubmission({
        id: this.ids.nextSubmissionId(),
        grant,
        participation,
        objectId: portalObjectId(command.object.objectId),
        payload: command.payload,
        now: this.clock.now(),
      });
      const receipt = createPortalReceipt({
        id: this.ids.nextPortalReceiptId(),
        submission,
        state: "accepted",
        now: this.clock.now(),
      });
      await persistSubmission(
        store,
        submission,
        receipt,
        command,
        this.ids,
        this.clock.now(),
      );
      const result = { submission, receipt };
      await store.completeCommand(identity, digest, result);
      return result;
    });
  }

  async revokeGrant(command: RevokeGrantCommand): Promise<ExternalGrant> {
    assertHumanActor(command.actor);
    const scope = commandScope(command.context);
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
      });
      await store.completeCommand(identity, digest, revoked);
      return revoked;
    });
    await this.sessions.invalidateGrant(result.id);
    return result;
  }

  async offboardParticipant(
    command: OffboardParticipantCommand,
  ): Promise<DealParticipation> {
    assertHumanActor(command.actor);
    const scope = commandScope(command.context);
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
      });
      await store.completeCommand(identity, digest, offboarded.participation);
      return offboarded.participation;
    });
    await this.sessions.invalidateParticipation(result.id);
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
        });
      }
      return grants;
    });
    for (const grant of expired) await this.sessions.invalidateGrant(grant.id);
    return expired.length;
  }

  async processQueuedSubmission(
    input: QueuedSubmissionInput,
    delivery: QueuedSubmissionDelivery,
  ): Promise<PortalSubmission> {
    assertExternalActor(input.actor);
    const scope = commandScope(input.context);
    const prepared = await this.repository.transaction(async (store) => {
      const submission = await store.findSubmission(scope, input.submissionId);
      if (submission === undefined) {
        throw new DealAccessAuthorizationError("PROTECTED_NOT_FOUND");
      }
      const grant = await store.findGrant(scope, submission.grantId);
      const participation = grant === undefined
        ? undefined
        : await store.findParticipation(scope, grant.participationId);
      if (grant === undefined || participation === undefined) {
        throw new DealAccessAuthorizationError("PROTECTED_NOT_FOUND");
      }
      await authorizeQueuedSubmission(
        input,
        submission,
        grant,
        participation,
        this.clock.now(),
      );
      return { submission, scope };
    });
    await delivery.deliver({
      submission: prepared.submission,
      beforeExternalEffect: () => this.reauthorizeQueuedSubmission(input),
    });
    return this.repository.transaction(async (store) => {
      const current = await store.findSubmission(
        prepared.scope,
        input.submissionId,
      );
      if (current === undefined) {
        throw new DealAccessAuthorizationError("PROTECTED_NOT_FOUND");
      }
      const completed = completePortalSubmission(current, this.clock.now());
      await store.saveSubmission(completed, current.version);
      return completed;
    });
  }

  private reauthorizeQueuedSubmission(
    input: QueuedSubmissionInput,
  ): Promise<ApprovedScopeToken> {
    const scope = commandScope(input.context);
    return this.repository.transaction(async (store) => {
      const submission = await store.findSubmission(scope, input.submissionId);
      if (submission === undefined) {
        throw new DealAccessAuthorizationError("PROTECTED_NOT_FOUND");
      }
      const grant = await store.findGrant(scope, submission.grantId);
      const participation = grant === undefined
        ? undefined
        : await store.findParticipation(scope, grant.participationId);
      if (grant === undefined || participation === undefined) {
        throw new DealAccessAuthorizationError("PROTECTED_NOT_FOUND");
      }
      return authorizeQueuedSubmission(
        input,
        submission,
        grant,
        participation,
        this.clock.now(),
      );
    });
  }
}
