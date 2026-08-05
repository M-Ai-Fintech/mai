import type { DocumentVersion } from "../documents/version.ts";
import type { DocumentVersionId } from "../documents/ids.ts";
import type { AuthorizedDocumentVersionReadPort } from "../documents/v1.ts";
import type { RequestContext } from "../platform/api/v1.ts";
import type {
  EvidenceClassification,
  EvidenceScope,
  ExactDocumentVersionReference,
} from "./model.ts";
import { sameScope } from "./model.ts";

export type ExactDocumentVerificationFailure =
  | "protected-not-found"
  | "scope-mismatch"
  | "checksum-mismatch"
  | "classification-mismatch"
  | "processing-version-mismatch"
  | "unsupported";

export interface VerifiedExactDocumentVersion {
  readonly scope: EvidenceScope;
  readonly reference: ExactDocumentVersionReference;
  readonly version: DocumentVersion;
}

export interface ExactDocumentVersionVerificationPort {
  verify(
    context: RequestContext,
    scope: EvidenceScope,
    reference: ExactDocumentVersionReference,
  ): Promise<VerifiedExactDocumentVersion>;
}

export class DocumentsExactVersionVerificationAdapter
  implements ExactDocumentVersionVerificationPort {
  constructor(
    private readonly versionReadPort: AuthorizedDocumentVersionReadPort,
  ) {}

  async verify(
    context: RequestContext,
    scope: EvidenceScope,
    reference: ExactDocumentVersionReference,
  ): Promise<VerifiedExactDocumentVersion> {
    const version = await this.versionReadPort.findAccessibleVersion(
      context,
      scope,
      reference.documentVersionId,
    );
    if (version === undefined || !sameScope(version.scope, scope)) {
      throw protectedNotFound(
        reference.documentVersionId,
        "protected-not-found",
      );
    }
    if (
      version.checksum.algorithm !== reference.checksum.algorithm ||
      version.checksum.value !== reference.checksum.value
    ) {
      throw protectedNotFound(reference.documentVersionId, "checksum-mismatch");
    }
    if (version.classification !== reference.classification) {
      throw protectedNotFound(
        reference.documentVersionId,
        "classification-mismatch",
      );
    }
    return Object.freeze({ scope, reference, version });
  }
}

export class FakeExactDocumentVersionVerificationPort
  implements ExactDocumentVersionVerificationPort {
  constructor(
    private readonly versions: readonly DocumentVersion[],
    private readonly inaccessible = new Set<DocumentVersionId>(),
  ) {}

  async verify(
    context: RequestContext,
    scope: EvidenceScope,
    reference: ExactDocumentVersionReference,
  ): Promise<VerifiedExactDocumentVersion> {
    await Promise.resolve();
    if (this.inaccessible.has(reference.documentVersionId)) {
      throw protectedNotFound(
        reference.documentVersionId,
        "protected-not-found",
      );
    }
    if (
      context.tenantId !== scope.tenantId ||
      context.workspaceId !== scope.workspaceId ||
      context.dealId !== scope.dealId
    ) {
      throw protectedNotFound(
        reference.documentVersionId,
        "protected-not-found",
      );
    }
    const version = this.versions.find((candidate) =>
      candidate.documentVersionId === reference.documentVersionId
    );
    if (version === undefined || !sameScope(version.scope, scope)) {
      throw protectedNotFound(
        reference.documentVersionId,
        "protected-not-found",
      );
    }
    if (version.checksum.value !== reference.checksum.value) {
      throw protectedNotFound(reference.documentVersionId, "checksum-mismatch");
    }
    if (version.classification !== reference.classification) {
      throw protectedNotFound(
        reference.documentVersionId,
        "classification-mismatch",
      );
    }
    return Object.freeze({ scope, reference, version });
  }
}

function protectedNotFound(
  versionId: string,
  reason: ExactDocumentVerificationFailure = "protected-not-found",
): Error {
  void reason;
  return new Error(
    `Document version "${versionId}" cannot be verified; protected outcome.`,
  );
}

export function assertSupportedClassification(
  classification: EvidenceClassification,
): void {
  if (
    ["legal", "financial", "tax", "operational", "other"].includes(
      classification,
    )
  ) return;
  throw new Error(
    `Evidence classification "${classification}" is unsupported.`,
  );
}
