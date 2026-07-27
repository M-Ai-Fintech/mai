import { Agent } from "@mastra/core/agent";
import { DatabaseMemoryService } from "../db/DatabaseMemoryService.ts";
import { LocalPubSubBus } from "./LocalPubSubBus.ts";

interface FlowMessage {
  transactionId?: string;
  [key: string]: unknown;
}

interface FlowRegistration<
  TInput extends FlowMessage,
  TResult extends Record<string, unknown>,
> {
  agent: Agent;
  inputTopic: string;
  outputTopic: string;
  executeStep: (agent: Agent, input: TInput) => Promise<TResult>;
  pubsub: LocalPubSubBus;
  db: DatabaseMemoryService;
}

export class AgentFlowWrapper {
  static registerAgentOnBus<
    TInput extends FlowMessage,
    TResult extends Record<string, unknown>,
  >(
    agent: Agent,
    inputTopic: string,
    outputTopic: string,
    executeStep: (agent: Agent, input: TInput) => Promise<TResult>,
  ): void {
    const registration = flowRegistration(
      agent,
      inputTopic,
      outputTopic,
      executeStep,
    );
    registration.pubsub.subscribe<TInput>(
      inputTopic,
      (input) => runAgentStep(registration, input),
    );
  }
}

function flowRegistration<
  TInput extends FlowMessage,
  TResult extends Record<string, unknown>,
>(
  agent: Agent,
  inputTopic: string,
  outputTopic: string,
  executeStep: (agent: Agent, input: TInput) => Promise<TResult>,
): FlowRegistration<TInput, TResult> {
  return {
    agent,
    inputTopic,
    outputTopic,
    executeStep,
    pubsub: LocalPubSubBus.getInstance(),
    db: DatabaseMemoryService.getInstance(),
  };
}

async function runAgentStep<
  TInput extends FlowMessage,
  TResult extends Record<string, unknown>,
>(
  registration: FlowRegistration<TInput, TResult>,
  input: TInput,
): Promise<void> {
  const transactionId = input.transactionId || "unknown_tx";
  const agentId = registration.agent.id || registration.agent.name ||
    "unknown_agent";
  await startCheckpoint(
    registration.db,
    transactionId,
    agentId,
    registration.inputTopic,
    input,
  );
  await executeRegisteredStep(registration, input, transactionId, agentId);
}

async function executeRegisteredStep<
  TInput extends FlowMessage,
  TResult extends Record<string, unknown>,
>(
  registration: FlowRegistration<TInput, TResult>,
  input: TInput,
  transactionId: string,
  agentId: string,
): Promise<void> {
  try {
    const result = await registration.executeStep(registration.agent, input);
    await completeRegistration(registration, transactionId, agentId, result);
    publishResult(registration, input, result);
  } catch (error: unknown) {
    await failRegistration(registration, transactionId, agentId, error);
  }
}

function failRegistration<
  TInput extends FlowMessage,
  TResult extends Record<string, unknown>,
>(
  registration: FlowRegistration<TInput, TResult>,
  transactionId: string,
  agentId: string,
  error: unknown,
): Promise<void> {
  return failStep(
    registration.db,
    transactionId,
    agentId,
    registration.inputTopic,
    error,
  );
}

async function completeRegistration<
  TInput extends FlowMessage,
  TResult extends Record<string, unknown>,
>(
  registration: FlowRegistration<TInput, TResult>,
  transactionId: string,
  agentId: string,
  result: TResult,
): Promise<void> {
  await finishStep(
    registration.db,
    transactionId,
    agentId,
    registration.outputTopic,
    result,
  );
}

function publishResult<
  TInput extends FlowMessage,
  TResult extends Record<string, unknown>,
>(
  registration: FlowRegistration<TInput, TResult>,
  input: TInput,
  result: TResult,
): void {
  registration.pubsub.publish(registration.outputTopic, {
    ...input,
    ...result,
  });
}

async function startCheckpoint(
  db: DatabaseMemoryService,
  transactionId: string,
  agentId: string,
  topic: string,
  input: FlowMessage,
): Promise<void> {
  console.log(`[${agentId}] Starting step: ${topic}`);
  await db.saveFlowCheckpoint(transactionId, agentId, topic, {
    status: "STARTED",
    data: input,
  });
}

async function finishStep(
  db: DatabaseMemoryService,
  transactionId: string,
  agentId: string,
  topic: string,
  result: Record<string, unknown>,
): Promise<void> {
  await db.saveFlowCheckpoint(transactionId, agentId, topic, {
    status: "COMPLETED",
    result,
  });
  console.log(`[${agentId}] Finished step. Publishing to ${topic}`);
}

async function failStep(
  db: DatabaseMemoryService,
  transactionId: string,
  agentId: string,
  topic: string,
  error: unknown,
): Promise<void> {
  console.error(`[${agentId}] Error in step ${topic}:`, error);
  await db.saveFlowCheckpoint(transactionId, agentId, topic, {
    status: "FAILED",
    error: String(error),
  });
}
