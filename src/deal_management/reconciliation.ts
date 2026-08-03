import type { DealManagementService } from "./service.ts";
import type { DealRepository } from "./repository.ts";
import type { Deal } from "./contracts.ts";
import {
  type DealReconciliationRecord,
  type DealReconciliationStore,
  type LegacyDealMapper,
  type LegacyDealRecord,
  type LegacyDealSource,
  type LegacyMappingIssue,
  type LegacyMappingResult,
  type ReconciliationEvidenceVerifier,
  type ReconciliationMode,
  type ReconciliationOperatorContext,
  type ReconciliationOutcome,
  type ReconciliationRunResult,
  type ReconciliationVerificationResult,
} from "./legacy_contracts.ts";
import {
  replayMappedDeal,
  sameMappedDealIntent,
  verifyMappedDeal,
} from "./reconciliation_replay.ts";
import {
  applyIssue,
  dryRunIssue,
  missingVerificationIssue,
  reconciliationRecord,
  recordIdFor,
  sourceConflict,
  statusForIssue,
  verificationIssue,
} from "./reconciliation_records.ts";

type ReconciliationRunInput = {
  readonly mode: ReconciliationMode;
  readonly legacyDealId: string;
  readonly operator: ReconciliationOperatorContext;
};

type ReconciliationIssueInput = Omit<ReconciliationRunInput, "mode"> & {
  readonly mode?: ReconciliationMode;
};

type MappedLegacyDeal = Extract<
  LegacyMappingResult,
  { readonly kind: "mapped" }
>;
type RoutingInput = {
  readonly legacySource: string;
  readonly legacyDealId: string;
  readonly operator: ReconciliationOperatorContext;
  readonly reason: string;
  readonly nextMode: "authoritative" | "legacy";
};

/**
 * Executes bounded per-Deal dry-run, apply, resume, and rollback operations.
 *
 * Dry-run writes only explicitly non-authoritative reconciliation diagnostics;
 * apply uses Deal Management commands and never changes global read routing.
 *
 * @example const report = await executor.run({ mode: "dry-run", ...input })
 */
export class DealReconciliationExecutor {
  constructor(
    private readonly source: LegacyDealSource,
    private readonly mapper: LegacyDealMapper,
    private readonly store: DealReconciliationStore,
    private readonly service: DealManagementService,
    private readonly repository: DealRepository,
    private readonly evidence?: ReconciliationEvidenceVerifier,
  ) {}

  async run(input: {
    readonly mode: ReconciliationMode;
    readonly legacyDealId: string;
    readonly operator: ReconciliationOperatorContext;
  }): Promise<ReconciliationRunResult> {
    const outcome = await this.runOne(input);
    return { mode: input.mode, outcomes: [outcome] };
  }

  async runBatch(input: {
    readonly mode: ReconciliationMode;
    readonly legacyDealIds: readonly string[];
    readonly operator: ReconciliationOperatorContext;
  }): Promise<ReconciliationRunResult> {
    const outcomes: ReconciliationOutcome[] = [];
    for (const legacyDealId of input.legacyDealIds) {
      outcomes.push(await this.runOne({ ...input, legacyDealId }));
    }
    return { mode: input.mode, outcomes };
  }

  /**
   * Compares persisted authoritative Deals with fresh mapped legacy intent.
   *
   * Drift is persisted as an explicit conflict; a matching record is returned
   * as verified without writing a Deal, history, or outbox event.
   *
   * @example await executor.verifyBatch({ legacyDealIds, operator })
   */
  async verifyBatch(input: {
    readonly legacyDealIds: readonly string[];
    readonly operator: ReconciliationOperatorContext;
  }): Promise<ReconciliationVerificationResult> {
    const outcomes: ReconciliationOutcome[] = [];
    for (const legacyDealId of input.legacyDealIds) {
      outcomes.push(await this.verifyOne({ ...input, legacyDealId }));
    }
    return { mode: "verify", outcomes };
  }

  /**
   * Routes one reconciled Deal back to the legacy compatibility reader.
   *
   * Authoritative data and reconciliation evidence remain untouched.
   *
   * @example await executor.rollbackReadRouting({ source, legacyDealId, operator })
   */
  rollbackReadRouting(input: {
    readonly legacySource: string;
    readonly legacyDealId: string;
    readonly operator: ReconciliationOperatorContext;
    readonly reason: string;
  }): Promise<DealReconciliationRecord> {
    return this.routeReadRouting({ ...input, nextMode: "legacy" });
  }

  /**
   * Restores one explicitly routed Deal to authoritative reads after review.
   *
   * This changes only one persisted route and appends routing evidence; it
   * does not enable a global cutover or remove legacy data.
   *
   * @example await executor.restoreAuthoritativeReadRouting({ legacySource, legacyDealId, operator, reason })
   */
  restoreAuthoritativeReadRouting(input: {
    readonly legacySource: string;
    readonly legacyDealId: string;
    readonly operator: ReconciliationOperatorContext;
    readonly reason: string;
  }): Promise<DealReconciliationRecord> {
    return this.routeReadRouting({ ...input, nextMode: "authoritative" });
  }

  private async runOne(input: {
    readonly mode: ReconciliationMode;
    readonly legacyDealId: string;
    readonly operator: ReconciliationOperatorContext;
  }): Promise<ReconciliationOutcome> {
    const record = await this.source.load({
      scope: input.operator.scope,
      legacyDealId: input.legacyDealId,
    });
    if (record === undefined) return await this.missingRecord(input);
    return await this.reconcileLoaded(record, input);
  }

  private async reconcileLoaded(
    record: LegacyDealRecord,
    input: ReconciliationRunInput,
  ): Promise<ReconciliationOutcome> {
    const mapping = await this.mapper.map({
      record,
      scope: input.operator.scope,
      now: input.operator.now,
    });
    const previous = await this.store.find({
      scope: input.operator.scope,
      legacySource: record.source,
      legacyDealId: record.legacyDealId,
    });
    return await this.resolveMapping(record, input, mapping, previous);
  }

  private async resolveMapping(
    record: LegacyDealRecord,
    input: ReconciliationRunInput,
    mapping: LegacyMappingResult,
    previous: DealReconciliationRecord | undefined,
  ): Promise<ReconciliationOutcome> {
    const conflict = sourceConflict(previous, mapping);
    if (conflict !== undefined) {
      return await this.handleIssue(
        record,
        input,
        conflict,
        previous,
      );
    }
    if (mapping.kind !== "mapped") {
      return await this.handleIssue(record, input, mapping.issue, previous);
    }
    if (input.mode === "dry-run") {
      return await this.saveDryRun(record, input, mapping, previous);
    }
    return await this.applyMapped(record, input, mapping, previous);
  }

  private handleIssue(
    record: LegacyDealRecord,
    input: ReconciliationRunInput,
    issue: LegacyMappingIssue,
    previous: DealReconciliationRecord | undefined,
  ): Promise<ReconciliationOutcome> {
    if (input.mode !== "dry-run") {
      return this.saveIssue(record, input, issue, previous);
    }
    return Promise.resolve(dryRunIssue(
      record,
      issue,
      previous,
      input.operator.scope,
      input.operator.now,
    ));
  }

  private async saveDryRun(
    legacyRecord: LegacyDealRecord,
    input: {
      readonly mode: ReconciliationMode;
      readonly legacyDealId: string;
      readonly operator: ReconciliationOperatorContext;
    },
    mapping: Extract<LegacyMappingResult, { readonly kind: "mapped" }>,
    previous: DealReconciliationRecord | undefined,
  ): Promise<ReconciliationOutcome> {
    if (previous !== undefined) return { kind: "mapped", record: previous };
    const record = reconciliationRecord(
      legacyRecord,
      input.operator.scope,
      mapping,
      "dry_run_valid",
      input.operator.now,
    );
    await this.store.save(record);
    return { kind: "mapped", record };
  }

  private async applyMapped(
    legacyRecord: LegacyDealRecord,
    input: ReconciliationRunInput,
    mapping: MappedLegacyDeal,
    previous: DealReconciliationRecord | undefined,
  ): Promise<ReconciliationOutcome> {
    if (previous?.status === "verified") {
      return { kind: "already_reconciled", record: previous };
    }
    const pending = pendingReconciliation(legacyRecord, input, mapping);
    await this.store.save(pending);
    try {
      return await this.applyAndVerify(
        legacyRecord,
        input,
        mapping,
        previous,
        pending,
      );
    } catch (error) {
      const issue = applyIssue(legacyRecord, error);
      return await this.saveIssue(legacyRecord, input, issue, pending);
    }
  }

  private async applyAndVerify(
    legacyRecord: LegacyDealRecord,
    input: ReconciliationRunInput,
    mapping: MappedLegacyDeal,
    previous: DealReconciliationRecord | undefined,
    pending: DealReconciliationRecord,
  ): Promise<ReconciliationOutcome> {
    const applied = await replayMappedDeal(
      mapping.deal,
      input.operator.commandContext,
      this.service,
      this.repository,
      resumableClaim(previous, mapping),
    );
    const appliedRecord = appliedReconciliation(pending, input.operator.now);
    await this.store.save(appliedRecord);
    return await this.verifyApplied(
      legacyRecord,
      input,
      mapping,
      applied,
      appliedRecord,
    );
  }

  private async verifyApplied(
    legacyRecord: LegacyDealRecord,
    input: ReconciliationRunInput,
    mapping: MappedLegacyDeal,
    applied: Deal,
    appliedRecord: DealReconciliationRecord,
  ): Promise<ReconciliationOutcome> {
    if (!await this.verifyEvidence(mapping.deal, input.operator)) {
      const issue = verificationIssue(legacyRecord, applied, mapping.deal);
      return await this.saveIssue(legacyRecord, input, issue, appliedRecord);
    }
    const verified = verifiedReconciliation(appliedRecord, input.operator.now);
    await this.store.save(verified);
    return { kind: "verified", record: verified };
  }

  private async saveIssue(
    legacyRecord: LegacyDealRecord,
    input: {
      readonly mode?: ReconciliationMode;
      readonly legacyDealId: string;
      readonly operator: ReconciliationOperatorContext;
    },
    issue: LegacyMappingIssue,
    previous?: DealReconciliationRecord,
  ): Promise<ReconciliationOutcome> {
    const record = issueRecord(legacyRecord, input, issue, previous);
    await this.store.save(record);
    return {
      kind: record.status === "conflict" ? "conflict" : "rejected",
      record,
    };
  }

  private async verifyOne(input: {
    readonly legacyDealId: string;
    readonly operator: ReconciliationOperatorContext;
  }): Promise<ReconciliationOutcome> {
    const legacyRecord = await this.source.load({
      scope: input.operator.scope,
      legacyDealId: input.legacyDealId,
    });
    if (legacyRecord === undefined) return await this.missingRecord(input);
    return await this.verifyLoaded(legacyRecord, input);
  }

  private async verifyLoaded(
    legacyRecord: LegacyDealRecord,
    input: ReconciliationIssueInput,
  ): Promise<ReconciliationOutcome> {
    const mapping = await this.mapper.map({
      record: legacyRecord,
      scope: input.operator.scope,
      now: input.operator.now,
    });
    if (mapping.kind !== "mapped") {
      return await this.saveIssue(legacyRecord, input, mapping.issue);
    }
    return await this.verifyMappedRecord(legacyRecord, input, mapping);
  }

  private async verifyMappedRecord(
    legacyRecord: LegacyDealRecord,
    input: ReconciliationIssueInput,
    mapping: MappedLegacyDeal,
  ): Promise<ReconciliationOutcome> {
    const previous = await this.store.find({
      scope: input.operator.scope,
      legacySource: legacyRecord.source,
      legacyDealId: legacyRecord.legacyDealId,
    });
    const issue = verificationPrecondition(legacyRecord, mapping, previous);
    if (issue !== undefined) {
      return await this.saveIssue(legacyRecord, input, issue, previous);
    }
    return await this.persistVerification(
      legacyRecord,
      input,
      mapping,
      previous!,
    );
  }

  private async persistVerification(
    legacyRecord: LegacyDealRecord,
    input: ReconciliationIssueInput,
    mapping: MappedLegacyDeal,
    previous: DealReconciliationRecord,
  ): Promise<ReconciliationOutcome> {
    if (await this.verifyEvidence(mapping.deal, input.operator)) {
      const verified = verifiedReconciliation(previous, input.operator.now);
      await this.store.save(verified);
      return { kind: "verified", record: verified };
    }
    return await this.saveIssue(
      legacyRecord,
      input,
      verificationIssue(legacyRecord, previous.intendedDeal, mapping.deal),
      previous,
    );
  }

  private async verifyEvidence(
    intendedDeal: Deal,
    operator: ReconciliationOperatorContext,
  ): Promise<boolean> {
    const documentMatches = await verifyMappedDeal(
      intendedDeal,
      this.repository,
      operator.scope,
    );
    if (!documentMatches) return false;
    if (this.evidence === undefined) return true;
    return (await this.evidence.verify({
      scope: operator.scope,
      intendedDeal,
      operator,
    })).ok;
  }

  private missingRecord(input: ReconciliationIssueInput) {
    const record = missingLegacyRecord(input.legacyDealId);
    return this.saveIssue(
      record,
      input,
      missingLegacyIssue(input.legacyDealId),
    );
  }

  private async routeReadRouting(input: RoutingInput) {
    const current = await this.store.find({
      scope: input.operator.scope,
      legacySource: input.legacySource,
      legacyDealId: input.legacyDealId,
    });
    assertRoutable(current, input.legacyDealId);
    return await this.store.route(routingChange(input, current));
  }
}

function pendingReconciliation(
  record: LegacyDealRecord,
  input: ReconciliationRunInput,
  mapping: MappedLegacyDeal,
): DealReconciliationRecord {
  return reconciliationRecord(
    record,
    input.operator.scope,
    mapping,
    "pending",
    input.operator.now,
  );
}

function verificationPrecondition(
  record: LegacyDealRecord,
  mapping: MappedLegacyDeal,
  previous: DealReconciliationRecord | undefined,
): LegacyMappingIssue | undefined {
  const conflict = sourceConflict(previous, mapping);
  if (conflict !== undefined) return conflict;
  if (previous?.authoritativeDealId === undefined) {
    return missingVerificationIssue(record);
  }
  if (matchesPersistedIntent(previous, mapping)) return;
  return verificationIssue(record, previous.intendedDeal, mapping.deal);
}

function missingLegacyRecord(legacyDealId: string): LegacyDealRecord {
  return { source: "unknown", legacyDealId, parties: [], team: [] };
}

function missingLegacyIssue(legacyDealId: string): LegacyMappingIssue {
  return {
    code: "MISSING_REQUIRED_FIELD",
    legacyDealId,
    received: "undefined",
    expected: "an existing legacy Deal record",
    explanation:
      "The legacy source returned no Deal for the requested identifier.",
    operatorInterventionRequired: true,
    retrySafe: true,
  };
}

function assertRoutable(
  record: DealReconciliationRecord | undefined,
  legacyDealId: string,
): asserts record is DealReconciliationRecord & {
  authoritativeDealId: Deal["id"];
} {
  if (record?.authoritativeDealId !== undefined) return;
  throw new Error(
    `Deal "${legacyDealId}" cannot change read routing; expected a reconciled authoritative identity in the requested scope.`,
  );
}

function routingChange(
  input: RoutingInput,
  current: DealReconciliationRecord & { authoritativeDealId: Deal["id"] },
) {
  return {
    scope: input.operator.scope,
    legacySource: input.legacySource,
    legacyDealId: input.legacyDealId,
    authoritativeDealId: current.authoritativeDealId,
    previousMode: current.routingMode,
    nextMode: input.nextMode,
    actorId: input.operator.actorId,
    correlationId: input.operator.correlationId,
    reason: input.reason,
    changedAt: input.operator.now,
  };
}

function matchesPersistedIntent(
  previous: DealReconciliationRecord,
  mapping: MappedLegacyDeal,
): boolean {
  return previous.intendedDeal !== undefined &&
    sameMappedDealIntent(previous.intendedDeal, mapping.deal);
}

function appliedReconciliation(
  pending: DealReconciliationRecord,
  now: string,
): DealReconciliationRecord {
  return { ...pending, status: "applied", updatedAt: now };
}

function verifiedReconciliation(
  applied: DealReconciliationRecord,
  now: string,
): DealReconciliationRecord {
  return {
    ...applied,
    status: "verified",
    routingMode: "authoritative",
    updatedAt: now,
  };
}

function issueRecord(
  legacyRecord: LegacyDealRecord,
  input: ReconciliationIssueInput,
  issue: LegacyMappingIssue,
  previous?: DealReconciliationRecord,
): DealReconciliationRecord {
  return {
    recordId: previous?.recordId ?? recordIdFor(legacyRecord),
    scope: input.operator.scope,
    legacySource: legacyRecord.source,
    legacyDealId: legacyRecord.legacyDealId,
    ...priorIdentity(previous),
    status: statusForIssue(issue),
    routingMode: previous?.routingMode ?? "legacy",
    issue,
    updatedAt: input.operator.now,
  };
}

function priorIdentity(
  previous?: DealReconciliationRecord,
): Partial<DealReconciliationRecord> {
  if (previous === undefined) return {};
  return {
    ...(previous.authoritativeDealId === undefined
      ? {}
      : { authoritativeDealId: previous.authoritativeDealId }),
    ...(previous.sourceFingerprint === undefined
      ? {}
      : { sourceFingerprint: previous.sourceFingerprint }),
    ...(previous.intendedDeal === undefined
      ? {}
      : { intendedDeal: previous.intendedDeal }),
  };
}

function resumableClaim(
  previous: DealReconciliationRecord | undefined,
  mapping: Extract<LegacyMappingResult, { readonly kind: "mapped" }>,
): boolean {
  return previous?.authoritativeDealId === mapping.authoritativeDealId &&
    previous.sourceFingerprint === mapping.sourceFingerprint &&
    previous.status !== "dry_run_valid";
}
