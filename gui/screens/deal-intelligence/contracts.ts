/** MAI-100 local-only contract vocabulary. These records are intentionally not production API claims. */
export type Freshness = "current" | "stale" | "superseded";
export type AccessClassification = "available" | "restricted";
export type ReviewState = "proposed" | "approval-pending" | "approved" | "rejected" | "invalidated" | "recorded";

export interface EvidenceReference {
  readonly evidenceId: string;
  readonly documentId: string;
  readonly documentVersionId: string;
  readonly location: string;
  readonly freshness: Freshness;
  readonly access: AccessClassification;
  readonly processingState: "ready" | "processing" | "failed" | "missing";
}
export interface DealFact {
  readonly factId: string;
  readonly value: string;
  readonly unit: string;
  readonly state: "approved" | "proposed" | "stale" | "superseded";
  readonly evidence: readonly EvidenceReference[];
  readonly approvingAuthority: string;
  readonly version: string;
}
export interface Interpretation {
  readonly interpretationId: string;
  readonly kind: "interpretation" | "assumption";
  readonly statement: string;
  readonly author: string;
  readonly rationale: string;
  readonly downstreamUsage: string;
  readonly reviewState: ReviewState;
}
export interface Finding {
  readonly findingId: string;
  readonly category: string;
  readonly severity: "material" | "moderate";
  readonly evidence: readonly EvidenceReference[];
  readonly coverageMeaning: string;
  readonly transactionImpact: string;
  readonly state: "review-required" | "invalidated" | "recorded";
  readonly requiredAuthority: string;
}
export interface HumanDecision {
  readonly decisionId: string;
  readonly state: ReviewState;
  readonly actor: string;
  readonly authority: string;
  readonly timestamp: string;
  readonly auditRecordId: string;
}
export interface ValuationScenario {
  readonly scenarioId: string;
  readonly version: string;
  readonly approvedFacts: readonly DealFact[];
  readonly assumptions: readonly Interpretation[];
  readonly calculationId: string;
  readonly methodOutputs: readonly string[];
  readonly sensitivity: string;
  readonly range: string;
  readonly approvalState: ReviewState;
}
export interface CounterpartyCandidate {
  readonly candidateId: string;
  readonly sourcedAttributes: string;
  readonly inferredFit: string;
  readonly modelRecommendation: string;
  readonly conflictStatus: "clear" | "pending" | "excluded";
  readonly shortlistDecision: ReviewState;
  readonly outreachAuthority: string;
}
