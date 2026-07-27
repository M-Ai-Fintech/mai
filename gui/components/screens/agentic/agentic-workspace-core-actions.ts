import { useCallback, useEffect, useMemo } from "react";
import {
  ApiClient,
  type ChatMessage,
  type ChatThread,
  type DealDetail,
  type EngineRun,
} from "@/lib/api-client";
import { type AgentId, AGENTS } from "./agentic-workspace-model";
import type {
  AgenticDataState,
  AgenticStateGroups,
  AgenticStreamState,
  AgenticThreadState,
  AgenticToastState,
} from "./agentic-workspace-state";
import { streamAgentReply } from "./agentic-stream";
import { initialStreamReply } from "./agentic-workspace-view-model";
import type {
  LoadState,
  StreamRequestIdentity,
  ToastState,
} from "./agentic-workspace-types";

export interface AgenticCoreActions {
  load: () => Promise<void>;
  resetActiveStream: () => void;
  executeStream: (
    request: StreamRequestIdentity,
    resume?: boolean,
  ) => Promise<void>;
}

export function useAgenticCoreActions(
  dealId: string,
  groups: AgenticStateGroups,
): AgenticCoreActions {
  const resetActiveStream = useResetForGroups(groups);
  const load = useLoadForGroups(dealId, groups, resetActiveStream);
  const executeStream = useStreamForGroups(dealId, groups);
  useAgenticInitialLoad(load);
  useAgenticMessageHistory(dealId, groups.threadState, groups.toastState);
  return { load, resetActiveStream, executeStream };
}

function useResetForGroups(groups: AgenticStateGroups) {
  return useResetActiveStream(groups.streamState, groups.threadState);
}

function useLoadForGroups(
  dealId: string,
  groups: AgenticStateGroups,
  reset: () => void,
) {
  return useAgenticLoadAction(
    dealId,
    groups.dataState,
    groups.threadState,
    reset,
  );
}

function useStreamForGroups(dealId: string, groups: AgenticStateGroups) {
  return useExecuteStreamAction(
    dealId,
    groups.streamState,
    groups.toastState,
  );
}

function useResetActiveStream(
  streamState: AgenticStreamState,
  threadState: AgenticThreadState,
) {
  const refs = useResetRefs(streamState);
  const { setReply } = streamState;
  const { setMessages } = threadState;
  return useCallback(
    () => resetActiveStream(refs, setReply, setMessages),
    [refs, setMessages, setReply],
  );
}

function useResetRefs(streamState: AgenticStreamState) {
  const { lastEventId, lastStreamRequest, streamController, streamSession } =
    streamState;
  return useMemo(
    () => ({ lastEventId, lastStreamRequest, streamController, streamSession }),
    [lastEventId, lastStreamRequest, streamController, streamSession],
  );
}

function useAgenticLoadAction(
  dealId: string,
  dataState: AgenticDataState,
  threadState: AgenticThreadState,
  resetActiveStream: () => void,
) {
  const dataSetters = useAgenticDataSetters(dataState);
  const threadSetters = useAgenticThreadSetters(threadState);
  return useCallback(
    () =>
      loadAgenticWorkspace(
        dealId,
        dataSetters,
        threadSetters,
        resetActiveStream,
      ),
    [dataSetters, dealId, resetActiveStream, threadSetters],
  );
}

function useAgenticDataSetters(state: AgenticDataState) {
  const { setDeal, setEngineRuns, setLoadState, setVdrDocuments } = state;
  return useMemo(
    () => ({ setDeal, setEngineRuns, setLoadState, setVdrDocuments }),
    [setDeal, setEngineRuns, setLoadState, setVdrDocuments],
  );
}

function useAgenticThreadSetters(state: AgenticThreadState) {
  const { setActiveAgent, setActiveThreadId, setHistoryLoading, setThreads } =
    state;
  return useMemo(
    () => ({
      setActiveAgent,
      setActiveThreadId,
      setHistoryLoading,
      setThreads,
    }),
    [setActiveAgent, setActiveThreadId, setHistoryLoading, setThreads],
  );
}

interface AgenticDataSetters {
  setLoadState: (state: LoadState) => void;
  setDeal: (deal: DealDetail) => void;
  setEngineRuns: (runs: EngineRun[]) => void;
  setVdrDocuments: (
    documents: Array<{ id: string; name: string; mimeType: string }>,
  ) => void;
}

interface AgenticThreadSetters {
  setThreads: (threads: ChatThread[]) => void;
  setHistoryLoading: (loading: boolean) => void;
  setActiveThreadId: (threadId: string | null) => void;
  setActiveAgent: (agent: AgentId) => void;
}

async function loadAgenticWorkspace(
  dealId: string,
  dataSetters: AgenticDataSetters,
  threadSetters: AgenticThreadSetters,
  resetActiveStream: () => void,
) {
  dataSetters.setLoadState("loading");
  try {
    applyWorkspaceSnapshot(
      await loadWorkspaceSnapshot(dealId),
      dataSetters,
      threadSetters,
      resetActiveStream,
    );
  } catch {
    dataSetters.setLoadState("error");
  }
}

function applyWorkspaceSnapshot(
  snapshot: Awaited<ReturnType<typeof loadWorkspaceSnapshot>>,
  dataSetters: AgenticDataSetters,
  threadSetters: AgenticThreadSetters,
  resetActiveStream: () => void,
) {
  const firstThread = firstDefaultAgentThread(snapshot.threads);
  dataSetters.setDeal(snapshot.deal);
  dataSetters.setEngineRuns(snapshot.engineRuns);
  dataSetters.setVdrDocuments(snapshot.documents);
  threadSetters.setThreads(snapshot.threads);
  resetActiveStream();
  threadSetters.setHistoryLoading(Boolean(firstThread));
  threadSetters.setActiveThreadId(firstThread?.id ?? null);
  threadSetters.setActiveAgent(AGENTS[0]);
  dataSetters.setLoadState(firstThread ? "ready" : "empty");
}

function firstDefaultAgentThread(threads: ChatThread[]): ChatThread | null {
  return threads.find((thread) => thread.agentId === AGENTS[0]) ?? null;
}

function useAgenticInitialLoad(load: () => Promise<void>) {
  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);
}

function useAgenticMessageHistory(
  dealId: string,
  threadState: AgenticThreadState,
  toastState: AgenticToastState,
) {
  const { activeThreadId, setHistoryLoading, setMessages } = threadState;
  const { setToast } = toastState;
  useEffect(
    () =>
      loadMessagesForThread(
        dealId,
        activeThreadId,
        setMessages,
        setToast,
        setHistoryLoading,
      ),
    [activeThreadId, dealId, setHistoryLoading, setMessages, setToast],
  );
}

function useExecuteStreamAction(
  dealId: string,
  streamState: AgenticStreamState,
  toastState: AgenticToastState,
) {
  const lastStreamRequestRef = streamState.lastStreamRequest;
  return async (request: StreamRequestIdentity, resume = false) => {
    lastStreamRequestRef.current = request;
    await streamAgentReply(
      streamReplyOptions(dealId, request, resume, streamState, toastState),
    );
  };
}

function streamReplyOptions(
  dealId: string,
  request: StreamRequestIdentity,
  resume: boolean,
  streamState: AgenticStreamState,
  toastState: AgenticToastState,
) {
  return {
    dealId,
    request,
    resume,
    refs: streamReplyRefs(streamState),
    callbacks: streamReplyCallbacks(streamState, toastState),
  };
}

function streamReplyRefs(state: AgenticStreamState) {
  return {
    controller: state.streamController,
    session: state.streamSession,
    lastEventId: state.lastEventId,
  };
}

function streamReplyCallbacks(
  streamState: AgenticStreamState,
  toastState: AgenticToastState,
) {
  return { setReply: streamState.setReply, setToast: toastState.setToast };
}

function resetActiveStream(
  refs: ReturnType<typeof useResetRefs>,
  setReply: AgenticStreamState["setReply"],
  setMessages: AgenticThreadState["setMessages"],
) {
  refs.streamSession.current += 1;
  refs.streamController.current?.abort();
  refs.lastStreamRequest.current = null;
  refs.lastEventId.current = undefined;
  setReply(initialStreamReply());
  setMessages([]);
}

async function loadWorkspaceSnapshot(dealId: string) {
  const [deal, threads, runPage, documentPage] = await Promise.all([
    ApiClient.getDealDetail(dealId),
    ApiClient.listChatThreads(dealId),
    ApiClient.listDealEngineRuns(dealId, { pageSize: 20 }),
    ApiClient.listVdrDocuments(dealId, { pageSize: 20 }),
  ]);
  return {
    deal,
    threads,
    engineRuns: runPage.data,
    documents: documentPage.data,
  };
}

function loadMessagesForThread(
  dealId: string,
  activeThreadId: string | null,
  setMessages: (messages: ChatMessage[]) => void,
  setToast: (toast: ToastState) => void,
  setHistoryLoading: (loading: boolean) => void,
) {
  if (!activeThreadId) return;
  let active = true;
  ApiClient.listChatMessages(dealId, activeThreadId)
    .then((result) => active && setMessages(result.data))
    .catch(() => active && setToast(conversationUnavailableToast()))
    .finally(() => active && setHistoryLoading(false));
  return () => {
    active = false;
  };
}

function conversationUnavailableToast(): ToastState {
  return {
    title: "Conversation unavailable",
    message: "Retry by selecting this thread again.",
    variant: "error",
  };
}
