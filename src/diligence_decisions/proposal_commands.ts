import {
  createDecisionRequest,
  createFinding,
  createImpact,
  type DecisionRequest,
  type DiligenceScope,
  type Finding,
  type Impact,
  transitionProposal,
} from "./model.ts";
import type { ExactEvidenceBasis } from "./basis.ts";
import type {
  CommandDependencies,
  CommandResult,
  CreateDecisionRequestCommand,
  CreateFindingCommand,
  CreateImpactCommand,
  TransitionFindingCommand,
  TransitionImpactCommand,
  TransitionProposalCommand,
} from "./contracts.ts";
import {
  appendEffect,
  assertActorMatchesContext,
  assertBasis,
  assertExpectedVersion,
  authorize,
  claim,
  complete,
  loadFinding,
  loadImpact,
  loadSubject,
  replayLoaded,
} from "./command_support.ts";
import type { TransactionHandle } from "../platform/persistence/v1.ts";
import { DiligenceDecisionError } from "./errors.ts";
import type { FindingId, ImpactId } from "./ids.ts";
import { proposalRule } from "./transition_tables.ts";

export class DiligenceProposalCommands {
  constructor(private readonly dependencies: CommandDependencies) {}

  async createFinding(
    input: CreateFindingCommand,
  ): Promise<CommandResult<Finding>> {
    assertActorMatchesContext(input.proposedBy, input.context);
    await authorize(
      this.dependencies,
      input,
      "finding",
      input.id,
      "create_finding",
    );
    await this.verifyBasis(input.context, input.scope, input.basis);
    const finding = createFinding({
      ...input,
      now: this.dependencies.clock.now(),
    });
    return this.persistFinding(input, finding);
  }

  async createImpact(
    input: CreateImpactCommand,
  ): Promise<CommandResult<Impact>> {
    assertActorMatchesContext(input.proposedBy, input.context);
    await authorize(
      this.dependencies,
      input,
      "impact",
      input.id,
      "create_impact",
    );
    await this.verifyBasis(input.context, input.scope, input.basis);
    const impact = createImpact({
      ...input,
      now: this.dependencies.clock.now(),
    });
    return this.persistImpact(input, impact);
  }

  async createDecisionRequest(
    input: CreateDecisionRequestCommand,
  ): Promise<CommandResult<DecisionRequest>> {
    assertActorMatchesContext(input.requester, input.context);
    await authorize(
      this.dependencies,
      input,
      "decision_request",
      input.id,
      "create_decision_request",
    );
    await this.verifyBasis(input.context, input.scope, input.basis);
    const request = createDecisionRequest({
      ...input,
      now: this.dependencies.clock.now(),
    });
    return this.persistRequest(input, request);
  }

  async transitionFinding(
    input: TransitionFindingCommand,
  ): Promise<CommandResult<Finding>> {
    await this.authorizeTransition(input);
    return this.dependencies.config.transactions.run((transaction) =>
      this.transitionProposal(
        transaction,
        input,
        () =>
          loadFinding(this.dependencies, transaction, input.scope, input.id),
        (id) =>
          this.dependencies.config.repository.findFinding(
            transaction,
            input.scope,
            id as FindingId,
          ),
        (value) =>
          this.dependencies.config.repository.updateFinding(
            transaction,
            value as Finding,
            input.expectedVersion,
          ),
      )
    );
  }

  async transitionImpact(
    input: TransitionImpactCommand,
  ): Promise<CommandResult<Impact>> {
    await this.authorizeTransition(input);
    return this.dependencies.config.transactions.run((transaction) =>
      this.transitionProposal(
        transaction,
        input,
        () => loadImpact(this.dependencies, transaction, input.scope, input.id),
        (id) =>
          this.dependencies.config.repository.findImpact(
            transaction,
            input.scope,
            id as ImpactId,
          ),
        (value) =>
          this.dependencies.config.repository.updateImpact(
            transaction,
            value as Impact,
            input.expectedVersion,
          ),
      )
    );
  }

  private verifyBasis(
    context: CreateFindingCommand["context"],
    scope: DiligenceScope,
    basis: ExactEvidenceBasis,
  ): Promise<void> {
    return this.dependencies.config.basis.verify(context, scope, basis);
  }

  private async authorizeTransition(
    input: TransitionProposalCommand,
  ): Promise<void> {
    await authorize(
      this.dependencies,
      input,
      input.aggregateType,
      input.id,
      proposalCommand(input.aggregateType, input.next),
    );
    assertActorMatchesContext(input.actor, input.context);
    await this.verifyBasis(input.context, input.scope, input.basis);
  }

  private async transitionProposal<T extends Finding | Impact>(
    transaction: TransactionHandle,
    input: TransitionProposalCommand,
    load: () => Promise<T>,
    replay: (id: string) => Promise<T | undefined>,
    update: (value: T) => Promise<void>,
  ): Promise<CommandResult<T>> {
    const command = proposalCommand(input.aggregateType, input.next);
    const result = await claim(
      this.dependencies,
      transaction,
      input,
      command,
      `${input.aggregateType}:${input.id}`,
      input.basis,
    );
    if (result.status === "replayed") {
      return replayLoaded(result.resultReference, replay);
    }
    const current = await load();
    assertExpectedVersion(current.version, input.expectedVersion, current.id);
    assertBasis(current.basis, input.basis, current.id);
    assertProposalAuthority(current.state, input.next, input.actor);
    const updated = transitionProposal(
      current,
      input.next,
      this.dependencies.clock.now(),
    ) as T;
    await update(updated);
    await appendEffect(
      this.dependencies,
      transaction,
      input,
      updated,
      `${input.aggregateType}_${input.next}`,
      input.basis,
      undefined,
      input.actor,
    );
    await complete(
      this.dependencies,
      transaction,
      result,
      `${input.aggregateType}:${updated.id}`,
    );
    return { status: "accepted", value: updated };
  }

  private persistFinding(
    input: CreateFindingCommand,
    finding: Finding,
  ): Promise<CommandResult<Finding>> {
    return this.dependencies.config.transactions.run(async (transaction) => {
      const result = await claim(
        this.dependencies,
        transaction,
        input,
        "create_finding",
        finding.id,
        finding.basis,
      );
      if (result.status === "replayed") {
        return replayLoaded(
          result.resultReference,
          (id) =>
            this.dependencies.config.repository.findFinding(
              transaction,
              input.scope,
              id as import("./ids.ts").FindingId,
            ),
        );
      }
      await this.dependencies.config.repository.insertFinding(
        transaction,
        finding,
      );
      await appendEffect(
        this.dependencies,
        transaction,
        input,
        finding,
        "finding_proposed",
        finding.basis,
        undefined,
        input.proposedBy,
      );
      await complete(
        this.dependencies,
        transaction,
        result,
        `finding:${finding.id}`,
      );
      return { status: "accepted", value: finding };
    });
  }

  private persistImpact(
    input: CreateImpactCommand,
    impact: Impact,
  ): Promise<CommandResult<Impact>> {
    return this.dependencies.config.transactions.run(async (transaction) => {
      const result = await claim(
        this.dependencies,
        transaction,
        input,
        "create_impact",
        impact.id,
        impact.basis,
      );
      if (result.status === "replayed") {
        return replayLoaded(
          result.resultReference,
          (id) =>
            this.dependencies.config.repository.findImpact(
              transaction,
              input.scope,
              id as import("./ids.ts").ImpactId,
            ),
        );
      }
      await loadFinding(
        this.dependencies,
        transaction,
        input.scope,
        input.findingId,
      );
      await this.dependencies.config.repository.insertImpact(
        transaction,
        impact,
      );
      await appendEffect(
        this.dependencies,
        transaction,
        input,
        impact,
        "impact_proposed",
        impact.basis,
        undefined,
        input.proposedBy,
      );
      await complete(
        this.dependencies,
        transaction,
        result,
        `impact:${impact.id}`,
      );
      return { status: "accepted", value: impact };
    });
  }

  private persistRequest(
    input: CreateDecisionRequestCommand,
    request: DecisionRequest,
  ): Promise<CommandResult<DecisionRequest>> {
    return this.dependencies.config.transactions.run(async (transaction) => {
      const result = await claim(
        this.dependencies,
        transaction,
        input,
        "create_decision_request",
        request.id,
        request.basis,
      );
      if (result.status === "replayed") {
        return replayLoaded(
          result.resultReference,
          (id) =>
            this.dependencies.config.repository.findDecisionRequest(
              transaction,
              input.scope,
              id as import("./ids.ts").DecisionRequestId,
            ),
        );
      }
      await loadSubject(
        this.dependencies,
        transaction,
        input.scope,
        input.subject,
      );
      await this.dependencies.config.repository.insertDecisionRequest(
        transaction,
        request,
      );
      await appendEffect(
        this.dependencies,
        transaction,
        input,
        request,
        "decision_request_created",
        request.basis,
        undefined,
        request.requester,
      );
      await complete(
        this.dependencies,
        transaction,
        result,
        `decision_request:${request.id}`,
      );
      return { status: "accepted", value: request };
    });
  }
}

function proposalCommand(
  aggregateType: "finding" | "impact",
  next: TransitionProposalCommand["next"],
): string {
  return `${next}_${aggregateType}`;
}

function assertProposalAuthority(
  current: Finding["state"],
  next: TransitionProposalCommand["next"],
  actor: CreateFindingCommand["proposedBy"],
): void {
  const rule = proposalRule(current, next);
  if (rule?.humanOnly !== true) return;
  if (actor.kind === "human" && actor.state === "active") return;
  throw new DiligenceDecisionError(
    "HUMAN_AUTHORITY_REQUIRED",
    `Actor "${actor.id}" cannot transition a proposal to "${next}"; expected an active human actor.`,
  );
}
