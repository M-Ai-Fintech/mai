import type {
  ActorReference,
  ApprovedScopeToken,
} from "../platform/authz/v1.ts";
import type {
  ActorId,
  IdempotencyKey,
} from "../shared/contracts/identifiers.ts";
import type { RequestContext } from "../shared/contracts/request_context.ts";
import type {
  DealParticipation,
  ExternalGrant,
  HumanSponsor,
  PortalObjectScope,
  PortalReceipt,
  PortalSubmission,
  SubmissionPayload,
} from "./model.ts";
import type { PortalResource } from "./policy.ts";
import type { PortalFieldName } from "./portal_fields.ts";
import type {
  ExternalGrantId,
  InvitationId,
  ParticipationId,
  PortalReceiptId,
  SubmissionId,
} from "./ids.ts";

export interface DealAccessIdFactory {
  nextParticipationId(): ParticipationId;
  nextInvitationId(): InvitationId;
  nextExternalGrantId(): ExternalGrantId;
  nextSubmissionId(): SubmissionId;
  nextPortalReceiptId(): PortalReceiptId;
  nextEventId(sequence: string): string;
}

export interface DealAccessClock {
  now(): string;
}

export interface ExternalSessionInvalidator {
  invalidateGrant(grantId: ExternalGrantId): Promise<void>;
  invalidateParticipation(participationId: ParticipationId): Promise<void>;
}

export interface InviteParticipantCommand {
  readonly type: "invite_participant";
  readonly context: RequestContext;
  readonly actor: ActorReference;
  readonly idempotencyKey: IdempotencyKey;
  readonly participantId: string;
  readonly purpose: string;
  readonly sponsor: HumanSponsor;
  readonly expiresAt: string;
  readonly objectScopes: readonly PortalObjectScope[];
  readonly actions: readonly string[];
  readonly fields: readonly string[];
}

export interface InvitationResult {
  readonly participation: DealParticipation;
  readonly grant: ExternalGrant;
}

export interface AcceptInvitationCommand {
  readonly type: "accept_invitation";
  readonly context: RequestContext;
  readonly actor: ActorReference;
  readonly idempotencyKey: IdempotencyKey;
  readonly participationId: ParticipationId;
  readonly participantId: string;
  readonly expectedVersion: number;
}

export interface SubmitPortalDataCommand {
  readonly type: "submit_portal_data";
  readonly context: RequestContext;
  readonly actor: ActorReference;
  readonly idempotencyKey: IdempotencyKey;
  readonly grantId: ExternalGrantId;
  readonly object: PortalResource;
  readonly purpose: string;
  readonly sponsor: ActorId;
  readonly requestedExpiry: string;
  readonly requestedFields: readonly PortalFieldName[];
  readonly payload: SubmissionPayload;
}

export interface SubmissionResult {
  readonly submission: PortalSubmission;
  readonly receipt: PortalReceipt;
}

export interface RevokeGrantCommand {
  readonly type: "revoke_grant";
  readonly context: RequestContext;
  readonly actor: ActorReference;
  readonly idempotencyKey: IdempotencyKey;
  readonly grantId: ExternalGrantId;
  readonly expectedVersion: number;
}

export interface OffboardParticipantCommand {
  readonly type: "offboard_participant";
  readonly context: RequestContext;
  readonly actor: ActorReference;
  readonly idempotencyKey: IdempotencyKey;
  readonly participationId: ParticipationId;
  readonly expectedParticipationVersion: number;
}

export interface ExpireGrantsInput {
  readonly context: RequestContext;
}

export interface QueuedSubmissionInput {
  readonly context: RequestContext;
  readonly actor: ActorReference;
  readonly submissionId: SubmissionId;
  readonly purpose: string;
  readonly sponsor: ActorId;
  readonly requestedExpiry: string;
  readonly requestedFields: readonly PortalFieldName[];
}

export interface QueuedSubmissionDelivery {
  deliver(input: {
    readonly submission: PortalSubmission;
    readonly beforeExternalEffect: () => Promise<ApprovedScopeToken>;
  }): Promise<void>;
}
