import type { TransactionHandle } from "../platform/persistence/v1.ts";
import type {
  ActivateValuationModelCommand,
  AddValuationInputCommand,
  CommandResult,
  CreateValuationModelCommand,
  CreateValuationScenarioCommand,
  EnqueueValuationComputeCommand,
} from "./commands.ts";
import {
  attachValuationInput,
  createValuationInput,
  createValuationModel,
  createValuationScenario,
  queueValuationScenario,
  transitionValuationModel,
  type ValuationInput,
  type ValuationModel,
  type ValuationScenario,
} from "./model.ts";
import type { DurableJob } from "../platform/jobs/v1.ts";
import {
  assertActorContext,
  commandPayload,
  requiredScope,
} from "./command_support.ts";
import { createValuationComputeJob } from "./jobs.ts";
import type { ValuationCommandRuntime } from "./command_runtime.ts";
import {
  accepted,
  appendEffect,
  assertVersion,
  claim,
  loadCurrentInput,
  loadInput,
  loadModel,
  loadScenario,
  resolveComputeReplay,
} from "./command_runtime.ts";

export async function createModel(
  runtime: ValuationCommandRuntime,
  transaction: TransactionHandle,
  command: CreateValuationModelCommand,
): Promise<CommandResult<ValuationModel>> {
  assertActorContext(command.actor, command.context);
  const scope = requiredScope(command.context);
  const claimed = await claim(
    runtime,
    transaction,
    command,
    "valuation.create_model",
    "valuation_model",
    command.modelId,
    commandPayload(command as unknown as Record<string, unknown>),
  );
  if (claimed.status === "replay") {
    return accepted(
      await loadModel(runtime, transaction, scope, command.modelId),
    );
  }
  const model = createValuationModel({
    id: command.modelId,
    scope,
    name: command.name,
    definition: command.definition,
    now: runtime.clock.now(),
  });
  await runtime.config.repository.insertModel(transaction, model);
  await appendEffect(
    runtime,
    transaction,
    command.context,
    command.actor,
    scope,
    model,
    "valuation_model_created",
    { method: model.definition.method },
  );
  await runtime.idempotency.complete(
    transaction,
    claimed.claim,
    `model:${model.id}`,
  );
  return accepted(model);
}

export async function activateModel(
  runtime: ValuationCommandRuntime,
  transaction: TransactionHandle,
  command: ActivateValuationModelCommand,
): Promise<CommandResult<ValuationModel>> {
  assertActorContext(command.actor, command.context);
  const scope = requiredScope(command.context);
  const claimed = await claim(
    runtime,
    transaction,
    command,
    "valuation.activate_model",
    "valuation_model",
    command.modelId,
    commandPayload(command as unknown as Record<string, unknown>),
  );
  if (claimed.status === "replay") {
    return accepted(
      await loadModel(runtime, transaction, scope, command.modelId),
    );
  }
  const current = await loadModel(runtime, transaction, scope, command.modelId);
  assertVersion(current.version, command.expectedVersion, current.id);
  const model = transitionValuationModel(
    current,
    "active",
    runtime.clock.now(),
  );
  await runtime.config.repository.insertModel(transaction, model);
  await appendEffect(
    runtime,
    transaction,
    command.context,
    command.actor,
    scope,
    model,
    "valuation_model_activated",
    { previousVersion: current.version },
  );
  await runtime.idempotency.complete(
    transaction,
    claimed.claim,
    `model:${model.id}`,
  );
  return accepted(model);
}

export async function createScenario(
  runtime: ValuationCommandRuntime,
  transaction: TransactionHandle,
  command: CreateValuationScenarioCommand,
): Promise<CommandResult<ValuationScenario>> {
  assertActorContext(command.actor, command.context);
  const scope = requiredScope(command.context);
  const claimed = await claim(
    runtime,
    transaction,
    command,
    "valuation.create_scenario",
    "valuation_scenario",
    command.scenarioId,
    commandPayload(command as unknown as Record<string, unknown>),
  );
  if (claimed.status === "replay") {
    return accepted(
      await loadScenario(runtime, transaction, scope, command.scenarioId),
    );
  }
  const model = await loadModel(
    runtime,
    transaction,
    scope,
    command.modelId,
    command.modelVersion,
  );
  const scenario = createValuationScenario({
    id: command.scenarioId,
    scope,
    name: command.name,
    model,
    now: runtime.clock.now(),
  });
  await runtime.config.repository.insertScenario(transaction, scenario);
  await appendEffect(
    runtime,
    transaction,
    command.context,
    command.actor,
    scope,
    scenario,
    "valuation_scenario_created",
    { modelVersion: model.version },
  );
  await runtime.idempotency.complete(
    transaction,
    claimed.claim,
    `scenario:${scenario.id}`,
  );
  return accepted(scenario);
}

export async function addInput(
  runtime: ValuationCommandRuntime,
  transaction: TransactionHandle,
  command: AddValuationInputCommand,
): Promise<CommandResult<ValuationInput>> {
  assertActorContext(command.actor, command.context);
  const scope = requiredScope(command.context);
  const claimed = await claim(
    runtime,
    transaction,
    command,
    "valuation.add_input",
    "valuation_scenario",
    command.scenarioId,
    commandPayload(command as unknown as Record<string, unknown>),
  );
  if (claimed.status === "replay") {
    return accepted(
      await loadInput(runtime, transaction, scope, command.inputId),
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
  const model = await loadModel(
    runtime,
    transaction,
    scope,
    scenario.modelId,
    scenario.modelVersion,
  );
  const input = createValuationInput({
    id: command.inputId,
    scenario,
    model,
    request: command.request,
    basis: command.basis,
    provenance: command.provenance,
    now: runtime.clock.now(),
  });
  const updated = attachValuationInput(scenario, input, runtime.clock.now());
  await runtime.config.repository.insertInput(transaction, input);
  await runtime.config.repository.updateScenario(
    transaction,
    updated,
    scenario.version,
  );
  await appendEffect(
    runtime,
    transaction,
    command.context,
    command.actor,
    scope,
    updated,
    "valuation_input_attached",
    { inputId: input.id, basisDigest: input.basis.basisDigest },
  );
  await runtime.idempotency.complete(
    transaction,
    claimed.claim,
    `input:${input.id}`,
  );
  return accepted(input);
}

export async function enqueueCompute(
  runtime: ValuationCommandRuntime,
  transaction: TransactionHandle,
  command: EnqueueValuationComputeCommand,
): Promise<CommandResult<DurableJob>> {
  assertActorContext(command.actor, command.context);
  const scope = requiredScope(command.context);
  const claimed = await claim(
    runtime,
    transaction,
    command,
    "valuation.enqueue_compute",
    "valuation_scenario",
    command.scenarioId,
    commandPayload(command as unknown as Record<string, unknown>),
  );
  if (claimed.status === "replay") {
    return accepted(
      await resolveComputeReplay(
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
  const input = await loadCurrentInput(runtime, transaction, scope, scenario);
  const queued = queueValuationScenario(scenario, runtime.clock.now());
  const createdAt = runtime.clock.now();
  const job = createValuationComputeJob({
    jobId: command.jobId,
    operationId: command.operationId,
    tenantId: scope.tenantId,
    workspaceId: scope.workspaceId,
    dealId: scope.dealId,
    initiatingActorId: command.actor.id,
    correlationId: command.context.correlationId,
    idempotencyKey: command.idempotencyKey,
    payload: {
      scenarioId: scenario.id,
      inputId: input.id,
      modelId: input.modelId,
      modelVersion: input.modelVersion,
      scenarioVersion: queued.version,
      inputVersion: input.version,
      method: input.request.method,
      input: input.request.input,
      basisDigest: input.basis.basisDigest,
    },
    createdAt,
    timeoutAt: new Date(createdAt.getTime() + (command.timeoutMs ?? 300_000)),
  });
  await runtime.jobs.enqueue(transaction, job);
  await runtime.config.repository.updateScenario(
    transaction,
    queued,
    scenario.version,
  );
  await appendEffect(
    runtime,
    transaction,
    command.context,
    command.actor,
    scope,
    queued,
    "valuation_compute_queued",
    {
      jobId: job.jobId,
      inputId: input.id,
      basisDigest: input.basis.basisDigest,
    },
  );
  await runtime.idempotency.complete(
    transaction,
    claimed.claim,
    `job:${job.jobId}`,
  );
  return accepted(job);
}
