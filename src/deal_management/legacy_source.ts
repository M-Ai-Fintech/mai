import type { TransactionHandle } from "../platform/persistence/v1.ts";
import type { DealScope } from "./contracts.ts";
import type {
  LegacyDealRecord,
  LegacyDealSource,
  LegacyPartyRecord,
  LegacyTeamMemberRecord,
} from "./legacy_contracts.ts";
import type { DealTransactionRunner } from "./repository.ts";

const LEGACY_SOURCE = "core.legacy_transaction";

/**
 * Provides deterministic fixture-backed legacy records for mapper and
 * reconciliation tests without becoming a production persistence default.
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
 * Reads the frozen legacy transaction tables into an explicit migration shape.
 *
 * UUIDs remain legacy identifiers until an approved reference resolver maps
 * them to canonical upstream IDs; this source never casts them silently.
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
      loadLegacyDeal(transaction, input.legacyDealId)
    );
  }
}

interface LegacyTransactionRow {
  readonly id: string;
  readonly title: string | null;
  readonly dealType: string | null;
  readonly currency: string | null;
  readonly createdAt: Date | string | null;
  readonly updatedAt: Date | string | null;
}

interface LegacyPartyRow {
  readonly legacyPartyId: string;
  readonly label: string | null;
  readonly side: string | null;
}

interface LegacyTeamRow {
  readonly legacyMemberId: string;
  readonly label: string | null;
  readonly assignmentRole: string | null;
  readonly side: string | null;
}

async function loadLegacyDeal(
  transaction: TransactionHandle,
  legacyDealId: string,
): Promise<LegacyDealRecord | undefined> {
  const deal = await loadTransaction(transaction, legacyDealId);
  if (deal === undefined) return undefined;
  const parties = await loadParties(transaction, legacyDealId);
  const team = await loadTeam(transaction, legacyDealId);
  return {
    source: LEGACY_SOURCE,
    legacyDealId: deal.id,
    name: deal.title ?? undefined,
    dealType: deal.dealType ?? undefined,
    currency: deal.currency ?? undefined,
    parties,
    team,
    sourceUpdatedAt: safeTimestamp(deal.updatedAt),
    sourceVersion: safeTimestamp(deal.updatedAt),
  };
}

async function loadTransaction(
  transaction: TransactionHandle,
  legacyDealId: string,
): Promise<LegacyTransactionRow | undefined> {
  const result = await transaction.query<LegacyTransactionRow>(
    `SELECT t.id, t.title, tt.name AS "dealType", t.currency,
       t.created_at AS "createdAt", t.updated_at AS "updatedAt"
     FROM transaction t
     LEFT JOIN transaction_type tt ON tt.id = t.transaction_type_id
     WHERE t.id = $1`,
    [legacyDealId],
  );
  return result.rows[0];
}

async function loadParties(
  transaction: TransactionHandle,
  legacyDealId: string,
): Promise<readonly LegacyPartyRecord[]> {
  const result = await transaction.query<LegacyPartyRow>(
    `SELECT b.id AS "legacyPartyId", b.name AS label,
       lower(tbr.role_name) AS side
     FROM transaction_business_role tbr
     JOIN business b ON b.id = tbr.business_id
     WHERE tbr.transaction_id = $1
     ORDER BY b.id`,
    [legacyDealId],
  );
  return result.rows.map((party) => ({
    legacyPartyId: party.legacyPartyId,
    label: party.label ?? undefined,
    side: party.side ?? undefined,
  }));
}

async function loadTeam(
  transaction: TransactionHandle,
  legacyDealId: string,
): Promise<readonly LegacyTeamMemberRecord[]> {
  const result = await transaction.query<LegacyTeamRow>(
    `SELECT a.id AS "legacyMemberId", a.name AS label,
       lower(at.name) AS "assignmentRole", lower(ads.name) AS side
     FROM transaction_advisor ta
     JOIN advisor a ON a.id = ta.advisor_id
     LEFT JOIN advisor_type at ON at.id = a.advisor_type_id
     LEFT JOIN advisor_side ads ON ads.id = ta.advisor_side_id
     WHERE ta.transaction_id = $1
     ORDER BY a.id`,
    [legacyDealId],
  );
  return result.rows.map((member) => ({
    legacyMemberId: member.legacyMemberId,
    label: member.label ?? undefined,
    assignmentRole: member.assignmentRole ?? undefined,
    side: member.side ?? undefined,
  }));
}

function safeTimestamp(value: Date | string | null): string | undefined {
  if (value === null) return undefined;
  const timestamp = new Date(value);
  return Number.isNaN(timestamp.getTime())
    ? undefined
    : timestamp.toISOString();
}
