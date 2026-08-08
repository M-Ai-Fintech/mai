import {
  type NegotiationOptimizerInput,
  type NegotiationOptimizerResult,
  optimizeNegotiationProposal,
} from "../engines/optimization/negotiation/index.ts";
import {
  type DisputeResolution,
  parseDisputeResolution,
  serializeDisputeResolution,
  type VersionedDisputeResolution,
} from "../shared/schemas/dispute-resolution.ts";
import {
  type NormalizedTerms,
  normalizedTermsFromOptimizerProposal,
} from "./terms.ts";

export interface NegotiationAnalysis {
  readonly contractVersion:
    NegotiationOptimizerResult["replay"]["contractVersion"];
  readonly algorithmVersion:
    NegotiationOptimizerResult["replay"]["algorithmVersion"];
  readonly status: NegotiationOptimizerResult["status"];
  readonly bestTerms?: NormalizedTerms;
  readonly alternatives: readonly NormalizedTerms[];
  readonly optimizer: NegotiationOptimizerResult;
  readonly analyzedAt: string;
}

/** MAI-20 is consumed as a deterministic, read-only recommendation engine. */
export function analyzeNegotiation(input: {
  readonly optimizer: NegotiationOptimizerInput;
  readonly currency: string;
  readonly analyzedAt: string;
}): NegotiationAnalysis {
  const optimizer = optimizeNegotiationProposal(input.optimizer);
  return Object.freeze({
    contractVersion: optimizer.replay.contractVersion,
    algorithmVersion: optimizer.replay.algorithmVersion,
    status: optimizer.status,
    ...(optimizer.best === null ? {} : {
      bestTerms: normalizedTermsFromOptimizerProposal(
        optimizer.best.proposal,
        input.currency,
      ),
    }),
    alternatives: Object.freeze(
      optimizer.alternatives.map((alternative) =>
        normalizedTermsFromOptimizerProposal(
          alternative.proposal,
          input.currency,
        )
      ),
    ),
    optimizer,
    analyzedAt: input.analyzedAt,
  });
}

/** MAI-21 remains the authoritative dispute contract; this is a typed adapter. */
export function normalizeDisputeReference(
  value: DisputeResolution | VersionedDisputeResolution,
): VersionedDisputeResolution {
  return "schemaVersion" in value
    ? serializeDisputeResolution(parseDisputeResolution(value))
    : serializeDisputeResolution(value);
}
