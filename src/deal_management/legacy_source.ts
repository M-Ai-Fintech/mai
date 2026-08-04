import type { TransactionHandle } from "../platform/persistence/v1.ts";
import type { DealPartyReference, DealScope } from "./contracts.ts";
import type {
  LegacyDealRecord,
  LegacyDealSource,
  LegacyPartyRecord,
  LegacyReferenceResolver,
  LegacyTeamMemberRecord,
} from "./legacy_contracts.ts";
import type { DealTransactionRunner } from "./repository.ts";

const LEGACY_SOURCE = "core.legacy_transaction";

/**
 * Identifies a legacy read whose operator scope lacks persisted review.
 *
 * @example throw new LegacyScopeMappingError(legacyDealId, scope, expected)
 */
export class LegacyScopeMappingError extends Error {
  constructor(legacyDealId: string, received: DealScope, expected: string) {
    super(
      `Legacy Deal "${legacyDealId}" scope ${received.tenantId}/${received.workspaceId} is untrusted; expected ${expected}.`,
    );
    this.name = "LegacyScopeMappingError";
  }
}

/** Rejects duplicate reviewed mappings instead of selecting one arbitrarily. */
export class LegacyReferenceAmbiguityError extends Error {
  constructor(input: LegacyReferenceInput) {
    super(
      `Legacy ${input.mappingKind} reference "${input.legacyReferenceId}" is ambiguous; expected exactly one ${input.referenceKind} mapping in the requested scope.`,
    );
    this.name = "LegacyReferenceAmbiguityError";
  }
}

/**
 * Rejects a reviewed mapping whose mandate columns violate the all-or-none contract.
 *
 * @example throw new LegacyMandateMappingError(legacyDealId, received)
 */
export class LegacyMandateMappingError extends Error {
  constructor(legacyDealId: string, received: string) {
    super(
      `Legacy Deal "${legacyDealId}" has mandate mapping "${received}"; expected all mandate values or none.`,
    );
    this.name = "LegacyMandateMappingError";
  }
}

/**
 * Provides fixture records for focused tests without a production fallback.
 *
 * @example const source = new InMemoryLegacyDealSource([record])
 */
export class InMemoryLegacyDealSource implements LegacyDealSource {
  private readonly records = new Map<string, LegacyDealRecord>();

  constructor(records: readonly LegacyDealRecord[] = []) {
    for (const record of records) this.records.set(record.legacyDealId, record);
  }

  load(input: {
    readonly scope: DealScope;
    readonly legacyDealId: string;
  }): Promise<LegacyDealRecord | undefined> {
    return Promise.resolve(this.records.get(input.legacyDealId));
  }
}

/**
 * Reads legacy records only after persisted tenant/workspace review.
 *
 * @example const record = await source.load({ scope, legacyDealId })
 */
export class PostgresLegacyDealSource implements LegacyDealSource {
  constructor(private readonly transactions: DealTransactionRunner) {}

  load(input: {
    readonly scope: DealScope;
    readonly legacyDealId: string;
  }): Promise<LegacyDealRecord | undefined> {
    return this.transactions.run((transaction) =>
      loadLegacyDeal(transaction, input)
    );
  }
}

/**
 * Resolves persisted Organization Registry and Identity Access evidence.
 *
 * @example const reference = await resolver.resolve(mappingRequest)
 */
export class PostgresLegacyReferenceResolver
  implements LegacyReferenceResolver {
  constructor(private readonly transactions: DealTransactionRunner) {}

  resolve(
    input: LegacyReferenceInput,
  ): Promise<DealPartyReference | undefined> {
    return this.transactions.run((transaction) =>
      resolveReference(transaction, input)
    );
  }
}

interface LegacyReferenceInput {
  readonly source: string;
  readonly legacyDealId: string;
  readonly scope: DealScope;
  readonly legacyReferenceId: string;
  readonly mappingKind: "party" | "team";
  readonly referenceKind: DealPartyReference["kind"];
}

interface LegacyDealMappingRow {
  readonly tenantId: DealScope["tenantId"];
  readonly workspaceId: DealScope["workspaceId"];
  readonly confidentiality: LegacyDealRecord["confidentiality"];
  readonly mandateValue: string | null;
  readonly mandateCurrency: string | null;
  readonly mandateAuthority: number | null;
}

interface LegacyTransactionRow {
  readonly id: string;
  readonly title: string | null;
  readonly dealType: string | null;
  readonly currency: string | null;
  readonly updatedAt: Date | string | null;
}

interface LegacyPartyRow {
  readonly legacyPartyId: string;
  readonly label: string | null;
  readonly side: string | null;
  readonly referenceKind: DealPartyReference["kind"] | null;
}

interface LegacyTeamRow {
  readonly legacyMemberId: string;
  readonly label: string | null;
  readonly assignmentRole: string | null;
  readonly side: string | null;
  readonly referenceKind: DealPartyReference["kind"] | null;
  readonly authorityLevel: number | null;
}

async function loadLegacyDeal(
  transaction: TransactionHandle,
  input: { readonly scope: DealScope; readonly legacyDealId: string },
): Promise<LegacyDealRecord | undefined> {
  const mapping = await loadDealMapping(transaction, input.legacyDealId);
  assertTrustedScope(input, mapping);
  const deal = await loadTransaction(transaction, input.legacyDealId);
  if (deal === undefined) return undefined;
  return assembleLegacyDeal(
    deal,
    mapping!,
    await loadParties(transaction, input),
    await loadTeam(transaction, input),
  );
}

async function loadDealMapping(
  transaction: TransactionHandle,
  legacyDealId: string,
): Promise<LegacyDealMappingRow | undefined> {
  const result = await transaction.query<LegacyDealMappingRow>(
    `SELECT tenant_id AS "tenantId", workspace_id AS "workspaceId",
       confidentiality, mandate_transaction_value_ceiling::text AS "mandateValue",
       mandate_currency AS "mandateCurrency",
       mandate_authority_ceiling AS "mandateAuthority"
     FROM deal_management.legacy_deal_mappings
     WHERE legacy_source = $1 AND legacy_record_id = $2`,
    [LEGACY_SOURCE, legacyDealId],
  );
  return result.rows[0];
}

function assertTrustedScope(
  input: { readonly scope: DealScope; readonly legacyDealId: string },
  mapping: LegacyDealMappingRow | undefined,
): asserts mapping is LegacyDealMappingRow {
  const expected = mapping === undefined
    ? "a persisted reviewed tenant/workspace mapping"
    : `${mapping.tenantId}/${mapping.workspaceId}`;
  if (
    mapping?.tenantId === input.scope.tenantId &&
    mapping.workspaceId === input.scope.workspaceId
  ) return;
  throw new LegacyScopeMappingError(input.legacyDealId, input.scope, expected);
}

async function loadTransaction(
  transaction: TransactionHandle,
  legacyDealId: string,
): Promise<LegacyTransactionRow | undefined> {
  const result = await transaction.query<LegacyTransactionRow>(
    `SELECT t.id, t.title, tt.name AS "dealType", t.currency,
       t.updated_at AS "updatedAt"
     FROM transaction t
     LEFT JOIN transaction_type tt ON tt.id = t.transaction_type_id
     WHERE t.id = $1`,
    [legacyDealId],
  );
  return result.rows[0];
}

async function loadParties(
  transaction: TransactionHandle,
  input: { readonly scope: DealScope; readonly legacyDealId: string },
): Promise<readonly LegacyPartyRecord[]> {
  const result = await transaction.query<LegacyPartyRow>(
    partySql(),
    partyParams(input),
  );
  return result.rows.map((party) => ({
    legacyPartyId: party.legacyPartyId,
    label: party.label ?? undefined,
    side: party.side ?? undefined,
    referenceKind: party.referenceKind ?? undefined,
  }));
}

function partySql(): string {
  return `SELECT b.id AS "legacyPartyId", b.name AS label,
      lower(tbr.role_name) AS side, m.reference_kind AS "referenceKind"
    FROM transaction_business_role tbr
    JOIN business b ON b.id = tbr.business_id
    LEFT JOIN deal_management.legacy_reference_mappings m
      ON m.legacy_source = $1 AND m.legacy_record_id = $2
      AND m.tenant_id = $3 AND m.workspace_id = $4
      AND m.mapping_kind = 'party' AND m.legacy_reference_id = b.id::text
    WHERE tbr.transaction_id = $2::uuid ORDER BY b.id`;
}

async function loadTeam(
  transaction: TransactionHandle,
  input: { readonly scope: DealScope; readonly legacyDealId: string },
): Promise<readonly LegacyTeamMemberRecord[]> {
  const result = await transaction.query<LegacyTeamRow>(
    teamSql(),
    partyParams(input),
  );
  return result.rows.map((member) => ({
    legacyMemberId: member.legacyMemberId,
    label: member.label ?? undefined,
    assignmentRole: member.assignmentRole ?? undefined,
    side: member.side ?? undefined,
    referenceKind: member.referenceKind ?? undefined,
    authorityLevel: member.authorityLevel ?? undefined,
  }));
}

function teamSql(): string {
  return `SELECT a.id AS "legacyMemberId", a.name AS label,
      lower(at.name) AS "assignmentRole", lower(ads.name) AS side,
      m.reference_kind AS "referenceKind", m.team_authority_level AS "authorityLevel"
    FROM transaction_advisor ta JOIN advisor a ON a.id = ta.advisor_id
    LEFT JOIN advisor_type at ON at.id = a.advisor_type_id
    LEFT JOIN advisor_side ads ON ads.id = ta.advisor_side_id
    LEFT JOIN deal_management.legacy_reference_mappings m
      ON m.legacy_source = $1 AND m.legacy_record_id = $2
      AND m.tenant_id = $3 AND m.workspace_id = $4
      AND m.mapping_kind = 'team' AND m.legacy_reference_id = a.id::text
    WHERE ta.transaction_id = $2::uuid ORDER BY a.id`;
}

function partyParams(input: {
  readonly scope: DealScope;
  readonly legacyDealId: string;
}): readonly string[] {
  return [
    LEGACY_SOURCE,
    input.legacyDealId,
    input.scope.tenantId,
    input.scope.workspaceId,
  ];
}

function assembleLegacyDeal(
  deal: LegacyTransactionRow,
  mapping: LegacyDealMappingRow,
  parties: readonly LegacyPartyRecord[],
  team: readonly LegacyTeamMemberRecord[],
): LegacyDealRecord {
  return {
    ...legacyDealFields(deal, mapping),
    parties,
    team,
  };
}

function legacyDealFields(
  deal: LegacyTransactionRow,
  mapping: LegacyDealMappingRow,
): Omit<LegacyDealRecord, "parties" | "team"> {
  const sourceTimestamp = safeTimestamp(deal.updatedAt);
  return {
    source: LEGACY_SOURCE,
    legacyDealId: deal.id,
    tenantId: mapping.tenantId,
    workspaceId: mapping.workspaceId,
    name: deal.title ?? undefined,
    dealType: deal.dealType ?? undefined,
    confidentiality: mapping.confidentiality,
    currency: deal.currency ?? undefined,
    mandate: mappedMandate(mapping, deal.id),
    sourceUpdatedAt: sourceTimestamp,
    sourceVersion: sourceTimestamp,
  };
}

function mappedMandate(
  mapping: LegacyDealMappingRow,
  legacyDealId: string,
): LegacyDealRecord["mandate"] {
  const values = [
    mapping.mandateValue,
    mapping.mandateCurrency,
    mapping.mandateAuthority,
  ];
  if (values.every((value) => value === null)) return undefined;
  if (values.some((value) => value === null)) {
    throw new LegacyMandateMappingError(legacyDealId, JSON.stringify(values));
  }
  return {
    transactionValueCeiling: Number(mapping.mandateValue),
    currency: mapping.mandateCurrency!,
    authorityCeiling: mapping.mandateAuthority!,
  };
}

async function resolveReference(
  transaction: TransactionHandle,
  input: LegacyReferenceInput,
): Promise<DealPartyReference | undefined> {
  const result = await transaction.query<{ readonly id: string }>(
    `SELECT authoritative_reference_id AS id
     FROM deal_management.legacy_reference_mappings
     WHERE legacy_source = $1 AND legacy_record_id = $2
       AND tenant_id = $3 AND workspace_id = $4
       AND mapping_kind = $5 AND legacy_reference_id = $6
       AND reference_kind = $7
     LIMIT 2`,
    referenceValues(input),
  );
  if (result.rows.length > 1) {
    throw new LegacyReferenceAmbiguityError(input);
  }
  const row = result.rows[0];
  return row === undefined
    ? undefined
    : { kind: input.referenceKind, id: row.id };
}

function referenceValues(input: LegacyReferenceInput): unknown[] {
  return [
    input.source,
    input.legacyDealId,
    input.scope.tenantId,
    input.scope.workspaceId,
    input.mappingKind,
    input.legacyReferenceId,
    input.referenceKind,
  ];
}

function safeTimestamp(value: Date | string | null): string | undefined {
  if (value === null) return undefined;
  const timestamp = new Date(value);
  return Number.isNaN(timestamp.getTime())
    ? undefined
    : timestamp.toISOString();
}
