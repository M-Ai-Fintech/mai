import type {
  AggregateVersion,
  CorrelationId,
  IdempotencyKey,
  JobId,
  OperationId,
} from "../platform/api/v1.ts";
import type {
  ActorId,
  DealId,
  TenantId,
  WorkspaceId,
} from "../platform/api/v1.ts";
import type {
  DurableJob,
  JobInputVersionReference,
} from "../platform/jobs/v1.ts";
import type {
  ValuationInputId,
  ValuationModelId,
  ValuationScenarioId,
} from "./ids.ts";
import { ValuationError } from "./errors.ts";

export const VALUATION_COMPUTE_JOB_TYPE = "valuation.compute";

export interface ValuationComputePayload {
  readonly scenarioId: ValuationScenarioId;
  readonly inputId: ValuationInputId;
  readonly modelId: ValuationModelId;
  readonly modelVersion: AggregateVersion;
  readonly scenarioVersion: AggregateVersion;
  readonly inputVersion: AggregateVersion;
  readonly method: string;
  readonly input: unknown;
  readonly basisDigest: string;
}

export function createValuationComputeJob(input: {
  readonly jobId: JobId;
  readonly operationId: OperationId;
  readonly tenantId: TenantId;
  readonly workspaceId: WorkspaceId;
  readonly dealId: DealId;
  readonly initiatingActorId: ActorId;
  readonly authoritySnapshotReference?: string;
  readonly correlationId: CorrelationId;
  readonly idempotencyKey: IdempotencyKey;
  readonly payload: ValuationComputePayload;
  readonly createdAt: Date;
  readonly timeoutAt: Date;
}): DurableJob {
  if (input.timeoutAt <= input.createdAt) {
    throw new ValuationError(
      "INVALID_INPUT",
      `Valuation compute job "${input.jobId}" timeout "${input.timeoutAt.toISOString()}" is not after creation; expected a future deadline.`,
    );
  }
  const references: readonly JobInputVersionReference[] = [
    {
      aggregateType: "valuation_scenario",
      aggregateId: input.payload.scenarioId,
      version: input.payload.scenarioVersion,
    },
    {
      aggregateType: "valuation_input",
      aggregateId: input.payload.inputId,
      version: input.payload.inputVersion,
    },
    {
      aggregateType: "valuation_model",
      aggregateId: input.payload.modelId,
      version: input.payload.modelVersion,
    },
  ];
  return {
    jobId: input.jobId,
    operationId: input.operationId,
    jobType: VALUATION_COMPUTE_JOB_TYPE,
    schemaVersion: 1,
    tenantId: input.tenantId,
    workspaceId: input.workspaceId,
    dealId: input.dealId,
    initiatingActorId: input.initiatingActorId,
    authoritySnapshotReference: input.authoritySnapshotReference,
    correlationId: input.correlationId,
    idempotencyKey: input.idempotencyKey,
    inputVersionReferences: references,
    payload: Object.freeze({ ...input.payload }),
    timeoutAt: new Date(input.timeoutAt),
    createdAt: new Date(input.createdAt),
  };
}

export function parseValuationComputePayload(
  payload: Readonly<Record<string, unknown>>,
): ValuationComputePayload {
  if (
    typeof payload.scenarioId !== "string" ||
    typeof payload.inputId !== "string" ||
    typeof payload.modelId !== "string" ||
    typeof payload.modelVersion !== "number" ||
    !Number.isSafeInteger(payload.modelVersion) ||
    typeof payload.method !== "string" ||
    typeof payload.basisDigest !== "string" ||
    typeof payload.input !== "object" || payload.input === null
  ) {
    throw new ValuationError(
      "JOB_FAILED",
      "Valuation compute job payload is incomplete; expected exact scenario, input, model, method, basis, and calculation input fields.",
    );
  }
  return payload as unknown as ValuationComputePayload;
}
