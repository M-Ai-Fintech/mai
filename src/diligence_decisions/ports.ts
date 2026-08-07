import type {
  EvidenceScope,
  ExactDocumentVersionReference,
  ExactDocumentVersionVerificationPort,
} from "../evidence_knowledge/v1.ts";
import type { RequestContext } from "../platform/api/v1.ts";
import type { EvidenceBasisReference, ExactEvidenceBasis } from "./basis.ts";
import { DiligenceDecisionError } from "./errors.ts";

export interface ExactEvidenceReferenceVerificationPort {
  verifyEvidence(
    context: RequestContext,
    scope: EvidenceScope,
    evidenceId: string,
  ): Promise<void>;
  verifyFactVersion(
    context: RequestContext,
    scope: EvidenceScope,
    factVersionId: string,
  ): Promise<void>;
}

export interface EvidenceBasisVerificationPort {
  verify(
    context: RequestContext,
    scope: EvidenceScope,
    basis: ExactEvidenceBasis,
  ): Promise<void>;
}

export class EvidenceKnowledgeBasisVerifier
  implements EvidenceBasisVerificationPort {
  constructor(
    private readonly documents: ExactDocumentVersionVerificationPort,
    private readonly references: ExactEvidenceReferenceVerificationPort,
  ) {}

  async verify(
    context: RequestContext,
    scope: EvidenceScope,
    basis: ExactEvidenceBasis,
  ): Promise<void> {
    assertContextScope(context, scope);
    if (!sameScope(scope, basis.scope)) {
      throw new DiligenceDecisionError(
        "SCOPE_MISMATCH",
        `Evidence basis scope does not match deal "${scope.dealId}"; expected exact tenant, workspace, and deal scope.`,
      );
    }
    for (const reference of basis.references) {
      await this.verifyReference(context, scope, reference);
    }
  }

  private verifyReference(
    context: RequestContext,
    scope: EvidenceScope,
    reference: EvidenceBasisReference,
  ): Promise<void> {
    if (reference.kind === "document_version") {
      return this.verifyDocument(context, scope, reference.reference);
    }
    if (reference.kind === "evidence") {
      return this.verifyEvidence(context, scope, reference.evidenceId);
    }
    return this.verifyFactVersion(context, scope, reference.factVersionId);
  }

  private async verifyDocument(
    context: RequestContext,
    scope: EvidenceScope,
    reference: ExactDocumentVersionReference,
  ): Promise<void> {
    try {
      await this.documents.verify(context, scope, reference);
    } catch {
      throw protectedBasisFailure(reference.documentVersionId);
    }
  }

  private async verifyEvidence(
    context: RequestContext,
    scope: EvidenceScope,
    evidenceId: string,
  ): Promise<void> {
    try {
      await this.references.verifyEvidence(context, scope, evidenceId);
    } catch {
      throw protectedBasisFailure(evidenceId);
    }
  }

  private async verifyFactVersion(
    context: RequestContext,
    scope: EvidenceScope,
    factVersionId: string,
  ): Promise<void> {
    try {
      await this.references.verifyFactVersion(context, scope, factVersionId);
    } catch {
      throw protectedBasisFailure(factVersionId);
    }
  }
}

function assertContextScope(
  context: RequestContext,
  scope: EvidenceScope,
): void {
  if (
    context.tenantId === scope.tenantId &&
    context.workspaceId === scope.workspaceId &&
    context.dealId === scope.dealId
  ) return;
  throw protectedBasisFailure("request-context");
}

function sameScope(left: EvidenceScope, right: EvidenceScope): boolean {
  return left.tenantId === right.tenantId &&
    left.workspaceId === right.workspaceId && left.dealId === right.dealId;
}

function protectedBasisFailure(reference: string): DiligenceDecisionError {
  return new DiligenceDecisionError(
    "PROTECTED_NOT_FOUND",
    `Evidence basis reference "${reference}" could not be verified; expected a protected exact-version outcome.`,
  );
}
