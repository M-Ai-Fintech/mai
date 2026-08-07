import type { AggregateVersion } from "../shared/contracts/aggregate_version.ts";
import {
  DealAccessInvariantError,
  DealAccessVersionConflictError,
} from "./errors.ts";
import type { DealParticipation, ExternalGrant } from "./model.ts";

export function activateParticipation(
  participation: DealParticipation,
  expectedVersion: number,
  now: string,
): DealParticipation {
  assertVersion(participation.version, expectedVersion, participation.id);
  if (participation.state !== "invited") {
    throw new DealAccessInvariantError(
      `Participation "${participation.id}" state "${participation.state}" cannot activate; expected invited.`,
    );
  }
  return updateParticipation(participation, "active", now);
}

export function revokeGrant(
  grant: ExternalGrant,
  expectedVersion: number,
  now: string,
): ExternalGrant {
  assertVersion(grant.version, expectedVersion, grant.id);
  return updateGrant(grant, "revoked", now);
}

export function expireGrant(
  grant: ExternalGrant,
  expectedVersion: number,
  now: string,
): ExternalGrant {
  assertVersion(grant.version, expectedVersion, grant.id);
  if (Date.parse(grant.expiresAt) > Date.parse(now)) {
    throw new DealAccessInvariantError(
      `Grant "${grant.id}" expires at "${grant.expiresAt}"; expected expiry at or before "${now}".`,
    );
  }
  return updateGrant(grant, "expired", now);
}

export function offboardGrant(
  grant: ExternalGrant,
  expectedVersion: number,
  now: string,
): ExternalGrant {
  assertVersion(grant.version, expectedVersion, grant.id);
  return updateGrant(grant, "offboarded", now);
}

export function offboardParticipation(
  participation: DealParticipation,
  grant: ExternalGrant,
  expectedParticipationVersion: number,
  expectedGrantVersion: number,
  now: string,
): {
  readonly participation: DealParticipation;
  readonly grant: ExternalGrant;
} {
  assertVersion(
    participation.version,
    expectedParticipationVersion,
    participation.id,
  );
  assertVersion(grant.version, expectedGrantVersion, grant.id);
  return {
    participation: updateParticipation(participation, "offboarded", now),
    grant: updateGrant(grant, "offboarded", now),
  };
}

function updateParticipation(
  participation: DealParticipation,
  state: DealParticipation["state"],
  now: string,
): DealParticipation {
  return Object.freeze({
    ...participation,
    state,
    version: (participation.version + 1) as AggregateVersion,
    updatedAt: now,
  });
}

function updateGrant(
  grant: ExternalGrant,
  state: ExternalGrant["state"],
  now: string,
): ExternalGrant {
  return Object.freeze({
    ...grant,
    state,
    version: (grant.version + 1) as AggregateVersion,
    updatedAt: now,
  });
}

function assertVersion(
  current: AggregateVersion,
  expected: number,
  _aggregateId: string,
): void {
  if (current === expected) return;
  throw new DealAccessVersionConflictError(expected, current);
}
