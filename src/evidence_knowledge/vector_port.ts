import type { IndexId } from "./ids.ts";
import type { EvidenceClassification, EvidenceScope } from "./model.ts";

export interface VectorIndexKey {
  readonly scope: EvidenceScope;
  readonly documentVersionId: string;
  readonly classification: EvidenceClassification;
  readonly processingVersion: string;
  readonly indexVersion: number;
}
export interface VectorCandidate {
  readonly candidateId: string;
  readonly evidenceId: string;
  readonly text: string;
  readonly permissions: readonly string[];
}
export interface VectorProjection {
  readonly indexId: IndexId;
  readonly key: VectorIndexKey;
  readonly candidates: readonly VectorCandidate[];
  readonly state: "active" | "stale";
}

export interface EvidenceVectorPort {
  replaceProjection(projection: VectorProjection): Promise<void>;
  markStale(indexId: IndexId, reason: string): Promise<void>;
}

export class FakeEvidenceVectorPort implements EvidenceVectorPort {
  readonly projections = new Map<IndexId, VectorProjection>();
  readonly staleReasons = new Map<IndexId, string>();
  replaceProjection(projection: VectorProjection): Promise<void> {
    assertScopedKey(projection.key);
    this.projections.set(
      projection.indexId,
      Object.freeze({
        ...projection,
        candidates: Object.freeze([...projection.candidates]),
      }),
    );
    return Promise.resolve();
  }
  markStale(indexId: IndexId, reason: string): Promise<void> {
    if (!reason.trim()) {
      throw new Error(
        `Vector invalidation reason "${reason}" is invalid; expected a non-empty reason.`,
      );
    }
    this.staleReasons.set(indexId, reason);
    const current = this.projections.get(indexId);
    if (current !== undefined) {
      this.projections.set(
        indexId,
        Object.freeze({ ...current, state: "stale" }),
      );
    }
    return Promise.resolve();
  }
}

function assertScopedKey(key: VectorIndexKey): void {
  if (
    !key.scope.tenantId || !key.scope.workspaceId || !key.scope.dealId ||
    !["legal", "financial", "tax", "operational", "other"].includes(
      key.classification,
    ) ||
    !key.documentVersionId || !key.processingVersion ||
    !Number.isSafeInteger(key.indexVersion) || key.indexVersion < 1
  ) {
    throw new Error(
      `Vector index key "${
        JSON.stringify(key)
      }" is invalid; expected tenant/workspace/Deal, exact version, processing, and positive index version.`,
    );
  }
}
