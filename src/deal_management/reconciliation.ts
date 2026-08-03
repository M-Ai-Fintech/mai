import type { DealManagementService } from "./service.ts";
import type { DealRepository } from "./repository.ts";
import {
  type DealReconciliationRecord,
  type DealReconciliationStore,
  type LegacyDealMapper,
  type LegacyDealRecord,
  type LegacyDealSource,
  type LegacyMappingIssue,
  type LegacyMappingResult,
  type ReconciliationMode,
  type ReconciliationOperatorContext,
  type ReconciliationOutcome,
  type ReconciliationRunResult,
  type ReconciliationVerificationResult,
} from "./legacy_contracts.ts";
import { replayMappedDeal, verifyMappedDeal } from "./reconciliation_replay.ts";
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
    const conflict = sourceConflict(previous, mapping);
    if (conflict !== undefined) {
      if (input.mode === "dry-run") {
        return dryRunIssue(
          record,
          conflict,
          previous,
          input.operator.scope,
          input.operator.now,
        );
      }
      return await this.saveIssue(record, input, conflict, previous);
    }
    if (mapping.kind !== "mapped") {
      if (input.mode === "dry-run") {
        return dryRunIssue(
          record,
          mapping.issue,
          previous,
          input.operator.scope,
          input.operator.now,
        );
      }
      return await this.saveIssue(record, input, mapping.issue, previous);
    }
    if (input.mode === "dry-run") {
      return await this.saveDryRun(record, input, mapping, previous);
    }
    return await this.applyMapped(record, input, mapping, previous);
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
    input: {
      readonly mode: ReconciliationMode;
      readonly legacyDealId: string;
      readonly operator: ReconciliationOperatorContext;
    },
    mapping: Extract<LegacyMappingResult, { readonly kind: "mapped" }>,
    previous: DealReconciliationRecord | undefined,
  ): Promise<ReconciliationOutcome> {
    if (previous?.status === "verified") {
      return { kind: "already_reconciled", record: previous };
    }
    const pending = reconciliationRecord(
      legacyRecord,
      input.operator.scope,
      mapping,
      "pending",
      input.operator.now,
    );
    await this.store.save(pending);
    try {
      const applied = await replayMappedDeal(
        mapping.deal,
        input.operator.commandContext,
        this.service,
        this.repository,
        resumableClaim(previous, mapping),
      );
      const appliedRecord = {
        ...pending,
        status: "applied" as const,
        updatedAt: input.operator.now,
      };
      await this.store.save(appliedRecord);
      const verified = await verifyMappedDeal(
        mapping.deal,
        this.repository,
        input.operator.scope,
      );
      if (!verified) {
        const issue = verificationIssue(legacyRecord, applied, mapping.deal);
        return await this.saveIssue(legacyRecord, input, issue, appliedRecord);
      }
      const finalRecord = {
        ...appliedRecord,
        status: "verified" as const,
        routingMode: "authoritative" as const,
        updatedAt: input.operator.now,
      };
      await this.store.save(finalRecord);
      return { kind: "verified", record: finalRecord };
    } catch (error) {
      const issue = applyIssue(legacyRecord, error);
      return await this.saveIssue(legacyRecord, input, issue, pending);
    }
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
    const status = statusForIssue(issue);
    const record: DealReconciliationRecord = {
      recordId: previous?.recordId ?? recordIdFor(legacyRecord),
      scope: input.operator.scope,
      legacySource: legacyRecord.source,
      legacyDealId: legacyRecord.legacyDealId,
      ...(previous?.authoritativeDealId === undefined
        ? {}
        : { authoritativeDealId: previous.authoritativeDealId }),
      ...(previous?.sourceFingerprint === undefined
        ? {}
        : { sourceFingerprint: previous.sourceFingerprint }),
      ...(previous?.intendedDeal === undefined
        ? {}
        : { intendedDeal: previous.intendedDeal }),
      status,
      routingMode: previous?.routingMode ?? "legacy",
      issue,
      updatedAt: input.operator.now,
    };
    await this.store.save(record);
    return { kind: status === "conflict" ? "conflict" : "rejected", record };
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
    const mapping = await this.mapper.map({
      record: legacyRecord,
      scope: input.operator.scope,
      now: input.operator.now,
    });
    if (mapping.kind !== "mapped") {
      return await this.saveIssue(legacyRecord, input, mapping.issue);
    }
    const previous = await this.store.find({
      scope: input.operator.scope,
      legacySource: legacyRecord.source,
      legacyDealId: legacyRecord.legacyDealId,
    });
    if (previous === undefined || previous.authoritativeDealId === undefined) {
      return await this.saveIssue(
        legacyRecord,
        input,
        missingVerificationIssue(legacyRecord),
        previous,
      );
    }
    if (
      await verifyMappedDeal(
        mapping.deal,
        this.repository,
        input.operator.scope,
      )
    ) {
      return { kind: "verified", record: previous };
    }
    return await this.saveIssue(
      legacyRecord,
      input,
      verificationIssue(legacyRecord, previous.intendedDeal, mapping.deal),
      previous,
    );
  }

  private async missingRecord(input: {
    readonly mode?: ReconciliationMode;
    readonly legacyDealId: string;
    readonly operator: ReconciliationOperatorContext;
  }): Promise<ReconciliationOutcome> {
    const record: LegacyDealRecord = {
      source: "unknown",
      legacyDealId: input.legacyDealId,
      parties: [],
      team: [],
    };
    const issue: LegacyMappingIssue = {
      code: "MISSING_REQUIRED_FIELD",
      legacyDealId: input.legacyDealId,
      received: "undefined",
      expected: "an existing legacy Deal record",
      explanation:
        "The legacy source returned no Deal for the requested identifier.",
      operatorInterventionRequired: true,
      retrySafe: true,
    };
    return await this.saveIssue(record, input, issue);
  }

  private routeReadRouting(input: {
    readonly legacySource: string;
    readonly legacyDealId: string;
    readonly operator: ReconciliationOperatorContext;
    readonly reason: string;
    readonly nextMode: "authoritative" | "legacy";
  }): Promise<DealReconciliationRecord> {
    return this.store.find({
      scope: input.operator.scope,
      legacySource: input.legacySource,
      legacyDealId: input.legacyDealId,
    }).then((current) => {
      if (current === undefined || current.authoritativeDealId === undefined) {
        throw new Error(
          `Deal "${input.legacyDealId}" cannot change read routing; expected a reconciled authoritative identity in the requested scope.`,
        );
      }
      return this.store.route({
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
      });
    });
  }
}

function resumableClaim(
  previous: DealReconciliationRecord | undefined,
  mapping: Extract<LegacyMappingResult, { readonly kind: "mapped" }>,
): boolean {
  return previous?.authoritativeDealId === mapping.authoritativeDealId &&
    previous.sourceFingerprint === mapping.sourceFingerprint &&
    previous.status !== "dry_run_valid";
}
