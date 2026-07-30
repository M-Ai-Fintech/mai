/** MAI-101 local-only contracts. They model reviewable fixture state, never production services. */
export type ApprovalState =
  | "proposed"
  | "approval-pending"
  | "approved"
  | "rejected";
export type Evidence = {
  readonly id: string;
  readonly citation: string;
  readonly version: string;
};
export interface NegotiationProposal {
  readonly proposalId: string;
  readonly roundId: string;
  readonly transactionSide: "buy-side" | "sell-side";
  readonly counterparty: string;
  readonly source: Evidence;
  readonly lifecycle:
    | "received"
    | "draft"
    | "approved"
    | "rejected"
    | "superseded"
    | "withdrawn";
  readonly normalizedTerms: readonly string[];
  readonly internalMandate: string;
  readonly concession: string;
  readonly economicConsequence: string;
  readonly communication: "not-authorized" | "authorized";
  readonly approval: ApprovalState;
}
export interface ClosingCondition {
  readonly conditionId: string;
  readonly checklistItem: string;
  readonly responsibleAuthority: string;
  readonly state: "open" | "satisfied" | "waived" | "blocked" | "invalidated";
  readonly evidence: Evidence;
  readonly signature: "not-ready" | "ready" | "signed";
  readonly readinessApproval: ApprovalState;
  readonly irreversibleConfirmation: boolean;
  readonly postSignBoundary: string;
}
export interface AgentMission {
  readonly missionId: string;
  readonly objective: string;
  readonly plan: readonly string[];
  readonly runId: string;
  readonly step: string;
  readonly engine: string;
  readonly evidence: readonly Evidence[];
  readonly artifactId: string;
  readonly sideEffect: "read-only" | "reversible-draft" | "irreversible";
  readonly approval: ApprovalState;
  readonly state:
    | "proposed"
    | "running"
    | "blocked"
    | "failed"
    | "cancelled"
    | "completed"
    | "invalidated";
}
export interface AuditEvent {
  readonly eventId: string;
  readonly actor: string;
  readonly authority: string;
  readonly timestamp: string;
  readonly correlationId: string;
  readonly objectVersion: string;
  readonly beforeAfter: string;
  readonly evidence: readonly Evidence[];
  readonly consequence: string;
  readonly reconstructionPermission: string;
}
export interface ParticipantAccess {
  readonly participantId: string;
  readonly classification: "internal" | "external";
  readonly role: string;
  readonly scope: string;
  readonly invitation: "draft" | "approved" | "sent";
  readonly duration: string;
  readonly state:
    | "active"
    | "temporary"
    | "restricted"
    | "revoked"
    | "offboarded";
  readonly approval: ApprovalState;
  readonly auditReference: string;
}
export interface Deliverable {
  readonly deliverableId: string;
  readonly versionId: string;
  readonly sourceInputs: readonly string[];
  readonly audience: string;
  readonly redaction: string;
  readonly state: "draft" | "review" | "approved" | "released" | "stale";
  readonly approval: ApprovalState;
  readonly exportAuthorization: ApprovalState;
  readonly distribution:
    | "internal"
    | "external-pending"
    | "external-authorized";
}
export interface DealGovernance {
  readonly lifecycle: "active" | "paused" | "archived" | "read-only";
  readonly policy: string;
  readonly retention: string;
  readonly ndaBoundary: string;
  readonly request:
    | "pause"
    | "resume"
    | "terminate"
    | "archive"
    | "restore"
    | "deletion-request";
  readonly authority: string;
  readonly reversible: boolean;
  readonly participantImpact: string;
  readonly auditReference: string;
}
