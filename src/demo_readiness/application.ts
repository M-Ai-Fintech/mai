import {
  auditEventDigest,
  type AuditEventDraft,
  type AuditEventId,
  type PostgresAuditEventRepository,
} from "../audit_activity/v1.ts";
import type { DealAuthorizationPort } from "../deal_management/contracts.ts";
import type { DealRepository } from "../deal_management/repository.ts";
import type { ExecutableRequestContext } from "../api/executable_request_context.ts";
import {
  action,
  type ActorReference,
  resourceKind,
} from "../platform/authz/v1.ts";
import type { PostgresTransactionRunner } from "../platform/persistence/v1.ts";
import type { AggregateVersion, IdempotencyKey } from "../platform/api/v1.ts";
import {
  type DemoManifest,
  type DemoReadinessResult,
  type DemoResetTarget,
  type DemoScreenFamily,
  type DemoScreenReadModel,
  type DemoShellReadModel,
} from "./contracts.ts";
import {
  buildSyntheticInvestorDemo,
  demoScope,
  type SyntheticInvestorDemoWorkflow,
} from "./runner.ts";
import type { DemoWorkflowPersistence } from "./persistence.ts";

const DEMO_RESOURCE = resourceKind("demo_readiness");
const DEMO_EVENT = "DemoReadinessCompleted";

export interface DemoReadinessApplicationConfig {
  readonly manifest: DemoManifest;
  readonly fixtureRoot: URL;
  readonly target: DemoResetTarget;
  readonly context: Pick<ExecutableRequestContext, "contextFor">;
  readonly authorization: DealAuthorizationPort;
  readonly deals: Pick<DealRepository, "find">;
  readonly transactions: Pick<PostgresTransactionRunner, "run">;
  readonly audit: Pick<PostgresAuditEventRepository, "list">;
  readonly persistence: Pick<DemoWorkflowPersistence, "persist" | "loadLatest">;
  readonly now?: () => Date;
}

export class DemoReadinessApplicationError extends Error {
  constructor(
    readonly status: 403 | 404 | 503,
    readonly code:
      | "DEMO_ACCESS_DENIED"
      | "PROTECTED_NOT_FOUND"
      | "DEMO_DEPENDENCY_UNAVAILABLE",
    message: string,
  ) {
    super(message);
    this.name = "DemoReadinessApplicationError";
  }
}

/** Runs and projects the synthetic demo behind persisted policy and audit.
 *
 * @example await application.execute(request)
 */
export class DemoReadinessApplication {
  private readonly now: () => Date;

  constructor(private readonly config: DemoReadinessApplicationConfig) {
    this.now = config.now ?? (() => new Date());
  }

  async execute(
    request: Request,
    idempotencyKey: IdempotencyKey,
  ): Promise<DemoReadinessResult> {
    const authenticated = await this.config.context.contextFor(request);
    await this.authorize(
      authenticated.context,
      authenticated.actor,
      "execute",
      true,
    );
    await this.requireDeal(authenticated.context);
    const workflow = await buildSyntheticInvestorDemo(
      this.config.manifest,
      this.config.fixtureRoot,
      this.config.target,
      authenticated.actor,
    );
    const persistedWorkflow = {
      ...workflow,
      result: persistedResult(workflow.result),
    };
    const receipt = await demoAuditEvent(
      authenticated,
      persistedWorkflow.result,
      this.now(),
    );
    const persisted = await this.persistWorkflow(
      idempotencyKey,
      persistedWorkflow,
      receipt,
    );
    return persisted.result;
  }

  async readScreen(
    request: Request,
    family: DemoScreenFamily,
  ): Promise<DemoScreenReadModel> {
    const authenticated = await this.config.context.contextFor(request);
    await this.authorize(
      authenticated.context,
      authenticated.actor,
      "read",
      false,
    );
    await this.requireDeal(authenticated.context);
    await this.requireReceipt(authenticated.context);
    const result = await this.loadPersistedResult();
    if (result === undefined) throw demoNotExecuted();
    return screenReadModel(result, family);
  }

  async readShell(request: Request): Promise<DemoShellReadModel> {
    const authenticated = await this.config.context.contextFor(request);
    await this.authorize(
      authenticated.context,
      authenticated.actor,
      "read",
      false,
    );
    await this.requireDeal(authenticated.context);
    await this.requireReceipt(authenticated.context);
    const result = await this.loadPersistedResult();
    if (result === undefined) throw demoNotExecuted();
    return {
      organization: {
        id: demoScope.workspaceId,
        name: "M&Ai synthetic demo",
      },
      deal: {
        id: demoScope.dealId,
        name: "Serra Azul synthetic sell-side mandate",
        phase: "diligence",
      },
      permissions: ["workspace", "deal"],
      counts: { tasks: 1, approvals: 1, notifications: 0 },
    };
  }

  private async authorize(
    context: import("../platform/api/v1.ts").RequestContext,
    actor: ActorReference,
    requestedAction: "read" | "execute",
    humanOnly: boolean,
  ): Promise<void> {
    if (
      context.tenantId !== demoScope.tenantId ||
      context.workspaceId !== demoScope.workspaceId ||
      context.dealId !== demoScope.dealId
    ) {
      throw new DemoReadinessApplicationError(
        403,
        "DEMO_ACCESS_DENIED",
        "The demo workflow is unavailable for this authenticated scope.",
      );
    }
    const decision = await this.config.authorization.authorize({
      context: {
        actor,
        request: workspacePolicyContext(context),
        now: this.now().toISOString(),
      },
      scope: {
        tenantId: demoScope.tenantId,
        workspaceId: demoScope.workspaceId,
      },
      resource: { kind: DEMO_RESOURCE, id: demoScope.dealId },
      action: action(requestedAction),
      requestedFields: [],
      humanOnly,
    });
    if (decision.outcome === "allow") return;
    throw new DemoReadinessApplicationError(
      403,
      "DEMO_ACCESS_DENIED",
      "The demo workflow is unavailable for this authenticated scope.",
    );
  }

  private async requireDeal(
    context: import("../platform/api/v1.ts").RequestContext,
  ): Promise<void> {
    let deal;
    try {
      deal = await this.config.deals.find({
        tenantId: context.tenantId,
        workspaceId: context.workspaceId!,
      }, demoScope.dealId);
    } catch {
      throw dependencyUnavailable();
    }
    if (deal !== undefined) return;
    throw new DemoReadinessApplicationError(
      404,
      "PROTECTED_NOT_FOUND",
      "The protected demo resource was not found.",
    );
  }

  private async requireReceipt(
    context: import("../platform/api/v1.ts").RequestContext,
  ): Promise<void> {
    let events;
    try {
      events = await this.config.transactions.run((transaction) =>
        this.config.audit.list(transaction, {
          tenantId: context.tenantId,
          workspaceId: context.workspaceId,
          dealId: context.dealId,
          limit: 100,
        })
      );
    } catch {
      throw dependencyUnavailable();
    }
    if (events.some((event) => event.eventType === DEMO_EVENT)) return;
    throw demoNotExecuted();
  }

  private async persistWorkflow(
    idempotencyKey: IdempotencyKey,
    workflow: SyntheticInvestorDemoWorkflow,
    receipt: AuditEventDraft,
  ) {
    try {
      return await this.config.persistence.persist(
        idempotencyKey,
        workflow,
        receipt,
      );
    } catch {
      throw dependencyUnavailable();
    }
  }

  private async loadPersistedResult(): Promise<
    DemoReadinessResult | undefined
  > {
    try {
      return await this.config.persistence.loadLatest(demoScope);
    } catch {
      throw dependencyUnavailable();
    }
  }
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

async function demoAuditEvent(
  authenticated: Awaited<
    ReturnType<DemoReadinessApplicationConfig["context"]["contextFor"]>
  >,
  result: DemoReadinessResult,
  occurredAt: Date,
): Promise<AuditEventDraft> {
  const draft: AuditEventDraft = {
    eventId: result.auditEventId as AuditEventId,
    ...demoScope,
    actorId: authenticated.actor.id,
    actorKind: "human",
    origin: "http",
    correlationId: authenticated.context.correlationId,
    aggregateType: "DemoReadinessRun",
    aggregateId: demoScope.dealId,
    aggregateVersion: 1 as AggregateVersion,
    eventType: DEMO_EVENT,
    schemaVersion: 1,
    authoritySnapshot: {
      snapshotId: `authority_${authenticated.context.sessionId}`,
      actorId: authenticated.actor.id,
      actorKind: "human",
      policyVersion: "persisted-access-v1",
      scope: demoScope,
      capturedAt: occurredAt,
    },
    evidenceSnapshot: {
      capturedAt: occurredAt,
      references: result.documentVersions.map((document) => ({
        sourceType: "DocumentVersion",
        sourceId: document.documentVersionId,
        sourceVersion: "synthetic-plaintext-v1",
        checksum: document.checksum,
      })),
    },
    provenance: {
      actorId: authenticated.actor.id,
      actorKind: "human",
      origin: "http",
      operationReference: "demo-readiness.execute",
    },
    payload: {
      datasetId: result.datasetId,
      datasetDigest: result.datasetDigest,
      synthetic: true,
      deliverableId: result.artifact.deliverableId,
      sourceSnapshotId: result.artifact.sourceSnapshotId,
      processingRuns: result.processingRuns,
      citations: result.citations,
    },
    classifications: {
      datasetId: "internal",
      datasetDigest: "internal",
      synthetic: "public",
      deliverableId: "restricted",
      sourceSnapshotId: "restricted",
      processingRuns: "internal",
      citations: "restricted",
    },
    contentDigest: "0".repeat(64),
    occurredAt,
  };
  return { ...draft, contentDigest: await auditEventDigest(draft) };
}

function persistedResult(result: DemoReadinessResult): DemoReadinessResult {
  return {
    ...result,
    labels: { ...result.labels, persistence: "postgres_context_records" },
    limitations: result.limitations.filter((limitation) =>
      !limitation.startsWith("Process-local") &&
      !limitation.startsWith("Frontend screen traversal")
    ),
  };
}

function demoNotExecuted(): DemoReadinessApplicationError {
  return new DemoReadinessApplicationError(
    404,
    "PROTECTED_NOT_FOUND",
    "The protected demo resource was not found.",
  );
}

function dependencyUnavailable(): DemoReadinessApplicationError {
  return new DemoReadinessApplicationError(
    503,
    "DEMO_DEPENDENCY_UNAVAILABLE",
    "The demo workflow dependency is temporarily unavailable.",
  );
}

function screenReadModel(
  result: DemoReadinessResult,
  family: DemoScreenFamily,
): DemoScreenReadModel {
  const items = screenItems(result, family);
  return {
    family,
    items,
    ...(items[0] === undefined ? {} : { selectedItemId: items[0].id }),
  };
}

function screenItems(
  result: DemoReadinessResult,
  family: DemoScreenFamily,
): DemoScreenReadModel["items"] {
  if (family === "documents-vdr") return documentItems(result);
  if (family === "diligence-decision-room") return diligenceItems(result);
  if (family === "valuation-lab") return valuationItems(result);
  if (family === "matching-universe") {
    return proposalItems("matching", "proposed");
  }
  if (family === "negotiation-room") {
    return proposalItems("negotiation", "approval-required");
  }
  if (family === "tasks-approvals") return authorityItems(result);
  if (family === "deal-activity-audit") return auditItems(result);
  if (family === "deliverables-exports") return deliverableItems(result);
  return dealItems(result, family);
}

function documentItems(
  result: DemoReadinessResult,
): DemoScreenReadModel["items"] {
  return result.documentVersions.map((version) => ({
    id: version.documentVersionId,
    title: version.documentId,
    summary: `${version.sourceId} · sha256:${version.checksum}`,
    status: "processed-synthetic",
  }));
}

function diligenceItems(
  result: DemoReadinessResult,
): DemoScreenReadModel["items"] {
  return [{
    id: result.finding.id,
    title: "Customer concentration finding",
    summary: `Exact source: "${
      result.citations.at(-1)?.excerpt ?? "unavailable"
    }"; missing ${result.missingCategories.join(", ")}.`,
    status: result.finding.state,
  }];
}

function valuationItems(
  result: DemoReadinessResult,
): DemoScreenReadModel["items"] {
  return [{
    id: result.calculation.id,
    title: "Deterministic enterprise value",
    summary:
      `BRL ${result.calculation.enterpriseValueBrl}; ${result.calculation.algorithmVersion}.`,
    status: "deterministic-current",
  }];
}

function proposalItems(
  kind: string,
  status: string,
): DemoScreenReadModel["items"] {
  return [{
    id: `${kind}_investor-demo-proposal`,
    title: `${kind} proposal boundary`,
    summary:
      "Synthetic proposal only; no autonomous approval or external transmission.",
    status,
  }];
}

function authorityItems(
  result: DemoReadinessResult,
): DemoScreenReadModel["items"] {
  return [{
    id: result.authority.humanDecisionRecordId,
    title: "Human decision recorded",
    summary: "Agent decision rejected before the authorized human record.",
    status: "human-approved",
  }];
}

function auditItems(result: DemoReadinessResult): DemoScreenReadModel["items"] {
  return [{
    id: result.auditEventId,
    title: "Immutable demo evidence receipt",
    summary:
      `Dataset ${result.datasetDigest}; ${result.documentVersions.length} source versions.`,
    status: "recorded",
  }];
}

function deliverableItems(
  result: DemoReadinessResult,
): DemoScreenReadModel["items"] {
  return [{
    id: result.artifact.versionId,
    title: "Synthetic investor dossier",
    summary:
      `${result.artifact.sourceSnapshotId}; ${result.artifact.sourceChecksums.length} checksums.`,
    status: "draft-internal",
  }];
}

function dealItems(
  result: DemoReadinessResult,
  family: DemoScreenFamily,
): DemoScreenReadModel["items"] {
  return [{
    id: demoScope.dealId,
    title: "Serra Azul synthetic sell-side mandate",
    summary:
      `${result.documentVersions.length} documents; ${result.missingCategories.length} evidence gap.`,
    status: family === "command-center" ? "review-required" : "diligence",
  }];
}
