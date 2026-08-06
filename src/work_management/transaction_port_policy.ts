export type WorkManagementPort =
  | "authorization"
  | "target"
  | "evidence"
  | "authority"
  | "audit"
  | "outbox"
  | "proof";

export type CommandExecutionPhase =
  | "replay_authorization"
  | "claim_transaction"
  | "finalize_transaction";

export type PortControl = "uncontrolled_external" | "transaction_local";

export interface WorkManagementPortPolicy {
  readonly control: PortControl;
  readonly permittedPhases: readonly CommandExecutionPhase[];
  readonly rule: string;
}

/**
 * Classifies every MAI-114 command port by where it may execute.
 *
 * @example assertWorkManagementPortPhase("target", "finalize_transaction")
 */
export const WORK_MANAGEMENT_PORT_POLICY: Readonly<
  Record<WorkManagementPort, WorkManagementPortPolicy>
> = Object.freeze({
  authorization: localPolicy(
    "Evaluate through the MAI-106 transaction-local authorization adapter while the command transaction is open.",
    ["replay_authorization", "finalize_transaction"],
  ),
  target: localPolicy(
    "Resolve target identity and version through the MAI-106 transaction-local adapter.",
    ["finalize_transaction"],
  ),
  evidence: localPolicy(
    "Validate immutable evidence references through the MAI-106 transaction-local adapter.",
    ["finalize_transaction"],
  ),
  authority: localPolicy(
    "Resolve the named human authority snapshot through the MAI-106 transaction-local adapter.",
    ["finalize_transaction"],
  ),
  audit: localPolicy(
    "Append immutable audit evidence using the active PostgreSQL transaction handle.",
  ),
  outbox: localPolicy(
    "Append domain and target-command messages using the active PostgreSQL transaction handle.",
  ),
  proof: localPolicy(
    "Persist aggregate history, decisions, command result, and idempotency completion atomically.",
  ),
});

/** Rejects an adapter invocation that would cross the transaction boundary. */
export function assertWorkManagementPortPhase(
  port: WorkManagementPort,
  phase: CommandExecutionPhase,
): void {
  const policy = WORK_MANAGEMENT_PORT_POLICY[port];
  if (policy.permittedPhases.includes(phase)) return;
  throw new TransactionPortPolicyError(port, phase, policy);
}

export class TransactionPortPolicyError extends Error {
  readonly code = "UNSAFE_TRANSACTION_PORT" as const;

  constructor(
    readonly port: WorkManagementPort,
    readonly phase: CommandExecutionPhase,
    readonly policy: WorkManagementPortPolicy,
  ) {
    super(
      `Work Management port "${port}" cannot run during "${phase}"; expected ${
        policy.permittedPhases.join(" or ")
      }. ${policy.rule}`,
    );
    this.name = "TransactionPortPolicyError";
  }
}

/** Rejects a production adapter that could perform uncontrolled I/O in a command transaction. */
export function assertTransactionSafeAdapter(
  port: WorkManagementPort,
  adapter: unknown,
): void {
  if (!isTransactionLocalAdapter(adapter)) {
    throw new TransactionPortPolicyError(
      port,
      "finalize_transaction",
      WORK_MANAGEMENT_PORT_POLICY[port],
    );
  }
}

export function assertTransactionSafeEffects(
  audit: unknown,
  outbox: unknown,
): void {
  assertTransactionSafeAdapter("audit", audit);
  assertTransactionSafeAdapter("outbox", outbox);
}

function isTransactionLocalAdapter(value: unknown): boolean {
  if (typeof value !== "object" || value === null) return false;
  const adapter = value as Record<string, unknown>;
  if (
    adapter.transactionSafe !== true ||
    adapter.transactionMode !== "mai106_local"
  ) return false;
  return adapter.external !== true && adapter.networked !== true;
}

function localPolicy(
  rule: string,
  permittedPhases: readonly CommandExecutionPhase[] = [
    "finalize_transaction",
  ],
): WorkManagementPortPolicy {
  return {
    control: "transaction_local",
    permittedPhases,
    rule,
  };
}
