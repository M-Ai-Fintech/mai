import {
  applyDecisionHistory,
  createDecisionRecord,
  type DecisionProjection,
  type DecisionRecord,
  type DecisionRequest,
  decisionRequestToDecided,
} from "./model.ts";
import { assertExactBasis } from "./basis.ts";
import type {
  ChangeDecisionCommand,
  CommandDependencies,
  CommandResult,
  RecordDecisionCommand,
  RequestDecisionCommand,
  SupersedeDecisionCommand,
} from "./contracts.ts";
import {
  appendEffect,
  assertActorMatchesContext,
  assertExpectedVersion,
  assertInvalidationVersion,
  authorize,
  claim,
  complete,
  loadProjection,
  loadRecord,
  loadRequest,
  loadRequester,
  referenceMismatch,
  replayLoaded,
  resolveAuthority,
  verifyBasis,
} from "./command_support.ts";
import type { TransactionHandle } from "../platform/persistence/v1.ts";
import type { DecisionAuthoritySnapshot } from "./model.ts";
import {
  assertDecisionRequestReady,
  createInitialProjection,
  historyEntry,
  invalidateRequest,
  replayProjection,
} from "./decision_projection_helpers.ts";
import { requestDecisionInTransaction } from "./request_commands.ts";

export class DiligenceDecisionCommands {
  constructor(private readonly dependencies: CommandDependencies) {}

  async requestDecision(
    input: RequestDecisionCommand,
  ): Promise<CommandResult<DecisionRequest>> {
    await authorize(
      this.dependencies,
      input,
      "decision_request",
      input.requestId,
      "request_decision",
    );
    await verifyBasis(this.dependencies, input);
    return this.dependencies.config.transactions.run((transaction) =>
      requestDecisionInTransaction(this.dependencies, transaction, input)
    );
  }

  async recordDecision(
    input: RecordDecisionCommand,
  ): Promise<CommandResult<DecisionRecord>> {
    await authorize(
      this.dependencies,
      input,
      "decision_request",
      input.requestId,
      "record_decision",
    );
    assertActorMatchesContext(input.actor, input.context);
    await verifyBasis(this.dependencies, input);
    const requester = await loadRequester(
      this.dependencies,
      input.scope,
      input.requestId,
    );
    const authority = await resolveAuthority(
      this.dependencies,
      input,
      "record_decision",
      requester,
    );
    return this.dependencies.config.transactions.run((transaction) =>
      this.recordInTransaction(transaction, input, authority)
    );
  }

  async invalidateDecision(
    input: ChangeDecisionCommand,
  ): Promise<CommandResult<DecisionProjection>> {
    await authorize(
      this.dependencies,
      input,
      "decision_record",
      input.recordId,
      "invalidate_decision",
    );
    assertActorMatchesContext(input.actor, input.context);
    await verifyBasis(this.dependencies, input);
    const requester = await loadRequester(
      this.dependencies,
      input.scope,
      input.requestId,
    );
    const authority = await resolveAuthority(
      this.dependencies,
      input,
      "invalidate_decision",
      requester,
    );
    return this.dependencies.config.transactions.run((transaction) =>
      this.changeInTransaction(transaction, input, authority)
    );
  }

  async supersedeDecision(
    input: SupersedeDecisionCommand,
  ): Promise<CommandResult<DecisionProjection>> {
    await authorize(
      this.dependencies,
      input,
      "decision_record",
      input.recordId,
      "supersede_decision",
    );
    assertActorMatchesContext(input.actor, input.context);
    await verifyBasis(this.dependencies, input);
    const requester = await loadRequester(
      this.dependencies,
      input.scope,
      input.requestId,
    );
    const authority = await resolveAuthority(
      this.dependencies,
      input,
      "supersede_decision",
      requester,
    );
    return this.dependencies.config.transactions.run((transaction) =>
      this.supersedeInTransaction(transaction, input, authority)
    );
  }

  private async recordInTransaction(
    transaction: TransactionHandle,
    input: RecordDecisionCommand,
    authority: DecisionAuthoritySnapshot,
  ): Promise<CommandResult<DecisionRecord>> {
    const result = await claim(
      this.dependencies,
      transaction,
      input,
      "record_decision",
      input.requestId,
      input.basis,
    );
    if (result.status === "replayed") {
      return replayLoaded(
        result.resultReference,
        (id) =>
          this.dependencies.config.repository.findDecisionRecord(
            transaction,
            input.scope,
            id as import("./ids.ts").DecisionRecordId,
          ),
      );
    }
    const request = await loadRequest(
      this.dependencies,
      transaction,
      input.scope,
      input.requestId,
      true,
    );
    assertExpectedVersion(
      request.version,
      input.expectedRequestVersion,
      request.id,
    );
    assertExactBasis(request.basis, input.basis, request.id);
    assertDecisionRequestReady(request, input);
    const record = createDecisionRecord({
      id: input.recordId,
      requestId: input.requestId,
      scope: input.scope,
      outcome: input.outcome,
      actor: input.actor,
      requestVersion: request.version,
      basis: input.basis,
      authority,
      recordedAt: this.dependencies.clock.now(),
    });
    const updatedRequest = decisionRequestToDecided(
      request,
      record.id,
      this.dependencies.clock.now(),
    );
    await this.dependencies.config.repository.insertDecisionRecord(
      transaction,
      record,
    );
    await this.dependencies.config.repository.updateDecisionRequest(
      transaction,
      updatedRequest,
      input.expectedRequestVersion,
    );
    await createInitialProjection(
      this.dependencies,
      transaction,
      input.scope,
      request.id,
      record,
      input.basis,
    );
    await appendEffect(
      this.dependencies,
      transaction,
      input,
      record,
      "decision_recorded",
      input.basis,
      authority,
      input.actor,
    );
    await complete(
      this.dependencies,
      transaction,
      result,
      `decision_record:${record.id}`,
    );
    return { status: "accepted", value: record };
  }

  private async changeInTransaction(
    transaction: TransactionHandle,
    input: ChangeDecisionCommand,
    authority: DecisionAuthoritySnapshot,
  ): Promise<CommandResult<DecisionProjection>> {
    const result = await claim(
      this.dependencies,
      transaction,
      input,
      "invalidate_decision",
      input.recordId,
      input.basis,
    );
    if (result.status === "replayed") {
      return replayProjection(this.dependencies, transaction, input);
    }
    const request = await loadRequest(
      this.dependencies,
      transaction,
      input.scope,
      input.requestId,
      true,
    );
    assertExpectedVersion(
      request.version,
      input.expectedRequestVersion,
      request.id,
    );
    const projection = await loadProjection(
      this.dependencies,
      transaction,
      input.scope,
      input.requestId,
      true,
    );
    assertInvalidationVersion(
      projection.version,
      input.expectedProjectionVersion,
      input.requestId,
    );
    if (projection.currentRecordId !== input.recordId) {
      throw referenceMismatch(input.recordId, projection.currentRecordId);
    }
    const record = await loadRecord(
      this.dependencies,
      transaction,
      input.scope,
      input.recordId,
    );
    assertExactBasis(record.basis, input.basis, record.id);
    const entry = historyEntry(
      this.dependencies,
      input,
      record,
      authority,
      "invalidated",
    );
    const updated = applyDecisionHistory(
      projection,
      entry,
      this.dependencies.clock.now(),
    );
    await invalidateRequest(
      this.dependencies,
      transaction,
      input,
      request,
      authority,
    );
    await this.dependencies.config.repository.insertHistory(transaction, entry);
    await this.dependencies.config.repository.updateProjection(
      transaction,
      updated,
      input.scope,
      input.expectedProjectionVersion,
    );
    await appendEffect(
      this.dependencies,
      transaction,
      input,
      updated,
      "decision_invalidated",
      input.basis,
      authority,
      input.actor,
    );
    await complete(
      this.dependencies,
      transaction,
      result,
      `projection:${updated.requestId}:${updated.version}`,
    );
    return { status: "accepted", value: updated };
  }

  private async supersedeInTransaction(
    transaction: TransactionHandle,
    input: SupersedeDecisionCommand,
    authority: DecisionAuthoritySnapshot,
  ): Promise<CommandResult<DecisionProjection>> {
    const result = await claim(
      this.dependencies,
      transaction,
      input,
      "supersede_decision",
      input.replacementRecordId,
      input.basis,
    );
    if (result.status === "replayed") {
      return replayProjection(this.dependencies, transaction, input);
    }
    const request = await loadRequest(
      this.dependencies,
      transaction,
      input.scope,
      input.requestId,
      true,
    );
    assertExpectedVersion(
      request.version,
      input.expectedRequestVersion,
      request.id,
    );
    const projection = await loadProjection(
      this.dependencies,
      transaction,
      input.scope,
      input.requestId,
      true,
    );
    assertExpectedVersion(
      projection.version,
      input.expectedProjectionVersion,
      input.requestId,
    );
    if (projection.currentRecordId !== input.recordId) {
      throw referenceMismatch(input.recordId, projection.currentRecordId);
    }
    const previous = await loadRecord(
      this.dependencies,
      transaction,
      input.scope,
      input.recordId,
    );
    const replacement = createDecisionRecord({
      id: input.replacementRecordId,
      requestId: input.requestId,
      scope: input.scope,
      outcome: input.outcome,
      actor: input.actor,
      requestVersion: request.version,
      basis: input.basis,
      authority,
      supersedesRecordId: previous.id,
      recordedAt: this.dependencies.clock.now(),
    });
    const entry = historyEntry(
      this.dependencies,
      input,
      previous,
      authority,
      "superseded",
      replacement.id,
    );
    const updated = applyDecisionHistory(
      projection,
      entry,
      this.dependencies.clock.now(),
    );
    await this.dependencies.config.repository.insertDecisionRecord(
      transaction,
      replacement,
    );
    await this.dependencies.config.repository.insertHistory(transaction, entry);
    await this.dependencies.config.repository.updateProjection(
      transaction,
      updated,
      input.scope,
      input.expectedProjectionVersion,
    );
    await appendEffect(
      this.dependencies,
      transaction,
      input,
      replacement,
      "decision_superseded",
      input.basis,
      authority,
      input.actor,
    );
    await complete(
      this.dependencies,
      transaction,
      result,
      `projection:${updated.requestId}:${updated.version}`,
    );
    return { status: "accepted", value: updated };
  }
}
