import {
  type IdempotencyClaim,
  type IdempotencyClaimResult,
  IdempotencyConflictError,
} from "../platform/persistence/idempotency.ts";
import type {
  TransactionHandle,
  TransactionQueryResult,
} from "../platform/persistence/transaction.ts";

export type WorkManagementIdempotencyInspection =
  | { readonly status: "absent" }
  | IdempotencyClaimResult;

/** Reads a Work Management replay claim without mutating shared idempotency state.
 *
 * @example await inspectWorkManagementIdempotency(transaction, claim)
 */
export async function inspectWorkManagementIdempotency(
  transaction: TransactionHandle,
  claim: IdempotencyClaim,
): Promise<WorkManagementIdempotencyInspection> {
  assertDigest(claim.payloadDigest);
  const result = await queryExistingClaim(transaction, claim);
  const row = result.rows[0];
  if (row === undefined) return { status: "absent" };
  if (row.payloadDigest !== claim.payloadDigest) {
    throw new IdempotencyConflictError(claim.idempotencyKey);
  }
  return replayStatus(row);
}

interface ExistingClaimRow {
  readonly payloadDigest: string;
  readonly state: "in_progress" | "completed" | "failed" | "abandoned";
  readonly resultReference: string | null;
  readonly errorReference: string | null;
}

function queryExistingClaim(
  transaction: TransactionHandle,
  claim: IdempotencyClaim,
): Promise<TransactionQueryResult<ExistingClaimRow>> {
  return transaction.query<ExistingClaimRow>(
    `SELECT payload_digest AS "payloadDigest", state,
       result_reference AS "resultReference",
       error_reference AS "errorReference"
     FROM platform.idempotency_records
     WHERE tenant_id = $1 AND actor_id = $2 AND command_type = $3
       AND target_type = $4 AND target_id = $5 AND idempotency_key = $6`,
    claimIdentity(claim),
  );
}

function replayStatus(
  row: ExistingClaimRow,
): Exclude<WorkManagementIdempotencyInspection, { readonly status: "absent" }> {
  if (row.state === "in_progress" || row.state === "abandoned") {
    return { status: row.state };
  }
  return {
    status: "replay",
    state: row.state,
    resultReference: row.resultReference ?? undefined,
    errorReference: row.errorReference ?? undefined,
  };
}

function claimIdentity(claim: IdempotencyClaim): readonly string[] {
  return [
    claim.tenantId,
    claim.actorId,
    claim.commandType,
    claim.targetType,
    claim.targetId,
    claim.idempotencyKey,
  ];
}

function assertDigest(value: string): void {
  if (/^[0-9a-f]{64}$/.test(value)) return;
  throw new Error(
    `Idempotency payload digest "${value}" is invalid; expected lowercase SHA-256 hex.`,
  );
}
