import type {
  AgentDefinition,
  AgentDefinitionId,
  AgentProposalResult,
  DefinitionCatalog,
  HumanOnlyEffect,
  VerifiedAgentLineage,
} from "./definitions/index.ts";
import {
  capabilitySchema,
  createAgentProposalResult,
  createUnavailableAgentResult,
} from "./definitions/index.ts";
import { GovernedProvenanceError } from "./governed_provenance.ts";
import {
  canonicalizePostParseData,
  canonicalizePostParseRecord,
} from "./definitions/post_parse_data_policy.ts";
import type {
  ResultRecord,
  RuntimeActor,
  RuntimeScope,
} from "../agent_runtime/model.ts";
import type { RunId } from "../agent_runtime/ids.ts";
import type { RequestContext } from "../shared/contracts/request_context.ts";

export {
  AgentRuntimeProvenanceVerifier,
  GovernedProvenanceError,
} from "./governed_provenance.ts";
export type { GovernedRuntimeReceiptReader } from "./governed_provenance.ts";

export interface GovernedExecutionContext {
  readonly context: RequestContext;
  readonly actor: RuntimeActor;
  readonly scope: RuntimeScope;
  readonly runId: RunId;
}

export interface GovernedExecutionBinding extends GovernedExecutionContext {
  readonly definition: {
    readonly id: AgentDefinitionId;
    readonly version: string;
  };
}

export interface GovernedProposalRequest {
  readonly definition: AgentDefinition;
  readonly execution: GovernedExecutionBinding;
  readonly input: unknown;
  readonly capability: string;
}

/**
 * The proposal adapter may return only an opaque durable result binding.
 * Values and lineage are read from AgentRuntime after authorization.
 */
export type GovernedProposalResponse =
  | {
    readonly status: "proposed";
    readonly resultId: string;
  }
  | {
    readonly status: "unavailable" | "denied";
    readonly capability: string;
    readonly reason: string;
  };

export interface GovernedProposalPort {
  propose(
    request: GovernedProposalRequest,
  ): Promise<GovernedProposalResponse>;
}

export interface GovernedProvenanceVerificationRequest {
  readonly execution: GovernedExecutionBinding;
  /** Capability requested by the caller and proven by the durable receipt. */
  readonly capability: string;
  readonly definition: Pick<
    AgentDefinition,
    | "id"
    | "version"
    | "prompt"
    | "modelPolicy"
    | "toolReferences"
    | "calculationBindings"
  >;
  readonly resultId: string;
}

export interface GovernedVerifiedProvenance {
  readonly execution: GovernedExecutionBinding;
  readonly result: ResultRecord;
  readonly lineage: VerifiedAgentLineage;
}

export interface GovernedProvenanceVerifier {
  /** Reads and verifies the exact durable result for the bound execution. */
  verify(
    request: GovernedProvenanceVerificationRequest,
  ): Promise<GovernedVerifiedProvenance>;
}

export interface GovernedAgentRequest {
  readonly input: unknown;
  readonly capability: unknown;
}

export class GovernedSpecialistAgent {
  readonly definition: AgentDefinition;
  private readonly execution: GovernedExecutionBinding;

  constructor(
    definition: AgentDefinition,
    private readonly proposals: GovernedProposalPort,
    private readonly provenance: GovernedProvenanceVerifier,
    execution: GovernedExecutionContext,
  ) {
    this.definition = definition;
    this.execution = bindExecution(definition, execution);
  }

  /** Proposes one validated, non-authoritative artifact. */
  async propose(request: GovernedAgentRequest): Promise<AgentProposalResult> {
    const capability = validCapability(request.capability);
    if (capability === undefined) {
      return malformedCapabilityResult(this.definition, request.capability);
    }
    const admission = capabilityAdmission(this.definition, capability);
    if (admission !== undefined) return admission;
    const canonicalInput = canonicalizePostParseData(request.input, "input");
    const parsedInput = this.definition.inputValidator.parse(canonicalInput);
    const input = canonicalizePostParseData(parsedInput, "input.parsed");
    const response = await this.proposals.propose({
      definition: this.definition,
      execution: this.execution,
      input,
      capability,
    });
    return await resultFromResponse(
      this.definition,
      this.execution,
      this.provenance,
      capability,
      response,
    );
  }
}

export function createGovernedSpecialist(
  catalog: DefinitionCatalog,
  id: AgentDefinitionId,
  proposals: GovernedProposalPort,
  provenance: GovernedProvenanceVerifier,
  execution: GovernedExecutionContext,
  version?: string,
): GovernedSpecialistAgent {
  const definition = version === undefined
    ? catalog.current(id)
    : catalog.select(id, version);
  return new GovernedSpecialistAgent(
    definition,
    proposals,
    provenance,
    execution,
  );
}

function capabilityAdmission(
  definition: AgentDefinition,
  capability: string,
): AgentProposalResult | undefined {
  const unavailable = definition.unavailableCapabilities.find((entry) =>
    entry.capability === capability
  );
  if (unavailable !== undefined) {
    return createUnavailableAgentResult(
      definition,
      capability,
      unavailable.reason,
    );
  }
  const denied = definition.deniedCapabilities.find((entry) =>
    entry.capability === capability
  );
  if (denied !== undefined) {
    return createUnavailableAgentResult(
      definition,
      capability,
      denied.reason,
      "denied",
    );
  }
  if (definition.prohibitedEffects.includes(capability as HumanOnlyEffect)) {
    return createUnavailableAgentResult(
      definition,
      capability,
      "Human-only effects require a separate authorized command.",
      "denied",
    );
  }
  return definition.allowedCapabilities.includes(capability)
    ? undefined
    : createUnavailableAgentResult(
      definition,
      capability,
      "Capability is not present in the selected definition allow-list.",
      "denied",
    );
}

async function resultFromResponse(
  definition: AgentDefinition,
  execution: GovernedExecutionBinding,
  provenance: GovernedProvenanceVerifier,
  capability: string,
  response: GovernedProposalResponse,
): Promise<AgentProposalResult> {
  if (response.status !== "proposed") {
    const capability = validCapability(response.capability) ??
      "unknown.capability";
    const reason = typeof response.reason === "string" && response.reason.trim()
      ? response.reason
      : "Proposal capability returned an invalid reason; expected non-empty text.";
    return createUnavailableAgentResult(
      definition,
      capability,
      reason,
      response.status,
    );
  }
  const resultId = exactResultId(response.resultId);
  const verified = await provenance.verify({
    execution,
    capability,
    definition: {
      id: definition.id,
      version: definition.version,
      prompt: definition.prompt,
      modelPolicy: definition.modelPolicy,
      toolReferences: definition.toolReferences,
      calculationBindings: definition.calculationBindings,
    },
    resultId,
  });
  assertVerifiedProvenance(
    definition,
    execution,
    capability,
    resultId,
    verified,
  );
  const durableValue = canonicalizePostParseRecord(
    verified.result.value,
    `result.${resultId}.value`,
  );
  const parsedValue = definition.outputValidator.parse(durableValue);
  const value = canonicalizePostParseRecord(parsedValue, "output.parsed");
  return createAgentProposalResult(
    definition,
    {
      value,
      kind: verified.result.kind === "proposal"
        ? "proposal"
        : "reversible_draft",
    },
    verified.lineage,
  );
}

function exactResultId(resultId: unknown): string {
  if (
    typeof resultId !== "string" || resultId.length === 0 ||
    resultId.trim() !== resultId
  ) {
    throw new GovernedProvenanceError(
      "proposal result binding is malformed; expected one exact durable result ID",
    );
  }
  return resultId;
}

function assertVerifiedProvenance(
  definition: AgentDefinition,
  execution: GovernedExecutionBinding,
  capability: string,
  resultId: string,
  verified: GovernedVerifiedProvenance,
): void {
  if (
    !isRecord(verified) || !isRecord(verified.execution) ||
    !isRecord(verified.result) || !isRecord(verified.lineage)
  ) {
    throw new GovernedProvenanceError(
      "verifier returned a malformed durable result or lineage binding",
    );
  }
  if (!sameExecution(execution, verified.execution)) {
    throw new GovernedProvenanceError(
      "verifier returned a cross-scope, cross-run, actor-mismatched, or definition-mismatched binding",
    );
  }
  const result = verified.result;
  if (
    !isRecord(result) || result.resultId !== resultId ||
    result.runId !== execution.runId
  ) {
    throw new GovernedProvenanceError(
      `verifier returned result "${resultId}" with a mismatched durable binding`,
    );
  }
  if (result.kind !== "proposal" && result.kind !== "reversible_draft") {
    throw new GovernedProvenanceError(
      `durable result "${resultId}" has unsupported kind "${
        String(result.kind)
      }"`,
    );
  }
  if (!isRecord(result.value)) {
    throw new GovernedProvenanceError(
      `durable result "${resultId}" has a malformed value; expected a record`,
    );
  }
  assertDurableIdentity(definition, resultId, result, capability);
  const model = verified.lineage.model;
  if (!isRecord(model)) {
    throw new GovernedProvenanceError(
      `durable result "${resultId}" has malformed model lineage`,
    );
  }
  const expected = definition.modelPolicy;
  if (
    model.policyReference !== expected.policyReference ||
    model.provider !== expected.provider ||
    model.model !== expected.model ||
    model.modelVersion !== expected.modelVersion
  ) {
    throw new GovernedProvenanceError(
      `model receipt "${model.provider}/${model.model}@${model.modelVersion}" does not match definition policy "${expected.provider}/${expected.model}@${expected.modelVersion}"`,
    );
  }
  if (
    !Array.isArray(verified.lineage.tools) ||
    !Array.isArray(verified.lineage.evidence)
  ) {
    throw new GovernedProvenanceError(
      "verified lineage lists are malformed; expected durable receipt lists",
    );
  }
}

function assertDurableIdentity(
  definition: AgentDefinition,
  resultId: string,
  result: ResultRecord,
  capability: string,
): void {
  const lineage = result.lineage;
  if (!isRecord(lineage)) {
    throw new GovernedProvenanceError(
      `durable result "${resultId}" has a malformed identity receipt; expected durable lineage`,
    );
  }
  const model = lineage.model;
  const prompt = lineage.prompt;
  if (
    !isRecord(lineage.definition) ||
    lineage.definition.id !== definition.id ||
    lineage.definition.version !== definition.version ||
    lineage.definitionId !== definition.id ||
    lineage.definitionVersion !== definition.version ||
    lineage.modelPolicyReference !== definition.modelPolicy.policyReference ||
    !isRecord(model) ||
    model.policyReference !== definition.modelPolicy.policyReference ||
    !isRecord(prompt) ||
    prompt.templateReference !== definition.prompt.templateReference ||
    prompt.templateVersion !== definition.prompt.templateVersion ||
    prompt.promptDigest !== definition.prompt.promptDigest ||
    lineage.capability !== undefined && lineage.capability !== capability
  ) {
    throw new GovernedProvenanceError(
      `durable result "${resultId}" identity receipt does not match requested definition or capability`,
    );
  }
}

function malformedCapabilityResult(
  definition: AgentDefinition,
  capability: unknown,
): AgentProposalResult {
  const received = typeof capability === "string"
    ? `string ${JSON.stringify(capability)}`
    : typeof capability;
  return createUnavailableAgentResult(
    definition,
    "unknown.capability",
    `Capability ${received} is malformed; expected a lowercase capability name.`,
    "denied",
  );
}

function validCapability(value: unknown): string | undefined {
  const parsed = capabilitySchema.safeParse(value);
  return parsed.success ? parsed.data : undefined;
}

function bindExecution(
  definition: AgentDefinition,
  execution: GovernedExecutionContext,
): GovernedExecutionBinding {
  if (execution.context.actorId !== execution.actor.actorId) {
    throw new GovernedProvenanceError(
      "execution actor does not match context actor",
    );
  }
  if (!sameScope(execution.context, execution.scope)) {
    throw new GovernedProvenanceError(
      "execution scope does not match request context",
    );
  }
  if (typeof execution.runId !== "string" || !execution.runId.trim()) {
    throw new GovernedProvenanceError("execution run ID is empty");
  }
  return Object.freeze({
    context: Object.freeze({ ...execution.context }),
    actor: Object.freeze({ ...execution.actor }),
    scope: Object.freeze({ ...execution.scope }),
    runId: execution.runId,
    definition: Object.freeze({
      id: definition.id,
      version: definition.version,
    }),
  });
}

function sameExecution(
  left: GovernedExecutionBinding,
  right: GovernedExecutionBinding,
): boolean {
  return left.runId === right.runId && sameActor(left.actor, right.actor) &&
    sameScope(left.scope, right.scope) &&
    left.definition.id === right.definition.id &&
    left.definition.version === right.definition.version;
}

function sameScope(
  left:
    | Pick<RuntimeScope, "tenantId" | "workspaceId" | "dealId">
    | RequestContext,
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
