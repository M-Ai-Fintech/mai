import { createDeal, setMandate } from "./model.ts";
import { dealId } from "./ids.ts";
import type { Deal, DealScope } from "./contracts.ts";
import type {
  LegacyDealRecord,
  LegacyMappingResult,
} from "./legacy_contracts.ts";
import {
  type LegacyMappingInput,
  type LegacyReferenceLookup,
  mapParties,
  mapTeam,
} from "./legacy_mapper_parties.ts";
import { issue, issueResult } from "./legacy_mapper_validation.ts";
import { mandateIdFor } from "./migration_identity.ts";

const LEGACY_TYPE_MAP: Readonly<Record<string, string>> = Object.freeze({
  "m&a": "acquisition",
  acquisition: "acquisition",
  merger: "merger",
  divestiture: "divestiture",
  sale: "divestiture",
});

export type { LegacyReferenceLookup } from "./legacy_mapper_parties.ts";

/**
 * Builds the authoritative aggregate candidate from validated legacy values.
 *
 * @example const candidate = await mapCandidate(input, authoritativeId, lookup)
 */
export async function mapCandidate(
  input: {
    readonly record: LegacyDealRecord;
    readonly scope: DealScope;
    readonly now: string;
  },
  identity: ReturnType<typeof dealId>,
  resolveReference: LegacyReferenceLookup,
): Promise<
  LegacyMappingResult | { readonly kind: "mapped"; readonly deal: Deal }
> {
  const dealType = normalizeLegacyDealType(input.record);
  if (dealType === undefined) return unsupportedDealType(input.record);
  let deal = createBaseDeal(input, identity, dealType);
  const mandateResult = await applyMandate(deal, input.record, input.now);
  if (mandateResult.kind !== "ok") return mandateResult;
  deal = mandateResult.deal;
  const mappingInput: LegacyMappingInput = {
    record: input.record,
    now: input.now,
  };
  const partyResult = await mapParties(mappingInput, deal, resolveReference);
  if (partyResult.kind !== "ok") return partyResult;
  const teamResult = await mapTeam(
    mappingInput,
    partyResult.deal,
    resolveReference,
  );
  if (teamResult.kind !== "ok") return teamResult;
  return { kind: "mapped", deal: teamResult.deal };
}

function normalizeLegacyDealType(record: LegacyDealRecord): string | undefined {
  return LEGACY_TYPE_MAP[record.dealType!.trim().toLowerCase()];
}

function unsupportedDealType(record: LegacyDealRecord): LegacyMappingResult {
  return issueResult(
    "unsupported_legacy_shape",
    issue(
      "UNSUPPORTED_DEAL_TYPE",
      record,
      record.dealType!,
      "one of m&a, acquisition, merger, divestiture, or sale",
      "Legacy Deal type cannot be represented by the bounded mapper.",
    ),
  );
}

function createBaseDeal(
  input: {
    readonly record: LegacyDealRecord;
    readonly scope: DealScope;
    readonly now: string;
  },
  identity: ReturnType<typeof dealId>,
  dealType: string,
): Deal {
  return createDeal({
    id: identity,
    tenantId: input.scope.tenantId,
    workspaceId: input.scope.workspaceId,
    name: input.record.name!,
    dealType,
    confidentiality: input.record.confidentiality!,
    currency: input.record.currency!,
    now: input.now,
  });
}

async function applyMandate(
  deal: Deal,
  record: LegacyDealRecord,
  now: string,
): Promise<{ readonly kind: "ok"; readonly deal: Deal } | LegacyMappingResult> {
  if (record.mandate === undefined) return { kind: "ok", deal };
  const mandate = record.mandate;
  if (isIncompleteMandate(mandate)) return missingMandate(record, mandate);
  try {
    return {
      kind: "ok",
      deal: setMandate(deal, await mandateInput(deal, record, now)),
    };
  } catch (error) {
    return invalidMandate(record, error);
  }
}

async function mandateInput(deal: Deal, record: LegacyDealRecord, now: string) {
  const mandate = record.mandate!;
  return {
    expectedVersion: deal.version,
    id: await mandateIdFor(record),
    transactionValueCeiling: {
      amount: mandate.transactionValueCeiling!,
      currency: mandate.currency!,
    },
    authorityCeiling: mandate.authorityCeiling!,
    now,
  };
}

function invalidMandate(record: LegacyDealRecord, error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return issueResult(
    "invalid_legacy_record",
    issue(
      "UNSUPPORTED_LEGACY_SHAPE",
      record,
      message,
      "a mandate compatible with the Deal currency and positive authority ceiling",
      "Mandate-like legacy data failed Deal invariant validation.",
    ),
  );
}

function isIncompleteMandate(
  mandate: NonNullable<LegacyDealRecord["mandate"]>,
): boolean {
  return mandate.transactionValueCeiling === undefined ||
    mandate.currency === undefined || mandate.authorityCeiling === undefined;
}

function missingMandate(
  record: LegacyDealRecord,
  mandate: NonNullable<LegacyDealRecord["mandate"]>,
): LegacyMappingResult {
  return issueResult(
    "missing_required_reference",
    issue(
      "MISSING_REQUIRED_FIELD",
      record,
      JSON.stringify(mandate),
      "mandate transactionValueCeiling, currency, and authorityCeiling",
      "Mandate-like legacy data is incomplete and cannot be promoted.",
    ),
  );
}
