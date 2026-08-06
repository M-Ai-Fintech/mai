import {
  buildServerApprovalPackageWithAuthority,
} from "./approval_package_factory.ts";
import { evaluateApprovalAuthority } from "./authority_evaluation.ts";
import {
  assertExpectedVersion,
  requireApproval,
} from "./application_helpers.ts";
import {
  type CommandInput,
  type CommandOutcome,
  outcome,
  semanticId,
  withPayload,
} from "./command_execution.ts";
import { WorkManagementAuthorityDeniedError } from "./command_unit_of_work.ts";
import type { WorkManagementApplicationContext } from "./application_types.ts";
import { approvalDecisionId, targetCommandType } from "./ids.ts";
import type { ApprovalRequestId } from "./ids.ts";
import {
  type ApprovalRequest,
  assertAuthorityEffective,
  type EvidenceSnapshotReference,
  type TargetReference,
  WorkManagementError,
} from "./model.ts";
import type { WorkManagementTransaction } from "./repository.ts";
import {
  createApprovalRequest,
  decideApprovalRequest,
  expireApprovalRequest,
  invalidateApprovalRequest,
  openApprovalRequest,
  withdrawApprovalRequest,
} from "./approval_requests.ts";
import type { WorkManagementEventType } from "./events.ts";

export class ApprovalApplicationService {
  constructor(private readonly context: WorkManagementApplicationContext) {}

  async createApprovalRequest(
    input: CommandInput<ApprovalRequestId> & {
      readonly namedApproverId: ApprovalRequest["namedApproverId"];
      readonly requestedAction: string;
      readonly target: TargetReference;
      readonly evidence: readonly EvidenceSnapshotReference[];
      readonly payload: Readonly<Record<string, unknown>>;
      readonly claimedDigest?: string;
    },
  ): Promise<ApprovalRequest> {
    const authorization = await this.context.authorization.requireAllowed(
      input,
      "create",
      "approval_request",
      true,
    );
    return await this.context.commands.execute(
      withPayload(input, approvalPayload(input)),
      "create_approval_request",
      "approval_request",
      (transaction) =>
        createWithinTransaction(
          this.context,
          transaction,
          input,
          authorization,
        ),
    );
  }

  openApprovalRequest(
    input: CommandInput<ApprovalRequestId>,
  ): Promise<ApprovalRequest> {
    return this.transitionApproval(
      input,
      "open",
      "approval.requested",
      (current) => openApprovalRequest(current, this.transitionInput(input)),
    );
  }

  async decideApprovalRequest(
    input: CommandInput<ApprovalRequestId> & {
      readonly outcome: "approved" | "rejected";
    },
  ): Promise<ApprovalRequest> {
    const actionName = input.outcome === "approved" ? "approve" : "reject";
    await this.context.authorization.requireAllowed(
      input,
      actionName,
      "approval_request",
      true,
    );
    await this.reauthorizeApprovalState(input, actionName);
    const commandType = `${actionName}_approval_request`;
    return await this.context.commands.execute(
      withPayload(input, { outcome: input.outcome, reason: input.reason }),
      commandType,
      "approval_request",
      (transaction, digest) =>
        decideWithinTransaction(
          this.context,
          transaction,
          input,
          actionName,
          commandType,
          digest,
        ),
    );
  }

  withdrawApprovalRequest(
    input: CommandInput<ApprovalRequestId>,
  ): Promise<ApprovalRequest> {
    return this.transitionApproval(
      input,
      "withdraw",
      "approval.withdrawn",
      (current) =>
        withdrawApprovalRequest(current, this.transitionInput(input)),
    );
  }

  invalidateApprovalRequest(
    input: CommandInput<ApprovalRequestId>,
  ): Promise<ApprovalRequest> {
    if (input.reason === undefined) {
      throw new WorkManagementError(
        "INVALID_INPUT",
        `Approval Request "${input.id}" invalidation reason is missing; expected governed dependency evidence.`,
      );
    }
    return this.transitionApproval(
      input,
      "invalidate",
      "approval.invalidated",
      (current) =>
        invalidateApprovalRequest(current, {
          reason: input.reason as string,
          now: this.context.options.clock.now(),
        }),
      false,
    );
  }

  expireApprovalRequest(
    input: CommandInput<ApprovalRequestId>,
  ): Promise<ApprovalRequest> {
    return this.transitionApproval(
      input,
      "expire",
      "approval.expired",
      (current) =>
        expireApprovalRequest(current, {
          now: this.context.options.clock.now(),
        }),
      false,
    );
  }

  private async transitionApproval(
    input: CommandInput<ApprovalRequestId>,
    actionName: string,
    eventType: WorkManagementEventType,
    transition: (current: ApprovalRequest) => ApprovalRequest,
    humanOnly = true,
  ): Promise<ApprovalRequest> {
    await this.context.authorization.requireAllowed(
      input,
      actionName,
      "approval_request",
      humanOnly,
    );
    await this.reauthorizeApprovalState(input, actionName, humanOnly);
    return await this.context.commands.execute(
      withPayload(input, { reason: input.reason }),
      `${actionName}_approval_request`,
      "approval_request",
      (transaction) =>
        transitionWithinTransaction(
          this.context,
          transaction,
          input,
          actionName,
          humanOnly,
          eventType,
          transition,
        ),
    );
  }

  private transitionInput(
    input: CommandInput<ApprovalRequestId>,
  ): {
    readonly actor: CommandInput<ApprovalRequestId>["actor"];
    readonly now: string;
  } {
    return { actor: input.actor, now: this.context.options.clock.now() };
  }

  private async reauthorizeApprovalState(
    input: CommandInput<ApprovalRequestId>,
    actionName: string,
    humanOnly = true,
  ): Promise<void> {
    await this.context.options.unitOfWork.read(async (transaction) => {
      const current = await requireApproval(transaction, input);
      await this.context.authorization.requireAllowed(
        input,
        actionName,
        "approval_request",
        humanOnly,
        current.state,
      );
    });
  }
}

function approvalPayload(
  input: CommandInput<ApprovalRequestId> & {
    readonly namedApproverId: ApprovalRequest["namedApproverId"];
    readonly requestedAction: string;
    readonly target: TargetReference;
    readonly evidence: readonly EvidenceSnapshotReference[];
    readonly payload: Readonly<Record<string, unknown>>;
    readonly claimedDigest?: string;
  },
): Readonly<Record<string, unknown>> {
  return {
    namedApproverId: input.namedApproverId,
    requestedAction: input.requestedAction,
    target: input.target,
    evidence: input.evidence,
    payload: input.payload,
    claimedDigest: input.claimedDigest,
  };
}

async function createWithinTransaction(
  context: WorkManagementApplicationContext,
  transaction: WorkManagementTransaction,
  input: CommandInput<ApprovalRequestId> & {
    readonly namedApproverId: ApprovalRequest["namedApproverId"];
    readonly requestedAction: string;
    readonly target: TargetReference;
    readonly evidence: readonly EvidenceSnapshotReference[];
    readonly payload: Readonly<Record<string, unknown>>;
    readonly claimedDigest?: string;
  },
  authorization: Awaited<
    ReturnType<
      WorkManagementApplicationContext["authorization"]["requireAllowed"]
    >
  >,
): Promise<CommandOutcome<ApprovalRequest>> {
  const packageResult = await buildServerApprovalPackageWithAuthority({
    requestId: input.id,
    scope: input.scope,
    requester: input.actor,
    now: context.options.clock.now(),
    namedApproverId: input.namedApproverId,
    requestedAction: targetCommandType(input.requestedAction),
    target: input.target,
    evidence: input.evidence,
    payload: input.payload,
    claimedDigest: input.claimedDigest,
    authorization,
    idempotencyIdentity:
      `${input.actor.id}|create_approval_request|${input.id}|${input.idempotencyKey}`,
  }, context.options);
  requireAuthorityFacts(context, input.id, packageResult.facts);
  if (packageResult.facts !== undefined) {
    const evaluation = await evaluateApprovalAuthority({
      package: packageResult.packageValue,
      expectedPackage: packageResult.packageValue,
      facts: packageResult.facts,
      evaluatedAt: context.options.clock.now(),
    });
    if (evaluation.outcome !== "allowed") {
      throw new WorkManagementAuthorityDeniedError(evaluation);
    }
    await transaction.appendAuthorityEvaluation(evaluation);
  }
  const value = createApprovalRequest({
    ...input.scope,
    id: input.id,
    requesterId: input.actor.id,
    namedApproverId: input.namedApproverId,
    package: packageResult.packageValue,
    now: context.options.clock.now(),
  });
  await transaction.saveApprovalRequest(value, 0);
  return outcome(value, "approval.draft_created");
}

function requireAuthorityFacts(
  context: WorkManagementApplicationContext,
  requestId: ApprovalRequestId,
  facts: unknown,
): asserts facts is NonNullable<typeof facts> {
  if (
    context.options.requireAuthorityEvaluation !== true ||
    facts !== undefined
  ) return;
  throw new WorkManagementError(
    "HUMAN_AUTHORITY_REQUIRED",
    `Approval Request "${requestId}" authority facts are unavailable; expected a trusted server authority evaluation before persistence.`,
  );
}

async function decideWithinTransaction(
  context: WorkManagementApplicationContext,
  transaction: WorkManagementTransaction,
  input: CommandInput<ApprovalRequestId> & {
    readonly outcome: "approved" | "rejected";
  },
  actionName: string,
  commandType: string,
  digest: string,
): Promise<CommandOutcome<ApprovalRequest>> {
  const current = await requireApproval(transaction, input);
  await context.authorization.requireAllowed(
    input,
    actionName,
    "approval_request",
    true,
    current.state,
  );
  assertAuthorityEffective(
    current.package.authority,
    context.options.clock.now(),
    current.package.id,
  );
  assertExpectedVersion(input.id, current.version, input.expectedVersion);
  const targetVersion = await context.options.targets.currentVersion(
    current.package.target,
  );
  const decisionId = approvalDecisionId(
    await semanticId(
      "decision",
      input,
      commandType,
      "approval_request",
      digest,
      `decision:${input.outcome}`,
    ),
  );
  const next = decideApprovalRequest(current, {
    actor: input.actor,
    expectedPackage: current.package,
    outcome: input.outcome,
    decisionId,
    currentTargetVersion: targetVersion,
    reason: input.reason,
    now: context.options.clock.now(),
  });
  await transaction.saveApprovalRequest(next, current.version);
  await transaction.appendApprovalDecision(next, next.decision!);
  const eventType = input.outcome === "approved"
    ? "approval.approved"
    : "approval.rejected";
  return {
    ...outcome(next, eventType),
    ...(input.outcome === "approved" ? { dispatchRequest: next } : {}),
  };
}

async function transitionWithinTransaction(
  context: WorkManagementApplicationContext,
  transaction: WorkManagementTransaction,
  input: CommandInput<ApprovalRequestId>,
  actionName: string,
  humanOnly: boolean,
  eventType: WorkManagementEventType,
  transition: (current: ApprovalRequest) => ApprovalRequest,
): Promise<CommandOutcome<ApprovalRequest>> {
  const current = await requireApproval(transaction, input);
  await context.authorization.requireAllowed(
    input,
    actionName,
    "approval_request",
    humanOnly,
    current.state,
  );
  const next = transition(current);
  await transaction.saveApprovalRequest(next, current.version);
  return outcome(next, eventType);
}
