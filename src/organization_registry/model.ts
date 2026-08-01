import {
  type AggregateVersion,
  parseAggregateVersion,
} from "../shared/contracts/aggregate_version.ts";
import type { ActorId } from "../shared/contracts/identifiers.ts";
import {
  RegistryInvariantError,
  RegistryVersionConflictError,
} from "./errors.ts";
import type {
  LegalEntityPatch,
  OrganizationPatch,
  PersonPatch,
} from "./commands.ts";
import type {
  LegalEntity,
  MergeHistory,
  Organization,
  Person,
  RegistryAggregate,
  RegistryEntityKind,
  RegistryLifecycleState,
  RegistryScope,
} from "./contracts.ts";
import type {
  LegalEntityId,
  MergeRecordId,
  OrganizationId,
  PersonId,
} from "./ids.ts";

export function createOrganizationAggregate(input: {
  readonly id: OrganizationId;
  readonly scope: RegistryScope;
  readonly name: string;
  readonly externalReference?: string;
  readonly now: string;
}): Organization {
  const name = validateOrganizationName(input.name);
  return Object.freeze({
    kind: "organization",
    id: input.id,
    scope: input.scope,
    version: initialVersion(),
    state: "active",
    createdAt: input.now,
    updatedAt: input.now,
    name,
    normalizedName: normalizeIdentity(name),
    ...(input.externalReference === undefined ? {} : {
      externalReference: requiredText(
        input.externalReference,
        "organization external reference",
        128,
      ),
    }),
  });
}

export function validateOrganizationName(value: string): string {
  return requiredText(value, "organization name", 200);
}

export function createLegalEntityAggregate(input: {
  readonly id: LegalEntityId;
  readonly scope: RegistryScope;
  readonly organizationId: OrganizationId;
  readonly legalName: string;
  readonly jurisdictionCode: string;
  readonly registrationNumber: string;
  readonly now: string;
}): LegalEntity {
  const legalName = requiredText(input.legalName, "legal entity name", 200);
  const jurisdictionCode = requiredJurisdiction(input.jurisdictionCode);
  const registrationNumber = requiredText(
    input.registrationNumber,
    "legal entity registration number",
    128,
  );
  return Object.freeze({
    kind: "legal_entity",
    id: input.id,
    scope: input.scope,
    version: initialVersion(),
    state: "active",
    createdAt: input.now,
    updatedAt: input.now,
    organizationId: input.organizationId,
    legalName,
    jurisdictionCode,
    registrationNumber,
  });
}

export function createPersonAggregate(input: {
  readonly id: PersonId;
  readonly scope: RegistryScope;
  readonly organizationId?: OrganizationId;
  readonly givenName: string;
  readonly familyName: string;
  readonly email?: string;
  readonly phone?: string;
  readonly nationalId?: string;
  readonly now: string;
}): Person {
  return Object.freeze({
    kind: "person",
    id: input.id,
    scope: input.scope,
    version: initialVersion(),
    state: "active",
    createdAt: input.now,
    updatedAt: input.now,
    ...(input.organizationId === undefined
      ? {}
      : { organizationId: input.organizationId }),
    givenName: requiredText(input.givenName, "person given name", 120),
    familyName: requiredText(input.familyName, "person family name", 120),
    ...(input.email === undefined
      ? {}
      : { email: validatedEmail(input.email) }),
    ...(input.phone === undefined
      ? {}
      : { phone: requiredText(input.phone, "person phone", 64) }),
    ...(input.nationalId === undefined ? {} : {
      nationalId: requiredText(input.nationalId, "person national ID", 128),
    }),
  });
}

export function updateOrganizationAggregate(
  current: Organization,
  patch: OrganizationPatch,
  now: string,
): Organization {
  if (Object.keys(patch).length === 0) {
    throw new RegistryInvariantError(
      `Organization "${current.id}" update was empty; expected a mutable field.`,
    );
  }
  const name = patch.name === undefined
    ? current.name
    : requiredText(patch.name, "organization name", 200);
  return Object.freeze({
    ...current,
    version: nextVersion(current.version),
    updatedAt: now,
    name,
    normalizedName: normalizeIdentity(name),
    ...(patch.externalReference === undefined ? {} : {
      externalReference: requiredText(
        patch.externalReference,
        "organization external reference",
        128,
      ),
    }),
  });
}

export function updateLegalEntityAggregate(
  current: LegalEntity,
  patch: LegalEntityPatch,
  now: string,
): LegalEntity {
  if (Object.keys(patch).length === 0) {
    throw new RegistryInvariantError(
      `Legal entity "${current.id}" update was empty; expected a mutable field.`,
    );
  }
  return Object.freeze({
    ...current,
    version: nextVersion(current.version),
    updatedAt: now,
    legalName: patch.legalName === undefined
      ? current.legalName
      : requiredText(patch.legalName, "legal entity name", 200),
    jurisdictionCode: patch.jurisdictionCode === undefined
      ? current.jurisdictionCode
      : requiredJurisdiction(patch.jurisdictionCode),
    registrationNumber: patch.registrationNumber === undefined
      ? current.registrationNumber
      : requiredText(
        patch.registrationNumber,
        "legal entity registration number",
        128,
      ),
  });
}

export function updatePersonAggregate(
  current: Person,
  patch: PersonPatch,
  now: string,
): Person {
  if (Object.keys(patch).length === 0) {
    throw new RegistryInvariantError(
      `Person "${current.id}" update was empty; expected a mutable field.`,
    );
  }
  return Object.freeze({
    ...current,
    version: nextVersion(current.version),
    updatedAt: now,
    ...(patch.organizationId === undefined
      ? {}
      : { organizationId: patch.organizationId }),
    givenName: patch.givenName === undefined
      ? current.givenName
      : requiredText(patch.givenName, "person given name", 120),
    familyName: patch.familyName === undefined
      ? current.familyName
      : requiredText(patch.familyName, "person family name", 120),
    ...(patch.email === undefined
      ? {}
      : { email: validatedEmail(patch.email) }),
    ...(patch.phone === undefined
      ? {}
      : { phone: requiredText(patch.phone, "person phone", 64) }),
    ...(patch.nationalId === undefined ? {} : {
      nationalId: requiredText(patch.nationalId, "person national ID", 128),
    }),
  });
}

export function transitionAggregate<T extends RegistryAggregate>(
  current: T,
  state: Exclude<RegistryLifecycleState, "merged">,
  now: string,
): T {
  assertTransition(current, state);
  return Object.freeze({
    ...current,
    version: nextVersion(current.version),
    state,
    updatedAt: now,
  }) as unknown as T;
}

export function mergeSourceAggregate<T extends RegistryAggregate>(
  source: T,
  targetId: T["id"],
  now: string,
): T {
  assertTransition(source, "merged");
  return Object.freeze({
    ...source,
    version: nextVersion(source.version),
    state: "merged",
    mergedIntoId: targetId,
    updatedAt: now,
  }) as unknown as T;
}

export function touchMergedTarget<T extends RegistryAggregate>(
  target: T,
  now: string,
): T {
  if (target.state !== "active") {
    throw new RegistryInvariantError(
      `Registry ${target.kind} "${target.id}" is "${target.state}"; expected an active target before merge.`,
    );
  }
  return Object.freeze({
    ...target,
    version: nextVersion(target.version),
    updatedAt: now,
  }) as unknown as T;
}

export function createMergeHistory(input: {
  readonly recordId: MergeRecordId;
  readonly kind: RegistryEntityKind;
  readonly scope: RegistryScope;
  readonly sourceId: RegistryEntityIdForKind;
  readonly targetId: RegistryEntityIdForKind;
  readonly sourceVersion: AggregateVersion;
  readonly targetVersion: AggregateVersion;
  readonly actorId: ActorId;
  readonly reason: string;
  readonly recordedAt: string;
}): MergeHistory {
  return Object.freeze({
    ...input,
    reason: requiredText(input.reason, "merge reason", 500),
  });
}

export type RegistryEntityIdForKind = RegistryAggregate["id"];

export function assertExpectedVersion(
  kind: string,
  id: string,
  expected: AggregateVersion,
  current: AggregateVersion,
): void {
  if (expected === current) return;
  throw new RegistryVersionConflictError(kind, id, expected, current);
}

export function normalizeIdentity(value: string): string {
  return value.trim().toLocaleLowerCase();
}

function initialVersion(): AggregateVersion {
  const parsed = parseAggregateVersion(1);
  if (parsed.ok) return parsed.value;
  throw new Error(
    "Initial registry version is invalid; expected positive one.",
  );
}

function nextVersion(current: AggregateVersion): AggregateVersion {
  const parsed = parseAggregateVersion(current + 1);
  if (parsed.ok) return parsed.value;
  throw new RegistryInvariantError(
    `Registry version "${current}" cannot advance; expected a safe positive integer.`,
  );
}

function assertTransition(
  aggregate: RegistryAggregate,
  target: RegistryLifecycleState,
): void {
  if (aggregate.state === "merged") {
    throw new RegistryInvariantError(
      `Registry ${aggregate.kind} "${aggregate.id}" is merged; expected an active or archived aggregate.`,
    );
  }
  if (target === "active" && aggregate.state !== "archived") {
    throw new RegistryInvariantError(
      `Registry ${aggregate.kind} "${aggregate.id}" is "${aggregate.state}"; expected archived state before restore.`,
    );
  }
  if (target === "archived" && aggregate.state !== "active") {
    throw new RegistryInvariantError(
      `Registry ${aggregate.kind} "${aggregate.id}" is "${aggregate.state}"; expected active state before archive.`,
    );
  }
}

function requiredText(value: string, field: string, maxLength: number): string {
  const normalized = value.trim();
  if (normalized.length > 0 && normalized.length <= maxLength) {
    return normalized;
  }
  throw new RegistryInvariantError(
    `Registry field "${field}" received "${value}"; expected non-empty text of at most ${maxLength} characters.`,
  );
}

function requiredJurisdiction(value: string): string {
  const normalized = value.trim().toUpperCase();
  if (/^[A-Z]{2,3}$/.test(normalized)) return normalized;
  throw new RegistryInvariantError(
    `Legal entity jurisdiction "${value}" is invalid; expected a two- or three-letter country or territory code.`,
  );
}

function validatedEmail(value: string): string {
  const normalized = requiredText(value, "person email", 320)
    .toLocaleLowerCase();
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) return normalized;
  throw new RegistryInvariantError(
    `Person email "${value}" is invalid; expected a qualified email address.`,
  );
}
