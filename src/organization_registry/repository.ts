import type { AggregateVersion } from "../shared/contracts/aggregate_version.ts";
import {
  RegistryDuplicateIdentityError,
  RegistryInvariantError,
  RegistryNotFoundError,
  RegistryScopeMismatchError,
} from "./errors.ts";
import type {
  LegalEntity,
  MergeHistory,
  Organization,
  Person,
  RegistryAggregate,
  RegistryEntityKind,
  RegistryMergeResult,
  RegistryScope,
} from "./contracts.ts";
import { assertExpectedVersion, normalizeIdentity } from "./model.ts";
import type { RegistryEntityId } from "./ids.ts";

export interface RegistryReference {
  readonly kind: RegistryEntityKind;
  readonly id: RegistryEntityId;
}

export interface RegistryMergeWrite {
  readonly scope: RegistryScope;
  readonly source: RegistryAggregate;
  readonly target: RegistryAggregate;
  readonly history: MergeHistory;
  readonly sourceExpectedVersion: AggregateVersion;
  readonly targetExpectedVersion: AggregateVersion;
}

export interface OrganizationRegistryRepository {
  get(
    scope: RegistryScope,
    reference: RegistryReference,
  ): Promise<RegistryAggregate | undefined>;
  list(
    scope: RegistryScope,
    kind: RegistryEntityKind,
  ): Promise<readonly RegistryAggregate[]>;
  insert(scope: RegistryScope, aggregate: RegistryAggregate): Promise<void>;
  replace(
    scope: RegistryScope,
    aggregate: RegistryAggregate,
    expectedVersion: AggregateVersion,
  ): Promise<RegistryAggregate>;
  merge(input: RegistryMergeWrite): Promise<RegistryMergeResult>;
  listMergeHistory(
    scope: RegistryScope,
    kind?: RegistryEntityKind,
  ): Promise<readonly MergeHistory[]>;
}

/**
 * Deterministic adapter for domain tests and local read-model composition.
 *
 * @example const repository = new InMemoryOrganizationRegistryRepository();
 */
export class InMemoryOrganizationRegistryRepository
  implements OrganizationRegistryRepository {
  private readonly aggregates = new Map<string, RegistryAggregate>();
  private readonly mergeHistory: MergeHistory[] = [];

  get(
    scope: RegistryScope,
    reference: RegistryReference,
  ): Promise<RegistryAggregate | undefined> {
    const aggregate = this.aggregates.get(aggregateKey(scope, reference));
    return Promise.resolve(
      aggregate === undefined ? undefined : cloneAggregate(aggregate),
    );
  }

  list(
    scope: RegistryScope,
    kind: RegistryEntityKind,
  ): Promise<readonly RegistryAggregate[]> {
    return Promise.resolve(
      [...this.aggregates.values()]
        .filter((aggregate) =>
          aggregate.kind === kind && sameScope(aggregate.scope, scope)
        )
        .map(cloneAggregate),
    );
  }

  insert(
    scope: RegistryScope,
    aggregate: RegistryAggregate,
  ): Promise<void> {
    assertAggregateScope(scope, aggregate);
    const key = aggregateKey(scope, aggregate);
    if (this.aggregates.has(key)) {
      throw new RegistryDuplicateIdentityError(
        `${aggregate.kind} id`,
        aggregate.id,
      );
    }
    this.assertNaturalIdentityAvailable(aggregate);
    this.aggregates.set(key, cloneAggregate(aggregate));
    return Promise.resolve();
  }

  async replace(
    scope: RegistryScope,
    aggregate: RegistryAggregate,
    expectedVersion: AggregateVersion,
  ): Promise<RegistryAggregate> {
    assertAggregateScope(scope, aggregate);
    const current = await this.get(scope, aggregate);
    if (current === undefined) {
      throw new RegistryNotFoundError(aggregate.kind, aggregate.id);
    }
    assertExpectedVersion(
      current.kind,
      current.id,
      expectedVersion,
      current.version,
    );
    if (aggregate.version !== expectedVersion + 1) {
      throw new RegistryInvariantError(
        `Registry ${aggregate.kind} "${aggregate.id}" supplied version "${aggregate.version}"; expected "${
          expectedVersion + 1
        }".`,
      );
    }
    this.assertNaturalIdentityAvailable(aggregate);
    this.aggregates.set(
      aggregateKey(scope, aggregate),
      cloneAggregate(aggregate),
    );
    return cloneAggregate(aggregate);
  }

  async merge(input: RegistryMergeWrite): Promise<RegistryMergeResult> {
    assertAggregateScope(input.scope, input.source);
    assertAggregateScope(input.scope, input.target);
    if (input.source.kind !== input.target.kind) {
      throw new RegistryInvariantError(
        `Registry merge kinds "${input.source.kind}" and "${input.target.kind}" differ; expected the same aggregate kind.`,
      );
    }
    const currentSource = await this.get(input.scope, input.source);
    const currentTarget = await this.get(input.scope, input.target);
    if (currentSource === undefined) {
      throw new RegistryNotFoundError(input.source.kind, input.source.id);
    }
    if (currentTarget === undefined) {
      throw new RegistryNotFoundError(input.target.kind, input.target.id);
    }
    assertExpectedVersion(
      currentSource.kind,
      currentSource.id,
      input.sourceExpectedVersion,
      currentSource.version,
    );
    assertExpectedVersion(
      currentTarget.kind,
      currentTarget.id,
      input.targetExpectedVersion,
      currentTarget.version,
    );
    assertMergeVersions(input, currentSource.version, currentTarget.version);
    assertMergeHistory(input);
    if (
      this.mergeHistory.some(({ recordId }) =>
        recordId === input.history.recordId
      )
    ) {
      throw new RegistryInvariantError(
        `Merge history record "${input.history.recordId}" already exists; expected an append-only unique record.`,
      );
    }
    this.aggregates.set(
      aggregateKey(input.scope, input.source),
      cloneAggregate(input.source),
    );
    this.aggregates.set(
      aggregateKey(input.scope, input.target),
      cloneAggregate(input.target),
    );
    this.mergeHistory.push(cloneHistory(input.history));
    return {
      source: cloneAggregate(input.source),
      target: cloneAggregate(input.target),
      history: cloneHistory(input.history),
    };
  }

  listMergeHistory(
    scope: RegistryScope,
    kind?: RegistryEntityKind,
  ): Promise<readonly MergeHistory[]> {
    return Promise.resolve(
      this.mergeHistory
        .filter((entry) => sameScope(entry.scope, scope))
        .filter((entry) => kind === undefined || entry.kind === kind)
        .map(cloneHistory),
    );
  }

  private assertNaturalIdentityAvailable(aggregate: RegistryAggregate): void {
    const conflict = [...this.aggregates.values()].find((current) =>
      current.id !== aggregate.id &&
      sameScope(current.scope, aggregate.scope) &&
      sameNaturalIdentity(current, aggregate)
    );
    if (conflict === undefined) return;
    const identity = aggregate.kind === "organization"
      ? "organization name"
      : "legal entity registration";
    const value = aggregate.kind === "organization"
      ? aggregate.normalizedName
      : aggregate.kind === "legal_entity"
      ? `${aggregate.jurisdictionCode}:${aggregate.registrationNumber}`
      : aggregate.id;
    throw new RegistryDuplicateIdentityError(identity, value);
  }
}

function assertAggregateScope(
  scope: RegistryScope,
  aggregate: RegistryAggregate,
): void {
  if (sameScope(scope, aggregate.scope)) return;
  throw new RegistryScopeMismatchError(
    aggregate.id,
    scope.tenantId,
    aggregate.scope.tenantId,
  );
}

function assertMergeVersions(
  input: RegistryMergeWrite,
  sourceVersion: AggregateVersion,
  targetVersion: AggregateVersion,
): void {
  if (
    input.source.version === sourceVersion + 1 &&
    input.target.version === targetVersion + 1
  ) return;
  throw new RegistryInvariantError(
    `Registry merge supplied source version "${input.source.version}" and target version "${input.target.version}"; expected "${
      sourceVersion + 1
    }" and "${targetVersion + 1}".`,
  );
}

function assertMergeHistory(input: RegistryMergeWrite): void {
  if (
    input.history.kind === input.source.kind &&
    input.history.sourceId === input.source.id &&
    input.history.targetId === input.target.id &&
    input.history.scope.tenantId === input.scope.tenantId &&
    input.history.scope.workspaceId === input.scope.workspaceId &&
    input.history.sourceVersion === input.source.version &&
    input.history.targetVersion === input.target.version
  ) return;
  throw new RegistryInvariantError(
    `Merge history "${input.history.recordId}" does not describe the supplied source and target versions; expected an append-only matching record.`,
  );
}

function sameNaturalIdentity(
  left: RegistryAggregate,
  right: RegistryAggregate,
): boolean {
  if (left.kind !== right.kind) return false;
  if (left.kind === "organization" && right.kind === "organization") {
    return left.normalizedName === right.normalizedName;
  }
  if (left.kind === "legal_entity" && right.kind === "legal_entity") {
    return left.jurisdictionCode === right.jurisdictionCode &&
      normalizeIdentity(left.registrationNumber) ===
        normalizeIdentity(right.registrationNumber);
  }
  return false;
}

function aggregateKey(
  scope: RegistryScope,
  reference: RegistryReference | RegistryAggregate,
): string {
  return [
    scope.tenantId,
    scope.workspaceId ?? "tenant-wide",
    reference.kind,
    reference.id,
  ].join("|");
}

function sameScope(left: RegistryScope, right: RegistryScope): boolean {
  return left.tenantId === right.tenantId &&
    left.workspaceId === right.workspaceId;
}

function cloneAggregate<T extends RegistryAggregate>(aggregate: T): T {
  return Object.freeze({ ...aggregate }) as unknown as T;
}

function cloneHistory(history: MergeHistory): MergeHistory {
  return Object.freeze({ ...history });
}

export type OrganizationRecord = Organization;
export type LegalEntityRecord = LegalEntity;
export type PersonRecord = Person;
