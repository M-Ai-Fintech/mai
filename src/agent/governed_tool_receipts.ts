import { capabilitySchema } from "./definitions/index.ts";
import type { AgentToolLineage } from "./definitions/index.ts";
import type { GovernedRuntimeReceiptReader } from "./governed_provenance.ts";
import type { GovernedProvenanceVerificationRequest } from "./governed_agent.ts";
import { GovernedProvenanceError } from "./governed_provenance_error.ts";
import {
  capabilityBindingForTool,
  capabilityForTool,
  DURABLE_CAPABILITY_BINDINGS,
  requestedCapabilityMismatch,
  type RuntimeToolReceipt,
} from "./governed_capability_binding.ts";
import type {
  ResultRecord,
  ToolActivityRecord,
} from "../agent_runtime/model.ts";
import type { RuntimeReadResult } from "../agent_runtime/reads.ts";

export async function runtimeToolLineage(
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
  const mismatch = DURABLE_CAPABILITY_BINDINGS[request.capability] === undefined
    ? undefined
    : requestedCapabilityMismatch(request.capability, result, receipts);
  if (mismatch !== undefined) throw new GovernedProvenanceError(mismatch);
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
  assertActivityBinding(activity, request, result, activityId);
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
  return {
    name: activity.toolName,
    activityId: activity.activityId,
    action: activity.action,
    ...capabilityForTool(activity.toolName, activity.action),
    status: "succeeded",
  };
}

function assertActivityBinding(
  activity: ToolActivityRecord,
  request: GovernedProvenanceVerificationRequest,
  result: ResultRecord,
  activityId: string,
): void {
  if (
    activity.activityId === activityId &&
    activity.runId === request.execution.runId &&
    activity.runId === result.runId
  ) return;
  throw new GovernedProvenanceError(
    `tool activity "${activityId}" belongs to another run or result binding`,
  );
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

function assertUnique(values: readonly unknown[], label: string): void {
  if (
    values.every((value) => typeof value === "string") &&
    new Set(values).size === values.length
  ) return;
  throw new GovernedProvenanceError(
    `${label} lineage contains a duplicate or malformed value`,
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
