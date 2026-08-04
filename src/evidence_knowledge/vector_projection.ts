import type { EvidenceId, IndexId } from "./ids.ts";
import type {
  EvidenceVectorPort,
  VectorCandidate,
  VectorIndexKey,
} from "./vector_port.ts";

export interface ProjectionInput {
  readonly indexId: IndexId;
  readonly key: VectorIndexKey;
  readonly candidates: readonly VectorCandidate[];
}
export class EvidenceVectorProjectionService {
  constructor(private readonly vector: EvidenceVectorPort) {}
  async rebuild(input: ProjectionInput): Promise<void> {
    if (
      input.candidates.some((candidate) => candidate.evidenceId.length === 0)
    ) {
      throw new Error(
        "Vector candidate contains an empty evidence ID; expected opaque evidence identity.",
      );
    }
    await this.vector.replaceProjection({ ...input, state: "active" });
  }
  async invalidate(indexId: IndexId, reason: string): Promise<void> {
    await this.vector.markStale(indexId, reason);
  }
}

export function evidenceCandidate(
  evidenceId: EvidenceId,
  candidateId: string,
  text: string,
  permissions: readonly string[],
): VectorCandidate {
  if (!text.trim()) {
    throw new Error(
      `Vector candidate text "${text}" is invalid; expected source text.`,
    );
  }
  return Object.freeze({
    evidenceId,
    candidateId,
    text,
    permissions: Object.freeze([...permissions]),
  });
}
