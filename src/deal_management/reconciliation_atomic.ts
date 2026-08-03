import type { TransactionHandle } from "../platform/persistence/v1.ts";
import type { Deal } from "./contracts.ts";
import type {
  DealReconciliationStore,
  LegacyDealRecord,
  ReconciliationEvidenceVerifier,
} from "./legacy_contracts.ts";
import type { DealRepository } from "./repository.ts";
import { sameMappedDealIntent } from "./reconciliation_replay.ts";
import type {
  AtomicVerificationCallback,
  AtomicVerificationInput,
  PostgresDealReconciliationStore,
} from "./reconciliation_store.ts";
import type {
  MappedLegacyDeal,
  ReconciliationIssueInput,
} from "./reconciliation_outcomes.ts";

export function supportsAtomicVerification(
  store: DealReconciliationStore,
  repository: DealRepository,
  evidence: ReconciliationEvidenceVerifier | undefined,
): boolean {
  return typeof (store as Partial<PostgresDealReconciliationStore>)
        .verifyAndMarkReconciliation === "function" &&
    typeof (repository as DealRepository & { findInTransaction?: unknown })
        .findInTransaction === "function" &&
    (evidence === undefined ||
      typeof (evidence as ReconciliationEvidenceVerifier & {
          verifyInTransaction?: unknown;
        }).verifyInTransaction === "function");
}

export async function verifyAtomicReconciliation(
  store: PostgresDealReconciliationStore,
  repository: DealRepository,
  evidence: ReconciliationEvidenceVerifier | undefined,
  legacyRecord: LegacyDealRecord,
  input: ReconciliationIssueInput,
  mapping: MappedLegacyDeal,
) {
  const atomicInput: AtomicVerificationInput = {
    scope: input.operator.scope,
    legacySource: legacyRecord.source,
    legacyDealId: legacyRecord.legacyDealId,
    authoritativeDealId: mapping.authoritativeDealId,
    sourceFingerprint: mapping.sourceFingerprint,
    intendedDeal: mapping.deal,
    actorId: input.operator.actorId,
    correlationId: input.operator.correlationId,
    now: input.operator.now,
  };
  return await store.verifyAndMarkReconciliation(
    atomicInput,
    atomicEvidenceValidator(
      repository,
      evidence,
      mapping.deal,
      legacyRecord,
      input,
    ),
  );
}

function atomicEvidenceValidator(
  repository: DealRepository,
  evidence: ReconciliationEvidenceVerifier | undefined,
  intendedDeal: Deal,
  legacyRecord: LegacyDealRecord,
  input: ReconciliationIssueInput,
): AtomicVerificationCallback {
  return async (transaction) => {
    const authoritative = await findAuthoritative(
      repository,
      transaction,
      input,
      intendedDeal,
    );
    if (
      authoritative === undefined ||
      !sameMappedDealIntent(authoritative, intendedDeal)
    ) {
      return { ok: false, missing: ["AUTHORITATIVE_DOCUMENT"] };
    }
    if (evidence === undefined) return { ok: true };
    return await transactionalVerifier(evidence).verifyInTransaction(
      transaction,
      {
        scope: input.operator.scope,
        intendedDeal,
        legacySource: legacyRecord.source,
        legacyDealId: legacyRecord.legacyDealId,
        operator: input.operator,
      },
    );
  };
}

async function findAuthoritative(
  repository: DealRepository,
  transaction: TransactionHandle,
  input: ReconciliationIssueInput,
  intendedDeal: Deal,
): Promise<Deal | undefined> {
  const transactional = repository as DealRepository & {
    findInTransaction: (
      transaction: TransactionHandle,
      scope: ReconciliationIssueInput["operator"]["scope"],
      dealId: Deal["id"],
      lock?: boolean,
    ) => Promise<Deal | undefined>;
  };
  return await transactional.findInTransaction(
    transaction,
    input.operator.scope,
    intendedDeal.id,
    true,
  );
}

function transactionalVerifier(evidence: ReconciliationEvidenceVerifier) {
  return evidence as ReconciliationEvidenceVerifier & {
    verifyInTransaction: (
      transaction: TransactionHandle,
      input: Parameters<ReconciliationEvidenceVerifier["verify"]>[0],
    ) => ReturnType<ReconciliationEvidenceVerifier["verify"]>;
  };
}
