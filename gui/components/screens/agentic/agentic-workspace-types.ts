import type {
  ChatMessage,
  ChatThread,
  DealDetail,
  EngineRun,
} from "@/lib/api-client";
import type { AgentId, StreamedReply } from "./agentic-workspace-model";

export type LoadState = "loading" | "ready" | "empty" | "error";

export type ToastState = {
  title: string;
  message: string;
  variant: "success" | "error" | "info";
};

export interface StreamRequestIdentity {
  threadId: string;
  agentId: AgentId;
  message: string;
  clientMessageId: string;
}

export type StreamCitation = NonNullable<StreamedReply["citations"]>[number];

export interface FinancialRiskSummary {
  run: EngineRun | undefined;
  running: boolean;
  failure: string | null;
  score: string;
}

export interface AgenticWorkspaceState {
  loadState: LoadState;
  deal: DealDetail | null;
  threads: ChatThread[];
  visibleThreads: ChatThread[];
  activeThread: ChatThread | null;
  activeThreadId: string | null;
  messages: ChatMessage[];
  historyLoading: boolean;
  activeAgent: AgentId;
  threadTabs: Array<{ id: AgentId; label: string; disabled: boolean }>;
  vdrDocuments: Array<{ id: string; name: string; mimeType: string }>;
  prompt: string;
  reply: StreamedReply;
  toast: ToastState | null;
  threadModalOpen: boolean;
  threadTitle: string;
  threadTitleError: string | null;
  threadCreating: boolean;
  selectedVdrDocumentId: string | null;
  selectedCitation: StreamCitation | null;
  valuation: string;
  financialRisk: FinancialRiskSummary;
  matchRun: EngineRun | undefined;
}

export interface AgenticWorkspaceActions {
  load: () => Promise<void>;
  selectAgent: (id: string) => void;
  selectThread: (threadId: string) => void;
  openThreadModal: () => void;
  closeThreadModal: () => void;
  createThread: () => Promise<void>;
  send: () => Promise<void>;
  retryLastStream: () => Promise<void>;
  copyLastPrompt: () => Promise<void>;
  cancelStream: () => void;
  dismissReply: () => void;
  openCitation: (citation: StreamCitation) => void;
  setPrompt: (prompt: string) => void;
  setThreadTitle: (title: string) => void;
  setThreadTitleError: (error: string | null) => void;
  setActiveAgentFromValue: (value: string | string[]) => void;
  setSelectedVdrDocumentId: (documentId: string | null) => void;
  runFinancialRisk: () => Promise<void>;
  clearToast: () => void;
}

export interface AgenticWorkspaceController {
  state: AgenticWorkspaceState;
  actions: AgenticWorkspaceActions;
}
