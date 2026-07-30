import {
  AggregateVersion,
  parseAggregateVersion,
} from "../../shared/contracts/aggregate_version.ts";
import { TenantId } from "../../shared/contracts/identifiers.ts";
import { TransactionHandle, TransactionQueryResult } from "./transaction.ts";

declare const projectionWatermarkBrand: unique symbol;
export type ProjectionWatermark = string & {
  readonly [projectionWatermarkBrand]: "ProjectionWatermark";
};

export type ProjectionWatermarkResult =
  | { readonly ok: true; readonly value: ProjectionWatermark }
  | {
    readonly ok: false;
    readonly issue: { readonly code: "INVALID_PROJECTION_WATERMARK" };
  };

export interface AggregateUpdate {
  readonly table: string;
  readonly tenantId: TenantId;
  readonly aggregateId: string;
  readonly expectedVersion: AggregateVersion;
  readonly changes: Readonly<Record<string, unknown>>;
}

export interface AggregateVersionReference {
  readonly table: string;
  readonly tenantId: TenantId;
  readonly aggregateId: string;
  readonly exactVersion: AggregateVersion;
}

export class VersionConflictError extends Error {
  readonly code: "VERSION_CONFLICT" | "REFERENCED_VERSION_MISMATCH";

  constructor(
    code: "VERSION_CONFLICT" | "REFERENCED_VERSION_MISMATCH",
    aggregateId: string,
    version: AggregateVersion,
  ) {
    super(
      `${code}: aggregate "${aggregateId}" did not match expected version "${version}".`,
    );
    this.name = "VersionConflictError";
    this.code = code;
  }
}

/**
 * Parses an opaque projection checkpoint separately from aggregate versions.
 *
 * @example parseProjectionWatermark("projection_deals:42")
 */
export function parseProjectionWatermark(
  value: unknown,
): ProjectionWatermarkResult {
  if (
    typeof value === "string" &&
    /^[a-z][a-z0-9_]{0,63}:[a-zA-Z0-9_-]{1,128}$/.test(value)
  ) {
    return { ok: true, value: value as ProjectionWatermark };
  }
  return {
    ok: false,
    issue: { code: "INVALID_PROJECTION_WATERMARK" },
  };
}

/**
 * Applies one tenant-scoped material update and increments version once.
 *
 * @example await updateAggregateVersion(transaction, update)
 */
export async function updateAggregateVersion(
  transaction: TransactionHandle,
  update: AggregateUpdate,
): Promise<AggregateVersion> {
  const columns = changeColumns(update);
  const result = await transaction.query<{ version: string }>(
    aggregateUpdateSql(update.table, columns),
    aggregateUpdateValues(update, columns),
  );
  if (result.rowCount === 0) {
    throw new VersionConflictError(
      "VERSION_CONFLICT",
      update.aggregateId,
      update.expectedVersion,
    );
  }
  return returnedVersion(result, update.aggregateId);
}

/**
 * Checks one exact referenced version without changing aggregate state.
 *
 * @example await assertReferencedVersion(transaction, reference)
 */
export async function assertReferencedVersion(
  transaction: TransactionHandle,
  reference: AggregateVersionReference,
): Promise<void> {
  assertQualifiedIdentifier(reference.table);
  const result = await transaction.query(
    `SELECT 1 FROM ${reference.table}
     WHERE aggregate_id = $1 AND tenant_id = $2 AND version = $3`,
    [reference.aggregateId, reference.tenantId, reference.exactVersion],
  );
  if (result.rowCount !== 0) return;
  throw new VersionConflictError(
    "REFERENCED_VERSION_MISMATCH",
    reference.aggregateId,
    reference.exactVersion,
  );
}

function changeColumns(update: AggregateUpdate): string[] {
  const columns = Object.keys(update.changes).sort();
  if (columns.length === 0) {
    throw new Error(
      `Aggregate "${update.aggregateId}" changes are empty; expected at least one material field.`,
    );
  }
  for (const column of columns) assertMutableColumn(column);
  assertQualifiedIdentifier(update.table);
  return columns;
}

function assertMutableColumn(column: string): void {
  assertIdentifier(column);
  if (!["aggregate_id", "tenant_id", "version"].includes(column)) return;
  throw new Error(
    `Aggregate change column "${column}" is protected; expected a material field.`,
  );
}

function aggregateUpdateSql(table: string, columns: readonly string[]): string {
  const assignments = columns.map((column, index) =>
    `${column} = $${index + 1}`
  );
  assignments.push("version = version + 1");
  const offset = columns.length;
  return `UPDATE ${table} SET ${assignments.join(", ")}
    WHERE aggregate_id = $${offset + 1}
      AND tenant_id = $${offset + 2}
      AND version = $${offset + 3}
    RETURNING version::text`;
}

function aggregateUpdateValues(
  update: AggregateUpdate,
  columns: readonly string[],
): unknown[] {
  return [
    ...columns.map((column) => update.changes[column]),
    update.aggregateId,
    update.tenantId,
    update.expectedVersion,
  ];
}

function returnedVersion(
  result: TransactionQueryResult<{ version: string }>,
  aggregateId: string,
): AggregateVersion {
  const parsed = parseAggregateVersion(Number(result.rows[0]?.version));
  if (parsed.ok) return parsed.value;
  throw new Error(
    `Aggregate "${aggregateId}" returned version "${
      result.rows[0]?.version
    }"; expected a positive integer.`,
  );
}

function assertQualifiedIdentifier(identifier: string): void {
  const parts = identifier.split(".");
  if (parts.length === 2 && parts.every(isIdentifier)) return;
  throw new Error(
    `SQL identifier "${identifier}" is invalid; expected "schema.table".`,
  );
}

function assertIdentifier(identifier: string): void {
  if (isIdentifier(identifier)) return;
  throw new Error(
    `SQL identifier "${identifier}" is invalid; expected lowercase snake case.`,
  );
}

function isIdentifier(identifier: string): boolean {
  return /^[a-z][a-z0-9_]*$/.test(identifier);
}
