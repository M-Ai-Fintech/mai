import type { TransactionHandle } from "../platform/persistence/v1.ts";
import type { Deal } from "./contracts.ts";
import type {
  ReconciliationEvidenceResult,
  ReconciliationEvidenceVerifier,
} from "./legacy_contracts.ts";
import type { DealTransactionRunner } from "./repository.ts";

/**
 * Verifies durable command, history, outbox, and audit evidence for migration.
 *
 * @example await verifier.verify({ scope, intendedDeal, operator })
 */
export class PostgresReconciliationEvidenceVerifier
  implements ReconciliationEvidenceVerifier {
  constructor(private readonly transactions: DealTransactionRunner) {}

  verify(
    input: Parameters<ReconciliationEvidenceVerifier["verify"]>[0],
  ): Promise<ReconciliationEvidenceResult> {
    return this.transactions.run((transaction) =>
      verifyEvidence(transaction, input)
    );
  }
}

async function verifyEvidence(
  transaction: TransactionHandle,
  input: Parameters<ReconciliationEvidenceVerifier["verify"]>[0],
): Promise<ReconciliationEvidenceResult> {
  const expected = expectedOperations(input.intendedDeal);
  const counts = await evidenceCounts(transaction, input);
  const missing = missingEvidence(expected, counts);
  return missing.length === 0 ? { ok: true } : { ok: false, missing };
}

function expectedOperations(deal: Deal): number {
  return 1 + deal.parties.length + deal.roles.length +
    (deal.mandate === undefined ? 0 : 1);
}

interface EvidenceCounts {
  readonly history: number;
  readonly receipts: number;
  readonly claims: number;
  readonly outbox: number;
  readonly audit: number;
  readonly linkedAudit: number;
}

async function evidenceCounts(
  transaction: TransactionHandle,
  input: Parameters<ReconciliationEvidenceVerifier["verify"]>[0],
): Promise<EvidenceCounts> {
  const values = [
    input.scope.tenantId,
    input.scope.workspaceId,
    input.intendedDeal.id,
    input.operator.actorId,
  ];
  const result = await transaction.query<EvidenceCounts>(evidenceSql, values);
  return result.rows[0];
}

const evidenceSql = `SELECT
  (SELECT COUNT(*)::int FROM deal_management.aggregate_history
   WHERE tenant_id=$1 AND workspace_id=$2 AND deal_id=$3) AS history,
  (SELECT COUNT(*)::int FROM deal_management.command_receipts
   WHERE tenant_id=$1 AND workspace_id=$2 AND actor_id=$4 AND target_id=$3) AS receipts,
  (SELECT COUNT(*)::int FROM deal_management.command_claims
   WHERE tenant_id=$1 AND workspace_id=$2 AND actor_id=$4 AND target_id=$3) AS claims,
  (SELECT COUNT(*)::int FROM platform.outbox
   WHERE tenant_id=$1 AND workspace_id=$2 AND aggregate_id=$3) AS outbox,
  (SELECT COUNT(*)::int FROM audit_activity.audit_events
   WHERE tenant_id=$1 AND workspace_id=$2 AND aggregate_id=$3) AS audit,
  (SELECT COUNT(*)::int FROM platform.outbox o
   JOIN audit_activity.audit_events a
     ON a.tenant_id=o.tenant_id AND a.event_id=o.payload->>'auditEventId'
   WHERE o.tenant_id=$1 AND o.workspace_id=$2 AND o.aggregate_id=$3) AS "linkedAudit"`;

function missingEvidence(
  expected: number,
  counts: EvidenceCounts,
): readonly string[] {
  return Object.entries(counts).flatMap(([kind, count]) =>
    count === expected ? [] : [`${kind}:${count}/${expected}`]
  );
}
