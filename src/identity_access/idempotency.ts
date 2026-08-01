import { payloadDigest } from "../platform/persistence/v1.ts";
import type {
  ActorId,
  IdempotencyKey,
  TenantId,
} from "../shared/contracts/identifiers.ts";
import { IdentityAccessError } from "./errors.ts";

export interface CommandIdempotencyClaim {
  readonly tenantId: TenantId;
  readonly actorId: ActorId;
  readonly commandType: string;
  readonly targetType: string;
  readonly targetId: string;
  readonly idempotencyKey: IdempotencyKey;
  readonly payload: unknown;
}

export type CommandIdempotencyResult =
  | { readonly status: "claimed" }
  | { readonly status: "replay"; readonly result: unknown };

export interface CommandIdempotencyStore {
  claim(input: CommandIdempotencyClaim): Promise<CommandIdempotencyResult>;
  complete(input: CommandIdempotencyClaim, result: unknown): Promise<void>;
}

interface StoredCommand {
  readonly payloadDigest: string;
  readonly state: "in_progress" | "completed";
  readonly result?: unknown;
  readonly completion: Promise<unknown>;
  readonly resolve: (result: unknown) => void;
}

export class InMemoryCommandIdempotencyStore
  implements CommandIdempotencyStore {
  private readonly records = new Map<string, StoredCommand>();
  private readonly locks = new Map<string, Promise<void>>();

  async claim(
    input: CommandIdempotencyClaim,
  ): Promise<CommandIdempotencyResult> {
    const digest = await payloadDigest(input.payload);
    const recordKey = commandKey(input);
    const outcome = await this.withLock(recordKey, () => {
      const existing = this.records.get(recordKey);
      if (existing === undefined) return this.createClaim(digest, recordKey);
      if (existing.payloadDigest !== digest) {
        throw new IdentityAccessError(
          "IDEMPOTENCY_CONFLICT",
          `idempotency key "${input.idempotencyKey}" payload digest changed.`,
        );
      }
      if (existing.state === "completed") {
        return { status: "replay", result: existing.result } as const;
      }
      return { status: "wait", completion: existing.completion } as const;
    });
    if (outcome.status === "wait") {
      return { status: "replay", result: await outcome.completion };
    }
    return outcome;
  }

  complete(
    input: CommandIdempotencyClaim,
    result: unknown,
  ): Promise<void> {
    return this.withLock(commandKey(input), () => {
      const recordKey = commandKey(input);
      const existing = this.records.get(recordKey);
      if (existing === undefined) {
        throw new Error(
          `Idempotency key "${input.idempotencyKey}" has no claim; expected a claimed command.`,
        );
      }
      if (existing.state === "completed") return;
      this.records.set(recordKey, { ...existing, state: "completed", result });
      existing.resolve(result);
    });
  }

  private createClaim(digest: string, recordKey: string): ClaimOutcome {
    let resolve!: (result: unknown) => void;
    const completion = new Promise<unknown>((complete) => {
      resolve = complete;
    });
    this.records.set(recordKey, {
      payloadDigest: digest,
      state: "in_progress",
      completion,
      resolve,
    });
    return { status: "claimed" };
  }

  private async withLock<T>(key: string, operation: () => T): Promise<T> {
    const previous = this.locks.get(key) ?? Promise.resolve();
    let release!: () => void;
    const current = new Promise<void>((resolve) => {
      release = resolve;
    });
    this.locks.set(key, current);
    await previous;
    try {
      return operation();
    } finally {
      release();
      if (this.locks.get(key) === current) this.locks.delete(key);
    }
  }
}

type ClaimOutcome =
  | { readonly status: "claimed" }
  | { readonly status: "replay"; readonly result: unknown }
  | { readonly status: "wait"; readonly completion: Promise<unknown> };

function commandKey(input: CommandIdempotencyClaim): string {
  return [
    input.tenantId,
    input.actorId,
    input.commandType,
    input.targetType,
    input.targetId,
    input.idempotencyKey,
  ].join("|");
}
