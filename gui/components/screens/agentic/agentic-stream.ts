import type { Dispatch, MutableRefObject, SetStateAction } from "react";
import { ApiClient, type ChatStreamEvent } from "@/lib/api-client";
import {
  decideStreamAction,
  reduceStreamedReply,
  type StreamedReply,
} from "./agentic-workspace-model";
import type {
  StreamRequestIdentity,
  ToastState,
} from "./agentic-workspace-types";
import { agentLabels } from "./agentic-workspace-view-model";

type StreamTerminal = "completed" | "failed" | null;

interface StreamReplyRefs {
  controller: MutableRefObject<AbortController | null>;
  session: MutableRefObject<number>;
  lastEventId: MutableRefObject<string | undefined>;
}

interface StreamReplyCallbacks {
  setReply: Dispatch<SetStateAction<StreamedReply>>;
  setToast: Dispatch<SetStateAction<ToastState | null>>;
}

export interface StreamAgentReplyOptions {
  dealId: string;
  request: StreamRequestIdentity;
  resume: boolean;
  refs: StreamReplyRefs;
  callbacks: StreamReplyCallbacks;
}

interface StreamAttemptResult {
  terminal: StreamTerminal;
  retryable: boolean;
  failureMessage: string;
  aborted: boolean;
}

export async function streamAgentReply(
  options: StreamAgentReplyOptions,
): Promise<void> {
  const sessionId = startStreamSession(options);
  let reconnectCount = 0;
  let resume = options.resume;
  while (options.refs.session.current === sessionId) {
    const attempt = await runReconnectableAttempt(
      options,
      sessionId,
      resume,
      reconnectCount,
    );
    if (attempt.finished) return;
    reconnectCount += 1;
    resume = true;
  }
}

function startStreamSession(options: StreamAgentReplyOptions): number {
  const sessionId = options.refs.session.current + 1;
  options.refs.session.current = sessionId;
  if (!options.resume) options.refs.lastEventId.current = undefined;
  return sessionId;
}

async function runReconnectableAttempt(
  options: StreamAgentReplyOptions,
  sessionId: number,
  resume: boolean,
  reconnectCount: number,
): Promise<{ finished: boolean }> {
  const reconnecting = resume || reconnectCount > 0;
  prepareStreamAttempt(options, reconnecting, reconnectCount);
  const result = await runStreamAttempt(options, sessionId, reconnecting);
  if (options.refs.session.current !== sessionId) return { finished: true };
  if (finishAbortedAttempt(options, result)) return { finished: true };
  return finishTerminalAttempt(options, result, reconnectCount);
}

function finishTerminalAttempt(
  options: StreamAgentReplyOptions,
  result: StreamAttemptResult,
  reconnectCount: number,
): { finished: boolean } {
  const action = decideStreamAction(
    result.terminal,
    result.retryable,
    reconnectCount,
  );
  if (action === "complete") return finishCompletedStream(options);
  if (action === "fail") return finishFailedStream(options, result);
  return { finished: false };
}

function prepareStreamAttempt(
  options: StreamAgentReplyOptions,
  reconnecting: boolean,
  reconnectCount: number,
) {
  options.callbacks.setReply((current) =>
    reconnecting
      ? { ...current, status: "reconnecting", error: undefined }
      : { content: "", status: "streaming", tools: [], citations: [] }
  );
  if (!reconnecting) return;
  options.callbacks.setToast({
    title: "Reconnecting to response",
    message: `Resume attempt ${
      reconnectCount + 1
    } of 3 is using the same message identity.`,
    variant: "info",
  });
}

async function runStreamAttempt(
  options: StreamAgentReplyOptions,
  sessionId: number,
  reconnecting: boolean,
): Promise<StreamAttemptResult> {
  const controller = new AbortController();
  options.refs.controller.current = controller;
  const result = newAttemptResult();
  await runTrackedStreamAttempt(
    options,
    controller,
    sessionId,
    reconnecting,
    result,
  );
  clearTrackedController(options, controller);
  return { ...result, aborted: controller.signal.aborted };
}

async function runTrackedStreamAttempt(
  options: StreamAgentReplyOptions,
  controller: AbortController,
  sessionId: number,
  reconnecting: boolean,
  result: StreamAttemptResult,
) {
  try {
    await streamChatAttempt(
      options,
      controller,
      sessionId,
      reconnecting,
      result,
    );
  } catch (cause) {
    result.failureMessage = streamFailureMessage(cause);
  }
}

function streamFailureMessage(cause: unknown): string {
  return cause instanceof Error ? cause.message : "Connection lost";
}

function clearTrackedController(
  options: StreamAgentReplyOptions,
  controller: AbortController,
) {
  if (options.refs.controller.current === controller) {
    options.refs.controller.current = null;
  }
}

function newAttemptResult(): StreamAttemptResult {
  return {
    terminal: null,
    retryable: true,
    failureMessage: "The response stream closed before completion.",
    aborted: false,
  };
}

async function streamChatAttempt(
  options: StreamAgentReplyOptions,
  controller: AbortController,
  sessionId: number,
  reconnecting: boolean,
  result: StreamAttemptResult,
) {
  await ApiClient.streamChat(
    options.dealId,
    options.request.threadId,
    streamChatPayload(options),
    streamChatOptions(options, controller, sessionId, reconnecting, result),
  );
}

function streamChatPayload(options: StreamAgentReplyOptions) {
  return {
    agentId: options.request.agentId,
    message: options.request.message,
    clientMessageId: options.request.clientMessageId,
  };
}

function streamChatOptions(
  options: StreamAgentReplyOptions,
  controller: AbortController,
  sessionId: number,
  reconnecting: boolean,
  result: StreamAttemptResult,
) {
  return {
    signal: controller.signal,
    lastEventId: reconnecting ? options.refs.lastEventId.current : undefined,
    onEvent: (event: ChatStreamEvent) =>
      handleStreamEvent(options, sessionId, result, event),
  };
}

function handleStreamEvent(
  options: StreamAgentReplyOptions,
  sessionId: number,
  result: StreamAttemptResult,
  event: ChatStreamEvent,
) {
  if (options.refs.session.current !== sessionId) return;
  options.refs.lastEventId.current = event.eventId;
  applyTerminalStreamEvent(result, event);
  options.callbacks.setReply((current) => reduceStreamedReply(current, event));
}

function applyTerminalStreamEvent(
  result: StreamAttemptResult,
  event: ChatStreamEvent,
) {
  if (event.event === "response.completed") result.terminal = "completed";
  if (event.event !== "response.failed") return;
  result.terminal = "failed";
  result.retryable = event.data.retryable;
  result.failureMessage = event.data.message;
}

function finishAbortedAttempt(
  options: StreamAgentReplyOptions,
  result: StreamAttemptResult,
): boolean {
  if (!result.aborted) return false;
  options.callbacks.setReply((current) => ({
    ...current,
    status: "stopped",
    error: undefined,
  }));
  return true;
}

function finishCompletedAttempt(options: StreamAgentReplyOptions) {
  options.callbacks.setToast({
    title: "Response complete",
    message: `${agentLabels[options.request.agentId]} finished the response.`,
    variant: "success",
  });
}

function finishCompletedStream(
  options: StreamAgentReplyOptions,
): { finished: boolean } {
  finishCompletedAttempt(options);
  return { finished: true };
}

function finishFailedAttempt(
  options: StreamAgentReplyOptions,
  result: StreamAttemptResult,
) {
  options.callbacks.setReply((current) => ({
    ...current,
    status: "failed",
    error: result.failureMessage,
  }));
  options.callbacks.setToast({
    title: "Stream interrupted",
    message:
      "Automatic reconnects were exhausted. The prompt and partial response are preserved.",
    variant: "error",
  });
}

function finishFailedStream(
  options: StreamAgentReplyOptions,
  result: StreamAttemptResult,
): { finished: boolean } {
  finishFailedAttempt(options, result);
  return { finished: true };
}
