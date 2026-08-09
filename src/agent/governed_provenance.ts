import type {
  AgentModelLineage,
  AgentSourceVersionReference,
  AgentToolLineage,
} from "./definitions/index.ts";
import {
  capabilitySchema,
  sourceVersionReferenceSchema,
} from "./definitions/index.ts";
import type {
  GovernedExecutionBinding,
  GovernedProposalClaims,
  GovernedProvenanceVerificationRequest,
  GovernedProvenanceVerifier,
  GovernedVerifiedProvenance,
} from "./governed_agent.ts";
import type {
  ResultRecord,
  RunRecord,
  RuntimeActor,
  RuntimeScope,
  SourceVersionReference,
} from "../agent_runtime/model.ts";
import type {
  AgentRuntimeReadService,
  RuntimeReadResult,
} from "../agent_runtime/reads.ts";
import type { SourceVersionChecker } from "../agent_runtime/runner.ts";

/** Public AgentRuntimeReadService methods used by the production adapter. */
export type GovernedRuntimeReceiptReader = Pick<
  AgentRuntimeReadService,
  "getRun" | "getToolActivity" | "listResults"
>;

export class GovernedProvenanceError extends Error {
  readonly code = "INVALID_GOVERNED_PROVENANCE";

  constructor(reason: string) {
    super(
      `Governed proposal provenance was rejected: ${reason}; expected trusted receipts for the bound actor, scope, run, and definition.`,
    );
    this.name = "GovernedProvenanceError";
  }
}

/** Adapts authorized AgentRuntimeReadService receipts into trusted lineage. */
export class AgentRuntimeProvenanceVerifier
  implements GovernedProvenanceVerifier {
  constructor(
    private readonly reads: GovernedRuntimeReceiptReader,
    private readonly sources: SourceVersionChecker,
  ) {}

  async verify(
    request: GovernedProvenanceVerificationRequest,
  ): Promise<GovernedVerifiedProvenance> {
    const execution = request.execution;
    const run = await readReceipt(
      this.reads.getRun(execution.context, execution.actor, execution.runId),
      "run",
    );
    assertRuntimeRun(run, execution);
    const results = await readReceipt(
      this.reads.listResults(
        execution.context,
        execution.actor,
        execution.runId,
      ),
      "result list",
    );
    assertRuntimeResults(results, execution);
    const model = runtimeModelLineage(run, results, request.definition);
    const tools = await runtimeToolLineage(this.reads, request, results);
    const evidence = runtimeEvidenceLineage(request.claims, results);
    await assertEvidenceCurrent(this.sources, evidence);
    return { execution, lineage: { model, tools, evidence } };
  }
}

async function assertEvidenceCurrent(
  checker: SourceVersionChecker,
  evidence: readonly AgentSourceVersionReference[],
): Promise<void> {
  for (const reference of evidence) {
    const runtimeReference = runtimeSourceReference(reference);
    let current: boolean;
    try {
      current = await checker.isCurrent(runtimeReference);
    } catch (_error) {
      throw new GovernedProvenanceError(
        `evidence receipt "${reference.sourceType}:${reference.sourceId}@${reference.version}" freshness is unavailable`,
      );
    }
    if (current) continue;
    throw new GovernedProvenanceError(
      `evidence receipt "${reference.sourceType}:${reference.sourceId}@${reference.version}" is stale or unavailable`,
    );
  }
}

function runtimeSourceReference(
  reference: AgentSourceVersionReference,
): SourceVersionReference {
  if (
    typeof reference.version !== "number" ||
    !Number.isSafeInteger(reference.version) || reference.version <= 0
  ) {
    throw new GovernedProvenanceError(
      `evidence receipt "${reference.sourceType}:${reference.sourceId}@${reference.version}" freshness is unavailable; expected a positive runtime version`,
    );
  }
  return {
    sourceType: reference.sourceType,
    sourceId: reference.sourceId,
    version: reference.version as SourceVersionReference["version"],
    ...(reference.checksum === undefined
      ? {}
      : { checksum: reference.checksum }),
  };
}

async function readReceipt<T>(
  result: Promise<RuntimeReadResult<T>>,
  label: string,
): Promise<T> {
  const receipt = await result;
  if (receipt.kind === "loaded") return receipt.value;
  throw new GovernedProvenanceError(
    `${label} receipt is unavailable or unauthorized`,
  );
}

function assertRuntimeRun(
  run: RunRecord,
  execution: GovernedExecutionBinding,
): void {
  if (
    run.runId !== execution.runId || !sameScope(run.scope, execution.scope) ||
    !sameActor(run.actor, execution.actor)
  ) {
    throw new GovernedProvenanceError(
      "runtime run receipt is cross-scope, cross-run, or actor-mismatched",
    );
  }
  if (run.state !== "running" && run.state !== "succeeded") {
    throw new GovernedProvenanceError(
      `runtime run "${run.runId}" is stale in state "${run.state}"`,
    );
  }
}

function assertRuntimeResults(
  results: readonly ResultRecord[],
  execution: GovernedExecutionBinding,
): void {
  if (results.some((result) => result.runId !== execution.runId)) {
    throw new GovernedProvenanceError(
      "runtime result receipt is cross-run; expected the bound run",
    );
  }
}

function runtimeModelLineage(
  run: RunRecord,
  results: readonly ResultRecord[],
  definition: GovernedProvenanceVerificationRequest["definition"],
): AgentModelLineage {
  if (run.model === undefined) {
    throw new GovernedProvenanceError(
      "runtime run has no model receipt; expected durable model metadata",
    );
  }
  const modelResults = results.filter((result) =>
    result.lineage.model !== undefined
  );
  const promptResults = results.filter((result) =>
    result.lineage.prompt !== undefined
  );
  if (modelResults.length === 0 || promptResults.length === 0) {
    throw new GovernedProvenanceError(
      "runtime results lack model or prompt lineage; expected durable execution receipts",
    );
  }
  if (
    modelResults.some((result) => {
      const model = result.lineage.model!;
      return !sameRuntimeModel(model, run.model!) ||
        !sameDefinitionModel(model, definition);
    })
  ) {
    throw new GovernedProvenanceError(
      "runtime model receipt does not match the bound run or definition policy",
    );
  }
  if (
    promptResults.some((result) =>
      !samePrompt(result.lineage.prompt!, definition)
    )
  ) {
    throw new GovernedProvenanceError(
      "runtime prompt receipt does not match the selected definition",
    );
  }
  return {
    policyReference: definition.modelPolicy.policyReference,
    provider: run.model.provider,
    model: run.model.model,
    modelVersion: run.model.modelVersion,
  };
}

function sameRuntimeModel(
  left: NonNullable<RunRecord["model"]>,
  right: NonNullable<RunRecord["model"]>,
): boolean {
  return left.provider === right.provider && left.model === right.model &&
    left.modelVersion === right.modelVersion;
}

function sameDefinitionModel(
  model: NonNullable<RunRecord["model"]>,
  definition: GovernedProvenanceVerificationRequest["definition"],
): boolean {
  return model.provider === definition.modelPolicy.provider &&
    model.model === definition.modelPolicy.model &&
    model.modelVersion === definition.modelPolicy.modelVersion;
}

function samePrompt(
  prompt: NonNullable<ResultRecord["lineage"]["prompt"]>,
  definition: GovernedProvenanceVerificationRequest["definition"],
): boolean {
  return prompt.templateReference === definition.prompt.templateReference &&
    prompt.templateVersion === definition.prompt.templateVersion &&
    prompt.promptDigest === definition.prompt.promptDigest;
}

async function runtimeToolLineage(
  reads: GovernedRuntimeReceiptReader,
  request: GovernedProvenanceVerificationRequest,
  results: readonly ResultRecord[],
): Promise<AgentToolLineage[]> {
  const claims = request.claims.tools ?? [];
  assertUnique(
    claims.map((claim) => isRecord(claim) ? claim.activityId : undefined),
    "tool activity claim",
  );
  return await Promise.all(
    claims.map((claim) =>
      runtimeTool(
        reads,
        request,
        results,
        isRecord(claim) ? claim.activityId : undefined,
      )
    ),
  );
}

async function runtimeTool(
  reads: GovernedRuntimeReceiptReader,
  request: GovernedProvenanceVerificationRequest,
  results: readonly ResultRecord[],
  activityId: unknown,
): Promise<AgentToolLineage> {
  if (typeof activityId !== "string" || !activityId.trim()) {
    throw new GovernedProvenanceError(
      "tool activity claim is malformed; expected a durable activity ID",
    );
  }
  const activity = await readReceipt(
    reads.getToolActivity(
      request.execution.context,
      request.execution.actor,
      activityId,
    ),
    `tool activity "${activityId}"`,
  );
  if (activity.runId !== request.execution.runId) {
    throw new GovernedProvenanceError(
      `tool activity "${activityId}" belongs to another run`,
    );
  }
  if (activity.state !== "succeeded") {
    throw new GovernedProvenanceError(
      `tool activity "${activityId}" is not succeeded`,
    );
  }
  if (
    !results.some((result) =>
      result.lineage.toolActivityIds.includes(activity.activityId)
    )
  ) {
    throw new GovernedProvenanceError(
      `tool activity "${activityId}" is not linked by a durable result`,
    );
  }
  if (
    !request.definition.toolReferences.includes(
      activity.toolName as (typeof request.definition.toolReferences)[number],
    ) || !capabilitySchema.safeParse(activity.toolName).success
  ) {
    throw new GovernedProvenanceError(
      `tool activity "${activityId}" has an invalid tool name`,
    );
  }
  const capability = capabilitySchema.safeParse(activity.action).success
    ? { capability: activity.action }
    : {};
  return {
    name: activity.toolName,
    activityId: activity.activityId,
    ...capability,
    status: "succeeded",
  };
}

function runtimeEvidenceLineage(
  claims: GovernedProposalClaims,
  results: readonly ResultRecord[],
): AgentSourceVersionReference[] {
  const evidence = claims.evidence ?? [];
  evidence.forEach(assertSourceReference);
  assertUnique(evidence.map(sourceReferenceKey), "evidence claim");
  return evidence.map((reference) => {
    const receipt = results.flatMap((result) => result.lineage.evidence).find(
      (candidate) =>
        sourceReferenceKey(candidate) === sourceReferenceKey(reference),
    );
    if (receipt === undefined) {
      throw new GovernedProvenanceError(
        `evidence claim "${reference.sourceType}:${reference.sourceId}@${reference.version}" is invented, cross-run, or stale`,
      );
    }
    return {
      sourceType: receipt.sourceType,
      sourceId: receipt.sourceId,
      version: receipt.version,
      ...(receipt.checksum === undefined ? {} : { checksum: receipt.checksum }),
    };
  });
}

function assertSourceReference(
  value: unknown,
): asserts value is AgentSourceVersionReference {
  if (sourceVersionReferenceSchema.safeParse(value).success) return;
  throw new GovernedProvenanceError(
    "evidence claim is malformed; expected an exact source version",
  );
}

function sourceReferenceKey(reference: {
  readonly sourceType: string;
  readonly sourceId: string;
  readonly version: string | number;
  readonly checksum?: string;
}): string {
  return `${reference.sourceType}:${reference.sourceId}:${reference.version}:${
    reference.checksum ?? ""
  }`;
}

function assertUnique(values: readonly unknown[], label: string): void {
  if (
    values.every((value) => typeof value === "string") &&
    new Set(values).size === values.length
  ) return;
  throw new GovernedProvenanceError(
    `${label} list contains a duplicate or malformed value`,
  );
}

function sameScope(
  left:
    | Pick<RuntimeScope, "tenantId" | "workspaceId" | "dealId">
    | GovernedExecutionBinding["context"],
  right: RuntimeScope,
): boolean {
  return left.tenantId === right.tenantId &&
    left.workspaceId === right.workspaceId && left.dealId === right.dealId;
}

function sameActor(left: RuntimeActor, right: RuntimeActor): boolean {
  return left.actorId === right.actorId && left.kind === right.kind &&
    left.state === right.state;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
