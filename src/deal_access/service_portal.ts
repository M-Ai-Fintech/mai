import type { ApprovedScopeToken } from "../platform/authz/v1.ts";
import { payloadDigest } from "../platform/persistence/v1.ts";
import {
  completePortalSubmission,
  createPortalReceipt,
  createPortalSubmission,
  type PortalSubmission,
} from "./model.ts";
import {
  DealAccessAuthorizationError,
  DealAccessIdempotencyConflictError,
} from "./errors.ts";
import type { DealAccessRepository } from "./repository.ts";
import { authorizePortalAccess } from "./policy.ts";
import type { PortalObjectLoader } from "./portal.ts";
import { portalObjectId } from "./ids.ts";
import type {
  DealAccessClock,
  DealAccessIdFactory,
  QueuedSubmissionDelivery,
  QueuedSubmissionInput,
  SubmissionResult,
  SubmitPortalDataCommand,
} from "./service_contracts.ts";
import {
  assertExternalActor,
  authorizeQueuedSubmission,
  commandIdentityFor,
  commandPayload,
  commandScope,
  persistSubmission,
} from "./service_support.ts";

export async function submitPortalData(input: {
  readonly repository: DealAccessRepository;
  readonly ids: DealAccessIdFactory;
  readonly clock: DealAccessClock;
  readonly command: SubmitPortalDataCommand;
  readonly loader: PortalObjectLoader;
}): Promise<SubmissionResult> {
  assertExternalActor(input.command.actor);
  const scope = commandScope(input.command.context);
  const digest = await payloadDigest(commandPayload(input.command));
  const identity = commandIdentityFor(
    input.command,
    scope,
    input.command.grantId,
  );
  return input.repository.transaction(async (store) => {
    const claim = await store.claimCommand(identity, digest);
    if (claim.state === "replay") return claim.result as SubmissionResult;
    if (claim.state === "in_progress") {
      throw new DealAccessIdempotencyConflictError(
        input.command.idempotencyKey,
      );
    }
    const grant = await store.findGrant(scope, input.command.grantId);
    const participation = grant === undefined
      ? undefined
      : await store.findParticipation(scope, grant.participationId);
    if (grant === undefined || participation === undefined) {
      throw new DealAccessAuthorizationError("PROTECTED_NOT_FOUND");
    }
    const decision = authorizePortalAccess({
      context: input.command.context,
      actor: input.command.actor,
      participation,
      grant,
      resource: input.command.object,
      action: "submit",
      purpose: input.command.purpose,
      sponsor: input.command.sponsor,
      requestedExpiry: input.command.requestedExpiry,
      requestedFields: input.command.requestedFields,
      clock: input.clock,
    });
    if (decision.outcome === "deny") {
      throw new DealAccessAuthorizationError(decision.reasonCode);
    }
    if (await input.loader.load(decision.approvedScope) === undefined) {
      throw new DealAccessAuthorizationError("PROTECTED_NOT_FOUND");
    }
    const submission = createPortalSubmission({
      id: input.ids.nextSubmissionId(),
      grant,
      participation,
      objectId: portalObjectId(input.command.object.objectId),
      payload: input.command.payload,
      now: input.clock.now(),
    });
    const receipt = createPortalReceipt({
      id: input.ids.nextPortalReceiptId(),
      submission,
      state: "accepted",
      now: input.clock.now(),
    });
    await persistSubmission(
      store,
      submission,
      receipt,
      input.command,
      input.ids,
      input.clock.now(),
    );
    const result = { submission, receipt };
    await store.completeCommand(identity, digest, result);
    return result;
  });
}

export async function processQueuedSubmission(input: {
  readonly repository: DealAccessRepository;
  readonly clock: DealAccessClock;
  readonly request: QueuedSubmissionInput;
  readonly delivery: QueuedSubmissionDelivery;
}): Promise<PortalSubmission> {
  assertExternalActor(input.request.actor);
  const scope = commandScope(input.request.context);
  const prepared = await input.repository.transaction(async (store) => {
    const submission = await store.findSubmission(
      scope,
      input.request.submissionId,
    );
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
      input.request,
      submission,
      grant,
      participation,
      input.clock.now(),
    );
    return { submission, scope };
  });
  await input.delivery.deliver({
    submission: prepared.submission,
    beforeExternalEffect: () =>
      reauthorizeQueuedSubmission(input.repository, input.clock, input.request),
  });
  return input.repository.transaction(async (store) => {
    const current = await store.findSubmission(
      prepared.scope,
      input.request.submissionId,
    );
    if (current === undefined) {
      throw new DealAccessAuthorizationError("PROTECTED_NOT_FOUND");
    }
    const completed = completePortalSubmission(current, input.clock.now());
    await store.saveSubmission(completed, current.version);
    return completed;
  });
}

function reauthorizeQueuedSubmission(
  repository: DealAccessRepository,
  clock: DealAccessClock,
  input: QueuedSubmissionInput,
): Promise<ApprovedScopeToken> {
  const scope = commandScope(input.context);
  return repository.transaction(async (store) => {
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
      clock.now(),
    );
  });
}
