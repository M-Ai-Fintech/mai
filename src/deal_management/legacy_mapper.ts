import type { DealPartyReference } from "./contracts.ts";
import {
  type LegacyDealMapper,
  type LegacyDealRecord,
  type LegacyMappingResult,
  type LegacyPartyRecord,
  type LegacyReferenceResolver,
} from "./legacy_contracts.ts";
import {
  type LegacyReferenceLookup,
  mapCandidate,
} from "./legacy_mapper_parts.ts";
import {
  sourceFingerprint,
  stableDealIdentity,
  validateRecord,
} from "./legacy_mapper_validation.ts";

/**
 * Maps one legacy Deal into a complete authoritative aggregate candidate.
 *
 * Missing upstream references and ambiguous authority values become explicit
 * outcomes; the mapper never invents tenant, identity, confidentiality, or
 * mandate data.
 *
 * @example const result = await mapper.map({ record, scope, now })
 */
export class DeterministicLegacyDealMapper implements LegacyDealMapper {
  constructor(private readonly references?: LegacyReferenceResolver) {}

  async map(input: {
    readonly record: LegacyDealRecord;
    readonly scope: import("./contracts.ts").DealScope;
    readonly now: string;
  }): Promise<LegacyMappingResult> {
    const issue = validateRecord(input.record, input.scope);
    if (issue !== undefined) return { kind: issue.kind, issue: issue.issue };
    const identity = await stableDealIdentity(input.record);
    const candidate = await mapCandidate(
      input,
      identity,
      this.lookup(input.record),
    );
    if (candidate.kind !== "mapped") return candidate;
    return {
      kind: "mapped",
      legacyDealId: input.record.legacyDealId,
      authoritativeDealId: identity,
      sourceFingerprint: await sourceFingerprint(input.record),
      deal: candidate.deal,
    };
  }

  private lookup(record: LegacyDealRecord): LegacyReferenceLookup {
    return (legacyId, kind) => this.resolveReference(record, legacyId, kind);
  }

  private async resolveReference(
    record: LegacyDealRecord,
    legacyReferenceId: string,
    referenceKind: NonNullable<LegacyPartyRecord["referenceKind"]>,
  ): Promise<DealPartyReference | undefined> {
    return await this.references?.resolve({
      source: record.source,
      legacyReferenceId,
      referenceKind,
    });
  }
}
