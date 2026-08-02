import type { RegistryCommand, RegistryCommandResult } from "./commands.ts";
import { RegistryIdempotencyConflictError } from "./errors.ts";

export interface RegistryCommandReceipt {
  readonly key: string;
  readonly fingerprint: string;
  readonly result: RegistryCommandResult;
}

export interface RegistryCommandReceiptStore {
  get(key: string): RegistryCommandReceipt | undefined;
  put(receipt: RegistryCommandReceipt): void;
}

export class InMemoryRegistryCommandReceiptStore
  implements RegistryCommandReceiptStore {
  private readonly receipts = new Map<string, RegistryCommandReceipt>();

  get(key: string): RegistryCommandReceipt | undefined {
    return this.receipts.get(key);
  }

  put(receipt: RegistryCommandReceipt): void {
    this.receipts.set(receipt.key, Object.freeze({ ...receipt }));
  }
}

export function replayOrThrow<Result extends RegistryCommandResult>(
  receipt: RegistryCommandReceipt | undefined,
  fingerprint: string,
  key: string,
): Result | undefined {
  if (receipt === undefined) return undefined;
  if (receipt.fingerprint !== fingerprint) {
    throw new RegistryIdempotencyConflictError(key);
  }
  return receipt.result as Result;
}

export function commandReceiptKey(command: RegistryCommand): string {
  return `${command.context.actorId}:${command.context.tenantId}:${command.idempotencyKey}`;
}

export function commandFingerprint(
  command: RegistryCommand,
  operation: string,
): string {
  const payload = { ...command } as Record<string, unknown>;
  delete payload.context;
  delete payload.idempotencyKey;
  return JSON.stringify({
    operation,
    actorId: command.context.actorId,
    tenantId: command.context.tenantId,
    workspaceId: command.context.workspaceId,
    payload,
  });
}
