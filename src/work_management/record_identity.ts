import { payloadDigest } from "../platform/persistence/v1.ts";
import { stableSerialize, WorkManagementError } from "./model.ts";

export type WorkRecordNamespace =
  | "history"
  | "decision"
  | "audit"
  | "notification"
  | "target_command"
  | "command_result";

export interface WorkRecordIdentityInput {
  readonly namespace: WorkRecordNamespace;
  readonly tenantId: string;
  readonly workspaceId: string;
  readonly dealId: string;
  readonly actorId: string;
  readonly commandType: string;
  readonly aggregateType: string;
  readonly aggregateId: string;
  readonly expectedVersion: number;
  readonly idempotencyKey: string;
  readonly payloadDigest: string;
  readonly purpose: string;
}

/** Derives a namespaced semantic record identity from the complete command. */
export async function workRecordIdentity(
  input: WorkRecordIdentityInput,
): Promise<string> {
  assertIdentityInput(input);
  const digest = await payloadDigest(input);
  return `${identityPrefix(input.namespace)}${digest.slice(0, 48)}`;
}

function identityPrefix(namespace: WorkRecordNamespace): string {
  if (namespace === "history") return "work_event_";
  if (namespace === "decision") return "decision_";
  return `work_${namespace}_`;
}

export function semanticallyEquivalent(left: unknown, right: unknown): boolean {
  return stableSerialize(left) === stableSerialize(right);
}

function assertIdentityInput(input: WorkRecordIdentityInput): void {
  const serialized = stableSerialize(input);
  if (
    serialized.length <= 4_096 && /^[0-9a-f]{64}$/.test(input.payloadDigest)
  ) {
    return;
  }
  throw new WorkManagementError(
    "INVALID_INPUT",
    `Work record identity for "${input.aggregateId}" is invalid; expected bounded semantic input and a SHA-256 payload digest.`,
  );
}
