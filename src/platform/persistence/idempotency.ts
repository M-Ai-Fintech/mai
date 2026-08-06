import {
  ActorId,
  IdempotencyKey,
  TenantId,
} from "../../shared/contracts/identifiers.ts";
import { TransactionHandle } from "./transaction.ts";

export interface Clock {
  now(): Date;
}

export interface IdempotencyClaim {
  readonly tenantId: TenantId;
  readonly actorId: ActorId;
  readonly commandType: string;
  readonly targetType: string;
  readonly targetId: string;
  readonly idempotencyKey: IdempotencyKey;
  readonly payloadDigest: string;
  readonly expiresAt: Date;
}

export type IdempotencyClaimResult =
  | { readonly status: "claimed" }
  | { readonly status: "in_progress" | "abandoned" }
  | {
    readonly status: "replay";
    readonly state: "completed" | "failed";
    readonly resultReference: string | undefined;
    readonly errorReference: string | undefined;
  };

interface IdempotencyRow {
  readonly payloadDigest: string;
  readonly state: "in_progress" | "completed" | "failed" | "abandoned";
  readonly resultReference: string | null;
  readonly errorReference: string | null;
}

export class IdempotencyConflictError extends Error {
  readonly code = "IDEMPOTENCY_CONFLICT";

  constructor(idempotencyKey: IdempotencyKey) {
    super(
      `IDEMPOTENCY_CONFLICT: key "${idempotencyKey}" payload digest changed; expected the original command payload.`,
    );
    this.name = "IdempotencyConflictError";
  }
}

export class IdempotencyRepository {
  constructor(private readonly clock: Clock) {}

  /**
   * Claims a durable command or returns its existing stable outcome.
   *
   * @example await repository.claim(transaction, claim)
   */
  async claim(
    transaction: TransactionHandle,
    claim: IdempotencyClaim,
  ): Promise<IdempotencyClaimResult> {
    assertDigest(claim.payloadDigest);
    const inserted = await insertClaim(transaction, claim, this.clock.now());
    if (inserted.rowCount === 1) return { status: "claimed" };
    const existing = await loadClaim(transaction, claim);
    return existingClaimResult(existing, claim);
  }

  /**
   * Stores an opaque terminal result reference in the claiming transaction.
   *
   * @example await repository.complete(transaction, claim, "result_1")
   */
  async complete(
    transaction: TransactionHandle,
    claim: IdempotencyClaim,
    resultReference: string,
  ): Promise<void> {
    assertReference(resultReference, "result");
    const result = await transaction.query(
      `${terminalUpdateSql("completed", "result_reference")}
       AND state = 'in_progress'`,
      [
        ...claimIdentity(claim),
        claim.payloadDigest,
        resultReference,
        this.clock.now(),
      ],
    );
    await assertTerminalUpdate(transaction, result.rowCount, claim);
  }

  /**
   * Stores an opaque terminal error reference for stable replay.
   *
   * @example await repository.fail(transaction, claim, "error_1")
   */
  async fail(
    transaction: TransactionHandle,
    claim: IdempotencyClaim,
    errorReference: string,
  ): Promise<void> {
    assertReference(errorReference, "error");
    const result = await transaction.query(
      `${terminalUpdateSql("failed", "error_reference")}
       AND state = 'in_progress'`,
      [
        ...claimIdentity(claim),
        claim.payloadDigest,
        errorReference,
        this.clock.now(),
      ],
    );
    await assertTerminalUpdate(transaction, result.rowCount, claim);
  }

  /**
   * Makes uncertain expired claims visible without silently stealing them.
   *
   * @example await repository.abandonExpired(transaction, cutoff, "RECOVERY_REQUIRED")
   */
  async abandonExpired(
    transaction: TransactionHandle,
    cutoff: Date,
    failureReference: string,
  ): Promise<number> {
    assertRecoveryCode(failureReference);
    const result = await transaction.query(
      `UPDATE platform.idempotency_records
       SET state = 'abandoned', error_reference = $2, completed_at = $1
       WHERE state = 'in_progress' AND created_at < $1`,
      [cutoff, failureReference],
    );
    return result.rowCount ?? 0;
  }
}

/**
 * Hashes canonical JSON with the built-in SHA-256 implementation.
 *
 * @example await payloadDigest({ command: "create" })
 */
export async function payloadDigest(payload: unknown): Promise<string> {
  const canonical = canonicalPayload(payload);
  const bytes = new TextEncoder().encode(canonical);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(
    new Uint8Array(digest),
    (value) => value.toString(16).padStart(2, "0"),
  ).join("");
}

function insertClaim(
  transaction: TransactionHandle,
  claim: IdempotencyClaim,
  now: Date,
) {
  return transaction.query(
    `INSERT INTO platform.idempotency_records (
       tenant_id, actor_id, command_type, target_type, target_id,
       idempotency_key, payload_digest, state, created_at, expires_at
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'in_progress', $8, $9)
     ON CONFLICT (
       tenant_id, actor_id, command_type, target_type, target_id,
       idempotency_key
     ) DO NOTHING`,
    [...claimIdentity(claim), claim.payloadDigest, now, claim.expiresAt],
  );
}

async function loadClaim(
  transaction: TransactionHandle,
  claim: IdempotencyClaim,
): Promise<IdempotencyRow> {
  const result = await transaction.query<IdempotencyRow>(
    `SELECT payload_digest AS "payloadDigest", state,
       result_reference AS "resultReference",
       error_reference AS "errorReference"
     FROM platform.idempotency_records
     WHERE tenant_id = $1 AND actor_id = $2 AND command_type = $3
       AND target_type = $4 AND target_id = $5 AND idempotency_key = $6`,
    claimIdentity(claim),
  );
  const row = result.rows[0];
  if (row !== undefined) return row;
  throw new Error(
    `Idempotency key "${claim.idempotencyKey}" disappeared; expected a durable conflicting row.`,
  );
}

function existingClaimResult(
  row: IdempotencyRow,
  claim: IdempotencyClaim,
): IdempotencyClaimResult {
  if (row.payloadDigest !== claim.payloadDigest) {
    throw new IdempotencyConflictError(claim.idempotencyKey);
  }
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

function terminalUpdateSql(
  state: "completed" | "failed",
  referenceColumn: "result_reference" | "error_reference",
): string {
  return `UPDATE platform.idempotency_records
    SET state = '${state}', ${referenceColumn} = $8, completed_at = $9
    WHERE tenant_id = $1 AND actor_id = $2 AND command_type = $3
      AND target_type = $4 AND target_id = $5 AND idempotency_key = $6
      AND payload_digest = $7`;
}

async function assertTerminalUpdate(
  transaction: TransactionHandle,
  rowCount: number | null,
  claim: IdempotencyClaim,
): Promise<void> {
  if (rowCount === 1) return;
  const existing = await loadClaim(transaction, claim);
  if (existing.payloadDigest !== claim.payloadDigest) {
    throw new IdempotencyConflictError(claim.idempotencyKey);
  }
  throw new Error(
    `Idempotency key "${claim.idempotencyKey}" could not complete; expected one in-progress claim.`,
  );
}

function claimIdentity(claim: IdempotencyClaim): unknown[] {
  return [
    claim.tenantId,
    claim.actorId,
    claim.commandType,
    claim.targetType,
    claim.targetId,
    claim.idempotencyKey,
  ];
}

function assertDigest(digest: string): void {
  if (/^[0-9a-f]{64}$/.test(digest)) return;
  throw new Error(
    `Payload digest "${digest}" is invalid; expected 64 lowercase hexadecimal characters.`,
  );
}

function assertReference(reference: string, kind: string): void {
  if (reference.trim() && reference.length <= 255) return;
  throw new Error(
    `Idempotency ${kind} reference "${reference}" is invalid; expected 1-255 characters.`,
  );
}

function assertRecoveryCode(reference: string): void {
  if (/^[A-Z][A-Z0-9_:-]{0,127}$/.test(reference)) return;
  throw new Error(
    `Idempotency recovery reference "${reference}" is unsafe; expected an uppercase code.`,
  );
}

function canonicalPayload(value: unknown): string {
  if (
    value === null || typeof value === "string" || typeof value === "boolean"
  ) {
    return JSON.stringify(value);
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map(canonicalPayload).join(",")}]`;
  }
  if (isRecord(value)) return canonicalRecord(value);
  throw new Error(
    `Payload value "${
      String(value)
    }" is not canonicalizable; expected JSON data.`,
  );
}

function canonicalRecord(value: Record<string, unknown>): string {
  const entries = Object.keys(value).sort().map((key) =>
    `${JSON.stringify(key)}:${canonicalPayload(value[key])}`
  );
  return `{${entries.join(",")}}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null &&
    !Array.isArray(value) && Object.getPrototypeOf(value) === Object.prototype;
}
