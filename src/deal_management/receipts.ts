import type { DealCommand, DealMutationCommand } from "./commands.ts";
import { DealIdempotencyConflictError } from "./errors.ts";
import type {
  DealCommandResult,
  DealReceipt,
  DealReceiptStore,
} from "./contracts.ts";
import { dealReceiptId } from "./ids.ts";
import type { TransactionHandle } from "../platform/persistence/v1.ts";

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
  return stableSerialize({
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
     ON CONFLICT (tenant_id, workspace_id, actor_id, command_type, target_id, idempotency_key)
     DO NOTHING`,
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
  const result = typeof row.result === "string"
    ? JSON.parse(row.result)
    : row.result;
  if (!isRecord(result) || !isRecord(result.deal)) {
    throw new Error(
      `Stored Deal receipt "${row.id}" has invalid result; expected a command result with a Deal aggregate.`,
    );
  }
  return Object.freeze({
    id: dealReceiptId(row.id),
    actorId: row.actorId as DealReceipt["actorId"],
    commandType: row.commandType,
    targetId: row.targetId,
    key: row.key,
    fingerprint: row.fingerprint,
    result: result as unknown as DealReceipt["result"],
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
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

function stableSerialize(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableSerialize).join(",")}]`;
  const object = value as Record<string, unknown>;
  return `{${
    Object.keys(object).sort().map((key) =>
      `${JSON.stringify(key)}:${stableSerialize(object[key])}`
    ).join(",")
  }}`;
}

export type { DealMutationCommand };
