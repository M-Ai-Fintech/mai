import type { ExactEvidenceBasis } from "../diligence_decisions/basis.ts";
import {
  createDecisionRecord,
  createDecisionRequest,
  type DecisionRecord,
  type DecisionRequest,
  decisionRequestToDecided,
  decisionRequestToRequested,
  type Finding,
} from "../diligence_decisions/model.ts";
import {
  parseDecisionRecordId,
  parseDecisionRequestId,
} from "../diligence_decisions/ids.ts";
import {
  createDeliverable,
  createDeliverableVersion,
  createSourceSnapshot,
  type Deliverable,
  type DeliverableVersion,
  type SourceSnapshot,
} from "../deliverables/model.ts";
import {
  parseDeliverableId,
  parseDeliverableVersionId,
  parseSourceSnapshotId,
} from "../deliverables/ids.ts";
import type { DocumentVersion } from "../documents/version.ts";
import type { DocumentScope } from "../documents/model.ts";
import type { Calculation } from "../evidence_knowledge/v1.ts";
import type { ActorReference } from "../platform/authz/v1.ts";
import type { DemoReadinessResult } from "./contracts.ts";

export interface DemoAuthorityProof {
  readonly result: DemoReadinessResult["authority"];
  readonly request: DecisionRequest;
  readonly record: DecisionRecord;
}

export interface DemoArtifactProof {
  readonly result: DemoReadinessResult["artifact"];
  readonly deliverable: Deliverable;
  readonly snapshot: SourceSnapshot;
  readonly version: DeliverableVersion;
}

export function proveHumanAuthority(
  scope: DocumentScope,
  finding: Finding,
  basis: ExactEvidenceBasis,
  authorizedHuman: ActorReference,
  agent: ActorReference,
  now: Date,
): DemoAuthorityProof {
  const draft = createDecisionRequest({
    id: requiredValue(
      parseDecisionRequestId("decision_request_demo-readiness"),
    ),
    scope,
    subject: { kind: "finding", id: finding.id },
    question: "Approve the synthetic investor-demo diligence conclusion?",
    basis,
    requester: agent,
    namedApproverId: authorizedHuman.id,
    now,
  });
  const requested = decisionRequestToRequested(draft, now);
  assertAgentCannotDecide(scope, agent, requested, basis, now);
  const record = decisionRecord(scope, authorizedHuman, requested, basis, now);
  return {
    result: { agentDecisionRejected: true, humanDecisionRecordId: record.id },
    request: decisionRequestToDecided(requested, record.id, now),
    record,
  };
}

function assertAgentCannotDecide(
  scope: DocumentScope,
  agent: ActorReference,
  request: DecisionRequest,
  basis: ExactEvidenceBasis,
  now: Date,
): void {
  try {
    decisionRecord(scope, agent, request, basis, now);
  } catch {
    return;
  }
  throw new Error(
    "Agent decision was accepted; expected human-only authority.",
  );
}

function decisionRecord(
  scope: DocumentScope,
  actor: ActorReference,
  request: DecisionRequest,
  basis: ExactEvidenceBasis,
  now: Date,
): DecisionRecord {
  return createDecisionRecord({
    id: requiredValue(parseDecisionRecordId("decision_record_demo-readiness")),
    requestId: request.id,
    scope,
    outcome: "approved",
    actor,
    requestVersion: request.version,
    basis,
    authority: {
      snapshotId: "authority_demo-readiness",
      actorId: actor.id,
      policyVersion: "demo-human-authority-v1",
      scope,
      capturedAt: now,
    },
    recordedAt: now,
  });
}

export function createDemoArtifact(
  scope: DocumentScope,
  versions: readonly DocumentVersion[],
  findingId: string,
  calculation: Calculation,
  authorizedHuman: ActorReference,
  now: Date,
): DemoArtifactProof {
  const deliverableId = requiredValue(
    parseDeliverableId("deliverable_investor-dossier"),
  );
  const snapshotId = requiredValue(
    parseSourceSnapshotId("snapshot_investor-dossier-v1"),
  );
  const deliverable = createDeliverable({
    deliverableId,
    scope,
    deliverableType: "investor_demo_dossier",
    title: "Synthetic Serra Azul investor dossier",
    ownerId: authorizedHuman.id,
    defaultAudienceType: "internal_team",
    confidentiality: "internal_restricted",
    createdBy: authorizedHuman.id,
    createdAt: now,
    updatedAt: now,
  });
  const snapshot = createSourceSnapshot({
    snapshotId,
    scope,
    sourceCutoffAt: now,
    references: versions.map((version) => ({
      sourceObjectType: "DocumentVersion",
      sourceObjectId: version.documentVersionId,
      sourceObjectVersion: version.versionNumber,
      documentId: version.documentId,
      documentVersionId: version.documentVersionId,
      checksum: version.checksum.value,
      accessLevel: "internal_restricted" as const,
    })),
    createdBy: authorizedHuman.id,
    createdAt: now,
  });
  const version = createDeliverableVersion({
    versionId: requiredValue(
      parseDeliverableVersionId("delivver_investor-dossier-v1"),
    ),
    deliverable,
    versionNumber: 1,
    versionLabel: "Synthetic draft v1",
    sourceSnapshot: snapshot,
    content: { findingId, calculationId: calculation.calculationId },
    classifications: { findingId: "internal", calculationId: "internal" },
    createdBy: authorizedHuman.id,
    createdAt: now,
  });
  return {
    result: {
      deliverableId,
      versionId: version.versionId,
      sourceSnapshotId: snapshotId,
      sourceChecksums: versions.map((item) => item.checksum.value),
    },
    deliverable,
    snapshot,
    version,
  };
}

function requiredValue<T>(
  result: { readonly ok: true; readonly value: T } | { readonly ok: false },
): T {
  if (result.ok) return result.value;
  throw new Error(
    "Synthetic identifier is invalid; expected a canonical semantic identifier.",
  );
}
