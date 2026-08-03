import type { DealCommand, DealMutationCommand } from "./commands.ts";
import { DealIdempotencyConflictError } from "./errors.ts";
import type {
  DealCommandResult,
  DealReceipt,
  DealReceiptStore,
  DealScope,
} from "./contracts.ts";
import { parseStoredDeal } from "./read_model.ts";
import { freezeDeal } from "./model.ts";
import { dealReceiptId } from "./ids.ts";
import type { TransactionHandle } from "../platform/persistence/v1.ts";
import type { DealCommandClaim } from "./repository.ts";
import { canonicalJson } from "./migration_identity.ts";

export interface DealReceiptTransactionRunner {
  run<TResult>(
    callback: (transaction: TransactionHandle) => Promise<TResult> | TResult,
  ): Promise<TResult>;
}

export class InMemoryDealReceiptStore implements DealReceiptStore {
  private readonly receipts = new Map<string, DealReceipt>();

  get(key: string): DealReceipt | undefined {
    return this.receipts.get(key);
  }

  put(receipt: DealReceipt): void {
    this.receipts.set(receipt.key, Object.freeze({ ...receipt }));
  }
}

export class PostgresDealReceiptStore implements DealReceiptStore {
  constructor(private readonly transactions: DealReceiptTransactionRunner) {}

  get(key: string): Promise<DealReceipt | undefined> {
    return this.transactions.run(async (transaction) => {
      const result = await transaction.query<DealReceiptRow>(
        `SELECT receipt_id AS "id", actor_id AS "actorId",
           command_type AS "commandType", target_id AS "targetId",
           idempotency_key AS "key", fingerprint, result
         FROM deal_management.command_receipts
         WHERE idempotency_key = $1`,
        [key],
      );
      const row = result.rows[0];
      return row === undefined ? undefined : deserializeReceipt(row);
    });
  }

  put(receipt: DealReceipt): Promise<void> {
    return this.transactions.run(async (transaction) => {
      await insertReceipt(transaction, receipt);
    });
  }
}

export interface DealClaimRow {
  readonly fingerprint: string;
  readonly state: "in_progress" | "completed";
  readonly result: unknown;
}

export async function claimDealCommand(
  transaction: TransactionHandle,
  claim: DealCommandClaim,
): Promise<boolean> {
  const result = await transaction.query(
    `INSERT INTO deal_management.command_claims (
       tenant_id, workspace_id, actor_id, command_type, target_id,
       idempotency_key, fingerprint, state, created_at
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'in_progress', CURRENT_TIMESTAMP)
     ON CONFLICT (
       tenant_id, workspace_id, actor_id, command_type, target_id, idempotency_key
     ) DO NOTHING RETURNING state`,
    claimValues(claim).concat(claim.fingerprint),
  );
  return result.rowCount === 1;
}

export async function loadDealCommandClaim(
  transaction: TransactionHandle,
  claim: DealCommandClaim,
): Promise<DealClaimRow> {
  const result = await transaction.query<DealClaimRow>(
    `SELECT fingerprint, state, result
     FROM deal_management.command_claims
     WHERE tenant_id = $1 AND workspace_id = $2 AND actor_id = $3
       AND command_type = $4 AND target_id = $5 AND idempotency_key = $6
     FOR UPDATE`,
    claimValues(claim),
  );
  const row = result.rows[0];
  if (row !== undefined) return row;
  throw new Error(
    `Idempotency key "${claim.key}" disappeared; expected a durable claim row.`,
  );
}

export async function completeDealCommand(
  transaction: TransactionHandle,
  claim: DealCommandClaim,
  result: DealCommandResult,
): Promise<void> {
  const updated = await transaction.query(
    `UPDATE deal_management.command_claims
     SET state = 'completed', result = $7, completed_at = CURRENT_TIMESTAMP
     WHERE tenant_id = $1 AND workspace_id = $2 AND actor_id = $3
       AND command_type = $4 AND target_id = $5 AND idempotency_key = $6
       AND fingerprint = $8 AND state = 'in_progress'`,
    [...claimValues(claim), JSON.stringify(result), claim.fingerprint],
  );
  if (updated.rowCount === 1) return;
  throw new Error(
    `Idempotency key "${claim.key}" could not complete; expected one in-progress claim.`,
  );
}

export async function persistDealReceipt(
  transaction: TransactionHandle,
  scope: DealScope,
  receipt: DealReceipt | undefined,
  occurredAt: Date,
): Promise<void> {
  if (receipt === undefined) return;
  await transaction.query(
    `INSERT INTO deal_management.command_receipts (
       receipt_id, tenant_id, workspace_id, actor_id, command_type,
       target_id, idempotency_key, fingerprint, result, created_at
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
    [
      receipt.id,
      scope.tenantId,
      scope.workspaceId,
      receipt.actorId,
      receipt.commandType,
      receipt.targetId,
      receipt.key,
      receipt.fingerprint,
      JSON.stringify(receipt.result),
      occurredAt,
    ],
  );
}

function claimValues(claim: DealCommandClaim): unknown[] {
  return [
    claim.scope.tenantId,
    claim.scope.workspaceId,
    claim.actorId,
    claim.commandType,
    claim.targetId,
    claim.idempotencyKey,
  ];
}

export function commandReceiptKey(
  command: DealCommand,
  target: string,
): string {
  return [
    command.context.request.tenantId,
    command.context.request.workspaceId ?? "unscoped",
    command.context.actor.id,
    command.type,
    target,
    command.idempotencyKey,
  ].join(":");
}

export function commandFingerprint(command: DealCommand): string {
  return canonicalJson({
    type: command.type,
    actorId: command.context.actor.id,
    tenantId: command.context.request.tenantId,
    workspaceId: command.context.request.workspaceId,
    ...payloadWithoutContext(command),
  });
}

export function createReceipt(input: {
  readonly key: string;
  readonly actorId: DealReceipt["actorId"];
  readonly commandType: string;
  readonly targetId: string;
  readonly fingerprint: string;
  readonly result: DealCommandResult;
  readonly sequence: string;
}): DealReceipt {
  return Object.freeze({
    id: dealReceiptId(`receipt_${input.sequence.replaceAll("_", "-")}`),
    actorId: input.actorId,
    commandType: input.commandType,
    targetId: input.targetId,
    key: input.key,
    fingerprint: input.fingerprint,
    result: input.result,
  });
}

interface DealReceiptRow {
  readonly id: string;
  readonly actorId: string;
  readonly commandType: string;
  readonly targetId: string;
  readonly key: string;
  readonly fingerprint: string;
  readonly result: unknown;
}

async function insertReceipt(
  transaction: TransactionHandle,
  receipt: DealReceipt,
): Promise<void> {
  await transaction.query(
    `INSERT INTO deal_management.command_receipts (
       receipt_id, tenant_id, workspace_id, actor_id, command_type,
       target_id, idempotency_key, fingerprint, result, created_at
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       `,
    [
      receipt.id,
      receipt.result.deal.tenantId,
      receipt.result.deal.workspaceId,
      receipt.actorId,
      receipt.commandType,
      receipt.targetId,
      receipt.key,
      receipt.fingerprint,
      JSON.stringify(receipt.result),
      receipt.result.deal.updatedAt,
    ],
  );
}

function deserializeReceipt(row: DealReceiptRow): DealReceipt {
  const result = deserializeResult(row.result, row.id);
  return Object.freeze({
    id: dealReceiptId(row.id),
    actorId: row.actorId as DealReceipt["actorId"],
    commandType: row.commandType,
    targetId: row.targetId,
    key: row.key,
    fingerprint: row.fingerprint,
    result,
  });
}

function deserializeResult(
  value: unknown,
  receiptId: string,
): DealCommandResult {
  const parsed = typeof value === "string" ? JSON.parse(value) : value;
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new Error(
      `Stored Deal receipt "${receiptId}" has invalid result; expected an object.`,
    );
  }
  const result = parsed as Record<string, unknown>;
  if (!isOperation(result.operation)) {
    throw new Error(
      `Stored Deal receipt "${receiptId}" has operation "${
        String(result.operation)
      }"; expected a Deal operation.`,
    );
  }
  return {
    operation: result.operation,
    deal: freezeDeal(parseStoredDeal(result.deal)),
  };
}

function isOperation(value: unknown): value is DealCommandResult["operation"] {
  return value === "created" || value === "configured" ||
    value === "party_added" || value === "role_assigned" ||
    value === "mandate_set" || value === "authority_constraint_set";
}

export function replayOrThrow(
  receipt: DealReceipt | undefined,
  fingerprint: string,
  key: string,
): DealCommandResult | undefined {
  if (receipt === undefined) return undefined;
  if (receipt.fingerprint !== fingerprint) {
    throw new DealIdempotencyConflictError(key);
  }
  return receipt.result;
}

function payloadWithoutContext(command: DealCommand): Record<string, unknown> {
  const payload = { ...command } as Record<string, unknown>;
  delete payload.context;
  delete payload.idempotencyKey;
  return payload;
}

export type { DealMutationCommand };
