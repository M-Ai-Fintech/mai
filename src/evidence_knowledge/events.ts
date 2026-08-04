import type { EvidenceId, FactVersionId, InvalidationId } from "./ids.ts";
import type { EvidenceScope } from "./model.ts";

export type EvidenceInvalidationEvent =
  | {
    readonly type: "evidence.source-invalidated";
    readonly eventId: InvalidationId;
    readonly scope: EvidenceScope;
    readonly evidenceId: EvidenceId;
    readonly reason: string;
  }
  | {
    readonly type: "evidence.fact-invalidated";
    readonly eventId: InvalidationId;
    readonly scope: EvidenceScope;
    readonly factVersionId: FactVersionId;
    readonly reason: string;
  };

export function eventSourceId(event: EvidenceInvalidationEvent): string {
  return event.type === "evidence.source-invalidated"
    ? event.evidenceId
    : event.factVersionId;
}

export function eventSourceKind(
  event: EvidenceInvalidationEvent,
): "evidence" | "fact_version" {
  return event.type === "evidence.source-invalidated"
    ? "evidence"
    : "fact_version";
}
