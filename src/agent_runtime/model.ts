import type { AggregateVersion } from "../shared/contracts/aggregate_version.ts";
import type {
  ActorId,
  CorrelationId,
  DealId,
  TenantId,
  WorkspaceId,
} from "../shared/contracts/identifiers.ts";
import type { RequestContext } from "../shared/contracts/request_context.ts";
import type {
  ArtifactId,
  MissionId,
  PlanId,
  ResultId,
  RunId,
  StepId,
  ToolActivityId,
} from "./ids.ts";
import {
  assertSourceVersionReceipt,
  sourceVersionKey,
} from "./source_version_receipts.ts";
export {
  assertSourceVersionReceipt,
  isLowercaseSha256Checksum,
  sourceVersionKey,
} from "./source_version_receipts.ts";

export interface RuntimeScope {
  readonly tenantId: TenantId;
  readonly workspaceId: WorkspaceId;
  readonly dealId: DealId;
}

export interface RuntimeActor {
  readonly actorId: ActorId;
  readonly kind: "human" | "ai" | "service";
  readonly state: "active" | "inactive" | "revoked";
}

export interface RuntimeAuthority {
  readonly snapshotReference: string;
  readonly decisionReference: string;
  readonly checkedAt: Date;
}

export interface SourceVersionReference {
  readonly sourceType: string;
  readonly sourceId: string;
  /** Exact numeric or semantic source identity; never normalize a source to a fake number. */
  readonly version: number | string;
  readonly checksum?: string;
}

export interface PlanStepDefinition {
  readonly ordinal: number;
  readonly name: string;
  readonly kind: "tool" | "model" | "compute";
  readonly toolName?: string;
  readonly action?: string;
  readonly resourceKind?: string;
  readonly resourceId?: string;
  readonly sourceVersions: readonly SourceVersionReference[];
  readonly input: Readonly<Record<string, unknown>>;
}

export interface PromptLineage {
  readonly templateReference: string;
  readonly templateVersion: string;
  readonly promptDigest: string;
}

export type RuntimeCalculationLineage = Record<
  "capability" | "purePort" | "operation" | "action" | "stepId",
  string
>;

export interface ModelMetadata {
  readonly provider: string;
  readonly model: string;
  readonly modelVersion: string;
  /** Durable policy receipt when a governed definition selects the model. */
  readonly policyReference?: string;
  readonly responseReference?: string;
}

export interface CostMetadata {
  readonly currency: string;
  readonly inputTokens: number;
  readonly outputTokens: number;
  readonly inputCost: number;
  readonly outputCost: number;
  readonly totalCost: number;
}

export interface RuntimeLineage {
  /** Durable definition identity selected for this result. */
  readonly definition?: {
    readonly id: string;
    readonly version: string;
  };
  /** Stable aliases retained for JSON consumers of the result lineage. */
  readonly definitionId?: string;
  readonly definitionVersion?: string;
  readonly modelPolicyReference?: string;
  /** Capability persisted by a non-tool executor when no tool proves it. */
  readonly capability?: string;
  readonly prompt?: PromptLineage;
  readonly model?: ModelMetadata;
  readonly calculation?: RuntimeCalculationLineage;
  readonly toolActivityIds: readonly ToolActivityId[];
  readonly evidence: readonly SourceVersionReference[];
}

export type MissionState =
  | "draft"
  | "active"
  | "cancelled"
  | "completed"
  | "failed";
export type PlanState = "proposed" | "active" | "superseded" | "cancelled";
export type RunState =
  | "queued"
  | "running"
  | "retry_scheduled"
  | "succeeded"
  | "failed"
  | "cancelled"
  | "invalidated"
  | "dead_lettered";
export type StepState =
  | "queued"
  | "running"
  | "retry_scheduled"
  | "succeeded"
  | "failed"
  | "cancelled"
  | "invalidated";

export interface MissionRecord {
  readonly missionId: MissionId;
  readonly scope: RuntimeScope;
  readonly actor: RuntimeActor;
  readonly objective: string;
  readonly state: MissionState;
  readonly aggregateVersion: AggregateVersion;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface PlanRecord {
  readonly planId: PlanId;
  readonly missionId: MissionId;
  readonly scope: RuntimeScope;
  readonly actor: RuntimeActor;
  readonly version: number;
  readonly state: PlanState;
  readonly steps: readonly PlanStepDefinition[];
  readonly sourceVersions: readonly SourceVersionReference[];
  readonly createdAt: Date;
}

export interface RunRecord {
  readonly runId: RunId;
  readonly missionId: MissionId;
  readonly planId: PlanId;
  readonly planVersion: number;
  readonly scope: RuntimeScope;
  readonly actor: RuntimeActor;
  readonly correlationId: CorrelationId;
  readonly state: RunState;
  readonly aggregateVersion: AggregateVersion;
  readonly sourceVersions: readonly SourceVersionReference[];
  readonly model?: ModelMetadata;
  readonly costLimit?: number;
  readonly cost: CostMetadata;
  readonly attemptCount: number;
  readonly failure?: string;
  readonly cancellationRequestedAt?: Date;
  readonly nextAttemptAt?: Date;
  readonly leaseOwner?: string;
  readonly leaseExpiresAt?: Date;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface ClaimedRun extends RunRecord {
  readonly state: "running";
  readonly attemptNumber: number;
  readonly workerId: string;
  readonly attemptStartedAt: Date;
  readonly leaseExpiresAt: Date;
}

export interface StepRecord {
  readonly stepId: StepId;
  readonly runId: RunId;
  readonly ordinal: number;
  readonly name: string;
  readonly kind: PlanStepDefinition["kind"];
  readonly toolName?: string;
  readonly action?: string;
  readonly resourceKind?: string;
  readonly resourceId?: string;
  readonly input: Readonly<Record<string, unknown>>;
  readonly sourceVersions: readonly SourceVersionReference[];
  readonly state: StepState;
  readonly attemptCount: number;
  readonly resultId?: ResultId;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface ToolActivityRecord {
  readonly activityId: ToolActivityId;
  readonly runId: RunId;
  readonly stepId: StepId;
  readonly toolName: string;
  readonly action: string;
  readonly resourceKind: string;
  readonly resourceId: string;
  readonly requestDigest: string;
  readonly state:
    | "requested"
    | "authorized"
    | "denied"
    | "started"
    | "succeeded"
    | "failed";
  readonly authority?: RuntimeAuthority;
  readonly denialReason?: string;
  readonly createdAt: Date;
  readonly completedAt?: Date;
}

export interface ResultRecord {
  readonly resultId: ResultId;
  readonly runId: RunId;
  readonly stepId: StepId;
  readonly kind: "read" | "proposal" | "reversible_draft" | "calculation";
  readonly value: Readonly<Record<string, unknown>>;
  readonly lineage: RuntimeLineage;
  readonly cost: CostMetadata;
  readonly createdAt: Date;
}

export interface ArtifactRecord {
  readonly artifactId: ArtifactId;
  readonly resultId: ResultId;
  readonly runId: RunId;
  readonly stepId: StepId;
  readonly artifactType: string;
  readonly contentReference: string;
  readonly contentDigest: string;
  readonly state: "draft" | "proposed" | "stale";
  readonly sourceVersions: readonly SourceVersionReference[];
  readonly createdAt: Date;
}

export interface RuntimeAttemptRecord {
  readonly attemptId: string;
  readonly scope: "run" | "step";
  readonly subjectId: RunId | StepId;
  readonly runId: RunId;
  readonly attemptNumber: number;
  readonly recordKind: "started" | "completed";
  readonly workerId: string;
  readonly leaseExpiresAt: Date;
  readonly startedAt: Date;
  readonly completedAt?: Date;
  readonly outcome?: string;
  readonly failure?: string;
}

export class RuntimeTransitionError extends Error {
  readonly code = "INVALID_RUNTIME_TRANSITION";

  constructor(subject: string, from: string, to: string) {
    super(
      `Runtime transition for "${subject}" from "${from}" to "${to}" is invalid; expected an allowed state transition.`,
    );
    this.name = "RuntimeTransitionError";
  }
}

export class SourceVersionInvalidatedError extends Error {
  readonly code = "SOURCE_VERSION_INVALIDATED";

  constructor(reference: SourceVersionReference) {
    super(
      `Source "${reference.sourceType}:${reference.sourceId}" version "${reference.version}" is stale; expected the exact recorded source version.`,
    );
    this.name = "SourceVersionInvalidatedError";
  }
}

export class RuntimeLeaseLostError extends Error {
  readonly code = "RUNTIME_LEASE_LOST";

  constructor(runId: RunId, workerId: string) {
    super(
      `Run "${runId}" lease for worker "${workerId}" is no longer active; expected the current fenced attempt.`,
    );
    this.name = "RuntimeLeaseLostError";
  }
}

export class RuntimeScopeRequiredError extends Error {
  readonly code = "RUNTIME_SCOPE_REQUIRED";

  constructor(context: RequestContext) {
    super(
      `Runtime operations require tenant/workspace/deal scope; received "${context.tenantId}/${
        context.workspaceId ?? ""
      }/${context.dealId ?? ""}" with a missing required identifier.`,
    );
    this.name = "RuntimeScopeRequiredError";
  }
}

export function runtimeScopeFromContext(context: RequestContext): RuntimeScope {
  if (context.workspaceId === undefined || context.dealId === undefined) {
    throw new RuntimeScopeRequiredError(context);
  }
  return {
    tenantId: context.tenantId,
    workspaceId: context.workspaceId,
    dealId: context.dealId,
  };
}

export function assertRuntimeContext(
  context: RequestContext,
  scope: RuntimeScope,
): void {
  if (
    context.tenantId === scope.tenantId &&
    context.workspaceId === scope.workspaceId &&
    context.dealId === scope.dealId
  ) return;
  throw new Error(
    `Runtime context scope "${context.tenantId}/${context.workspaceId ?? ""}/${
      context.dealId ?? ""
    }" does not match scope "${scope.tenantId}/${scope.workspaceId}/${scope.dealId}"; expected the trusted actor scope.`,
  );
}

export function assertRunTransition(from: RunState, to: RunState): void {
  assertTransition("run", from, to, RUN_TRANSITIONS);
}

export function assertStepTransition(from: StepState, to: StepState): void {
  assertTransition("step", from, to, STEP_TRANSITIONS);
}

export function assertPlanTransition(from: PlanState, to: PlanState): void {
  assertTransition("plan", from, to, PLAN_TRANSITIONS);
}

export function sourceVersionIdentityKey(
  reference: SourceVersionReference,
): string {
  return JSON.stringify([
    reference.sourceType,
    reference.sourceId,
    reference.version,
  ]);
}

export function deduplicateSourceVersions(
  references: readonly SourceVersionReference[],
): readonly SourceVersionReference[] {
  const unique = new Map<string, SourceVersionReference>();
  for (const reference of references) {
    assertSourceVersionReceipt(reference);
    const identity = sourceVersionIdentityKey(reference);
    const existing = unique.get(identity);
    if (existing === undefined) {
      unique.set(identity, reference);
      continue;
    }
    if (sameSourceVersionReceipt(existing, reference)) continue;
    throw new Error(
      `Source version receipt "${identity}" conflicts: "${
        sourceVersionKey(existing)
      }" and "${sourceVersionKey(reference)}"; expected one exact checksum.`,
    );
  }
  return [...unique.values()];
}

function sameSourceVersionReceipt(
  left: SourceVersionReference,
  right: SourceVersionReference,
): boolean {
  return sameSourceVersion(left, right) &&
    JSON.stringify(receiptMetadata(left)) ===
      JSON.stringify(receiptMetadata(right));
}

function receiptMetadata(reference: SourceVersionReference): unknown {
  const value = reference as unknown as Record<string, unknown>;
  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) =>
        key !== "sourceType" && key !== "sourceId" && key !== "version" &&
        key !== "checksum"
      )
      .sort(([left], [right]) => left.localeCompare(right)),
  );
}

export function sameSourceVersion(
  left: SourceVersionReference,
  right: SourceVersionReference,
): boolean {
  return sourceVersionKey(left) === sourceVersionKey(right);
}

export function assertCostMetadata(cost: CostMetadata): void {
  if (!/^[A-Z]{3}$/.test(cost.currency)) {
    throw new Error(
      `Runtime cost currency "${cost.currency}" is invalid; expected an ISO-style three-letter code.`,
    );
  }
  assertNonNegativeInteger(cost.inputTokens, "input tokens");
  assertNonNegativeInteger(cost.outputTokens, "output tokens");
  assertNonNegativeNumber(cost.inputCost, "input cost");
  assertNonNegativeNumber(cost.outputCost, "output cost");
  assertNonNegativeNumber(cost.totalCost, "total cost");
  if (cost.totalCost >= cost.inputCost + cost.outputCost) return;
  throw new Error(
    `Runtime total cost "${cost.totalCost}" is invalid; expected at least the input and output cost sum.`,
  );
}

const RUN_TRANSITIONS: Readonly<Record<RunState, readonly RunState[]>> = {
  queued: ["running", "cancelled"],
  running: [
    "retry_scheduled",
    "succeeded",
    "failed",
    "cancelled",
    "invalidated",
    "dead_lettered",
  ],
  retry_scheduled: ["running", "cancelled", "dead_lettered"],
  succeeded: [],
  failed: [],
  cancelled: [],
  invalidated: [],
  dead_lettered: [],
};

const STEP_TRANSITIONS: Readonly<Record<StepState, readonly StepState[]>> = {
  queued: ["running", "cancelled", "invalidated"],
  running: [
    "retry_scheduled",
    "succeeded",
    "failed",
    "cancelled",
    "invalidated",
  ],
  retry_scheduled: ["running", "cancelled", "invalidated"],
  succeeded: [],
  failed: [],
  cancelled: [],
  invalidated: [],
};

const PLAN_TRANSITIONS: Readonly<Record<PlanState, readonly PlanState[]>> = {
  proposed: ["active", "cancelled", "superseded"],
  active: ["superseded", "cancelled"],
  superseded: [],
  cancelled: [],
};

function assertTransition<T extends string>(
  subject: string,
  from: T,
  to: T,
  transitions: Readonly<Record<T, readonly T[]>>,
): void {
  if (transitions[from].includes(to)) return;
  throw new RuntimeTransitionError(subject, from, to);
}

function assertNonNegativeInteger(value: number, label: string): void {
  if (Number.isSafeInteger(value) && value >= 0) return;
  throw new Error(
    `Runtime ${label} "${value}" is invalid; expected a non-negative safe integer.`,
  );
}

function assertNonNegativeNumber(value: number, label: string): void {
  if (Number.isFinite(value) && value >= 0) return;
  throw new Error(
    `Runtime ${label} "${value}" is invalid; expected a finite non-negative number.`,
  );
}
