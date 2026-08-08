import {
  type SignatureEvidenceId,
  signatureEvidenceId,
  signaturePackageId,
} from "./ids.ts";
import type { SignatureEvidence, SignaturePackage } from "./model.ts";

export function createSignatureEvidence(input: {
  readonly signatureEvidenceId: string;
  readonly documentVersionId: string;
  readonly signatoryId: string;
  readonly authorityEvidenceId?: string;
  readonly signatureMethod: SignatureEvidence["signatureMethod"];
  readonly signedAt: string;
  readonly evidenceReference: string;
}): SignatureEvidence {
  return Object.freeze({
    signatureEvidenceId: signatureEvidenceId(input.signatureEvidenceId),
    documentVersionId: input.documentVersionId,
    signatoryId: input.signatoryId,
    ...(input.authorityEvidenceId === undefined
      ? {}
      : { authorityEvidenceId: input.authorityEvidenceId }),
    signatureMethod: input.signatureMethod,
    state: "received",
    signedAt: input.signedAt,
    evidenceReference: input.evidenceReference,
  });
}

export function acceptSignatureEvidence(
  evidence: SignatureEvidence,
  reviewerId: string,
  reviewedAt: string,
): SignatureEvidence {
  if (evidence.state !== "received") {
    throw new Error(
      `Signature evidence "${evidence.signatureEvidenceId}" cannot be accepted from state "${evidence.state}"; expected received.`,
    );
  }
  return Object.freeze({
    ...evidence,
    state: "accepted",
    reviewedBy: reviewerId,
    reviewedAt,
  });
}

export function createSignaturePackage(input: {
  readonly signaturePackageId: string;
  readonly documentVersionIds: readonly string[];
  readonly requiredSignatoryIds: readonly string[];
}): SignaturePackage {
  if (
    input.documentVersionIds.length === 0 ||
    input.requiredSignatoryIds.length === 0
  ) {
    throw new Error(
      `Signature package "${input.signaturePackageId}" is incomplete; expected at least one document and signatory.`,
    );
  }
  return Object.freeze({
    signaturePackageId: signaturePackageId(input.signaturePackageId),
    documentVersionIds: Object.freeze([...input.documentVersionIds]),
    requiredSignatoryIds: Object.freeze([...input.requiredSignatoryIds]),
    signatureEvidenceIds: Object.freeze([]),
    status: "draft",
    version: 1,
  });
}

export function completeSignaturePackage(
  signaturePackage: SignaturePackage,
  evidence: readonly SignatureEvidence[],
  completedAt: string,
): SignaturePackage {
  const accepted = evidence.filter((item) => item.state === "accepted");
  const allSigned = signaturePackage.requiredSignatoryIds.every((signatoryId) =>
    accepted.some((item) =>
      item.signatoryId === signatoryId &&
      signaturePackage.documentVersionIds.includes(item.documentVersionId)
    )
  );
  if (!allSigned) {
    throw new Error(
      `Signature package "${signaturePackage.signaturePackageId}" cannot complete; expected accepted evidence for every required signatory.`,
    );
  }
  return Object.freeze({
    ...signaturePackage,
    signatureEvidenceIds: Object.freeze(
      accepted.map((item) => item.signatureEvidenceId),
    ),
    status: "complete",
    completedAt,
  });
}

export function signatureEvidenceReference(
  evidence: SignatureEvidence,
): SignatureEvidenceId {
  return evidence.signatureEvidenceId;
}
