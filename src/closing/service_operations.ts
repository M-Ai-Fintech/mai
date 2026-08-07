import type { ActorReference } from "../platform/authz/v1.ts";
import type { IdempotencyKey } from "../platform/api/v1.ts";
import { createBlocker, resolveBlocker } from "./blockers.ts";
import {
  acceptConditionEvidence,
  type ConditionEvidence,
  createCondition,
  satisfyCondition,
  submitConditionEvidence,
} from "./conditions.ts";
import { completionRecordId, type ConditionId } from "./ids.ts";
import {
  type ChecklistRequirement,
  ClosingError,
  type ClosingScope,
  type ClosingWorkspace,
  createChecklistRequirement,
  createClosingWorkspace,
} from "./model.ts";
import { approveClosingReadiness } from "./readiness.ts";
import type { ClosingCommandResult } from "./repository.ts";
import {
  acceptSignatureEvidence,
  completeSignaturePackage,
  createSignatureEvidence,
  createSignaturePackage,
} from "./signatures.ts";
import {
  assertClosingTransition,
  type ClosingStatus,
  isIrreversibleStatus,
} from "./transitions.ts";
import {
  approveWaiver,
  confirmWaiverLegalReview,
  createWaiver,
} from "./waivers.ts";
import {
  appendEffects,
  assertCompletionPreconditions,
  assertHumanActor,
  commandIdentity,
  recordCreation,
  replaceBlocker,
  replaceCondition,
  replaceConditionByWaiver,
  replaceSignatureEvidence,
  replaceSignaturePackage,
  replaceWaiver,
} from "./service_support.ts";
import type {
  ClosingAuthorityCommandInput,
  ClosingCommandInput,
} from "./service.ts";
import { ClosingServiceRuntime } from "./service_runtime.ts";

export class ClosingServiceOperations extends ClosingServiceRuntime {
  async createWorkspace(input: {
    readonly scope: ClosingScope;
    readonly closingWorkspaceId: string;
    readonly actor: ActorReference;
    readonly idempotencyKey: IdempotencyKey;
    readonly confirmationEnabled?: boolean;
  }): Promise<ClosingCommandResult> {
    assertHumanActor(input.actor, "create a closing workspace");
    const now = this.dependencies.clock.now();
    const workspace = createClosingWorkspace({
      closingWorkspaceId: input.closingWorkspaceId,
      scope: input.scope,
      confirmationEnabled: input.confirmationEnabled,
      now,
    });
    const identity = await commandIdentity(
      input.scope,
      input.actor,
      "closing_create_workspace",
      input.closingWorkspaceId,
      input.idempotencyKey,
      { workspace },
      now,
    );
    return this.dependencies.unitOfWork.run(identity, async (transaction) => {
      const recorded = recordCreation(workspace, input.actor, now);
      await transaction.insert(recorded);
      await appendEffects(
        this.effects,
        transaction,
        recorded,
        input.actor,
        "closing_created",
      );
      return recorded;
    });
  }

  getWorkspace(
    scope: ClosingScope,
    workspaceId: string,
  ): Promise<ClosingWorkspace | undefined> {
    return this.dependencies.unitOfWork.read((transaction) =>
      transaction.find(scope, workspaceId)
    );
  }

  transition(
    input: ClosingCommandInput & { readonly to: ClosingStatus },
  ): Promise<ClosingCommandResult> {
    return this.mutate(
      input,
      "closing_transition",
      { to: input.to },
      (workspace) => {
        assertClosingTransition(workspace.status, input.to);
        return { status: input.to };
      },
    );
  }

  addRequirement(
    input: ClosingCommandInput,
    requirement: ChecklistRequirement,
  ): Promise<ClosingCommandResult> {
    const normalized = createChecklistRequirement(requirement);
    return this.mutate(input, "closing_add_requirement", {
      requirement: normalized,
    }, (workspace) => ({
      requirements: [...workspace.requirements, normalized],
    }));
  }

  addCondition(
    input: ClosingCommandInput,
    conditionInput: Parameters<typeof createCondition>[0],
  ): Promise<ClosingCommandResult> {
    const condition = createCondition(conditionInput);
    return this.mutate(
      input,
      "closing_add_condition",
      { condition },
      (workspace) => ({
        conditions: [...workspace.conditions, condition],
      }),
    );
  }

  submitConditionEvidence(
    input: ClosingCommandInput,
    conditionId: ConditionId,
    evidence: Omit<ConditionEvidence, "evidenceId" | "state"> & {
      readonly evidenceId: string;
    },
  ): Promise<ClosingCommandResult> {
    return this.mutate(input, "closing_submit_evidence", {
      conditionId,
      evidence,
    }, (workspace) => ({
      conditions: replaceCondition(
        workspace,
        conditionId,
        (condition) => submitConditionEvidence(condition, evidence),
      ),
    }));
  }

  acceptConditionEvidence(
    input: ClosingCommandInput,
    conditionId: ConditionId,
    evidenceId: string,
  ): Promise<ClosingCommandResult> {
    return this.mutate(input, "closing_accept_evidence", {
      conditionId,
      evidenceId,
    }, (workspace) => ({
      conditions: replaceCondition(
        workspace,
        conditionId,
        (condition) =>
          acceptConditionEvidence(
            condition,
            evidenceId,
            input.actor.id,
            this.dependencies.clock.now(),
          ),
      ),
    }));
  }

  satisfyCondition(
    input: ClosingCommandInput,
    conditionId: ConditionId,
  ): Promise<ClosingCommandResult> {
    return this.mutate(
      input,
      "closing_satisfy_condition",
      { conditionId },
      (workspace) => ({
        conditions: replaceCondition(
          workspace,
          conditionId,
          (condition) =>
            satisfyCondition(
              condition,
              input.actor.id,
              this.dependencies.clock.now(),
            ),
        ),
      }),
    );
  }

  proposeWaiver(
    input: ClosingCommandInput,
    waiverInput: Parameters<typeof createWaiver>[0],
  ): Promise<ClosingCommandResult> {
    const waiver = createWaiver(waiverInput);
    return this.mutate(
      input,
      "closing_propose_waiver",
      { waiver },
      (workspace) => ({
        waivers: [...workspace.waivers, waiver],
        conditions: replaceCondition(
          workspace,
          waiver.conditionId,
          (condition) => ({ ...condition, state: "waiver_proposed" }),
        ),
      }),
    );
  }

  confirmWaiverLegalReview(
    input: ClosingCommandInput,
    waiverId: string,
  ): Promise<ClosingCommandResult> {
    return this.mutate(
      input,
      "closing_confirm_waiver_review",
      { waiverId },
      (workspace) => ({
        waivers: replaceWaiver(workspace, waiverId, confirmWaiverLegalReview),
      }),
    );
  }

  approveWaiver(
    input: ClosingAuthorityCommandInput,
    waiverId: string,
  ): Promise<ClosingCommandResult> {
    return this.authorizedMutation(input, "closing_approve_waiver", {
      waiverId,
    }, (workspace, authority) => ({
      waivers: replaceWaiver(workspace, waiverId, (waiver) =>
        approveWaiver(
          waiver,
          authority.actor.id,
          this.dependencies.clock.now(),
        )),
      conditions: replaceConditionByWaiver(workspace, waiverId, "waived"),
    }));
  }

  addBlocker(
    input: ClosingCommandInput,
    blockerInput: Parameters<typeof createBlocker>[0],
  ): Promise<ClosingCommandResult> {
    const blocker = createBlocker(blockerInput);
    return this.mutate(
      input,
      "closing_add_blocker",
      { blocker },
      (workspace) => ({
        blockers: [...workspace.blockers, blocker],
      }),
    );
  }

  resolveBlocker(
    input: ClosingCommandInput,
    blockerId: string,
    resolution: string,
  ): Promise<ClosingCommandResult> {
    return this.mutate(input, "closing_resolve_blocker", {
      blockerId,
      resolution,
    }, (workspace) => ({
      blockers: replaceBlocker(
        workspace,
        blockerId,
        (blocker) =>
          resolveBlocker(
            blocker,
            input.actor.id,
            resolution,
            this.dependencies.clock.now(),
          ),
      ),
    }));
  }

  recordSignatureEvidence(
    input: ClosingCommandInput,
    evidenceInput: Parameters<typeof createSignatureEvidence>[0],
  ): Promise<ClosingCommandResult> {
    const evidence = createSignatureEvidence(evidenceInput);
    return this.mutate(
      input,
      "closing_record_signature_evidence",
      { evidence },
      (workspace) => ({
        signatures: [...workspace.signatures, evidence],
      }),
    );
  }

  acceptSignatureEvidence(
    input: ClosingCommandInput,
    evidenceId: string,
  ): Promise<ClosingCommandResult> {
    return this.mutate(input, "closing_accept_signature_evidence", {
      evidenceId,
    }, (workspace) => ({
      signatures: replaceSignatureEvidence(
        workspace,
        evidenceId,
        (evidence) =>
          acceptSignatureEvidence(
            evidence,
            input.actor.id,
            this.dependencies.clock.now(),
          ),
      ),
    }));
  }

  createSignaturePackage(
    input: ClosingCommandInput,
    packageInput: Parameters<typeof createSignaturePackage>[0],
  ): Promise<ClosingCommandResult> {
    const signaturePackage = createSignaturePackage(packageInput);
    return this.mutate(input, "closing_create_signature_package", {
      signaturePackage,
    }, (workspace) => ({
      signaturePackages: [...workspace.signaturePackages, signaturePackage],
    }), true);
  }

  completeSignaturePackage(
    input: ClosingCommandInput,
    packageId: string,
  ): Promise<ClosingCommandResult> {
    return this.mutate(input, "closing_complete_signature_package", {
      packageId,
    }, (workspace) => ({
      signaturePackages: replaceSignaturePackage(
        workspace,
        packageId,
        (signaturePackage) =>
          completeSignaturePackage(
            signaturePackage,
            workspace.signatures,
            this.dependencies.clock.now(),
          ),
      ),
    }), true);
  }

  startReadinessReview(
    input: ClosingCommandInput,
  ): Promise<ClosingCommandResult> {
    return this.transition({ ...input, to: "closing_review" });
  }

  approveReadiness(
    input: ClosingAuthorityCommandInput,
  ): Promise<ClosingCommandResult> {
    return this.authorizedMutation(
      input,
      "closing_approve_readiness",
      {},
      (workspace, authority) => {
        const approved = approveClosingReadiness({
          workspace,
          readinessApprovalId: `readiness_${workspace.version}-${
            input.workspaceId.slice("closing_".length)
          }`,
          actorId: authority.actor.id,
          authorityProofId: authority.proof.proofId,
          now: this.dependencies.clock.now(),
        });
        return { status: approved.status, readiness: approved.readiness };
      },
      false,
      false,
    );
  }

  beginClosing(
    input: ClosingAuthorityCommandInput,
  ): Promise<ClosingCommandResult> {
    return this.authorizedMutation(
      input,
      "closing_begin",
      {},
      (workspace) => {
        assertClosingTransition(workspace.status, "closing_in_progress");
        return { status: "closing_in_progress" };
      },
      false,
      false,
    );
  }

  confirmCompletion(
    input: ClosingAuthorityCommandInput & {
      readonly paymentsEvidence: readonly string[];
      readonly transferEvidence: readonly string[];
      readonly finalExceptions: readonly string[];
      readonly pendingEvidence: readonly string[];
      readonly effectiveAt: string;
    },
  ): Promise<ClosingCommandResult> {
    return this.authorizedMutation(
      input,
      "closing_confirm_completion",
      {
        paymentsEvidence: input.paymentsEvidence,
        transferEvidence: input.transferEvidence,
        finalExceptions: input.finalExceptions,
        pendingEvidence: input.pendingEvidence,
        effectiveAt: input.effectiveAt,
      },
      (workspace, authority) => {
        assertCompletionPreconditions(workspace, input);
        const nextStatus = input.pendingEvidence.length === 0
          ? "closed"
          : "closed_pending_evidence";
        assertClosingTransition(workspace.status, nextStatus);
        const completion = {
          completionRecordId: completionRecordId(
            `completion_${workspace.version}-${
              workspace.closingWorkspaceId.slice("closing_".length)
            }`,
          ),
          confirmedBy: authority.actor.id,
          authorityProofId: authority.proof.proofId,
          paymentsEvidence: Object.freeze([...input.paymentsEvidence]),
          transferEvidence: Object.freeze([...input.transferEvidence]),
          finalExceptions: Object.freeze([...input.finalExceptions]),
          pendingEvidence: Object.freeze([...input.pendingEvidence]),
          confirmedAt: this.dependencies.clock.now(),
          effectiveAt: input.effectiveAt,
          irreversible: true as const,
        };
        return { status: nextStatus, completion: Object.freeze(completion) };
      },
      false,
      false,
    );
  }

  abort(input: ClosingCommandInput): Promise<ClosingCommandResult> {
    return this.mutate(
      input,
      "closing_abort",
      {},
      (workspace) => {
        if (
          workspace.completion !== undefined ||
          isIrreversibleStatus(workspace.status)
        ) {
          throw new ClosingError(
            "IRREVERSIBLE_CONFIRMATION",
            `Closing workspace "${workspace.closingWorkspaceId}" cannot abort after irreversible confirmation; expected compensation before completion.`,
          );
        }
        assertClosingTransition(workspace.status, "aborted");
        return { status: "aborted" };
      },
      false,
      false,
    );
  }
}
