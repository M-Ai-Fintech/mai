import { action, resourceKind } from "../platform/authz/v1.ts";
import type { OutboxEvent } from "../platform/events/v1.ts";
import type { AggregateVersion } from "../shared/contracts/aggregate_version.ts";
import type { RequestContext } from "../shared/contracts/request_context.ts";
import {
  applyGovernanceTransition,
  assertPreviewCurrent,
  attachDeletionRequest,
  attachLegalHold,
  attachRetentionAssignment,
  type ConsequencePreview,
  createInitialGovernance,
  type DealGovernanceAggregate,
  detachLegalHold,
  type GovernanceAction,
  type GovernanceEvent,
  type GovernanceScope,
  previewGovernanceTransition,
} from "./model.ts";
import {
  assessRetention,
  createLegalHold,
  createRetentionAssignment,
  type LegalHold,
  releaseLegalHold,
  replaceRetentionAssignment,
  type RetentionAssignment,
  startRetentionClock,
} from "./retention.ts";
import {
  approveDeletionRequest,
  assessDeletionImpact,
  cancelDeletionRequest,
  completeDeletionRequest,
  createDeletionRequest,
  type DeletionRequest,
  rejectDeletionRequest,
  scheduleDeletionRequest,
  startDeletionExecution,
  submitDeletionRequest,
} from "./deletion.ts";
import {
  createErasureManifest,
  createErasureOrchestration,
  type ErasureGate,
  type ErasureOrchestration,
  recordOrchestrationStep,
  refreshErasureGate,
  startOrchestration,
} from "./orchestration.ts";
import {
  defaultDeniedErasureGate,
  resolveTrustedErasureGate,
} from "./trusted_evidence.ts";
import {
  DealGovernanceError,
  GovernanceAuthorizationError,
  GovernanceInvariantError,
} from "./errors.ts";
import type {
  AssessDeletionImpactCommand,
  AssignRetentionCommand,
  CancelDeletionRequestCommand,
  CreateDeletionRequestCommand,
  CreateGovernanceCommand,
  DealGovernanceIdFactory,
  DecideDeletionRequestCommand,
  ErasureExecutor,
  GovernanceAuthorizationInput,
  GovernanceAuthorizationPort,
  GovernanceClock,
  GovernanceCommandContext,
  GovernanceReadResult,
  OrchestrationResult,
  PlaceLegalHoldCommand,
  ReleaseLegalHoldCommand,
  ResumeOrchestrationCommand,
  StartOrchestrationCommand,
  SubmitDeletionRequestCommand,
  TransitionGovernanceCommand,
} from "./service_contracts.ts";
import type { ErasureGateEvidencePort } from "./trusted_evidence.ts";
import type { DeletionRequestId } from "./ids.ts";
import type {
  CommandIdentity,
  DealGovernanceRepository,
  DealGovernanceStore,
} from "./repository.ts";
import { holdAffectsCategory } from "./retention.ts";

export const GOVERNANCE_RESOURCE = resourceKind("deal_governance");
export const GOVERNANCE_ACTION = Object.freeze({
  create: action("create"),
  read: action("read"),
  pause: action("pause"),
  archive: action("archive"),
  restore: action("restore"),
  terminate: action("terminate"),
  retention: action("manage_retention"),
  placeHold: action("place_legal_hold"),
  releaseHold: action("release_legal_hold"),
  requestDeletion: action("request_deletion"),
  approveDeletion: action("approve_deletion"),
  executeDeletion: action("execute_deletion"),
});

export interface DealGovernanceDependencies {
  readonly repository: DealGovernanceRepository;
  readonly authorization: GovernanceAuthorizationPort;
  readonly ids: DealGovernanceIdFactory;
  readonly clock: GovernanceClock;
  readonly erasureExecutor?: ErasureExecutor;
  readonly erasureGateEvidence: ErasureGateEvidencePort;
}

export class DealGovernanceService {
  constructor(private readonly dependencies: DealGovernanceDependencies) {}

  async read(context: GovernanceCommandContext): Promise<GovernanceReadResult> {
    const scope = scopeFromContext(context.request);
    await this.authorize(context, scope, "read", false);
    return await this.dependencies.repository.transaction(async (store) => {
      const governance = await store.findGovernance(scope);
      if (governance === undefined) {
        throw new GovernanceInvariantError(
          `Governance aggregate for deal "${scope.dealId}" was not found; expected the governance context to be initialized.`,
        );
      }
      return await readResult(store, governance);
    });
  }

  async createGovernance(
    command: CreateGovernanceCommand,
  ): Promise<DealGovernanceAggregate> {
    const scope = scopeFromContext(command.context.request);
    await this.authorize(command.context, scope, "create", true);
    return await this.runIdempotent(
      command.context,
      command.idempotencyKey,
      "create_governance",
      scope.dealId,
      command,
      async (store) => {
        const current = await store.findGovernance(scope);
        if (current !== undefined) return current;
        const aggregate = createInitialGovernance({
          scope,
          now: command.context.now,
          id: this.dependencies.ids.nextGovernanceId(),
        });
        await store.saveGovernance(aggregate);
        await this.record(
          store,
          command.context,
          aggregate,
          "GovernanceCreated",
          {},
        );
        return aggregate;
      },
    );
  }

  async previewTransition(
    context: GovernanceCommandContext,
    actionName: GovernanceAction,
  ): Promise<ConsequencePreview> {
    const scope = scopeFromContext(context.request);
    await this.authorize(context, scope, actionName, true);
    return await this.dependencies.repository.transaction(async (store) => {
      const aggregate = await requireGovernance(store, scope);
      const holds = await store.listHolds(scope);
      const retention = await store.findRetention(scope);
      const assessment = assessRetention({
        state: aggregate.state,
        assignment: retention,
        holds,
        now: context.now,
      });
      const preview = previewGovernanceTransition({
        aggregate,
        action: actionName,
        previewId: this.dependencies.ids.nextPreviewId(),
        now: context.now,
        activeLegalHold: holds.some((hold) => hold.state === "active"),
        retentionBlocked: mandatoryRetentionBlocksArchive(
          retention,
          assessment.code,
          actionName,
        ),
      });
      await store.savePreview(preview);
      return preview;
    });
  }

  async transitionGovernance(
    command: TransitionGovernanceCommand,
  ): Promise<DealGovernanceAggregate> {
    const scope = scopeFromContext(command.context.request);
    await this.authorize(command.context, scope, command.action, true);
    return await this.runIdempotent(
      command.context,
      command.idempotencyKey,
      "transition_governance",
      scope.dealId,
      command,
      async (store) => {
        const aggregate = await requireGovernance(store, scope);
        if (aggregate.version !== command.expectedVersion) {
          throw new DealGovernanceError(
            "GOVERNANCE_VERSION_CONFLICT",
            `Governance deal "${scope.dealId}" version "${aggregate.version}" conflicts with expected version "${command.expectedVersion}".`,
          );
        }
        const holds = await store.listHolds(scope);
        const retention = await store.findRetention(scope);
        const preview = await store.findPreview(scope, command.previewId);
        if (preview === undefined) {
          throw new DealGovernanceError(
            "PREVIEW_STALE",
            `Consequence preview "${command.previewId}" was not found in the current governance scope; expected a server-issued preview.`,
          );
        }
        if (preview.action !== command.action) {
          throw new DealGovernanceError(
            "INVALID_STATE_TRANSITION",
            `Consequence preview "${preview.previewId}" is for action "${preview.action}"; expected action "${command.action}".`,
          );
        }
        const assessment = assessRetention({
          state: aggregate.state,
          assignment: retention,
          holds,
          now: command.context.now,
        });
        assertPreviewCurrent(aggregate, preview, command.context.now, {
          requireAllowed: false,
        });
        if (
          mandatoryRetentionBlocksArchive(
            retention,
            assessment.code,
            command.action,
          )
        ) {
          throw retentionError(assessment.code, assessment.message);
        }
        if (
          command.action === "terminate" &&
          holds.some((hold) => hold.state === "active")
        ) {
          throw new DealGovernanceError(
            "LEGAL_HOLD_ACTIVE",
            `Governance deal "${scope.dealId}" has an active legal hold; expected legal-hold dominance over termination.`,
          );
        }
        const authoritativePreview = previewGovernanceTransition({
          aggregate,
          action: command.action,
          previewId: preview.previewId,
          now: command.context.now,
          activeLegalHold: holds.some((hold) => hold.state === "active"),
          retentionBlocked: mandatoryRetentionBlocksArchive(
            retention,
            assessment.code,
            command.action,
          ),
        });
        if (authoritativePreview.outcome !== "allowed") {
          throw authoritativePreviewError(authoritativePreview);
        }
        if (preview.outcome !== "allowed") {
          throw authoritativePreviewError(preview);
        }
        const transition = applyGovernanceTransition(
          aggregate,
          authoritativePreview,
          command.context.now,
        );
        await store.saveGovernance(transition.aggregate, aggregate.version);
        if (transition.aggregate.state === "archived") {
          const assignment = await store.findRetention(scope);
          if (
            assignment !== undefined &&
            assignment.retentionStartAt === undefined
          ) {
            const started = startRetentionClock(
              assignment,
              command.context.now,
            );
            await store.saveRetention(started, assignment.version);
            await this.record(
              store,
              command.context,
              transition.aggregate,
              "RetentionClockStarted",
              {
                retentionAssignmentId: started.id,
                retentionStartAt: started.retentionStartAt,
              },
            );
          }
        }
        await this.record(
          store,
          command.context,
          transition.aggregate,
          `Governance${capitalize(command.action)}`,
          {
            previousState: transition.previousState,
            nextState: transition.nextState,
            previewId: preview.previewId,
            effects: authoritativePreview.effects,
            retentionAssessment: assessment.code,
          },
        );
        return transition.aggregate;
      },
    );
  }

  async assignRetention(
    command: AssignRetentionCommand,
  ): Promise<RetentionAssignment> {
    const scope = scopeFromContext(command.context.request);
    await this.authorize(command.context, scope, "manage_retention", true);
    return await this.runIdempotent(
      command.context,
      command.idempotencyKey,
      "assign_retention",
      scope.dealId,
      command,
      async (store) => {
        const governance = await requireGovernance(store, scope);
        assertExpectedVersion(
          governance.version,
          command.expectedVersion,
          scope.dealId,
        );
        const current = await store.findRetention(scope);
        const candidate = createRetentionAssignment({
          scope,
          policySource: command.policySource,
          policyVersion: command.policyVersion,
          retainedCategories: command.retainedCategories,
          retentionStartEvent: command.retentionStartEvent,
          retentionUntil: command.retentionUntil,
          disposition: command.disposition,
          mandatory: command.mandatory,
          now: command.context.now,
          id: current?.id ?? this.dependencies.ids.nextRetentionAssignmentId(),
        });
        const assignment = current === undefined
          ? candidate
          : replaceRetentionAssignment(current, candidate, current.version);
        await store.saveRetention(assignment, current?.version);
        const next = attachRetentionAssignment(
          governance,
          assignment.id,
          command.context.now,
        );
        if (next !== governance) {
          await store.saveGovernance(
            next,
            governance.version,
          );
        }
        await this.record(store, command.context, next, "RetentionAssigned", {
          retentionAssignmentId: assignment.id,
          policyVersion: assignment.policyVersion,
          retentionUntil: assignment.retentionUntil,
        });
        return assignment;
      },
    );
  }

  async placeLegalHold(command: PlaceLegalHoldCommand): Promise<LegalHold> {
    const scope = scopeFromContext(command.context.request);
    await this.authorize(command.context, scope, "place_legal_hold", true);
    return await this.runIdempotent(
      command.context,
      command.idempotencyKey,
      "place_legal_hold",
      scope.dealId,
      command,
      async (store) => {
        const governance = await requireGovernance(store, scope);
        const hold = createLegalHold({
          scope,
          categories: command.categories,
          reason: command.reason,
          placedBy: command.context.actor.id,
          actorKind: command.context.actor.kind,
          placedAt: command.context.now,
          reviewAt: command.reviewAt,
          id: this.dependencies.ids.nextLegalHoldId(),
        });
        await store.saveHold(hold);
        const next = attachLegalHold(governance, hold.id, command.context.now);
        await store.saveGovernance(next, governance.version);
        await this.record(store, command.context, next, "LegalHoldPlaced", {
          holdId: hold.id,
          categories: hold.categories,
        });
        return hold;
      },
    );
  }

  async releaseLegalHold(command: ReleaseLegalHoldCommand): Promise<LegalHold> {
    const scope = scopeFromContext(command.context.request);
    await this.authorize(command.context, scope, "release_legal_hold", true);
    return await this.runIdempotent(
      command.context,
      command.idempotencyKey,
      "release_legal_hold",
      command.holdId,
      command,
      async (store) => {
        const governance = await requireGovernance(store, scope);
        const current = await store.findHold(scope, command.holdId);
        if (current === undefined) {
          throw new GovernanceInvariantError(
            `Legal hold "${command.holdId}" was not found; expected a scoped hold.`,
          );
        }
        const hold = releaseLegalHold(current, {
          expectedVersion: current.version,
          releasedBy: command.context.actor.id,
          actorKind: command.context.actor.kind,
          releasedAt: command.context.now,
        });
        await store.saveHold(hold, current.version);
        const next = detachLegalHold(governance, hold.id, command.context.now);
        await store.saveGovernance(next, governance.version);
        await this.record(store, command.context, next, "LegalHoldReleased", {
          holdId: hold.id,
        });
        return hold;
      },
    );
  }

  async createDeletionRequest(
    command: CreateDeletionRequestCommand,
  ): Promise<DeletionRequest> {
    const scope = scopeFromContext(command.context.request);
    await this.authorize(command.context, scope, "request_deletion", true);
    return await this.runIdempotent(
      command.context,
      command.idempotencyKey,
      "create_deletion_request",
      scope.dealId,
      command,
      async (store) => {
        const governance = await requireGovernance(store, scope);
        assertExpectedVersion(
          governance.version,
          command.requestedGovernanceVersion,
          scope.dealId,
        );
        const retention = await store.findRetention(scope);
        const holds = await store.listHolds(scope);
        const assessment = assessRetention({
          state: governance.state,
          assignment: retention,
          holds,
          now: command.context.now,
        });
        if (!assessment.eligible) {
          throw retentionError(
            assessment.code,
            assessment.message,
          );
        }
        const request = await createDeletionRequest({
          scope,
          requestedBy: command.context.actor.id,
          requesterKind: command.context.actor.kind,
          governanceState: governance.state,
          requestedGovernanceVersion: governance.version,
          reason: command.reason,
          typedConfirmation: command.typedConfirmation,
          expectedConfirmation: command.expectedConfirmation,
          requiredApprovalCount: command.requiredApprovalCount,
          now: command.context.now,
          id: this.dependencies.ids.nextDeletionRequestId(),
        });
        await store.saveDeletionRequest(request);
        const next = attachDeletionRequest(
          governance,
          request.id,
          command.context.now,
        );
        await store.saveGovernance(next, governance.version);
        await this.record(store, command.context, next, "DeletionRequested", {
          requestId: request.id,
          retainedCategories: assessment.retainedCategories,
        });
        return request;
      },
    );
  }

  async assessDeletionImpact(
    command: AssessDeletionImpactCommand,
  ): Promise<DeletionRequest> {
    const scope = scopeFromContext(command.context.request);
    await this.authorize(command.context, scope, "request_deletion", true);
    return await this.runIdempotent(
      command.context,
      command.idempotencyKey,
      "assess_deletion_impact",
      command.requestId,
      command,
      async (store) => {
        const governance = await requireGovernance(store, scope);
        const request = await requireDeletionRequest(
          store,
          scope,
          command.requestId,
        );
        const next = assessDeletionImpact(
          request,
          command.impact,
          command.context.now,
          command.expectedVersion,
        );
        await store.saveDeletionRequest(next, request.version);
        await this.record(
          store,
          command.context,
          governance,
          "DeletionImpactAssessed",
          { requestId: next.id, categories: command.impact.categories },
        );
        return next;
      },
    );
  }

  async submitDeletionRequest(
    command: SubmitDeletionRequestCommand,
  ): Promise<DeletionRequest> {
    const scope = scopeFromContext(command.context.request);
    await this.authorize(command.context, scope, "request_deletion", true);
    return await this.runIdempotent(
      command.context,
      command.idempotencyKey,
      "submit_deletion_request",
      command.requestId,
      command,
      async (store) => {
        const governance = await requireGovernance(store, scope);
        const request = await requireDeletionRequest(
          store,
          scope,
          command.requestId,
        );
        const next = submitDeletionRequest(
          request,
          command.expectedVersion,
          command.context.now,
        );
        await store.saveDeletionRequest(next, request.version);
        await this.record(
          store,
          command.context,
          governance,
          "DeletionApprovalRequested",
          { requestId: next.id },
        );
        return next;
      },
    );
  }

  async decideDeletionRequest(
    command: DecideDeletionRequestCommand,
  ): Promise<DeletionRequest> {
    const scope = scopeFromContext(command.context.request);
    await this.authorize(command.context, scope, "approve_deletion", true);
    return await this.runIdempotent(
      command.context,
      command.idempotencyKey,
      "decide_deletion_request",
      command.requestId,
      command,
      async (store) => {
        const governance = await requireGovernance(store, scope);
        const request = await requireDeletionRequest(
          store,
          scope,
          command.requestId,
        );
        if (command.decision === "approve") {
          const holds = await store.listHolds(scope);
          if (holds.some((hold) => hold.state === "active")) {
            throw new DealGovernanceError(
              "LEGAL_HOLD_ACTIVE",
              `Deletion request "${request.id}" is blocked by an active legal hold; expected hold dominance.`,
            );
          }
        }
        const next = command.decision === "approve"
          ? approveDeletionRequest(request, {
            expectedVersion: command.expectedVersion,
            actorId: command.context.actor.id,
            actorKind: command.context.actor.kind,
            role: command.role,
            now: command.context.now,
            waitingPeriodMs: command.waitingPeriodMs,
            approvalId: this.dependencies.ids.nextDeletionApprovalId(),
          })
          : rejectDeletionRequest(request, {
            expectedVersion: command.expectedVersion,
            actorId: command.context.actor.id,
            actorKind: command.context.actor.kind,
            role: command.role,
            now: command.context.now,
            approvalId: this.dependencies.ids.nextDeletionApprovalId(),
          });
        await store.saveDeletionRequest(next, request.version);
        await this.record(
          store,
          command.context,
          governance,
          command.decision === "approve"
            ? "DeletionApproved"
            : "DeletionRejected",
          { requestId: next.id, role: command.role },
        );
        return next;
      },
    );
  }

  async cancelDeletionRequest(
    command: CancelDeletionRequestCommand,
  ): Promise<DeletionRequest> {
    const scope = scopeFromContext(command.context.request);
    await this.authorize(command.context, scope, "request_deletion", true);
    return await this.runIdempotent(
      command.context,
      command.idempotencyKey,
      "cancel_deletion_request",
      command.requestId,
      command,
      async (store) => {
        const governance = await requireGovernance(store, scope);
        const request = await requireDeletionRequest(
          store,
          scope,
          command.requestId,
        );
        const next = cancelDeletionRequest(
          request,
          command.expectedVersion,
          command.context.now,
        );
        await store.saveDeletionRequest(next, request.version);
        await this.record(
          store,
          command.context,
          governance,
          "DeletionCancelled",
          { requestId: next.id },
        );
        return next;
      },
    );
  }

  async startOrchestration(
    command: StartOrchestrationCommand,
  ): Promise<OrchestrationResult> {
    const scope = scopeFromContext(command.context.request);
    await this.authorize(command.context, scope, "execute_deletion", true);
    return await this.runIdempotent(
      command.context,
      command.idempotencyKey,
      "start_erasure_orchestration",
      command.requestId,
      command,
      async (store) => {
        const request = await requireDeletionRequest(
          store,
          scope,
          command.requestId,
        );
        const retention = await store.findRetention(scope);
        const holds = await store.listHolds(scope);
        const assessment = assessRetention({
          state: "archived",
          assignment: retention,
          holds,
          now: command.context.now,
        });
        if (!assessment.eligible) {
          throw retentionError(
            assessment.code,
            assessment.message,
          );
        }
        const scheduled = request.state === "waiting_period"
          ? scheduleDeletionRequest(
            request,
            request.version,
            command.context.now,
          )
          : request;
        if (scheduled !== request) {
          await store.saveDeletionRequest(
            scheduled,
            request.version,
          );
        }
        const executing = startDeletionExecution(
          scheduled,
          scheduled.version,
          command.context.now,
        );
        await store.saveDeletionRequest(executing, scheduled.version);
        const gate = await this.resolveErasureGate(
          command.context,
          scope,
          executing.id,
          command.categories,
        );
        const orchestration = createErasureOrchestration({
          request: executing,
          categories: command.categories,
          gate,
          now: command.context.now,
          id: this.dependencies.ids.nextOrchestrationId(),
        });
        await store.saveOrchestration(orchestration);
        const result = await this.runOrchestration(
          store,
          command.context,
          executing,
          orchestration,
        );
        return result;
      },
    );
  }

  async resumeOrchestration(
    command: ResumeOrchestrationCommand,
  ): Promise<OrchestrationResult> {
    const scope = scopeFromContext(command.context.request);
    await this.authorize(command.context, scope, "execute_deletion", true);
    return await this.runIdempotent(
      command.context,
      command.idempotencyKey,
      "resume_erasure_orchestration",
      command.orchestrationId,
      command,
      async (store) => {
        const orchestration = await store.findOrchestration(
          scope,
          command.orchestrationId,
        );
        if (orchestration === undefined) {
          throw new GovernanceInvariantError(
            `Orchestration "${command.orchestrationId}" was not found; expected a scoped resumable orchestration.`,
          );
        }
        const request = await requireDeletionRequest(
          store,
          scope,
          orchestration.requestId,
        );
        assertExpectedVersion(
          orchestration.version,
          command.expectedVersion,
          orchestration.id,
        );
        const gate = await this.resolveErasureGate(
          command.context,
          scope,
          request.id,
          orchestration.steps.map((step) => step.category),
        );
        const refreshed = refreshErasureGate(
          orchestration,
          gate,
          command.context.now,
        );
        if (refreshed !== orchestration) {
          await store.saveOrchestration(refreshed, orchestration.version);
        }
        const started = startOrchestration(
          refreshed,
          refreshed.version,
          command.context.now,
        );
        await store.saveOrchestration(started, refreshed.version);
        return await this.runOrchestration(
          store,
          command.context,
          request,
          started,
        );
      },
    );
  }

  private async runOrchestration(
    store: DealGovernanceStore,
    context: GovernanceCommandContext,
    request: DeletionRequest,
    initial: ErasureOrchestration,
  ): Promise<OrchestrationResult> {
    let orchestration = initial.state === "queued"
      ? startOrchestration(initial, initial.version, context.now)
      : initial;
    if (orchestration !== initial) {
      await store.saveOrchestration(orchestration, initial.version);
    }
    while (orchestration.state === "running") {
      const step = orchestration.steps[orchestration.nextStepIndex];
      if (step === undefined) break;
      const currentGate = await this.resolveErasureGate(
        context,
        orchestration.scope,
        request.id,
        orchestration.steps.map((item) => item.category),
      );
      const refreshed = refreshErasureGate(
        orchestration,
        currentGate,
        context.now,
      );
      if (refreshed !== orchestration) {
        await store.saveOrchestration(refreshed, orchestration.version);
        orchestration = refreshed;
      }
      const holds = await store.listHolds(orchestration.scope);
      const previousVersion = orchestration.version;
      try {
        const outcome = await this.stepOutcome(
          orchestration,
          request,
          step.category,
          holds,
          context,
        );
        orchestration = recordOrchestrationStep(orchestration, {
          expectedVersion: previousVersion,
          now: context.now,
          outcome,
        });
      } catch (error) {
        orchestration = recordOrchestrationStep(orchestration, {
          expectedVersion: previousVersion,
          now: context.now,
          failure: error instanceof Error ? error.message : String(error),
        });
      }
      await store.saveOrchestration(orchestration, previousVersion);
    }
    const manifest = createErasureManifest({
      orchestration,
      actorId: context.actor.id,
      now: context.now,
      id: this.dependencies.ids.nextManifestId(),
    });
    await store.saveManifest(manifest);
    const completed = orchestration.state === "completed"
      ? completeDeletionRequest(
        request,
        request.version,
        context.now,
        manifest.status === "verified",
      )
      : request;
    if (completed !== request) {
      await store.saveDeletionRequest(completed, request.version);
    }
    await this.record(
      store,
      context,
      orchestrationToAggregate(orchestration),
      "ErasureManifestRecorded",
      {
        requestId: request.id,
        manifestId: manifest.id,
        status: manifest.status,
        limitations: manifest.limitations,
      },
    );
    return { orchestration, manifest, deletionRequest: completed };
  }

  private async stepOutcome(
    orchestration: ErasureOrchestration,
    request: DeletionRequest,
    category: string,
    holds: readonly LegalHold[],
    context: GovernanceCommandContext,
  ) {
    if (holdAffectsCategory(holds, category)) {
      return { disposition: "retained" as const, reason: "LEGAL_HOLD_ACTIVE" };
    }
    if (!orchestration.gate.physicalErasureEnabled) {
      return {
        disposition: "retained" as const,
        reason: orchestration.gate.resolutionReason,
      };
    }
    if (this.dependencies.erasureExecutor === undefined) {
      return {
        disposition: "retained" as const,
        reason: "NO_APPROVED_ERASURE_EXECUTOR",
      };
    }
    try {
      const result = await this.dependencies.erasureExecutor.erase({
        scope: orchestration.scope,
        category,
        requestId: request.id,
        actorId: context.actor.id,
        correlationId: context.request.correlationId,
      });
      if (result.proofReference.trim().length === 0) {
        throw new DealGovernanceError(
          "ERASURE_PROOF_REQUIRED",
          `Erasure executor returned an empty proof for category "${category}"; expected an immutable downstream proof reference.`,
        );
      }
      return {
        disposition: "erased" as const,
        reason: "DOWNSTREAM_ERASURE_PROOF",
        proofReference: result.proofReference,
      };
    } catch (error) {
      throw new DealGovernanceError(
        "ORCHESTRATION_BLOCKED",
        `Erasure executor failed for category "${category}" with "${
          error instanceof Error ? error.message : String(error)
        }"; expected resumable retry.`,
      );
    }
  }

  private async resolveErasureGate(
    context: GovernanceCommandContext,
    scope: GovernanceScope,
    requestId: DeletionRequestId,
    categories: readonly string[],
  ): Promise<ErasureGate> {
    try {
      const evaluationContext = {
        ...context,
        now: this.dependencies.clock.now(),
      };
      const evidence = await this.dependencies.erasureGateEvidence.resolve({
        context: evaluationContext,
        scope,
        requestId,
        categories,
      });
      return resolveTrustedErasureGate({
        evidence,
        context: evaluationContext,
        scope,
        requestId,
        categories,
        now: evaluationContext.now,
      });
    } catch (_error) {
      return defaultDeniedErasureGate(
        this.dependencies.clock.now(),
        "TRUSTED_ERASURE_GATE_RESOLUTION_FAILED_PHYSICAL_ERASURE_DISABLED",
      );
    }
  }

  private async runIdempotent<T>(
    context: GovernanceCommandContext,
    idempotencyKey: import("../shared/contracts/identifiers.ts").IdempotencyKey,
    commandType: string,
    targetId: string,
    payload: unknown,
    callback: (store: DealGovernanceStore) => Promise<T>,
  ): Promise<T> {
    const scope = scopeFromContext(context.request);
    const digest = await payloadDigest({
      commandType,
      targetId,
      payload: withoutVolatileContext(payload),
    });
    const identity: CommandIdentity = {
      scope,
      actorId: context.actor.id,
      commandType,
      targetId,
      idempotencyKey,
    };
    return await this.dependencies.repository.transaction(async (store) => {
      const claim = await store.claimCommand(identity, digest);
      if (claim.state === "replay") return claim.result as T;
      if (claim.state === "in_progress") {
        throw new GovernanceErrorForInProgress(idempotencyKey);
      }
      const result = await callback(store);
      await store.completeCommand(identity, digest, result);
      return result;
    });
  }

  private async authorize(
    context: GovernanceCommandContext,
    scope: GovernanceScope,
    actionName: GovernanceAuthorizationInput["action"],
    humanOnly: boolean,
  ): Promise<void> {
    if (context.request.actorId !== context.actor.id) {
      throw new GovernanceAuthorizationError(
        "ACTOR_CONTEXT_MISMATCH",
        context.actor.id,
      );
    }
    if (context.actor.state !== "active") {
      throw new GovernanceAuthorizationError(
        "ACTOR_INACTIVE",
        context.actor.id,
      );
    }
    if (humanOnly && context.actor.kind !== "human") {
      throw new GovernanceAuthorizationError(
        "HUMAN_AUTHORITY_REQUIRED",
        context.actor.id,
      );
    }
    const decision = await this.dependencies.authorization.authorize({
      context,
      scope,
      action: actionName,
      humanOnly,
    });
    if (decision === true) return;
    if (decision === false || decision.outcome === "deny") {
      throw new GovernanceAuthorizationError(
        decision === false ? "AUTHORIZATION_DENIED" : decision.reasonCode,
        context.actor.id,
      );
    }
  }

  private async record(
    store: DealGovernanceStore,
    context: GovernanceCommandContext,
    aggregate: DealGovernanceAggregate,
    eventType: string,
    payload: Readonly<Record<string, unknown>>,
  ): Promise<void> {
    const event: GovernanceEvent = {
      eventId: this.dependencies.ids.nextEventId(),
      scope: aggregate.scope,
      actorId: context.actor.id,
      actorKind: context.actor.kind,
      correlationId: context.request.correlationId,
      aggregateVersion: aggregate.version,
      eventType,
      schemaVersion: 1,
      payload,
      occurredAt: context.now,
    };
    const outbox: OutboxEvent = {
      eventId: `outbox_${event.eventId}`,
      tenantId: aggregate.scope.tenantId,
      workspaceId: aggregate.scope.workspaceId,
      dealId: aggregate.scope.dealId,
      aggregateType: "deal_governance",
      aggregateId: aggregate.id,
      aggregateVersion: aggregate.version as AggregateVersion,
      eventType,
      schemaVersion: 1,
      payload: { ...payload, governanceEventId: event.eventId },
      correlationId: context.request.correlationId,
      occurredAt: new Date(context.now),
      availableAt: new Date(context.now),
    };
    await store.appendEvent(event);
    await store.appendOutbox(outbox);
  }
}

class GovernanceErrorForInProgress extends DealGovernanceError {
  constructor(idempotencyKey: string) {
    super(
      "GOVERNANCE_IDEMPOTENCY_CONFLICT",
      `Governance command "${idempotencyKey}" is already in progress; expected a retry after completion.`,
    );
    this.name = "GovernanceErrorForInProgress";
  }
}

async function readResult(
  store: DealGovernanceStore,
  governance: DealGovernanceAggregate,
): Promise<GovernanceReadResult> {
  const retention = await store.findRetention(governance.scope);
  const holds = await store.listHolds(governance.scope);
  const deletionRequest = governance.deletionRequestId === undefined
    ? undefined
    : await store.findDeletionRequest(
      governance.scope,
      governance.deletionRequestId,
    );
  return {
    governance,
    ...(retention === undefined ? {} : { retention }),
    holds,
    ...(deletionRequest === undefined ? {} : { deletionRequest }),
  };
}

async function requireGovernance(
  store: DealGovernanceStore,
  scope: GovernanceScope,
): Promise<DealGovernanceAggregate> {
  const aggregate = await store.findGovernance(scope);
  if (aggregate !== undefined) return aggregate;
  throw new GovernanceInvariantError(
    `Governance aggregate for deal "${scope.dealId}" was not found; expected initialization before a protected command.`,
  );
}

async function requireDeletionRequest(
  store: DealGovernanceStore,
  scope: GovernanceScope,
  id: string,
): Promise<DeletionRequest> {
  const request = await store.findDeletionRequest(scope, id);
  if (request !== undefined) return request;
  throw new GovernanceInvariantError(
    `Deletion request "${id}" was not found in deal "${scope.dealId}"; expected a scoped request.`,
  );
}

function scopeFromContext(context: RequestContext): GovernanceScope {
  if (context.workspaceId !== undefined && context.dealId !== undefined) {
    return {
      tenantId: context.tenantId,
      workspaceId: context.workspaceId,
      dealId: context.dealId,
    };
  }
  throw new GovernanceInvariantError(
    `Governance request for tenant "${context.tenantId}" lacks workspace or deal scope; expected both identifiers.`,
  );
}

function assertExpectedVersion(
  current: number,
  expected: number,
  aggregateId: string,
): void {
  if (current === expected) return;
  throw new DealGovernanceError(
    "GOVERNANCE_VERSION_CONFLICT",
    `Governance aggregate "${aggregateId}" version "${current}" conflicts with expected version "${expected}".`,
  );
}

function retentionError(code: string, message: string): DealGovernanceError {
  return new DealGovernanceError(
    code === "LEGAL_HOLD_ACTIVE" ? "LEGAL_HOLD_ACTIVE" : "RETENTION_BLOCKED",
    message,
  );
}

function mandatoryRetentionBlocksArchive(
  retention: RetentionAssignment | undefined,
  assessmentCode: string,
  action: GovernanceAction,
): boolean {
  return action === "archive" && retention?.mandatory === true &&
    assessmentCode === "RETENTION_WINDOW_OPEN";
}

function authoritativePreviewError(
  preview: ConsequencePreview,
): DealGovernanceError {
  const blocker = preview.blockers[0];
  if (blocker?.code === "ACTIVE_LEGAL_HOLD") {
    return new DealGovernanceError("LEGAL_HOLD_ACTIVE", blocker.message);
  }
  if (blocker?.code === "MANDATORY_RETENTION") {
    return new DealGovernanceError("RETENTION_BLOCKED", blocker.message);
  }
  return new DealGovernanceError(
    "INVALID_STATE_TRANSITION",
    blocker?.message ??
      `Consequence preview "${preview.previewId}" is blocked; expected an allowed current transition.`,
  );
}

function orchestrationToAggregate(
  orchestration: ErasureOrchestration,
): DealGovernanceAggregate {
  return {
    aggregateType: "deal_governance",
    id: `governance_${
      orchestration.scope.dealId.slice(5)
    }` as DealGovernanceAggregate["id"],
    scope: orchestration.scope,
    version: orchestration.version,
    state: "archived",
    activeLegalHoldIds: [],
    createdAt: orchestration.createdAt,
    updatedAt: orchestration.updatedAt,
  };
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

async function payloadDigest(value: unknown): Promise<string> {
  const bytes = new TextEncoder().encode(stableSerialize(value));
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(
    new Uint8Array(digest),
    (part) => part.toString(16).padStart(2, "0"),
  ).join("");
}

function withoutVolatileContext(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(withoutVolatileContext);
  if (value === null || typeof value !== "object") return value;
  const object = value as Record<string, unknown>;
  return Object.fromEntries(
    Object.entries(object)
      .filter(([key]) => key !== "context")
      .map(([key, item]) => [key, withoutVolatileContext(item)]),
  );
}

function stableSerialize(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value) ?? "null";
  }
  if (Array.isArray(value)) return `[${value.map(stableSerialize).join(",")}]`;
  const object = value as Record<string, unknown>;
  return `{${
    Object.keys(object).sort().map((key) =>
      `${JSON.stringify(key)}:${stableSerialize(object[key])}`
    ).join(",")
  }}`;
}
