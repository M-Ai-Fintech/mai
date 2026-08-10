import type {
  AgentModelLineage,
  AgentSourceVersionReference,
  VerifiedAgentLineage,
} from "./definitions/index.ts";
import { sourceVersionReferenceSchema } from "./definitions/index.ts";
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
import { assertSourceVersionReceipt } from "../agent_runtime/model.ts";
import type {
  AgentRuntimeReadService,
  RuntimeReadResult,
} from "../agent_runtime/reads.ts";
import type { SourceVersionChecker } from "../agent_runtime/runner.ts";
import {
  sameDefinitionModel,
  samePrompt,
  sameRuntimeModel,
} from "./governed_provenance_values.ts";
import {
  assertStepClaims,
  calculationLineage,
  type DurableStepReceipt,
  readDurableStep,
} from "./governed_calculation_receipts.ts";
import { runtimeToolLineage } from "./governed_tool_receipts.ts";
import { GovernedProvenanceError } from "./governed_provenance_error.ts";

export { GovernedProvenanceError } from "./governed_provenance_error.ts";

/** Public AgentRuntimeReadService methods used by the production adapter. */
export type GovernedRuntimeReceiptReader = Pick<
  AgentRuntimeReadService,
  "getRun" | "getResult" | "getToolActivity" | "getStep"
>;

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
    const step = await readStep(this.reads, execution, result);
    assertDurableStepClaims(step, request);
    const identity = runtimeIdentityLineage(result, request.definition);
    const model = runtimeModelLineage(run, result, request.definition);
    const tools = await runtimeToolLineage(this.reads, request, result);
    const calculation = durableCalculationLineage(step, request, result);
    const evidence = runtimeEvidenceLineage(result);
    await assertEvidenceCurrent(this.sources, evidence);
    const currentRun = await readRun(this.reads, execution);
    assertRunUnchanged(run, currentRun, execution);
    return {
      execution,
      result,
      lineage: {
        ...identity,
        model,
        tools,
        ...(calculation === undefined ? {} : { calculation }),
        evidence,
      },
    };
  }
}

function assertDurableStepClaims(
  step: DurableStepReceipt,
  request: GovernedProvenanceVerificationRequest,
): void {
  try {
    assertStepClaims(step, request);
  } catch (error) {
    throw new GovernedProvenanceError(
      error instanceof Error
        ? error.message
        : "durable step claims are malformed",
    );
  }
}

function durableCalculationLineage(
  step: DurableStepReceipt,
  request: GovernedProvenanceVerificationRequest,
  result: ResultRecord,
) {
  try {
    return calculationLineage(step, request, result);
  } catch (error) {
    throw new GovernedProvenanceError(
      error instanceof Error
        ? error.message
        : "durable calculation receipt is malformed",
    );
  }
}

async function readStep(
  reads: GovernedRuntimeReceiptReader,
  execution: GovernedExecutionBinding,
  result: ResultRecord,
): Promise<DurableStepReceipt> {
  try {
    return await readDurableStep(reads, execution, result);
  } catch (error) {
    throw new GovernedProvenanceError(
      error instanceof Error
        ? error.message
        : "durable step receipt is malformed",
    );
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
  const runtimeReference: SourceVersionReference = {
    sourceType: reference.sourceType,
    sourceId: reference.sourceId,
    version: reference.version,
    ...(reference.checksum === undefined
      ? {}
      : { checksum: reference.checksum }),
  };
  try {
    assertSourceVersionReceipt(runtimeReference);
  } catch (_error) {
    throw new GovernedProvenanceError(
      `evidence receipt "${reference.sourceType}:${reference.sourceId}@${reference.version}" freshness is unavailable; expected its exact numeric or semantic source version`,
    );
  }
  return runtimeReference;
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
  if (
    run.model.policyReference !== definition.modelPolicy.policyReference
  ) {
    throw new GovernedProvenanceError(
      "runtime run model policy receipt does not match the selected definition",
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

function runtimeEvidenceLineage(
  result: ResultRecord,
): AgentSourceVersionReference[] {
  const evidence = result.lineage.evidence;
  evidence.forEach(assertSourceReference);
  return deduplicateAgentEvidence(evidence.map(normalizedSourceReference));
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
  return JSON.stringify([
    reference.sourceType,
    reference.sourceId,
    String(reference.version),
    reference.checksum ?? null,
  ]);
}

function normalizedSourceReference(
  reference: AgentSourceVersionReference,
): AgentSourceVersionReference {
  return {
    sourceType: reference.sourceType,
    sourceId: reference.sourceId,
    version: reference.version,
    ...(reference.checksum === undefined
      ? {}
      : { checksum: reference.checksum }),
  };
}

function deduplicateAgentEvidence(
  evidence: readonly AgentSourceVersionReference[],
): AgentSourceVersionReference[] {
  const unique = new Map<string, AgentSourceVersionReference>();
  for (const reference of evidence) {
    const identity = JSON.stringify([
      reference.sourceType,
      reference.sourceId,
      String(reference.version),
    ]);
    const existing = unique.get(identity);
    if (existing === undefined) {
      unique.set(identity, reference);
      continue;
    }
    if (sourceReferenceKey(existing) === sourceReferenceKey(reference)) {
      continue;
    }
    throw new GovernedProvenanceError(
      `durable result evidence receipt "${identity}" conflicts: "${
        sourceReferenceKey(existing)
      }" and "${sourceReferenceKey(reference)}"; expected one exact checksum`,
    );
  }
  return [...unique.values()];
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
