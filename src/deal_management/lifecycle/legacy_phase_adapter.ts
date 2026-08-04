import { sourceFingerprint } from "../migration_identity.ts";
import type { LegacyDealRecord } from "../legacy_contracts.ts";
import type { DealLifecycleState } from "./contracts.ts";

export interface LegacyPhaseRecord extends
  Pick<
    LegacyDealRecord,
    "source" | "legacyDealId" | "sourceVersion" | "sourceUpdatedAt"
  > {
  readonly currentPhase?: unknown;
  readonly phase?: unknown;
  readonly phaseHistory?: readonly unknown[];
}

export type LegacyPhaseQuality =
  | "supported"
  | "missing"
  | "unsupported"
  | "ambiguous";

export interface LegacyPhaseProjection {
  readonly sourceIdentity: {
    readonly source: string;
    readonly legacyDealId: string;
  };
  readonly sourceFingerprint: string;
  readonly lifecycleState?: DealLifecycleState;
  readonly status: "proposed" | "uncertain";
  readonly quality: LegacyPhaseQuality;
  readonly approved: false;
  readonly approvedHistory: readonly [];
  readonly reason: string;
}

export class LegacyPhaseAdapter {
  async derive(record: LegacyPhaseRecord): Promise<LegacyPhaseProjection> {
    const fingerprint = await sourceFingerprint(fingerprintPayload(record));
    return deriveProjection(record, fingerprint);
  }
}

export function deriveLegacyPhase(
  record: LegacyPhaseRecord,
): Promise<LegacyPhaseProjection> {
  return new LegacyPhaseAdapter().derive(record);
}

function deriveProjection(
  record: LegacyPhaseRecord,
  sourceFingerprintValue: string,
): LegacyPhaseProjection {
  const rawCurrent = record.currentPhase ?? record.phase;
  const current = normalizePhase(rawCurrent);
  const history = parseHistory(record.phaseHistory);
  const quality = phaseQuality(rawCurrent, current, history);
  const lifecycleState = quality === "supported" ? current : undefined;
  return {
    sourceIdentity: {
      source: record.source,
      legacyDealId: record.legacyDealId,
    },
    sourceFingerprint: sourceFingerprintValue,
    ...(lifecycleState === undefined ? {} : { lifecycleState }),
    status: quality === "supported" ? "proposed" : "uncertain",
    quality,
    approved: false,
    approvedHistory: [],
    reason: reasonFor(quality, rawCurrent, history),
  };
}

function phaseQuality(
  rawCurrent: unknown,
  current: DealLifecycleState | undefined,
  history: HistoryResult,
): LegacyPhaseQuality {
  if (current === undefined && rawCurrent === undefined) return "missing";
  if (history.invalid) return "unsupported";
  if (current === undefined) return "unsupported";
  if (history.last !== undefined && history.last !== current) {
    return "ambiguous";
  }
  return "supported";
}

function parseHistory(value: readonly unknown[] | undefined): HistoryResult {
  if (value === undefined) return { last: undefined, invalid: false };
  const phases = value.map(historyPhase);
  if (phases.some((phase) => phase === undefined)) {
    return { last: undefined, invalid: true };
  }
  return {
    last: phases.at(-1),
    invalid: false,
  };
}

function historyPhase(value: unknown): DealLifecycleState | undefined {
  if (typeof value === "string") return normalizePhase(value);
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return undefined;
  }
  const entry = value as Record<string, unknown>;
  return normalizePhase(entry.toPhase ?? entry.to_phase ?? entry.phase);
}

function normalizePhase(value: unknown): DealLifecycleState | undefined {
  if (
    value === "draft" || value === "sourcing" || value === "due_diligence" ||
    value === "negotiation" || value === "closing" || value === "completed" ||
    value === "archived"
  ) return value;
  return undefined;
}

function reasonFor(
  quality: LegacyPhaseQuality,
  rawCurrent: unknown,
  history: HistoryResult,
): string {
  if (quality === "supported") {
    return "Legacy phase is representable but remains proposed until an approved lifecycle command establishes history.";
  }
  if (quality === "missing") {
    return "Legacy phase evidence is absent; expected one supported current phase value.";
  }
  if (quality === "ambiguous") {
    return `Legacy phase evidence received current ${
      String(rawCurrent)
    } and conflicting history ${
      String(history.last)
    }; expected one consistent phase.`;
  }
  return `Legacy phase evidence received ${
    String(rawCurrent)
  } or an unsupported history value; expected a supported lifecycle phase. `;
}

function fingerprintPayload(
  record: LegacyPhaseRecord,
): Record<string, unknown> {
  return {
    source: record.source,
    legacyDealId: record.legacyDealId,
    sourceVersion: record.sourceVersion,
    sourceUpdatedAt: record.sourceUpdatedAt,
    currentPhase: record.currentPhase,
    phase: record.phase,
    phaseHistory: record.phaseHistory,
  };
}

interface HistoryResult {
  readonly last: DealLifecycleState | undefined;
  readonly invalid: boolean;
}
