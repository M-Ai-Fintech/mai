import type { AggregateVersion } from "../shared/contracts/aggregate_version.ts";
import { assertExpectedVersion, assertReason } from "./errors.ts";
import type { AdministrationContext, AggregateBase } from "./contracts.ts";

export const FIRST_VERSION = 1 as AggregateVersion;

export function aggregateBase(
  context: AdministrationContext,
): AggregateBase {
  return {
    version: FIRST_VERSION,
    tenantId: context.tenantId,
    createdAt: context.now,
    updatedAt: context.now,
  };
}

export function nextAggregateVersion(
  aggregate: AggregateBase,
  expectedVersion: AggregateVersion | number | undefined,
  context: AdministrationContext,
): AggregateBase {
  assertExpectedVersion(aggregate.version, expectedVersion, "aggregate");
  return {
    ...aggregate,
    version: (aggregate.version + 1) as AggregateVersion,
    updatedAt: context.now,
  };
}

export function freezeValues<T>(values: readonly T[]): readonly T[] {
  return Object.freeze([...values]);
}

export function assertName(name: string, field: string): void {
  if (name.trim().length > 0 && name.length <= 255) return;
  throw new Error(
    `Invalid ${field} "${name}"; expected 1-255 non-whitespace characters.`,
  );
}

export function assertText(value: string, field: string, maximum = 255): void {
  if (value.trim().length > 0 && value.length <= maximum) return;
  throw new Error(
    `Invalid ${field} "${value}"; expected 1-${maximum} non-whitespace characters.`,
  );
}

export function assertReasonText(reason: string): void {
  assertReason(reason);
}
