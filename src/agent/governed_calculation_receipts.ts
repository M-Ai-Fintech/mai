import type {
  CalculationBinding,
  CalculationLineage,
} from "./definitions/index.ts";
import type {
  GovernedExecutionBinding,
  GovernedProvenanceVerificationRequest,
} from "./governed_agent.ts";
import { calculationBindingFor } from "./governed_capability_binding.ts";
import {
  type DurableStepClaims,
  readDurableStepClaims,
} from "./governed_step_receipts.ts";
import type { ResultRecord, StepRecord } from "../agent_runtime/model.ts";
import type { AgentRuntimeReadService } from "../agent_runtime/reads.ts";

export type GovernedStepReader = Pick<AgentRuntimeReadService, "getStep">;

export interface DurableStepReceipt {
  readonly step: StepRecord;
  readonly claims: DurableStepClaims;
}

export class DurableStepReceiptError extends Error {}

export async function readDurableStep(
  reads: GovernedStepReader,
  execution: GovernedExecutionBinding,
  result: ResultRecord,
): Promise<DurableStepReceipt> {
  const receipt = await reads.getStep(
    execution.context,
    execution.actor,
    result.stepId,
  );
  if (receipt.kind !== "loaded") {
    throw new DurableStepReceiptError(
      "durable step receipt is unavailable or unauthorized",
    );
  }
  assertStepIdentity(receipt.value, result, execution);
  try {
    return {
      step: receipt.value,
      claims: readDurableStepClaims(receipt.value),
    };
  } catch (error) {
    throw new DurableStepReceiptError(
      error instanceof Error
        ? error.message
        : "durable step claims are malformed",
    );
  }
}

export function assertStepClaims(
  receipt: DurableStepReceipt,
  request: GovernedProvenanceVerificationRequest,
): void {
  const { claims } = receipt;
  if (
    claims.definition.id !== request.definition.id ||
    claims.definition.version !== request.definition.version ||
    claims.capability !== request.capability ||
    claims.modelPolicyReference !==
      request.definition.modelPolicy.policyReference ||
    claims.prompt.templateReference !==
      request.definition.prompt.templateReference ||
    claims.prompt.templateVersion !==
      request.definition.prompt.templateVersion ||
    claims.prompt.promptDigest !== request.definition.prompt.promptDigest
  ) {
    throw new DurableStepReceiptError(
      "durable step claims do not match the requested definition, capability, prompt, or model policy",
    );
  }
}

export function calculationLineage(
  receipt: DurableStepReceipt,
  request: GovernedProvenanceVerificationRequest,
  result: ResultRecord,
): CalculationLineage | undefined {
  const binding = calculationBindingFor(request.definition, request.capability);
  if (binding === undefined) return undefined;
  const { step, claims } = receipt;
  if (step.kind !== "compute") {
    throw new DurableStepReceiptError(
      `calculation result "${result.resultId}" is bound to step "${step.stepId}" of kind "${step.kind}"; expected compute`,
    );
  }
  if (
    step.name !== binding.operation || step.action !== binding.action ||
    claims.calculation === undefined ||
    !sameBinding(claims.calculation, binding) ||
    claims.capability !== binding.capability
  ) {
    throw new DurableStepReceiptError(
      `calculation result "${result.resultId}" lacks the exact pure operation receipt for capability "${request.capability}"`,
    );
  }
  return { ...binding, stepId: step.stepId };
}

function assertStepIdentity(
  step: StepRecord,
  result: ResultRecord,
  execution: GovernedExecutionBinding,
): void {
  if (
    step.stepId !== result.stepId || step.runId !== result.runId ||
    result.runId !== execution.runId || step.resultId !== result.resultId ||
    step.state !== "succeeded"
  ) {
    throw new DurableStepReceiptError(
      `durable step "${step.stepId}" does not prove result "${result.resultId}" for run "${execution.runId}"`,
    );
  }
}

function sameBinding(
  left: DurableStepClaims["calculation"],
  right: CalculationBinding,
): boolean {
  return left !== undefined && left.capability === right.capability &&
    left.purePort === right.purePort && left.operation === right.operation &&
    left.action === right.action;
}
