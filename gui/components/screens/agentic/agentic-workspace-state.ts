import { useRef, useState } from "react";
import type {
  ChatMessage,
  ChatThread,
  DealDetail,
  EngineRun,
} from "@/lib/api-client";
import { type AgentId, AGENTS } from "./agentic-workspace-model";
import {
  dealValuationLabel,
  financialRiskSummary,
  initialStreamReply,
  threadTabs,
} from "./agentic-workspace-view-model";
import type {
  AgenticWorkspaceController,
  LoadState,
  StreamCitation,
  StreamRequestIdentity,
  ToastState,
} from "./agentic-workspace-types";

export function useAgenticStateGroups(): AgenticStateGroups {
  return {
    dataState: useAgenticDataState(),
    threadState: useAgenticThreadState(),
    streamState: useAgenticStreamState(),
    toastState: useAgenticToastState(),
    modalState: useAgenticThreadModalState(),
    citationState: useAgenticCitationState(),
  };
}

function useAgenticDataState() {
  return {
    ...useAgenticDealLoadState(),
    ...useAgenticEngineState(),
    ...useAgenticDocumentState(),
  };
}

function useAgenticDealLoadState() {
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [deal, setDeal] = useState<DealDetail | null>(null);
  return { loadState, setLoadState, deal, setDeal };
}

function useAgenticEngineState() {
  const [engineRuns, setEngineRuns] = useState<EngineRun[]>([]);
  const [engineStarting, setEngineStarting] = useState(false);
  const [engineError, setEngineError] = useState<string | null>(null);
  return {
    engineRuns,
    setEngineRuns,
    engineStarting,
    setEngineStarting,
    engineError,
    setEngineError,
  };
}

function useAgenticDocumentState() {
  const [vdrDocuments, setVdrDocuments] = useState<
    Array<{ id: string; name: string; mimeType: string }>
  >([]);
  return {
    vdrDocuments,
    setVdrDocuments,
  };
}

function useAgenticThreadState() {
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [activeAgent, setActiveAgent] = useState<AgentId>(AGENTS[0]);
  return {
    threads,
    setThreads,
    activeThreadId,
    setActiveThreadId,
    messages,
    setMessages,
    historyLoading,
    setHistoryLoading,
    activeAgent,
    setActiveAgent,
  };
}

function useAgenticStreamState() {
  return {
    ...useAgenticPromptState(),
    ...useAgenticReplyState(),
    ...useAgenticStreamRefs(),
  };
}

function useAgenticPromptState() {
  const [prompt, setPrompt] = useState("");
  const [lastSubmittedPrompt, setLastSubmittedPrompt] = useState("");
  return { prompt, setPrompt, lastSubmittedPrompt, setLastSubmittedPrompt };
}

function useAgenticReplyState() {
  const [reply, setReply] = useState(initialStreamReply);
  return { reply, setReply };
}

function useAgenticStreamRefs() {
  const streamController = useRef<AbortController | null>(null);
  const streamSession = useRef(0);
  const lastStreamRequest = useRef<StreamRequestIdentity | null>(null);
  const lastEventId = useRef<string | undefined>(undefined);
  return {
    streamController,
    streamSession,
    lastStreamRequest,
    lastEventId,
  };
}

function useAgenticToastState() {
  const [toast, setToast] = useState<ToastState | null>(null);
  return { toast, setToast };
}

function useAgenticThreadModalState() {
  const [threadModalOpen, setThreadModalOpen] = useState(false);
  const [threadTitle, setThreadTitle] = useState("");
  const [threadTitleError, setThreadTitleError] = useState<string | null>(null);
  const [threadCreating, setThreadCreating] = useState(false);
  return {
    threadModalOpen,
    setThreadModalOpen,
    threadTitle,
    setThreadTitle,
    threadTitleError,
    setThreadTitleError,
    threadCreating,
    setThreadCreating,
  };
}

function useAgenticCitationState() {
  const [selectedVdrDocumentId, setSelectedVdrDocumentId] = useState<
    string | null
  >(null);
  const [selectedCitation, setSelectedCitation] = useState<
    StreamCitation | null
  >(null);
  return {
    selectedVdrDocumentId,
    setSelectedVdrDocumentId,
    selectedCitation,
    setSelectedCitation,
  };
}

export type AgenticDataState = ReturnType<typeof useAgenticDataState>;
export type AgenticThreadState = ReturnType<typeof useAgenticThreadState>;
export type AgenticStreamState = ReturnType<typeof useAgenticStreamState>;
export type AgenticToastState = ReturnType<typeof useAgenticToastState>;
export type AgenticModalState = ReturnType<typeof useAgenticThreadModalState>;
export type AgenticCitationState = ReturnType<typeof useAgenticCitationState>;

export interface AgenticStateGroups {
  dataState: AgenticDataState;
  threadState: AgenticThreadState;
  streamState: AgenticStreamState;
  toastState: AgenticToastState;
  modalState: AgenticModalState;
  citationState: AgenticCitationState;
}

export function agenticWorkspaceControllerFromGroups(
  groups: AgenticStateGroups,
  actions: AgenticWorkspaceController["actions"],
): AgenticWorkspaceController {
  return { state: agenticWorkspaceStateFromGroups(groups), actions };
}

function agenticWorkspaceStateFromGroups(
  groups: AgenticStateGroups,
): AgenticWorkspaceController["state"] {
  return agenticWorkspaceState(
    groups.dataState,
    groups.threadState,
    groups.streamState,
    groups.toastState,
    groups.modalState,
    groups.citationState,
  );
}

function agenticWorkspaceState(
  dataState: AgenticDataState,
  threadState: AgenticThreadState,
  streamState: AgenticStreamState,
  toastState: AgenticToastState,
  modalState: AgenticModalState,
  citationState: AgenticCitationState,
): AgenticWorkspaceController["state"] {
  return {
    ...agenticDealState(dataState),
    ...agenticThreadState(threadState),
    ...agenticStreamState(streamState),
    ...agenticOverlayState(toastState, modalState, citationState),
  };
}

function agenticDealState(dataState: AgenticDataState) {
  return {
    loadState: dataState.loadState,
    deal: dataState.deal,
    vdrDocuments: dataState.vdrDocuments,
    valuation: dealValuationLabel(dataState.deal),
    financialRisk: financialRiskSummary(
      dataState.engineRuns,
      dataState.engineStarting,
      dataState.engineError,
    ),
    matchRun: dataState.engineRuns.find((run) =>
      run.engine === "portfolio_match" && run.status === "completed"
    ),
  };
}

function agenticThreadState(threadState: AgenticThreadState) {
  return {
    threads: threadState.threads,
    visibleThreads: threadState.threads.filter((thread) =>
      thread.agentId === threadState.activeAgent
    ),
    activeThread:
      threadState.threads.find((thread) =>
        thread.id === threadState.activeThreadId
      ) ?? null,
    activeThreadId: threadState.activeThreadId,
    messages: threadState.messages,
    historyLoading: threadState.historyLoading,
    activeAgent: threadState.activeAgent,
    threadTabs: threadTabs(),
  };
}

function agenticStreamState(streamState: AgenticStreamState) {
  return { prompt: streamState.prompt, reply: streamState.reply };
}

function agenticOverlayState(
  toastState: AgenticToastState,
  modalState: AgenticModalState,
  citationState: AgenticCitationState,
) {
  return {
    toast: toastState.toast,
    threadModalOpen: modalState.threadModalOpen,
    threadTitle: modalState.threadTitle,
    threadTitleError: modalState.threadTitleError,
    threadCreating: modalState.threadCreating,
    selectedVdrDocumentId: citationState.selectedVdrDocumentId,
    selectedCitation: citationState.selectedCitation,
  };
}
