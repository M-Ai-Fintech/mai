import type { RequestContext } from "../platform/api/v1.ts";
import type { DocumentVersionId } from "./ids.ts";
import type { DocumentVersion } from "./version.ts";
import type { DocumentScope } from "./model.ts";
import type { DocumentsAuthorizationPort } from "../api/v1/documents.ts";
import type { DocumentsRepository } from "./repository.ts";
import type { PostgresTransactionRunner } from "../platform/persistence/v1.ts";
import { sameDocumentScope } from "./model.ts";

export interface AuthorizedDocumentVersionReadPort {
  findAccessibleVersion(
    context: RequestContext,
    scope: DocumentScope,
    documentVersionId: DocumentVersionId,
  ): Promise<DocumentVersion | undefined>;
}

export class PostgresAuthorizedDocumentVersionReadPort
  implements AuthorizedDocumentVersionReadPort {
  constructor(
    private readonly authorization: DocumentsAuthorizationPort,
    private readonly documents: DocumentsRepository,
    private readonly transactions: PostgresTransactionRunner,
  ) {}

  async findAccessibleVersion(
    context: RequestContext,
    scope: DocumentScope,
    documentVersionId: DocumentVersionId,
  ): Promise<DocumentVersion | undefined> {
    if (
      context.tenantId !== scope.tenantId ||
      context.workspaceId !== scope.workspaceId ||
      context.dealId !== scope.dealId
    ) {
      return undefined;
    }
    const authorized = await this.authorization.authorize({
      action: "read",
      context,
      resourceId: documentVersionId,
      scope,
    });
    if (!authorized) return undefined;

    return this.transactions.run(async (transaction) => {
      const version = await this.documents.findVersion(
        transaction,
        scope,
        documentVersionId,
      );
      if (version === undefined || !sameDocumentScope(version.scope, scope)) {
        return undefined;
      }
      return version;
    });
  }
}
