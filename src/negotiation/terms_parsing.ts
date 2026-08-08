import type {
  DisputeResolution,
} from "../shared/schemas/dispute-resolution.ts";
import {
  createNormalizedTerms,
  NEGOTIATION_TERMS_SCHEMA_VERSION,
  type NegotiationMoney,
  type NormalizedTerm,
  type NormalizedTermKey,
  type NormalizedTerms,
  type NormalizedTermsInput,
  type NormalizedTermUnit,
} from "./terms.ts";

/** Parses request and persistence values through the closed term vocabulary. */
export function parseNormalizedTermsInput(
  value: unknown,
): NormalizedTermsInput {
  const record = exactRecord(value, "normalized negotiation term input");
  assertExactKeys(
    record,
    [
      "schemaVersion",
      "currency",
      "valuation",
      "cashPercentageBps",
      "equityPercentageBps",
      "earnOutPercentageBps",
      "escrowPercentageBps",
      "earnOutTargetMonths",
      "nonCompeteMonths",
      "paymentTimingDays",
      "disputeResolution",
      "terms",
    ],
    "normalized negotiation term input",
  );
  if (
    record.schemaVersion !== undefined &&
    record.schemaVersion !== NEGOTIATION_TERMS_SCHEMA_VERSION
  ) {
    throw new Error(
      `Negotiation terms schema version "${
        String(record.schemaVersion)
      }" is unsupported; expected version 1.`,
    );
  }
  const result: NormalizedTermsInput = {
    ...(record.schemaVersion === undefined
      ? {}
      : { schemaVersion: NEGOTIATION_TERMS_SCHEMA_VERSION }),
    currency: textValue(record.currency, "terms currency"),
    ...(record.valuation === undefined ? {} : {
      valuation: parseMoney(record.valuation),
    }),
    ...optionalNumber(record, "cashPercentageBps"),
    ...optionalNumber(record, "equityPercentageBps"),
    ...optionalNumber(record, "earnOutPercentageBps"),
    ...optionalNumber(record, "escrowPercentageBps"),
    ...optionalNumber(record, "earnOutTargetMonths"),
    ...optionalNumber(record, "nonCompeteMonths"),
    ...optionalNumber(record, "paymentTimingDays"),
    ...(record.disputeResolution === undefined
      ? {}
      : { disputeResolution: record.disputeResolution as DisputeResolution }),
    ...(record.terms === undefined ? {} : {
      terms: parseTermList(record.terms),
    }),
  };
  return result;
}

/** Parses the canonical persisted or externally projected term representation. */
export function parseNormalizedTerms(value: unknown): NormalizedTerms {
  const record = exactRecord(value, "normalized negotiation terms");
  assertExactKeys(
    record,
    [
      "schemaVersion",
      "currency",
      "valuation",
      "cashPercentageBps",
      "equityPercentageBps",
      "earnOutPercentageBps",
      "escrowPercentageBps",
      "earnOutTargetMonths",
      "nonCompeteMonths",
      "paymentTimingDays",
      "disputeResolution",
      "terms",
    ],
    "normalized negotiation terms",
  );
  if (record.schemaVersion !== NEGOTIATION_TERMS_SCHEMA_VERSION) {
    throw new Error(
      `Negotiation terms schema version "${
        String(record.schemaVersion)
      }" is unsupported; expected version 1.`,
    );
  }
  if (!Array.isArray(record.terms)) {
    throw new Error("Normalized negotiation terms require a term list.");
  }
  return createNormalizedTerms({
    ...parseNormalizedTermsInput(record),
    schemaVersion: NEGOTIATION_TERMS_SCHEMA_VERSION,
  });
}

function parseTermList(value: unknown): readonly NormalizedTerm[] {
  if (!Array.isArray(value)) {
    throw new Error("Normalized negotiation terms require an array of terms.");
  }
  return value.map((item) => {
    const record = exactRecord(item, "normalized negotiation term");
    assertExactKeys(
      record,
      ["key", "value", "unit", "currency"],
      "normalized negotiation term",
    );
    return {
      key: record.key as NormalizedTermKey,
      value: record.value as number,
      unit: record.unit as NormalizedTermUnit,
      ...(record.currency === undefined
        ? {}
        : { currency: record.currency as string }),
    };
  });
}

function parseMoney(value: unknown): NegotiationMoney {
  const record = exactRecord(value, "negotiation money");
  assertExactKeys(record, ["minorUnits", "currency"], "negotiation money");
  return {
    minorUnits: record.minorUnits as number,
    currency: textValue(record.currency, "money currency"),
  };
}

function optionalNumber(
  record: Record<string, unknown>,
  key: string,
): Record<string, number> {
  if (record[key] === undefined) return {};
  if (typeof record[key] !== "number" || !Number.isFinite(record[key])) {
    throw new Error(`Negotiation term field "${key}" must be a finite number.`);
  }
  return { [key]: record[key] };
}

function textValue(value: unknown, label: string): string {
  if (typeof value === "string") return value;
  throw new Error(`Negotiation ${label} must be text.`);
}

function exactRecord(value: unknown, label: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(`Invalid ${label}; expected an object.`);
  }
  return value as Record<string, unknown>;
}

function assertExactKeys(
  value: object,
  allowed: readonly string[],
  label: string,
): void {
  const keys = Object.keys(value);
  if (keys.every((key) => allowed.includes(key))) return;
  const unknown = keys.find((key) => !allowed.includes(key));
  throw new Error(
    `Invalid ${label}; unknown field "${
      unknown ?? "<unknown>"
    }" is not permitted.`,
  );
}
