import type {
  AgentMission,
  AuditEvent,
  ClosingCondition,
  DealGovernance,
  Deliverable,
  NegotiationProposal,
  ParticipantAccess,
} from "./contracts";
export const fixtureDisclosure =
  "Local typed demonstration fixtures only — no live negotiation synchronization, signatures, agent execution, invitations, exports, archival, deletion, or external communication is claimed.";
const evidence = {
  id: "EVD-201",
  citation: "Negotiation register §4.2",
  version: "v18",
} as const;
export const negotiation: NegotiationProposal = {
  proposalId: "PRP-021",
  roundId: "RND-03",
  transactionSide: "buy-side",
  counterparty: "Counterparty counsel",
  source: evidence,
  lifecycle: "received",
  normalizedTerms: [
    "R$ 440m enterprise value",
    "90-day exclusivity",
    "Escrow 8%",
  ],
  internalMandate: "Restricted: R$ 452m ceiling",
  concession: "Escrow may reduce after counsel review",
  economicConsequence: "R$ 12m range exposure",
  communication: "not-authorized",
  approval: "approval-pending",
};
export const closing: ClosingCondition = {
  conditionId: "CP-014",
  checklistItem: "Competition clearance",
  responsibleAuthority: "External counsel",
  state: "open",
  evidence,
  signature: "not-ready",
  readinessApproval: "approval-pending",
  irreversibleConfirmation: false,
  postSignBoundary: "Post-sign permission is separate from signature.",
};
export const mission: AgentMission = {
  missionId: "MIS-017",
  objective: "Draft a normalized term comparison",
  plan: [
    "Read authorized evidence",
    "Normalize terms",
    "Generate reversible draft",
  ],
  runId: "RUN-044",
  step: "Normalize terms",
  engine: "Local deterministic demonstration",
  evidence: [evidence],
  artifactId: "ART-007",
  sideEffect: "reversible-draft",
  approval: "approval-pending",
  state: "blocked",
};
export const audit: AuditEvent = {
  eventId: "AUD-905",
  actor: "Ana Costa",
  authority: "Vice President",
  timestamp: "2026-07-29T14:20:00Z",
  correlationId: "COR-101",
  objectVersion: "PRP-021/v3",
  beforeAfter: "Source v17 → v18 stale",
  evidence: [evidence],
  consequence:
    "Negotiation review, agent artifact invalidated, CP reopened, release blocked",
  reconstructionPermission: "Deal Lead only",
};
export const participant: ParticipantAccess = {
  participantId: "PAR-022",
  classification: "external",
  role: "Counsel observer",
  scope: "Closing evidence only",
  invitation: "approved",
  duration: "Expires 2026-08-15",
  state: "temporary",
  approval: "approval-pending",
  auditReference: audit.eventId,
};
export const deliverable: Deliverable = {
  deliverableId: "DLV-041",
  versionId: "v4",
  sourceInputs: ["PRP-021/v3", "DOC-120/v18"],
  audience: "Internal investment committee",
  redaction: "Counsel names redacted",
  state: "stale",
  approval: "approved",
  exportAuthorization: "approval-pending",
  distribution: "external-pending",
};
export const governance: DealGovernance = {
  lifecycle: "active",
  policy: "Deal retention policy 7 years",
  retention: "Legal hold applies",
  ndaBoundary: "NDA and data-protection boundary cannot be changed here",
  request: "archive",
  authority: "Deal Lead or administrator",
  reversible: true,
  participantImpact: "External participant access becomes read-only",
  auditReference: audit.eventId,
};
