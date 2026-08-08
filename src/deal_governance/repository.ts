import type { IdempotencyKey } from "../shared/contracts/identifiers.ts";
import type { OutboxEvent } from "../platform/events/v1.ts";
import {
  GovernanceIdempotencyConflictError,
  GovernanceInvariantError,
  GovernanceVersionConflictError,
} from "./errors.ts";
import type {
  ConsequencePreview,
  DealGovernanceAggregate,
  GovernanceEvent,
  GovernanceScope,
} from "./model.ts";
import type { LegalHold, RetentionAssignment } from "./retention.ts";
import type { DeletionRequest } from "./deletion.ts";
import type { ErasureManifest, ErasureOrchestration } from "./orchestration.ts";

export interface CommandIdentity {
  readonly scope: GovernanceScope;
  readonly actorId: string;
  readonly commandType: string;
  readonly targetId: string;
  readonly idempotencyKey: IdempotencyKey;
}

export type CommandClaim =
  | { readonly state: "claimed" }
  | { readonly state: "in_progress" }
  | { readonly state: "replay"; readonly result: unknown };

export interface DealGovernanceStore {
  findPreview(
    scope: GovernanceScope,
    id: string,
  ): Promise<ConsequencePreview | undefined>;
  savePreview(preview: ConsequencePreview): Promise<void>;
  findGovernance(
    scope: GovernanceScope,
  ): Promise<DealGovernanceAggregate | undefined>;
  saveGovernance(
    aggregate: DealGovernanceAggregate,
    expectedVersion?: number,
  ): Promise<void>;
  findRetention(
    scope: GovernanceScope,
  ): Promise<RetentionAssignment | undefined>;
  saveRetention(
    assignment: RetentionAssignment,
    expectedVersion?: number,
  ): Promise<void>;
  findHold(scope: GovernanceScope, id: string): Promise<LegalHold | undefined>;
  listHolds(scope: GovernanceScope): Promise<LegalHold[]>;
  saveHold(hold: LegalHold, expectedVersion?: number): Promise<void>;
  findDeletionRequest(
    scope: GovernanceScope,
    id: string,
  ): Promise<DeletionRequest | undefined>;
  saveDeletionRequest(
    request: DeletionRequest,
    expectedVersion?: number,
  ): Promise<void>;
  findOrchestration(
    scope: GovernanceScope,
    id: string,
  ): Promise<ErasureOrchestration | undefined>;
  saveOrchestration(
    orchestration: ErasureOrchestration,
    expectedVersion?: number,
  ): Promise<void>;
  findManifest(
    scope: GovernanceScope,
    id: string,
  ): Promise<ErasureManifest | undefined>;
  saveManifest(manifest: ErasureManifest): Promise<void>;
  listEvents(scope: GovernanceScope): Promise<readonly GovernanceEvent[]>;
  claimCommand(
    identity: CommandIdentity,
    digest: string,
  ): Promise<CommandClaim>;
  completeCommand(
    identity: CommandIdentity,
    digest: string,
    result: unknown,
  ): Promise<void>;
  appendEvent(event: GovernanceEvent): Promise<void>;
  appendOutbox(event: OutboxEvent): Promise<void>;
}

export interface DealGovernanceRepository {
  transaction<T>(
    callback: (store: DealGovernanceStore) => Promise<T>,
  ): Promise<T>;
}

interface CommandRecord {
  readonly digest: string;
  readonly state: "in_progress" | "completed";
  readonly result?: unknown;
}

interface StoreState {
  readonly previews: Map<string, ConsequencePreview>;
  readonly governance: Map<string, DealGovernanceAggregate>;
  readonly retention: Map<string, RetentionAssignment>;
  readonly holds: Map<string, LegalHold>;
  readonly deletionRequests: Map<string, DeletionRequest>;
  readonly orchestrations: Map<string, ErasureOrchestration>;
  readonly manifests: Map<string, ErasureManifest>;
  readonly commands: Map<string, CommandRecord>;
  readonly events: GovernanceEvent[];
  readonly outbox: OutboxEvent[];
}

export class InMemoryDealGovernanceRepository
  implements DealGovernanceRepository {
  private state: StoreState = emptyState();
  private tail: Promise<void> = Promise.resolve();

  async transaction<T>(
    callback: (store: DealGovernanceStore) => Promise<T>,
  ): Promise<T> {
    const previous = this.tail;
    let release: () => void = () => {};
    this.tail = new Promise<void>((resolve) => release = resolve);
    await previous;
    const snapshot = cloneState(this.state);
    try {
      const result = await callback(
        new InMemoryDealGovernanceStore(this.state),
      );
      release();
      return result;
    } catch (error) {
      this.state = snapshot;
      release();
      throw error;
    }
  }

  get events(): readonly GovernanceEvent[] {
    return this.state.events.map(cloneValue);
  }

  get outbox(): readonly OutboxEvent[] {
    return this.state.outbox.map(cloneValue);
  }
}

class InMemoryDealGovernanceStore implements DealGovernanceStore {
  constructor(private readonly state: StoreState) {}

  findPreview(
    scope: GovernanceScope,
    id: string,
  ): Promise<ConsequencePreview | undefined> {
    return Promise.resolve(findPreviewById(this.state.previews, scope, id));
  }

  savePreview(preview: ConsequencePreview): Promise<void> {
    const key = scopedKey(preview.scope, preview.previewId);
    if (this.state.previews.has(key)) {
      throw new GovernanceInvariantError(
        `Consequence preview "${preview.previewId}" already exists; expected an immutable server-issued preview identity.`,
      );
    }
    this.state.previews.set(key, cloneValue(preview));
    return Promise.resolve();
  }

  findGovernance(
    scope: GovernanceScope,
  ): Promise<DealGovernanceAggregate | undefined> {
    return Promise.resolve(findScoped(this.state.governance, scope));
  }

  saveGovernance(
    aggregate: DealGovernanceAggregate,
    expectedVersion?: number,
  ): Promise<void> {
    saveVersioned(
      this.state.governance,
      aggregate,
      expectedVersion,
      "governance",
    );
    return Promise.resolve();
  }

  findRetention(
    scope: GovernanceScope,
  ): Promise<RetentionAssignment | undefined> {
    return Promise.resolve(findScoped(this.state.retention, scope));
  }

  saveRetention(
    assignment: RetentionAssignment,
    expectedVersion?: number,
  ): Promise<void> {
    saveVersioned(
      this.state.retention,
      assignment,
      expectedVersion,
      "retention assignment",
    );
    return Promise.resolve();
  }

  findHold(scope: GovernanceScope, id: string): Promise<LegalHold | undefined> {
    return Promise.resolve(findById(this.state.holds, scope, id));
  }

  listHolds(scope: GovernanceScope): Promise<LegalHold[]> {
    return Promise.resolve(listScoped(this.state.holds, scope));
  }

  saveHold(hold: LegalHold, expectedVersion?: number): Promise<void> {
    saveVersioned(this.state.holds, hold, expectedVersion, "legal hold");
    return Promise.resolve();
  }

  findDeletionRequest(
    scope: GovernanceScope,
    id: string,
  ): Promise<DeletionRequest | undefined> {
    return Promise.resolve(findById(this.state.deletionRequests, scope, id));
  }

  saveDeletionRequest(
    request: DeletionRequest,
    expectedVersion?: number,
  ): Promise<void> {
    saveVersioned(
      this.state.deletionRequests,
      request,
      expectedVersion,
      "deletion request",
    );
    return Promise.resolve();
  }

  findOrchestration(
    scope: GovernanceScope,
    id: string,
  ): Promise<ErasureOrchestration | undefined> {
    return Promise.resolve(findById(this.state.orchestrations, scope, id));
  }

  saveOrchestration(
    orchestration: ErasureOrchestration,
    expectedVersion?: number,
  ): Promise<void> {
    saveVersioned(
      this.state.orchestrations,
      orchestration,
      expectedVersion,
      "orchestration",
    );
    return Promise.resolve();
  }

  findManifest(
    scope: GovernanceScope,
    id: string,
  ): Promise<ErasureManifest | undefined> {
    return Promise.resolve(findById(this.state.manifests, scope, id));
  }

  saveManifest(manifest: ErasureManifest): Promise<void> {
    const key = scopedKey(manifest.scope, manifest.id);
    if (this.state.manifests.has(key)) {
      throw new GovernanceInvariantError(
        `Erasure manifest "${manifest.id}" already exists; expected an immutable manifest identity.`,
      );
    }
    this.state.manifests.set(key, cloneValue(manifest));
    return Promise.resolve();
  }

  listEvents(scope: GovernanceScope): Promise<readonly GovernanceEvent[]> {
    return Promise.resolve(
      this.state.events.filter((event) => sameScope(event.scope, scope)).map(
        cloneValue,
      ),
    );
  }

  claimCommand(
    identity: CommandIdentity,
    digest: string,
  ): Promise<CommandClaim> {
    const key = commandKey(identity);
    const existing = this.state.commands.get(key);
    if (existing === undefined) {
      this.state.commands.set(key, { digest, state: "in_progress" });
      return Promise.resolve({ state: "claimed" });
    }
    if (existing.digest !== digest) {
      throw new GovernanceIdempotencyConflictError(identity.idempotencyKey);
    }
    return Promise.resolve(
      existing.state === "completed"
        ? { state: "replay", result: cloneValue(existing.result) }
        : { state: "in_progress" },
    );
  }

  completeCommand(
    identity: CommandIdentity,
    digest: string,
    result: unknown,
  ): Promise<void> {
    const key = commandKey(identity);
    const existing = this.state.commands.get(key);
    if (existing?.state !== "in_progress" || existing.digest !== digest) {
      throw new GovernanceInvariantError(
        `Governance command "${identity.commandType}" key "${identity.idempotencyKey}" cannot complete; expected a matching in-progress claim.`,
      );
    }
    this.state.commands.set(key, {
      digest,
      state: "completed",
      result: cloneValue(result),
    });
    return Promise.resolve();
  }

  appendEvent(event: GovernanceEvent): Promise<void> {
    this.state.events.push(cloneValue(event));
    return Promise.resolve();
  }

  appendOutbox(event: OutboxEvent): Promise<void> {
    this.state.outbox.push(cloneValue(event));
    return Promise.resolve();
  }
}

function saveVersioned<
  T extends {
    readonly scope: GovernanceScope;
    readonly id: string;
    readonly version: number;
  },
>(
  map: Map<string, T>,
  value: T,
  expectedVersion: number | undefined,
  label: string,
): void {
  const key = scopedKey(value.scope, value.id);
  const current = map.get(key);
  if (expectedVersion === undefined) {
    if (current !== undefined) {
      throw new GovernanceInvariantError(
        `${label} "${value.id}" already exists; expected a new scoped aggregate.`,
      );
    }
  } else {
    if (current?.version !== expectedVersion) {
      throw new GovernanceVersionConflictError(
        expectedVersion,
        current?.version ?? 0,
        value.id,
      );
    }
    if (value.version !== expectedVersion + 1) {
      throw new GovernanceInvariantError(
        `${label} "${value.id}" version "${value.version}" is invalid; expected "${
          expectedVersion + 1
        }" after update.`,
      );
    }
  }
  map.set(key, cloneValue(value));
}

function findScoped<T extends { readonly scope: GovernanceScope }>(
  map: Map<string, T>,
  scope: GovernanceScope,
): T | undefined {
  const found = [...map.values()].find((value) =>
    sameScope(value.scope, scope)
  );
  return found === undefined ? undefined : cloneValue(found);
}

function listScoped<T extends { readonly scope: GovernanceScope }>(
  map: Map<string, T>,
  scope: GovernanceScope,
): T[] {
  return [...map.values()].filter((value) => sameScope(value.scope, scope)).map(
    cloneValue,
  );
}

function findById<
  T extends { readonly scope: GovernanceScope; readonly id: string },
>(
  map: Map<string, T>,
  scope: GovernanceScope,
  id: string,
): T | undefined {
  return map.get(scopedKey(scope, id)) === undefined
    ? undefined
    : cloneValue(map.get(scopedKey(scope, id))!);
}

function findPreviewById(
  map: Map<string, ConsequencePreview>,
  scope: GovernanceScope,
  id: string,
): ConsequencePreview | undefined {
  const preview = map.get(scopedKey(scope, id));
  return preview === undefined ? undefined : cloneValue(preview);
}

function emptyState(): StoreState {
  return {
    previews: new Map(),
    governance: new Map(),
    retention: new Map(),
    holds: new Map(),
    deletionRequests: new Map(),
    orchestrations: new Map(),
    manifests: new Map(),
    commands: new Map(),
    events: [],
    outbox: [],
  };
}

function cloneState(state: StoreState): StoreState {
  return {
    previews: cloneMap(state.previews),
    governance: cloneMap(state.governance),
    retention: cloneMap(state.retention),
    holds: cloneMap(state.holds),
    deletionRequests: cloneMap(state.deletionRequests),
    orchestrations: cloneMap(state.orchestrations),
    manifests: cloneMap(state.manifests),
    commands: cloneMap(state.commands),
    events: state.events.map(cloneValue),
    outbox: state.outbox.map(cloneValue),
  };
}

function cloneMap<T>(map: Map<string, T>): Map<string, T> {
  return new Map(
    [...map.entries()].map(([key, value]) => [key, cloneValue(value)]),
  );
}

function cloneValue<T>(value: T): T {
  return structuredClone(value);
}

function sameScope(left: GovernanceScope, right: GovernanceScope): boolean {
  return left.tenantId === right.tenantId &&
    left.workspaceId === right.workspaceId && left.dealId === right.dealId;
}

function scopedKey(scope: GovernanceScope, id: string): string {
  return `${scope.tenantId}|${scope.workspaceId}|${scope.dealId}|${id}`;
}

function commandKey(identity: CommandIdentity): string {
  return `${
    scopedKey(identity.scope, identity.targetId)
  }|${identity.actorId}|${identity.commandType}|${identity.idempotencyKey}`;
}
