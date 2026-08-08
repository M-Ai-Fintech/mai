import type { TransactionHandle } from "../platform/persistence/v1.ts";
import type {
  ApproveValuationCommand,
  CommandResult,
  ExecuteValuationComputeCommand,
  InvalidateValuationCommand,
} from "./commands.ts";
import type {
  ValuationApproval,
  ValuationInvalidation,
  ValuationResult,
} from "./model.ts";
import type { ValuationCommandRuntime } from "./command_runtime.ts";
import {
  approveValuationScenario,
  completeValuationScenario,
  invalidateValuationScenario,
  markValuationComputing,
} from "./model.ts";
import { parseValuationComputePayload } from "./jobs.ts";
import { createValuationResult } from "./result.ts";
import {
  assertActorContext,
  commandPayload,
  requiredScope,
} from "./command_support.ts";
import { ValuationError } from "./errors.ts";
import {
  accepted,
  appendEffect,
  assertVersion,
  claim,
  jobActor,
  jobContext,
  jobScope,
  loadInput,
  loadModel,
  loadResult,
  loadScenario,
  resolveApprovalReplay,
  resolveInvalidationReplay,
} from "./command_runtime.ts";

export async function executeCompute(
  runtime: ValuationCommandRuntime,
  transaction: TransactionHandle,
  command: ExecuteValuationComputeCommand,
): Promise<CommandResult<ValuationResult>> {
  const payload = parseValuationComputePayload(command.job.payload);
  const scope = jobScope(command.job);
  const scenario = await loadScenario(
    runtime,
    transaction,
    scope,
    payload.scenarioId,
    true,
  );
  assertQueuedScenario(
    command,
    scenario.version,
    scenario.state,
    payload.scenarioVersion,
  );
  const computing = markValuationComputing(scenario, runtime.clock.now());
  await runtime.config.repository.updateScenario(
    transaction,
    computing,
    scenario.version,
  );
  const model = await loadModel(
    runtime,
    transaction,
    scope,
    payload.modelId,
    payload.modelVersion,
  );
  const outcome = await runtime.config.calculations.compute({
    request: { method: payload.method, input: payload.input },
    model: model.definition,
  });
  if (!outcome.ok) {
    return failCalculation(command, outcome.error.code);
  }
  const input = await loadInput(
    runtime,
    transaction,
    scope,
    payload.inputId,
    payload.inputVersion,
  );
  const result = createValuationResult({
    id: command.resultId,
    scenario: computing,
    valuationInput: input,
    outcome,
    now: runtime.clock.now(),
  });
  const completed = completeValuationScenario(
    computing,
    result,
    runtime.clock.now(),
  );
  await runtime.config.repository.insertResult(transaction, result);
  await runtime.config.repository.updateScenario(
    transaction,
    completed,
    computing.version,
  );
  await runtime.jobs.complete(
    transaction,
    command.job,
    `result:${result.id}`,
    runtime.clock.now(),
  );
  await appendEffect(
    runtime,
    transaction,
    jobContext(command.job),
    jobActor(command.job),
    scope,
    completed,
    "valuation_computed",
    { resultId: result.id, basisDigest: result.basis.basisDigest },
  );
  return accepted(result);
}

export async function approve(
  runtime: ValuationCommandRuntime,
  transaction: TransactionHandle,
  command: ApproveValuationCommand,
): Promise<CommandResult<ValuationApproval>> {
  assertActorContext(command.actor, command.context);
  const scope = requiredScope(command.context);
  const claimed = await claim(
    runtime,
    transaction,
    command,
    "valuation.approve",
    "valuation_result",
    command.resultId,
    commandPayload(command as unknown as Record<string, unknown>),
  );
  if (claimed.status === "replay") {
    return accepted(
      await resolveApprovalReplay(
        runtime,
        transaction,
        scope,
        command,
        claimed.reference,
      ),
    );
  }
  const scenario = await loadScenario(
    runtime,
    transaction,
    scope,
    command.scenarioId,
    true,
  );
  assertVersion(scenario.version, command.expectedScenarioVersion, scenario.id);
  const result = await loadResult(
    runtime,
    transaction,
    scope,
    command.resultId,
  );
  const approved = approveValuationScenario(scenario, result, {
    id: command.approvalId,
    actor: command.actor,
    authority: command.authority,
    now: runtime.clock.now(),
  });
  await runtime.config.repository.insertApproval(
    transaction,
    approved.approval,
  );
  await runtime.config.repository.updateScenario(
    transaction,
    approved.scenario,
    scenario.version,
  );
  await appendEffect(
    runtime,
    transaction,
    command.context,
    command.actor,
    scope,
    approved.scenario,
    "valuation_approved",
    {
      resultId: result.id,
      approvalId: approved.approval.id,
      basisDigest: result.basis.basisDigest,
    },
  );
  await runtime.idempotency.complete(
    transaction,
    claimed.claim,
    `approval:${approved.approval.id}`,
  );
  return accepted(approved.approval);
}

export async function invalidate(
  runtime: ValuationCommandRuntime,
  transaction: TransactionHandle,
  command: InvalidateValuationCommand,
): Promise<CommandResult<ValuationInvalidation>> {
  assertActorContext(command.actor, command.context);
  const scope = requiredScope(command.context);
  const claimed = await claim(
    runtime,
    transaction,
    command,
    "valuation.invalidate",
    "valuation_scenario",
    command.scenarioId,
    commandPayload(command as unknown as Record<string, unknown>),
  );
  if (claimed.status === "replay") {
    return accepted(
      await resolveInvalidationReplay(
        runtime,
        transaction,
        scope,
        command,
        claimed.reference,
      ),
    );
  }
  const scenario = await loadScenario(
    runtime,
    transaction,
    scope,
    command.scenarioId,
    true,
  );
  assertVersion(scenario.version, command.expectedScenarioVersion, scenario.id);
  const invalidated = invalidateValuationScenario(scenario, {
    id: command.invalidationId,
    kind: command.kind,
    resultId: command.resultId,
    reason: command.reason,
    sourceReference: command.sourceReference,
    actor: command.actor,
    now: runtime.clock.now(),
  });
  await runtime.config.repository.insertInvalidation(
    transaction,
    invalidated.invalidation,
  );
  await runtime.config.repository.updateScenario(
    transaction,
    invalidated.scenario,
    scenario.version,
  );
  await appendEffect(
    runtime,
    transaction,
    command.context,
    command.actor,
    scope,
    invalidated.scenario,
    "valuation_invalidated",
    {
      invalidationId: invalidated.invalidation.id,
      kind: invalidated.invalidation.kind,
      resultId: invalidated.invalidation.resultId ?? null,
    },
  );
  await runtime.idempotency.complete(
    transaction,
    claimed.claim,
    `invalidation:${invalidated.invalidation.id}`,
  );
  return accepted(invalidated.invalidation);
}

function assertQueuedScenario(
  command: ExecuteValuationComputeCommand,
  currentVersion: number,
  state: string,
  expectedVersion: number,
): void {
  if (currentVersion === expectedVersion && state === "queued") return;
  throw new ValuationError(
    "STALE_INPUT",
    `Valuation compute job "${command.job.jobId}" targets scenario version "${expectedVersion}"; expected queued current version "${currentVersion}".`,
  );
}

function failCalculation(
  command: ExecuteValuationComputeCommand,
  code: string,
): never {
  throw new ValuationError(
    "JOB_FAILED",
    `Valuation compute job "${command.job.jobId}" failed with "${code}"; expected a successful deterministic calculation.`,
  );
}
