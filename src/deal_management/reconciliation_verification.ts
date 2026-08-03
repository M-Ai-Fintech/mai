import type { TransactionHandle } from "../platform/persistence/v1.ts";
import type { Deal } from "./contracts.ts";
import type {
  ReconciliationEvidenceResult,
  ReconciliationEvidenceVerifier,
} from "./legacy_contracts.ts";
import type { DealTransactionRunner } from "./repository.ts";

/** Verifies one exact migration operation per durable evidence stream. */
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

interface ExpectedOperation {
  command: string;
  event: string;
  key: string;
}
interface EvidenceRow {
  command: string | null;
  event: string | null;
  state: string | null;
  version: number | null;
  key: string | null;
  fingerprint: string | null;
  claimFingerprint: string | null;
  claimResult: unknown;
}

async function verifyEvidence(
  transaction: TransactionHandle,
  input: Parameters<ReconciliationEvidenceVerifier["verify"]>[0],
): Promise<ReconciliationEvidenceResult> {
  const expected = expectedOperations(
    input.intendedDeal,
    input.scope.tenantId,
    input.scope.workspaceId,
    input.operator.actorId,
  );
  const rows = await loadEvidence(transaction, input);
  const missing = expected.flatMap((operation) =>
    operationMissing(operation, rows)
  );
  return missing.length === 0 ? { ok: true } : { ok: false, missing };
}

function expectedOperations(
  deal: Deal,
  tenantId: string,
  workspaceId: string,
  actorId: string,
): readonly ExpectedOperation[] {
  const base = [{
    command: "create_deal",
    event: "DealCreated",
    key: key(deal.id, "create"),
  }];
  const mandate = deal.mandate === undefined ? [] : [{
    command: "set_mandate",
    event: "MandateSet",
    key: key(deal.id, "mandate"),
  }];
  const parties = deal.parties.map((party) => ({
    command: "add_deal_party",
    event: "DealPartyAdded",
    key: key(deal.id, `party-${party.id}`),
  }));
  const roles = deal.roles.map((role) => ({
    command: "assign_deal_role",
    event: "DealRoleAssigned",
    key: key(deal.id, `role-${role.id}`),
  }));
  return [...base, ...mandate, ...parties, ...roles].map((operation) => ({
    ...operation,
    key: [
      tenantId,
      workspaceId,
      actorId,
      operation.command,
      deal.id,
      operation.key,
    ]
      .join(":"),
  }));
}

function key(dealId: string, operation: string): string {
  return `idem_reconcile-${slug(operation)}-${slug(dealId)}`.slice(0, 64);
}

function slug(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(
    /^-|-$/g,
    "",
  ) || "record";
}

async function loadEvidence(
  transaction: TransactionHandle,
  input: Parameters<ReconciliationEvidenceVerifier["verify"]>[0],
): Promise<readonly EvidenceRow[]> {
  const result = await transaction.query<EvidenceRow>(evidenceSql, [
    input.scope.tenantId,
    input.scope.workspaceId,
    input.intendedDeal.id,
    input.operator.actorId,
  ]);
  return result.rows;
}

function operationMissing(
  operation: ExpectedOperation,
  rows: readonly EvidenceRow[],
): readonly string[] {
  const match = rows.filter((row) => row.key === operation.key);
  if (match.length !== 1) {
    return [`${operation.command}:evidence:${match.length}`];
  }
  const row = match[0];
  const errors: string[] = [];
  if (row.command !== operation.command) {
    errors.push(`${operation.command}:command`);
  }
  if (row.event !== operation.event) errors.push(`${operation.command}:event`);
  if (row.state !== "completed") {
    errors.push(`${operation.command}:claim-state`);
  }
  if (row.version === null || row.version < 1) {
    errors.push(`${operation.command}:version`);
  }
  if (row.fingerprint === null || row.fingerprint.length === 0) {
    errors.push(`${operation.command}:fingerprint`);
  }
  if (row.claimFingerprint !== row.fingerprint) {
    errors.push(`${operation.command}:claim-fingerprint`);
  }
  if (row.claimResult === null || typeof row.claimResult !== "object") {
    errors.push(`${operation.command}:claim-result`);
  }
  return errors;
}

const evidenceSql = `SELECT r.command_type AS command, h.event_type AS event,
  c.state, h.aggregate_version AS version, r.idempotency_key AS key,
  r.fingerprint, c.fingerprint AS "claimFingerprint", c.result AS "claimResult"
  FROM deal_management.command_receipts r
  JOIN deal_management.command_claims c ON c.tenant_id=r.tenant_id
    AND c.workspace_id=r.workspace_id AND c.actor_id=r.actor_id
    AND c.command_type=r.command_type AND c.target_id=r.target_id
    AND c.idempotency_key=split_part(r.idempotency_key, ':', 6)
  JOIN deal_management.aggregate_history h ON h.tenant_id=r.tenant_id
    AND h.workspace_id=r.workspace_id AND h.deal_id=r.target_id
    AND h.aggregate_version = (r.result->'deal'->>'version')::bigint
  JOIN platform.outbox o ON o.tenant_id=h.tenant_id AND o.workspace_id=h.workspace_id
    AND o.aggregate_id=h.deal_id AND o.aggregate_version=h.aggregate_version
    AND o.event_type=h.event_type
  JOIN audit_activity.audit_events a ON a.tenant_id=h.tenant_id
    AND a.workspace_id=h.workspace_id AND a.aggregate_id=h.deal_id
    AND a.aggregate_version=h.aggregate_version AND a.event_type=h.event_type
  WHERE r.tenant_id=$1 AND r.workspace_id=$2 AND r.target_id=$3 AND r.actor_id=$4`;
