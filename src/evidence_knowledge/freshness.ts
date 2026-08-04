export type FreshnessState =
  | "current"
  | "stale"
  | "missing"
  | "inaccessible"
  | "unsupported";

export interface Freshness {
  readonly state: FreshnessState;
  readonly checkedAt: Date;
  readonly reason?: string;
}

export function createFreshness(input: Freshness): Freshness {
  assertDate(input.checkedAt, "Freshness checked timestamp");
  if (input.state !== "current" && !input.reason?.trim()) {
    throw new Error(
      `Freshness state "${input.state}" is invalid without a reason; expected an explicit stale or unavailable explanation.`,
    );
  }
  if (input.reason !== undefined && input.reason.length > 512) {
    throw new Error(
      `Freshness reason "${input.reason}" is invalid; expected at most 512 characters.`,
    );
  }
  return Object.freeze({ ...input });
}

export function staleFreshness(reason: string, checkedAt: Date): Freshness {
  return createFreshness({ state: "stale", reason, checkedAt });
}

function assertDate(value: Date, label: string): void {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return;
  throw new Error(
    `${label} "${String(value)}" is invalid; expected a valid Date.`,
  );
}
