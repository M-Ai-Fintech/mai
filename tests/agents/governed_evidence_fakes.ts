import type { AllowedAuthorizationDecision } from "../../src/platform/authz/v1.ts";
import type { ToolInvocationRequest } from "../../src/agent_runtime/tool_gateway.ts";
import type {
  RuntimeActor,
  RuntimeScope,
  SourceVersionReference,
} from "../../src/agent_runtime/model.ts";
import type { ToolActivityId } from "../../src/agent_runtime/ids.ts";
import type { RequestContext } from "../../src/shared/contracts/request_context.ts";
import type {
  EvidenceSearchHit,
  ExactDocumentVersionReference,
  GovernedEvidenceSearchPort,
  GovernedSourceVersionPort,
} from "../../src/agent/tools/governed_evidence_tools.ts";

export const scope: RuntimeScope = {
  tenantId: "tenant_acme" as RuntimeScope["tenantId"],
  workspaceId: "workspace_horizon" as RuntimeScope["workspaceId"],
  dealId: "deal_horizon" as RuntimeScope["dealId"],
};
export const context: RequestContext = {
  actorId: "actor_agent" as RequestContext["actorId"],
  tenantId: scope.tenantId,
  workspaceId: scope.workspaceId,
  dealId: scope.dealId,
  correlationId: "cor_tools" as RequestContext["correlationId"],
  origin: "job",
};
export const actor: RuntimeActor = {
  actorId: context.actorId,
  kind: "ai",
  state: "active",
};
export const exactReference: ExactDocumentVersionReference = {
  documentVersionId: "docv_contract_v2",
  version: 2,
  checksum: { algorithm: "sha256", value: "a".repeat(64) },
};
export const sourceVersion: SourceVersionReference = {
  sourceType: "document_version",
  sourceId: exactReference.documentVersionId,
  version: exactReference.version as SourceVersionReference["version"],
  checksum: exactReference.checksum.value,
};

export function request(
  toolName: string,
  action: string,
  input: Readonly<Record<string, unknown>>,
): ToolInvocationRequest {
  return { ...authorizedInvocation(toolName, action), input };
}

export function authorizedInvocation(toolName: string, action: string) {
  return {
    activityId: "activity_tools" as ToolActivityId,
    context,
    actor,
    scope,
    toolName,
    action,
    resourceKind: "agent_tool",
    resourceId: toolName,
    input: {},
    sourceVersions: [],
    beforeEffect: () => Promise.resolve(),
    authority: {
      snapshotReference: "authz-v1",
      decisionReference: "decision_tools",
      checkedAt: new Date(),
    },
  };
}

export function allowDecision(): AllowedAuthorizationDecision {
  return {
    outcome: "allow",
    reasonCode: "ALLOWED",
    allowedActions: [],
    approvedScope: {
      decisionReference: "decision_tools",
    } as AllowedAuthorizationDecision["approvedScope"],
    fieldMask: {
      include: [],
      omit: [],
      redact: [],
      approvedClassifications: [],
    },
  };
}

export class RecordingEvidenceSearchPort implements GovernedEvidenceSearchPort {
  constructor(private readonly values: readonly EvidenceSearchHit[]) {}
  search(): Promise<readonly EvidenceSearchHit[]> {
    return Promise.resolve(this.values);
  }
}

export function evidenceHit(
  reference: ExactDocumentVersionReference,
  page: number,
): EvidenceSearchHit {
  return {
    evidenceId: `evidence_${reference.documentVersionId}_${page}`,
    citationId: `citation_${reference.documentVersionId}_${page}`,
    source: {
      ...reference,
      location: { kind: "page", page },
      classification: "legal",
      processingVersion: "extract-v1",
    },
  };
}

export class ToggleSourceVersionPort implements GovernedSourceVersionPort {
  current = true;
  checks = 0;
  isCurrent(): Promise<boolean> {
    this.checks += 1;
    return Promise.resolve(this.current);
  }
}
