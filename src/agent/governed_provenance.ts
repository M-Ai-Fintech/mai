import type {
  AgentModelLineage,
  AgentSourceVersionReference,
  AgentToolLineage,
  VerifiedAgentLineage,
} from "./definitions/index.ts";
import {
  capabilitySchema,
  sourceVersionReferenceSchema,
} from "./definitions/index.ts";
import type {
  GovernedExecutionBinding,
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
import {
  capabilityBindingForTool,
  capabilityForTool,
  requestedCapabilityMismatch,
  type RuntimeToolReceipt,
} from "./governed_capability_binding.ts";
import {
  sameDefinitionModel,
  samePrompt,
  sameRuntimeModel,
} from "./governed_provenance_values.ts";

/** Public AgentRuntimeReadService methods used by the production adapter. */
export type GovernedRuntimeReceiptReader = Pick<
  AgentRuntimeReadService,
  "getRun" | "getResult" | "getToolActivity"
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
    const run = await readRun(this.reads, execution);
    const result = await readResult(this.reads, execution, request.resultId);
    assertRuntimeResult(result, request.resultId, execution);
    const identity = runtimeIdentityLineage(result, request.definition);
    const model = runtimeModelLineage(run, result, request.definition);
    const tools = await runtimeToolLineage(this.reads, request, result);
    const evidence = runtimeEvidenceLineage(result);
    await assertEvidenceCurrent(this.sources, evidence);
    const currentRun = await readRun(this.reads, execution);
    assertRunUnchanged(run, currentRun, execution);
    return {
      execution,
      result,
      lineage: { ...identity, model, tools, evidence },
    };
  }
}

async function readRun(
  reads: GovernedRuntimeReceiptReader,
  execution: GovernedExecutionBinding,
): Promise<RunRecord> {
  const run = await readReceipt(
    reads.getRun(execution.context, execution.actor, execution.runId),
    "run",
  );
  assertRuntimeRun(run, execution);
  return run;
}

async function readResult(
  reads: GovernedRuntimeReceiptReader,
  execution: GovernedExecutionBinding,
  resultId: string,
): Promise<ResultRecord> {
  return await readReceipt(
    reads.getResult(execution.context, execution.actor, resultId),
    `result "${resultId}"`,
  );
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
  if (!isRecord(run)) {
    throw new GovernedProvenanceError(
      "runtime run receipt is malformed; expected a durable run record",
    );
  }
  if (
    run.runId !== execution.runId || !sameScope(run.scope, execution.scope) ||
    !sameActor(run.actor, execution.actor)
  ) {
    throw new GovernedProvenanceError(
      "runtime run receipt is cross-scope, cross-run, or actor-mismatched",
    );
  }
  if (run.state !== "succeeded") {
    throw new GovernedProvenanceError(
      `runtime run "${run.runId}" is not succeeded; received state "${run.state}"`,
    );
  }
}

function assertRuntimeResult(
  result: ResultRecord,
  resultId: string,
  execution: GovernedExecutionBinding,
): void {
  if (!isRecord(result)) {
    throw new GovernedProvenanceError(
      `durable result "${resultId}" is malformed; expected a durable result record`,
    );
  }
  if (result.resultId !== resultId || result.runId !== execution.runId) {
    throw new GovernedProvenanceError(
      `durable result "${resultId}" is cross-run or bound to another result ID`,
    );
  }
  if (result.kind !== "proposal" && result.kind !== "reversible_draft") {
    throw new GovernedProvenanceError(
      `durable result "${resultId}" has unsupported kind "${result.kind}"; expected proposal or reversible_draft`,
    );
  }
  if (!isRecord(result.value) || !isRecord(result.lineage)) {
    throw new GovernedProvenanceError(
      `durable result "${resultId}" is malformed; expected a value and lineage record`,
    );
  }
  if (
    !Array.isArray(result.lineage.toolActivityIds) ||
    !Array.isArray(result.lineage.evidence)
  ) {
    throw new GovernedProvenanceError(
      `durable result "${resultId}" has incomplete tool or evidence lineage`,
    );
  }
}

function runtimeIdentityLineage(
  result: ResultRecord,
  definition: GovernedProvenanceVerificationRequest["definition"],
): Pick<
  VerifiedAgentLineage,
  "definition" | "prompt" | "modelPolicyReference"
> {
  const lineage = result.lineage;
  const durableDefinition = lineage.definition;
  if (!isRecord(durableDefinition)) {
    throw new GovernedProvenanceError(
      `durable result "${result.resultId}" lacks a definition receipt; expected durable definition ID and version`,
    );
  }
  if (
    durableDefinition.id !== definition.id ||
    durableDefinition.version !== definition.version ||
    lineage.definitionId !== durableDefinition.id ||
    lineage.definitionVersion !== durableDefinition.version
  ) {
    throw new GovernedProvenanceError(
      `durable result "${result.resultId}" definition receipt does not match the selected definition`,
    );
  }
  const prompt = lineage.prompt;
  if (!isRecord(prompt) || !samePrompt(prompt, definition)) {
    throw new GovernedProvenanceError(
      `durable result "${result.resultId}" model or prompt receipt does not match the selected definition`,
    );
  }
  if (
    typeof lineage.modelPolicyReference !== "string" ||
    lineage.modelPolicyReference !== definition.modelPolicy.policyReference
  ) {
    throw new GovernedProvenanceError(
      `durable result "${result.resultId}" model policy receipt does not match the selected definition`,
    );
  }
  return {
    definition: {
      id: durableDefinition.id as typeof definition.id,
      version: durableDefinition.version,
    },
    prompt: {
      templateReference: prompt.templateReference as string,
      templateVersion: prompt.templateVersion as string,
      promptDigest: prompt.promptDigest as string,
    },
    modelPolicyReference: lineage.modelPolicyReference,
  };
}

function runtimeModelLineage(
  run: RunRecord,
  result: ResultRecord,
  definition: GovernedProvenanceVerificationRequest["definition"],
): AgentModelLineage {
  if (run.model === undefined) {
    throw new GovernedProvenanceError(
      "runtime run has no model receipt; expected durable model metadata",
    );
  }
  const model = result.lineage.model;
  const prompt = result.lineage.prompt;
  if (model === undefined || prompt === undefined) {
    throw new GovernedProvenanceError(
      "durable result lacks model or prompt lineage; expected the bound definition identity",
    );
  }
  if (
    typeof model.policyReference !== "string" ||
    model.policyReference !== definition.modelPolicy.policyReference
  ) {
    throw new GovernedProvenanceError(
      "durable result model receipt lacks the durable model policy reference",
    );
  }
  if (
    !sameRuntimeModel(model, run.model) ||
    !sameDefinitionModel(model, definition) || !samePrompt(prompt, definition)
  ) {
    throw new GovernedProvenanceError(
      "durable result model or prompt receipt does not match the bound definition",
    );
  }
  return {
    policyReference: model.policyReference,
    provider: run.model.provider,
    model: run.model.model,
    modelVersion: run.model.modelVersion,
  };
}

async function runtimeToolLineage(
  reads: GovernedRuntimeReceiptReader,
  request: GovernedProvenanceVerificationRequest,
  result: ResultRecord,
): Promise<AgentToolLineage[]> {
  const activityIds = result.lineage.toolActivityIds;
  assertUnique(activityIds, "durable result tool activity");
  const receipts = await Promise.all(
    activityIds.map((activityId) =>
      runtimeTool(reads, request, result, activityId)
    ),
  );
  const mismatch = requestedCapabilityMismatch(
    request.capability,
    result,
    receipts,
  );
  if (mismatch !== undefined) {
    throw new GovernedProvenanceError(mismatch);
  }
  return receipts.map(({ action: _action, ...tool }) => tool);
}

async function runtimeTool(
  reads: GovernedRuntimeReceiptReader,
  request: GovernedProvenanceVerificationRequest,
  result: ResultRecord,
  activityId: unknown,
): Promise<RuntimeToolReceipt> {
  if (typeof activityId !== "string" || !activityId.trim()) {
    throw new GovernedProvenanceError(
      "durable result tool lineage is malformed; expected durable activity IDs",
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
  if (!isRecord(activity)) {
    throw new GovernedProvenanceError(
      `tool activity "${activityId}" is malformed; expected a durable activity record`,
    );
  }
  if (
    activity.activityId !== activityId ||
    activity.runId !== request.execution.runId ||
    activity.runId !== result.runId
  ) {
    throw new GovernedProvenanceError(
      `tool activity "${activityId}" belongs to another run or result binding`,
    );
  }
  if (activity.state !== "succeeded") {
    throw new GovernedProvenanceError(
      `tool activity "${activityId}" is not succeeded`,
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
  const binding = capabilityBindingForTool(activity.toolName);
  if (binding !== undefined && activity.action !== binding.action) {
    throw new GovernedProvenanceError(
      `tool activity "${activityId}" action "${activity.action}" does not match tool "${activity.toolName}"`,
    );
  }
  const capability = capabilityForTool(activity.toolName, activity.action);
  return {
    name: activity.toolName,
    activityId: activity.activityId,
    action: activity.action,
    ...capability,
    status: "succeeded",
  };
}

function runtimeEvidenceLineage(
  result: ResultRecord,
): AgentSourceVersionReference[] {
  const evidence = result.lineage.evidence;
  evidence.forEach(assertSourceReference);
  assertUnique(evidence.map(sourceReferenceKey), "durable result evidence");
  return evidence.map((reference) => ({
    sourceType: reference.sourceType,
    sourceId: reference.sourceId,
    version: reference.version,
    ...(reference.checksum === undefined
      ? {}
      : { checksum: reference.checksum }),
  }));
}

function assertSourceReference(
  value: unknown,
): asserts value is AgentSourceVersionReference {
  if (sourceVersionReferenceSchema.safeParse(value).success) return;
  throw new GovernedProvenanceError(
    "durable result evidence lineage is malformed; expected exact source versions",
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
    `${label} lineage contains a duplicate or malformed value`,
  );
}

function assertRunUnchanged(
  initial: RunRecord,
  current: RunRecord,
  execution: GovernedExecutionBinding,
): void {
  assertRuntimeRun(current, execution);
  if (
    current.aggregateVersion !== initial.aggregateVersion ||
    current.state !== initial.state ||
    !sameScope(current.scope, initial.scope) ||
    !sameActor(current.actor, initial.actor) ||
    !sameModel(current.model, initial.model)
  ) {
    throw new GovernedProvenanceError(
      `runtime run "${execution.runId}" changed while its result was being verified; expected the same aggregate version, state, scope, actor, and model`,
    );
  }
}

function sameModel(
  left: RunRecord["model"],
  right: RunRecord["model"],
): boolean {
  if (left === undefined || right === undefined) return left === right;
  return left.provider === right.provider && left.model === right.model &&
    left.modelVersion === right.modelVersion &&
    left.policyReference === right.policyReference &&
    left.responseReference === right.responseReference;
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
