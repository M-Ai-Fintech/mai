const versionBrand: unique symbol = Symbol("aggregate-version");

export type AggregateVersion = number & {
  readonly [versionBrand]: "AggregateVersion";
};

export type AggregateVersionResult =
  | { readonly ok: true; readonly value: AggregateVersion }
  | {
    readonly ok: false;
    readonly issue: { readonly code: "INVALID_VERSION" };
  };

export function parseAggregateVersion(value: unknown): AggregateVersionResult {
  return isAggregateVersion(value)
    ? { ok: true, value: value as AggregateVersion }
    : { ok: false, issue: { code: "INVALID_VERSION" } };
}

export function isAggregateVersion(value: unknown): value is AggregateVersion {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0;
}
