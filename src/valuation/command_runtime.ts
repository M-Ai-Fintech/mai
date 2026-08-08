import type { ActorReference } from "../platform/authz/v1.ts";
import type {
  AggregateVersion,
  IdempotencyKey,
  RequestContext,
} from "../platform/api/v1.ts";
import { parseJobId } from "../platform/api/v1.ts";
import {
  type Clock,
  IdempotencyRepository,
  type TransactionHandle,
} from "../platform/persistence/v1.ts";
import {
  type ClaimedJob,
  type DurableJob,
  JobRepository,
  sanitizedJobFailure,
} from "../platform/jobs/v1.ts";
import type {
  ApproveValuationCommand,
  EnqueueValuationComputeCommand,
  InvalidateValuationCommand,
  ValuationCommandServiceConfig,
} from "./commands.ts";
import type { ValuationEffectInput, ValuationEffects } from "./effects.ts";
import type {
  ValuationApproval,
  ValuationInput,
  ValuationInvalidation,
  ValuationModel,
  ValuationResult,
  ValuationScenario,
} from "./model.ts";
import type {
  ValuationInputId,
  ValuationModelId,
  ValuationResultId,
  ValuationScenarioId,
} from "./ids.ts";
import { sameScope, type ValuationScope } from "./basis.ts";
import { ValuationError } from "./errors.ts";
import { claimValuationCommand } from "./command_support.ts";
import {
  parseValuationApprovalId,
  parseValuationInvalidationId,
} from "./ids.ts";
import { VALUATION_COMPUTE_JOB_TYPE } from "./jobs.ts";

export interface ValuationCommandRuntime {
  readonly config: ValuationCommandServiceConfig;
  readonly effects: ValuationEffects;
  readonly idempotency: IdempotencyRepository;
  readonly jobs: JobRepository;
  readonly clock: Clock;
}

export function accepted<T>(
  value: T,
): { readonly status: "accepted"; readonly value: T } {
  return { status: "accepted", value };
}

export function claim(
  runtime: ValuationCommandRuntime,
  transaction: TransactionHandle,
  command: {
    readonly context: RequestContext;
    readonly idempotencyKey: IdempotencyKey;
  },
  commandType: string,
  targetType: string,
  targetId: string,
  payload: unknown,
) {
  return claimValuationCommand({
    transaction,
    idempotency: runtime.idempotency,
    context: command.context,
    idempotencyKey: command.idempotencyKey,
    commandType,
    targetType,
    targetId,
    payload,
    now: runtime.clock.now(),
  });
}

export async function resolveComputeReplay(
  runtime: ValuationCommandRuntime,
  transaction: TransactionHandle,
  scope: ValuationScope,
  command: EnqueueValuationComputeCommand,
  reference: string,
): Promise<DurableJob> {
  const jobId = parseReplayId(reference, "job", parseJobId);
  const job = await runtime.jobs.find(transaction, scope.tenantId, jobId);
  if (job === undefined) {
    invalidReplayReference(reference, "the original compute job");
  }
  assertComputeReplay(job, command, scope, reference);
  return job;
}

export async function resolveApprovalReplay(
  runtime: ValuationCommandRuntime,
  transaction: TransactionHandle,
  scope: ValuationScope,
  command: ApproveValuationCommand,
  reference: string,
): Promise<ValuationApproval> {
  const approvalId = parseReplayId(
    reference,
    "approval",
    parseValuationApprovalId,
  );
  const approval = await runtime.config.repository.findApproval(
    transaction,
    scope,
    approvalId,
  );
  if (approval === undefined) {
    invalidReplayReference(reference, "the original approval");
  }
  assertApprovalReplay(approval, command, scope, reference);
  return approval;
}

export async function resolveInvalidationReplay(
  runtime: ValuationCommandRuntime,
  transaction: TransactionHandle,
  scope: ValuationScope,
  command: InvalidateValuationCommand,
  reference: string,
): Promise<ValuationInvalidation> {
  const invalidationId = parseReplayId(
    reference,
    "invalidation",
    parseValuationInvalidationId,
  );
  const invalidation = await runtime.config.repository.findInvalidation(
    transaction,
    scope,
    invalidationId,
  );
  if (invalidation === undefined) {
    invalidReplayReference(reference, "the original invalidation");
  }
  assertInvalidationReplay(invalidation, command, scope, reference);
  return invalidation;
}

function assertComputeReplay(
  job: DurableJob,
  command: EnqueueValuationComputeCommand,
  scope: ValuationScope,
  reference: string,
): void {
  if (
    job.tenantId === scope.tenantId &&
    job.workspaceId === scope.workspaceId &&
    job.dealId === scope.dealId &&
    job.initiatingActorId === command.actor.id &&
    job.idempotencyKey === command.idempotencyKey &&
    job.operationId === command.operationId &&
    job.jobType === VALUATION_COMPUTE_JOB_TYPE &&
    job.payload.scenarioId === command.scenarioId
  ) return;
  invalidReplayReference(
    reference,
    "the original compute job in the exact command scope",
  );
}

function assertApprovalReplay(
  approval: ValuationApproval,
  command: ApproveValuationCommand,
  scope: ValuationScope,
  reference: string,
): void {
  if (
    sameScope(approval.scope, scope) &&
    approval.scenarioId === command.scenarioId &&
    approval.scenarioVersion === command.expectedScenarioVersion &&
    approval.resultId === command.resultId &&
    sameActor(approval.actor, command.actor) &&
    approval.authority.actorId === command.authority.actorId &&
    sameScope(approval.authority.scope, command.authority.scope) &&
    approval.authority.snapshotId === command.authority.snapshotId &&
    approval.authority.policyVersion === command.authority.policyVersion &&
    sameInstant(approval.authority.capturedAt, command.authority.capturedAt)
  ) return;
  invalidReplayReference(
    reference,
    "the original approval in the exact command scope",
  );
}

function assertInvalidationReplay(
  invalidation: ValuationInvalidation,
  command: InvalidateValuationCommand,
  scope: ValuationScope,
  reference: string,
): void {
  if (
    sameScope(invalidation.scope, scope) &&
    invalidation.scenarioId === command.scenarioId &&
    invalidation.scenarioVersion === command.expectedScenarioVersion &&
    invalidation.resultId === command.resultId &&
    invalidation.kind === command.kind &&
    invalidation.reason === command.reason &&
    invalidation.sourceReference === command.sourceReference &&
    sameActor(invalidation.actor, command.actor)
  ) return;
  invalidReplayReference(
    reference,
    "the original invalidation in the exact command scope",
  );
}

function parseReplayId<T>(
  reference: string,
  prefix: string,
  parser: (
    value: unknown,
  ) => { readonly ok: true; readonly value: T } | { readonly ok: false },
): T {
  const marker = `${prefix}:`;
  if (!reference.startsWith(marker)) {
    return invalidReplayReference(reference, `${prefix}:<typed-id>`);
  }
  const parsed = parser(reference.slice(marker.length));
  if (parsed.ok) return parsed.value;
  return invalidReplayReference(reference, `${prefix}:<typed-id>`);
}

function invalidReplayReference(reference: string, expected: string): never {
  throw new ValuationError(
    "IDEMPOTENCY_CONFLICT",
    `Valuation terminal replay reference "${reference}" is invalid; expected ${expected}.`,
  );
}

function sameActor(left: ActorReference, right: ActorReference): boolean {
  return left.id === right.id && left.kind === right.kind &&
    left.state === right.state;
}

function sameInstant(left: Date, right: Date): boolean {
  return left.getTime() === right.getTime();
}

export async function loadModel(
  runtime: ValuationCommandRuntime,
  transaction: TransactionHandle,
  scope: ValuationScope,
  id: ValuationModelId,
  version?: number,
): Promise<ValuationModel> {
  const model = await runtime.config.repository.findModel(
    transaction,
    scope,
    id,
    version,
  );
  if (model !== undefined) return model;
  throw new ValuationError(
    "PROTECTED_NOT_FOUND",
    `Valuation model "${id}" was not found in the requested scope; expected an authorized exact model version.`,
  );
}

export async function loadScenario(
  runtime: ValuationCommandRuntime,
  transaction: TransactionHandle,
  scope: ValuationScope,
  id: ValuationScenarioId,
  forUpdate = false,
): Promise<ValuationScenario> {
  const scenario = await runtime.config.repository.findScenario(
    transaction,
    scope,
    id,
    forUpdate,
  );
  if (scenario !== undefined) return scenario;
  throw new ValuationError(
    "PROTECTED_NOT_FOUND",
    `Valuation scenario "${id}" was not found in the requested scope; expected an authorized scenario.`,
  );
}

export async function loadInput(
  runtime: ValuationCommandRuntime,
  transaction: TransactionHandle,
  scope: ValuationScope,
  id: ValuationInputId,
  version?: number,
): Promise<ValuationInput> {
  const input = await runtime.config.repository.findInput(
    transaction,
    scope,
    id,
    version,
  );
  if (input !== undefined) return input;
  throw new ValuationError(
    "PROTECTED_NOT_FOUND",
    `Valuation input "${id}" was not found in the requested scope; expected an exact input version.`,
  );
}

export function loadCurrentInput(
  runtime: ValuationCommandRuntime,
  transaction: TransactionHandle,
  scope: ValuationScope,
  scenario: ValuationScenario,
): Promise<ValuationInput> {
  if (
    scenario.currentInputId === undefined ||
    scenario.currentInputVersion === undefined
  ) {
    throw new ValuationError(
      "INVALID_INPUT",
      `Valuation scenario "${scenario.id}" has no current input; expected an exact input before compute.`,
    );
  }
  return loadInput(
    runtime,
    transaction,
    scope,
    scenario.currentInputId,
    scenario.currentInputVersion,
  );
}

export async function loadResult(
  runtime: ValuationCommandRuntime,
  transaction: TransactionHandle,
  scope: ValuationScope,
  id: ValuationResultId,
): Promise<ValuationResult> {
  const result = await runtime.config.repository.findResult(
    transaction,
    scope,
    id,
  );
  if (result !== undefined) return result;
  throw new ValuationError(
    "PROTECTED_NOT_FOUND",
    `Valuation result "${id}" was not found in the requested scope; expected an authorized immutable result.`,
  );
}

export function appendEffect(
  runtime: ValuationCommandRuntime,
  transaction: TransactionHandle,
  context: RequestContext,
  actor: ActorReference,
  scope: ValuationScope,
  aggregate: {
    readonly aggregateType: string;
    readonly id: string;
    readonly version: AggregateVersion;
  },
  eventType: string,
  payload: Readonly<Record<string, unknown>>,
): Promise<void> {
  const input: ValuationEffectInput = {
    context,
    actor,
    scope,
    aggregateType: aggregate.aggregateType,
    aggregateId: aggregate.id,
    aggregateVersion: aggregate.version,
    eventType,
    payload,
    occurredAt: runtime.clock.now(),
  };
  return runtime.effects.append(transaction, input);
}

export function assertVersion(
  current: number,
  expected: number,
  id: string,
): void {
  if (current === expected) return;
  throw new ValuationError(
    "VERSION_CONFLICT",
    `Valuation aggregate "${id}" is at version "${current}"; expected exact version "${expected}".`,
  );
}

export function jobScope(job: ClaimedJob): ValuationScope {
  if (job.workspaceId !== undefined && job.dealId !== undefined) {
    return {
      tenantId: job.tenantId,
      workspaceId: job.workspaceId,
      dealId: job.dealId,
    };
  }
  throw new ValuationError(
    "JOB_FAILED",
    `Valuation compute job "${job.jobId}" has incomplete deal scope; expected workspace and Deal identifiers.`,
  );
}

export function jobContext(job: ClaimedJob): RequestContext {
  const scope = jobScope(job);
  return {
    actorId: job.initiatingActorId,
    tenantId: scope.tenantId,
    workspaceId: scope.workspaceId,
    dealId: scope.dealId,
    correlationId: job.correlationId,
    origin: "job",
  };
}

export function jobActor(job: ClaimedJob): ActorReference {
  return { id: job.initiatingActorId, kind: "service", state: "active" };
}

export function failedJob(code: string, completedAt: Date) {
  return {
    outcome: "failed" as const,
    failure: sanitizedJobFailure(code),
    completedAt,
  };
}
