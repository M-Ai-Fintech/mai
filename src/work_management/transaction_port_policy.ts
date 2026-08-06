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
  | "external_prepare"
  | "prepared_facts_transaction"
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
 * @example assertWorkManagementPortPhase("target", "external_prepare")
 */
export const WORK_MANAGEMENT_PORT_POLICY: Readonly<
  Record<WorkManagementPort, WorkManagementPortPolicy>
> = Object.freeze({
  authorization: externalPolicy(
    [
      "replay_authorization",
      "external_prepare",
    ],
    "Evaluate current disclosure and state-sensitive command authority without a database lock.",
  ),
  target: externalPolicy(
    ["external_prepare"],
    "Resolve target identity and version before the atomic finalize transaction.",
  ),
  evidence: externalPolicy(
    ["external_prepare"],
    "Validate immutable evidence references before the atomic finalize transaction.",
  ),
  authority: externalPolicy(
    ["external_prepare"],
    "Resolve the named human authority snapshot before the atomic finalize transaction.",
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
  adapter: {
    readonly transactionSafe?: true;
    readonly transactionMode?: "mai106_local";
  },
): void {
  if (
    adapter.transactionSafe === true &&
    adapter.transactionMode === "mai106_local"
  ) return;
  throw new TransactionPortPolicyError(
    port,
    "finalize_transaction",
    WORK_MANAGEMENT_PORT_POLICY[port],
  );
}

function externalPolicy(
  permittedPhases: readonly CommandExecutionPhase[],
  rule: string,
): WorkManagementPortPolicy {
  return { control: "uncontrolled_external", permittedPhases, rule };
}

function localPolicy(rule: string): WorkManagementPortPolicy {
  return {
    control: "transaction_local",
    permittedPhases: ["finalize_transaction"],
    rule,
  };
}
