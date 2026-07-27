import { ApiClient, type ChatMessage, type ChatThread } from "@/lib/api-client";
import { type AgentId } from "./agentic-workspace-model";
import { initialStreamReply, isAgentId } from "./agentic-workspace-view-model";
import type {
  AgenticWorkspaceController,
  StreamCitation,
  StreamRequestIdentity,
  ToastState,
} from "./agentic-workspace-types";
import type {
  AgenticModalState,
  AgenticStateGroups,
  AgenticStreamState,
  AgenticThreadState,
  AgenticToastState,
} from "./agentic-workspace-state";
import type { AgenticCoreActions } from "./agentic-workspace-core-actions";

type AgenticThreadActionSlice = Pick<
  AgenticWorkspaceController["actions"],
  | "selectAgent"
  | "selectThread"
  | "openThreadModal"
  | "closeThreadModal"
  | "createThread"
  | "setThreadTitle"
  | "setThreadTitleError"
  | "setActiveAgentFromValue"
>;
type AgenticStreamActionSlice = Pick<
  AgenticWorkspaceController["actions"],
  | "send"
  | "retryLastStream"
  | "copyLastPrompt"
  | "cancelStream"
  | "dismissReply"
  | "setPrompt"
>;
type AgenticInsightActionSlice = Pick<
  AgenticWorkspaceController["actions"],
  "openCitation" | "setSelectedVdrDocumentId" | "runFinancialRisk"
>;

export function useAgenticWorkspaceActions(
  dealId: string,
  groups: AgenticStateGroups,
  coreActions: AgenticCoreActions,
): AgenticWorkspaceController["actions"] {
  return {
    load: coreActions.load,
    ...agenticThreadActions(dealId, groups, coreActions.resetActiveStream),
    ...agenticStreamActions(groups, coreActions.executeStream),
    ...agenticInsightActions(dealId, groups),
    clearToast: () => groups.toastState.setToast(null),
  };
}

function agenticThreadActions(
  dealId: string,
  groups: AgenticStateGroups,
  resetActiveStream: () => void,
): AgenticThreadActionSlice {
  return {
    selectAgent: (id) =>
      selectAgentInState(id, groups.threadState, resetActiveStream),
    selectThread: (id) =>
      selectThreadInState(id, groups.threadState, resetActiveStream),
    openThreadModal: () => openThreadModalForState(groups.modalState),
    closeThreadModal: () => groups.modalState.setThreadModalOpen(false),
    createThread: () => createThreadInState(dealId, groups, resetActiveStream),
    setThreadTitle: groups.modalState.setThreadTitle,
    setThreadTitleError: groups.modalState.setThreadTitleError,
    setActiveAgentFromValue: (value) =>
      setActiveAgentFromValue(value, groups.threadState.setActiveAgent),
  };
}

function agenticStreamActions(
  groups: AgenticStateGroups,
  executeStream: AgenticCoreActions["executeStream"],
): AgenticStreamActionSlice {
  return {
    send: () =>
      sendMessageInState(groups.threadState, groups.streamState, executeStream),
    retryLastStream: () =>
      retryStreamInState(groups.threadState, groups.streamState, executeStream),
    copyLastPrompt: () =>
      copyPromptInState(groups.streamState, groups.toastState),
    cancelStream: () => groups.streamState.streamController.current?.abort(),
    dismissReply: () => groups.streamState.setReply(initialStreamReply()),
    setPrompt: groups.streamState.setPrompt,
  };
}

function agenticInsightActions(
  dealId: string,
  groups: AgenticStateGroups,
): AgenticInsightActionSlice {
  return {
    openCitation: (citation) => openCitationInState(citation, groups),
    setSelectedVdrDocumentId: groups.citationState.setSelectedVdrDocumentId,
    runFinancialRisk: () => runFinancialRiskInState(dealId, groups),
  };
}

function selectAgentInState(
  id: string,
  threadState: AgenticThreadState,
  resetActiveStream: () => void,
) {
  if (!isAgentId(id)) return;
  threadState.setActiveAgent(id);
  resetActiveStream();
  const nextThreadId =
    threadState.threads.find((thread) => thread.agentId === id)?.id ?? null;
  threadState.setHistoryLoading(Boolean(nextThreadId));
  threadState.setActiveThreadId(nextThreadId);
}

function selectThreadInState(
  threadId: string,
  threadState: AgenticThreadState,
  resetActiveStream: () => void,
) {
  if (threadId === threadState.activeThreadId) return;
  resetActiveStream();
  threadState.setHistoryLoading(true);
  threadState.setActiveThreadId(threadId);
}

function openThreadModalForState(modalState: AgenticModalState) {
  openThreadModal(
    modalState.setThreadTitle,
    modalState.setThreadTitleError,
    modalState.setThreadModalOpen,
  );
}

async function createThreadInState(
  dealId: string,
  groups: AgenticStateGroups,
  resetActiveStream: () => void,
) {
  if (!validThreadTitle(groups.modalState)) return;
  groups.modalState.setThreadCreating(true);
  try {
    const thread = await createThreadForGroups(dealId, groups);
    acceptCreatedThread(thread, groups, resetActiveStream);
  } catch {
    groups.toastState.setToast(threadCreationErrorToast());
  } finally {
    groups.modalState.setThreadCreating(false);
  }
}

function validThreadTitle(modalState: AgenticModalState): boolean {
  if (modalState.threadTitle.trim()) return true;
  modalState.setThreadTitleError("Thread title is required.");
  return false;
}

async function createThreadForGroups(
  dealId: string,
  groups: AgenticStateGroups,
) {
  return await createChatThread(
    dealId,
    groups.modalState.threadTitle,
    groups.threadState.activeAgent,
  );
}

function acceptCreatedThread(
  thread: ChatThread,
  groups: AgenticStateGroups,
  resetActiveStream: () => void,
) {
  groups.threadState.setThreads((current) => [thread, ...current]);
  resetActiveStream();
  groups.threadState.setHistoryLoading(true);
  groups.threadState.setActiveThreadId(thread.id);
  groups.dataState.setLoadState("ready");
  groups.modalState.setThreadModalOpen(false);
  groups.toastState.setToast(threadCreatedToast(thread.title));
}

async function sendMessageInState(
  threadState: AgenticThreadState,
  streamState: AgenticStreamState,
  executeStream: AgenticCoreActions["executeStream"],
) {
  const text = streamState.prompt.trim();
  if (!canSendThreadMessage(text, threadState, streamState)) return;
  streamState.setPrompt("");
  streamState.setLastSubmittedPrompt(text);
  const request = buildStreamRequest(
    threadState.activeThreadId,
    threadState.activeAgent,
    text,
  );
  threadState.setMessages((
    current,
  ) => [...current, optimisticMessage(request)]);
  await executeStream(request);
}

function canSendThreadMessage(
  text: string,
  threadState: AgenticThreadState,
  streamState: AgenticStreamState,
): threadState is AgenticThreadState & { activeThreadId: string } {
  return canSendMessage(
    text,
    threadState.activeThreadId,
    threadState.historyLoading,
    streamState.reply.status,
  );
}

async function retryStreamInState(
  threadState: AgenticThreadState,
  streamState: AgenticStreamState,
  executeStream: AgenticCoreActions["executeStream"],
) {
  const request = streamState.lastStreamRequest.current;
  if (!request || request.threadId !== threadState.activeThreadId) return;
  await executeStream(request, true);
}

async function copyPromptInState(
  streamState: AgenticStreamState,
  toastState: AgenticToastState,
) {
  try {
    await navigator.clipboard.writeText(
      streamState.lastStreamRequest.current?.message ??
        streamState.lastSubmittedPrompt,
    );
    toastState.setToast(promptCopiedToast());
  } catch {
    toastState.setToast(promptCopyFailedToast());
  }
}

function openCitationInState(
  citation: StreamCitation,
  groups: AgenticStateGroups,
) {
  groups.citationState.setSelectedCitation(citation);
  groups.citationState.setSelectedVdrDocumentId(citation.documentId);
  groups.toastState.setToast(citationOpenedToast(citation));
}

async function runFinancialRiskInState(
  dealId: string,
  groups: AgenticStateGroups,
) {
  groups.dataState.setEngineStarting(true);
  groups.dataState.setEngineError(null);
  try {
    const run = await ApiClient.runDealEngine(dealId, {
      engine: "financial_risk",
      input: {},
    });
    groups.dataState.setEngineRuns((current) => [run, ...current]);
    groups.toastState.setToast(financialRiskStartedToast());
  } catch (cause) {
    groups.dataState.setEngineError(financialRiskError(cause));
  } finally {
    groups.dataState.setEngineStarting(false);
  }
}

async function createChatThread(
  dealId: string,
  threadTitle: string,
  activeAgent: AgentId,
) {
  return await ApiClient.createChatThread(dealId, {
    title: threadTitle.trim(),
    agentId: activeAgent,
  });
}

function canSendMessage(
  text: string,
  activeThreadId: string | null,
  historyLoading: boolean,
  replyStatus: string,
): activeThreadId is string {
  return Boolean(text) && Boolean(activeThreadId) && !historyLoading &&
    replyStatus !== "streaming" && replyStatus !== "reconnecting";
}

function buildStreamRequest(
  threadId: string,
  agentId: AgentId,
  message: string,
): StreamRequestIdentity {
  return {
    threadId,
    agentId,
    message,
    clientMessageId: crypto.randomUUID(),
  };
}

function optimisticMessage(request: StreamRequestIdentity): ChatMessage {
  return {
    id: crypto.randomUUID(),
    threadId: request.threadId,
    role: "user",
    content: request.message,
    clientMessageId: request.clientMessageId,
    createdAt: new Date().toISOString(),
  };
}

function openThreadModal(
  setThreadTitle: (title: string) => void,
  setThreadTitleError: (error: string | null) => void,
  setThreadModalOpen: (open: boolean) => void,
) {
  setThreadTitle("");
  setThreadTitleError(null);
  setThreadModalOpen(true);
}

function setActiveAgentFromValue(
  value: string | string[],
  setActiveAgent: (agent: AgentId) => void,
) {
  const next = Array.isArray(value) ? value[0] : value;
  if (isAgentId(next)) setActiveAgent(next);
}

function threadCreatedToast(title: string): ToastState {
  return {
    title: "Thread created",
    message: `${title} is ready.`,
    variant: "success",
  };
}

function threadCreationErrorToast(): ToastState {
  return {
    title: "Thread not created",
    message: "The workspace could not start a new conversation.",
    variant: "error",
  };
}

function promptCopiedToast(): ToastState {
  return {
    title: "Prompt copied",
    message: "The last submitted prompt is on your clipboard.",
    variant: "success",
  };
}

function promptCopyFailedToast(): ToastState {
  return {
    title: "Prompt not copied",
    message: "Clipboard access is unavailable in this browser.",
    variant: "error",
  };
}

function citationOpenedToast(citation: StreamCitation): ToastState {
  return {
    title: "Citation opened",
    message: `${citation.label}${
      citation.page ? ` · page ${citation.page}` : ""
    }`,
    variant: "info",
  };
}

function financialRiskStartedToast(): ToastState {
  return {
    title: "Analysis started",
    message: "Financial risk results are linked to this deal.",
    variant: "success",
  };
}

function financialRiskError(cause: unknown): string {
  return cause instanceof Error
    ? cause.message
    : "Financial risk analysis failed.";
}
