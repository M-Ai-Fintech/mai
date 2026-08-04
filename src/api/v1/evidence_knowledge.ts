import {
  createApiError,
  createProtectedNotFoundError,
  type ErrorEnvelope,
  formatEtag,
  type RequestContext,
} from "../../platform/api/v1.ts";
import type { Citation } from "../../evidence_knowledge/citation.ts";
import type {
  Calculation,
  EvidenceRecord,
  EvidenceScope,
  Fact,
} from "../../evidence_knowledge/model.ts";
import type {
  CalculationId,
  CitationId,
  EvidenceId,
  FactId,
} from "../../evidence_knowledge/ids.ts";

export type EvidenceKnowledgeResource =
  | "evidence"
  | "citation"
  | "fact"
  | "calculation";
export interface EvidenceKnowledgeAuthorizationRequest {
  readonly resource: EvidenceKnowledgeResource;
  readonly resourceId: string;
  readonly context: RequestContext;
  readonly scope: EvidenceScope;
}
export interface EvidenceKnowledgeAuthorizationPort {
  authorize(request: EvidenceKnowledgeAuthorizationRequest): Promise<boolean>;
}
export interface EvidenceKnowledgeReadPort {
  findCitation(
    scope: EvidenceScope,
    id: CitationId,
  ): Promise<Citation | undefined>;
  findEvidence(
    scope: EvidenceScope,
    id: EvidenceId,
  ): Promise<EvidenceRecord | undefined>;
  findFact(scope: EvidenceScope, id: FactId): Promise<Fact | undefined>;
  findCalculation(
    scope: EvidenceScope,
    id: CalculationId,
  ): Promise<Calculation | undefined>;
}
export type EvidenceKnowledgeApiResult<T> = {
  readonly kind: "ok";
  readonly value: T;
} | { readonly kind: "error"; readonly error: ErrorEnvelope };
export interface EvidenceKnowledgeReadView<T> {
  readonly value: T;
  readonly etag: string;
}

export class EvidenceKnowledgeV1Application {
  constructor(
    private readonly authorization: EvidenceKnowledgeAuthorizationPort,
    private readonly reads: EvidenceKnowledgeReadPort,
  ) {}
  readEvidence(
    context: RequestContext,
    id: EvidenceId,
  ): Promise<
    EvidenceKnowledgeApiResult<EvidenceKnowledgeReadView<EvidenceRecord>>
  > {
    return this.read(
      context,
      "evidence",
      id,
      (scope) => this.reads.findEvidence(scope, id),
    );
  }
  readCitation(
    context: RequestContext,
    id: CitationId,
  ): Promise<EvidenceKnowledgeApiResult<EvidenceKnowledgeReadView<Citation>>> {
    return this.read(
      context,
      "citation",
      id,
      (scope) => this.reads.findCitation(scope, id),
    );
  }
  readFact(
    context: RequestContext,
    id: FactId,
  ): Promise<EvidenceKnowledgeApiResult<EvidenceKnowledgeReadView<Fact>>> {
    return this.read(
      context,
      "fact",
      id,
      (scope) => this.reads.findFact(scope, id),
      (fact) => fact.aggregateVersion,
    );
  }
  readCalculation(
    context: RequestContext,
    id: CalculationId,
  ): Promise<
    EvidenceKnowledgeApiResult<EvidenceKnowledgeReadView<Calculation>>
  > {
    return this.read(
      context,
      "calculation",
      id,
      (scope) => this.reads.findCalculation(scope, id),
    );
  }

  private async read<T>(
    context: RequestContext,
    resource: EvidenceKnowledgeResource,
    resourceId: string,
    loader: (scope: EvidenceScope) => Promise<T | undefined>,
    version: (value: T) => number = () => 1,
  ): Promise<EvidenceKnowledgeApiResult<EvidenceKnowledgeReadView<T>>> {
    const scope = requestScope(context);
    if (scope === undefined) return validationScope(context);
    const allowed = await this.authorization.authorize({
      resource,
      resourceId,
      context,
      scope,
    });
    if (!allowed) return protectedNotFound(context);
    const value = await loader(scope);
    if (value === undefined) return protectedNotFound(context);
    return { kind: "ok", value: { value, etag: formatEtag(version(value)) } };
  }
}

function requestScope(context: RequestContext): EvidenceScope | undefined {
  if (context.workspaceId === undefined || context.dealId === undefined) {
    return undefined;
  }
  return {
    tenantId: context.tenantId,
    workspaceId: context.workspaceId,
    dealId: context.dealId,
  };
}
function validationScope(
  context: RequestContext,
): EvidenceKnowledgeApiResult<never> {
  return {
    kind: "error",
    error: createApiError({
      code: "VALIDATION_FAILED",
      message: "The evidence request requires workspace and Deal scope.",
      correlationId: context.correlationId,
      retryable: false,
      fieldErrors: {
        scope: [{
          field: "scope",
          code: "INVALID_TYPE",
          message: "Workspace and Deal scope are required.",
        }],
      },
    }),
  };
}
function protectedNotFound(
  context: RequestContext,
): EvidenceKnowledgeApiResult<never> {
  return {
    kind: "error",
    error: createProtectedNotFoundError(context.correlationId),
  };
}
