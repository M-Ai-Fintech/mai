import { EvidenceKnowledgeV1Application } from "./v1/evidence_knowledge.ts";
import type { CoreWorkflowRouteDependencies } from "./core_workflow_routes.ts";
import type { DealManagementComposition } from "../deal_management/v1.ts";
import type { DealAuthorizationInput } from "../deal_management/contracts.ts";
import { action, resourceKind } from "../platform/authz/v1.ts";
import { createDocumentsComposition } from "../documents/composition.ts";
import { createEvidenceKnowledgeComposition } from "../evidence_knowledge/composition.ts";
import { ExecutableRequestContext } from "./executable_request_context.ts";

const DOCUMENT_RESOURCE = resourceKind("document");
const EVIDENCE_RESOURCE = resourceKind("evidence");

export interface ExecutableCoreWorkflowComposition {
  readonly routes: CoreWorkflowRouteDependencies;
  readonly close: () => Promise<void>;
}

/** Composes protected core reads and commands on the Deal-owned process pool.
 *
 * @example createExecutableCoreWorkflowComposition(deal)
 */
export function createExecutableCoreWorkflowComposition(
  deal: DealManagementComposition,
): ExecutableCoreWorkflowComposition {
  const context = new ExecutableRequestContext(deal.http.authentication);
  const documents = createDocumentsComposition({
    pool: deal.pool,
    authorization: new DealBackedDocumentsAuthorization(deal, context),
  });
  const evidence = createEvidenceKnowledgeComposition({ pool: deal.pool });
  const evidenceApplication = new EvidenceKnowledgeV1Application(
    new DealBackedEvidenceAuthorization(deal, context),
    evidence.reads,
  );
  return {
    routes: {
      documents: {
        context: {
          contextFor: async (request) =>
            (await context.contextFor(request)).context,
        },
        application: documents.application,
      },
      evidenceKnowledge: {
        context: {
          contextFor: async (request) =>
            (await context.contextFor(request)).context,
        },
        application: evidenceApplication,
      },
    },
    close: async () => {
      await documents.close();
      await evidence.close();
    },
  };
}

class DealBackedDocumentsAuthorization {
  constructor(
    private readonly deal: DealManagementComposition,
    private readonly identities: ExecutableRequestContext,
  ) {}

  async authorize(
    input: Parameters<
      import("./v1/documents.ts").DocumentsAuthorizationPort["authorize"]
    >[0],
  ): Promise<boolean> {
    const decision = await this.deal.authorization.authorize(dealAuthorization({
      context: input.context,
      resourceId: input.resourceId,
      resource: DOCUMENT_RESOURCE,
      requestedAction: input.action,
      actor: this.identities.actorFor(input.context),
    }));
    return decision.outcome === "allow";
  }
}

class DealBackedEvidenceAuthorization {
  constructor(
    private readonly deal: DealManagementComposition,
    private readonly identities: ExecutableRequestContext,
  ) {}

  async authorize(
    input: Parameters<
      import("./v1/evidence_knowledge.ts").EvidenceKnowledgeAuthorizationPort[
        "authorize"
      ]
    >[0],
  ): Promise<boolean> {
    const decision = await this.deal.authorization.authorize(dealAuthorization({
      context: input.context,
      resourceId: input.resourceId,
      resource: EVIDENCE_RESOURCE,
      requestedAction: "read",
      actor: this.identities.actorFor(input.context),
    }));
    return decision.outcome === "allow";
  }
}

function dealAuthorization(input: {
  readonly context: import("../platform/api/v1.ts").RequestContext;
  readonly resourceId: string;
  readonly resource: ReturnType<typeof resourceKind>;
  readonly requestedAction: string;
  readonly actor: import("../platform/authz/v1.ts").ActorReference;
}): DealAuthorizationInput {
  return {
    context: {
      actor: input.actor,
      request: workspacePolicyContext(input.context),
      now: new Date().toISOString(),
    },
    scope: {
      tenantId: input.context.tenantId,
      workspaceId: input.context.workspaceId!,
    },
    resource: { kind: input.resource, id: input.resourceId },
    action: action(input.requestedAction),
    requestedFields: [],
    humanOnly: false,
  };
}

function workspacePolicyContext(
  context: import("../platform/api/v1.ts").RequestContext,
): import("../platform/api/v1.ts").RequestContext {
  return {
    actorId: context.actorId,
    sessionId: context.sessionId,
    identityId: context.identityId,
    tenantId: context.tenantId,
    workspaceId: context.workspaceId,
    correlationId: context.correlationId,
    origin: context.origin,
  };
}
