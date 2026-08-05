import type { Citation } from "./citation.ts";
import type { EvidenceRecord, EvidenceScope } from "./model.ts";
import { sameScope } from "./model.ts";
import type { RequestContext } from "../platform/api/v1.ts";
import type { PostgresTransactionRunner } from "../platform/persistence/v1.ts";
import { EvidenceKnowledgeRepository } from "./repository.ts";
import type {
  ExactDocumentVersionVerificationPort,
} from "./document_version_verification.ts";

export interface CitationPersistencePort {
  insertCitation(citation: Citation): Promise<void>;
  insertEvidence?(evidence: EvidenceRecord): Promise<void>;
}

export interface EvidenceWriteAuthorizationPort {
  authorize(context: RequestContext, scope: EvidenceScope): Promise<boolean>;
}

export interface VerifiedEvidenceWritePort {
  createCitation(context: RequestContext, citation: Citation): Promise<void>;
  createEvidence(
    context: RequestContext,
    evidence: EvidenceRecord,
  ): Promise<void>;
}

export class VerifiedCitationWriter {
  constructor(
    private readonly verifier: ExactDocumentVersionVerificationPort,
    private readonly persistence: CitationPersistencePort,
  ) {}

  async insert(
    context: RequestContext,
    scope: EvidenceScope,
    citation: Citation,
  ): Promise<void> {
    if (!sameScope(scope, citation.scope)) {
      throw new Error("Citation cannot be verified; protected outcome.");
    }
    await this.verifier.verify(context, scope, citation.source);
    await this.persistence.insertCitation(citation);
  }
}

export class PostgresVerifiedEvidenceWriteService
  implements VerifiedEvidenceWritePort {
  constructor(
    private readonly transactions: PostgresTransactionRunner,
    private readonly repository: EvidenceKnowledgeRepository,
    private readonly verifier: ExactDocumentVersionVerificationPort,
    private readonly authorization: EvidenceWriteAuthorizationPort,
  ) {}

  async createCitation(
    context: RequestContext,
    citation: Citation,
  ): Promise<void> {
    const scope = contextScope(context);
    if (!sameScope(scope, citation.scope)) {
      throw new Error("Citation cannot be verified; protected outcome.");
    }
    await this.transactions.run(async (transaction) => {
      await authorize(this.authorization, context, scope);
      await this.verifier.verify(context, scope, citation.source);
      await this.repository.insertOrValidateCitation(transaction, citation);
    });
  }

  async createEvidence(
    context: RequestContext,
    evidence: EvidenceRecord,
  ): Promise<void> {
    const scope = contextScope(context);
    if (
      !sameScope(scope, evidence.scope) ||
      !sameScope(scope, evidence.citation.scope)
    ) {
      throw new Error("Evidence cannot be verified; protected outcome.");
    }
    await this.transactions.run(async (transaction) => {
      await authorize(this.authorization, context, scope);
      await this.verifier.verify(context, scope, evidence.citation.source);
      await this.repository.insertOrValidateCitation(
        transaction,
        evidence.citation,
      );
      await this.repository.insertEvidence(transaction, evidence);
    });
  }
}

async function authorize(
  authorization: EvidenceWriteAuthorizationPort,
  context: RequestContext,
  scope: EvidenceScope,
): Promise<void> {
  if (await authorization.authorize(context, scope)) return;
  throw new Error("Evidence write is forbidden; protected outcome.");
}

function contextScope(context: RequestContext): EvidenceScope {
  if (context.workspaceId === undefined || context.dealId === undefined) {
    throw new Error("Evidence write scope is incomplete; protected outcome.");
  }
  return {
    tenantId: context.tenantId,
    workspaceId: context.workspaceId,
    dealId: context.dealId,
  };
}
