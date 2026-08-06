export interface StoredCommandEnvelope<Body = unknown> {
  readonly status: number;
  readonly etag?: string;
  readonly headers: Readonly<Record<string, string>>;
  readonly body: Body;
}

export interface AuthorizationReceipt {
  readonly decisionDigest: string;
  readonly resourceState?: string;
  readonly evaluatedAt: string;
  readonly expiresAt?: string;
}

export interface PreparedCommandFacts {
  readonly payloadDigest: string;
  readonly aggregateVersion?: number;
  readonly ownerVersion?: number;
  readonly targetVersion?: number;
  readonly authorization: AuthorizationReceipt;
  readonly authorityExpiresAt?: string;
  readonly commandExpiresAt?: string;
}

export interface FinalizationObservation {
  readonly payloadDigest: string;
  readonly aggregateVersion?: number;
  readonly ownerVersion?: number;
  readonly targetVersion?: number;
  readonly resourceState?: string;
  readonly now: string;
}

export interface OwnedTaskTerminalState {
  readonly id: string;
  readonly state: string;
}

export class PreparedCommandConflictError extends Error {
  constructor(
    readonly code:
      | "PREPARED_PAYLOAD_CONFLICT"
      | "PREPARED_VERSION_CONFLICT"
      | "PREPARED_STATE_CONFLICT"
      | "PREPARED_FACTS_EXPIRED"
      | "TERMINAL_TASK_INVARIANT",
    message: string,
  ) {
    super(message);
    this.name = "PreparedCommandConflictError";
  }
}

/**
 * Revalidates all volatile prepared facts using only transaction-local reads.
 *
 * @example assertPreparedCommandFinalizable(prepared, current)
 */
export function assertPreparedCommandFinalizable(
  prepared: PreparedCommandFacts,
  current: FinalizationObservation,
): void {
  assertSame(
    "payload digest",
    prepared.payloadDigest,
    current.payloadDigest,
    "PREPARED_PAYLOAD_CONFLICT",
  );
  assertSameVersion(
    "aggregate",
    prepared.aggregateVersion,
    current.aggregateVersion,
  );
  assertSameVersion("owner", prepared.ownerVersion, current.ownerVersion);
  assertSameVersion("target", prepared.targetVersion, current.targetVersion);
  if (prepared.authorization.resourceState !== current.resourceState) {
    throw new PreparedCommandConflictError(
      "PREPARED_STATE_CONFLICT",
      `Prepared resource state "${prepared.authorization.resourceState}" differs from current state "${current.resourceState}"; expected exact state-sensitive authorization facts.`,
    );
  }
  assertBeforeExpiry(
    "authorization",
    prepared.authorization.expiresAt,
    current.now,
  );
  assertBeforeExpiry("authority", prepared.authorityExpiresAt, current.now);
  assertBeforeExpiry("command", prepared.commandExpiresAt, current.now);
}

/** Binds prepared external facts to the durable command claim. */
export function assertPreparedPayloadIdentity(
  claimedPayloadDigest: string,
  preparedPayloadDigest: string,
): void {
  assertSame(
    "payload digest",
    claimedPayloadDigest,
    preparedPayloadDigest,
    "PREPARED_PAYLOAD_CONFLICT",
  );
}

/** Workstream completion accepts exactly the authoritative terminal Task set. */
export function assertTerminalTaskInvariants(
  authoritativeTaskIds: readonly string[],
  loadedTasks: readonly OwnedTaskTerminalState[],
): void {
  const expected = sortedUnique(authoritativeTaskIds, "authoritative");
  const actual = sortedUnique(loadedTasks.map((task) => task.id), "loaded");
  if (expected.join("|") !== actual.join("|")) {
    throw new PreparedCommandConflictError(
      "TERMINAL_TASK_INVARIANT",
      `Loaded Task membership "${
        actual.join(",")
      }" differs from authoritative membership "${
        expected.join(",")
      }"; expected exact scope and membership equivalence.`,
    );
  }
  const nonTerminal = loadedTasks.filter((task) =>
    task.state !== "completed" && task.state !== "cancelled"
  );
  if (nonTerminal.length === 0) return;
  throw new PreparedCommandConflictError(
    "TERMINAL_TASK_INVARIANT",
    `Tasks "${
      nonTerminal.map((task) => `${task.id}:${task.state}`).join(",")
    }" are not terminal; expected completed or cancelled before Workstream completion.`,
  );
}

/** A completed replay is disclosed only after current authorization succeeds. */
export function discloseStoredReplay<Body>(
  authorizationOutcome: "allow" | "deny",
  stored: StoredCommandEnvelope<Body>,
): StoredCommandEnvelope<Body> {
  if (authorizationOutcome === "allow") return stored;
  throw new ReplayDisclosureDeniedError();
}

export class ReplayDisclosureDeniedError extends Error {
  readonly code = "PROTECTED_NOT_FOUND" as const;

  constructor() {
    super(
      "Protected command result is unavailable; expected current replay-disclosure authorization.",
    );
    this.name = "ReplayDisclosureDeniedError";
  }
}

function assertSameVersion(
  name: string,
  prepared: number | undefined,
  current: number | undefined,
): void {
  assertSame(name + " version", prepared, current, "PREPARED_VERSION_CONFLICT");
}

function assertSame(
  name: string,
  prepared: unknown,
  current: unknown,
  code: PreparedCommandConflictError["code"],
): void {
  if (prepared === current) return;
  throw new PreparedCommandConflictError(
    code,
    `Prepared ${name} "${prepared}" differs from current ${name} "${current}"; expected exact finalize-time equivalence.`,
  );
}

function assertBeforeExpiry(
  name: string,
  expiresAt: string | undefined,
  now: string,
): void {
  if (expiresAt === undefined && validInstant(now)) return;
  if (
    expiresAt !== undefined && validInstant(expiresAt) && validInstant(now) &&
    Date.parse(now) < Date.parse(expiresAt)
  ) return;
  throw new PreparedCommandConflictError(
    "PREPARED_FACTS_EXPIRED",
    `Prepared ${name} facts expire at "${expiresAt}" for finalize time "${now}"; expected a valid instant strictly before expiry.`,
  );
}

function sortedUnique(values: readonly string[], kind: string): string[] {
  const sorted = [...values].sort();
  if (new Set(sorted).size === sorted.length) return sorted;
  throw new PreparedCommandConflictError(
    "TERMINAL_TASK_INVARIANT",
    `${kind} Task membership "${
      sorted.join(",")
    }" contains duplicates; expected unique Task IDs.`,
  );
}

function validInstant(value: string): boolean {
  return Number.isFinite(Date.parse(value));
}
