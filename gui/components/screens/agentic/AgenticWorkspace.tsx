"use client";

import { Badge } from "@/components/Badge/Badge";
import { AgentConversationPanel } from "./AgentConversationPanel";
import { AgenticInsightsPanel } from "./AgenticInsightsPanel";
import { AgenticOverlays } from "./AgenticOverlays";
import { AgenticError, AgenticLoading } from "./AgenticStatusPanels";
import { AgentThreadSidebar } from "./AgentThreadSidebar";
import type { AgenticWorkspaceController } from "./agentic-workspace-types";
import { useAgenticWorkspace } from "./useAgenticWorkspace";

interface AgenticWorkspaceProps {
  dealId: string;
}

export function AgenticWorkspace({ dealId }: AgenticWorkspaceProps) {
  return <AgenticWorkspaceContent {...useAgenticWorkspace(dealId)} />;
}

function AgenticWorkspaceContent(
  { state, actions }: AgenticWorkspaceController,
) {
  if (state.loadState === "loading") {
    return <AgenticLoading />;
  }

  if (state.loadState === "error") {
    return <AgenticError onRetry={() => void actions.load()} />;
  }

  return <LoadedAgenticWorkspace state={state} actions={actions} />;
}

function LoadedAgenticWorkspace(
  { state, actions }: AgenticWorkspaceController,
) {
  return (
    <div className="mx-auto flex min-h-[calc(100vh-96px)] max-w-[2200px] flex-col gap-6 p-8 text-left">
      <WorkspaceHeader
        title={state.deal?.title ?? "Deal workspace"}
        subtitle={`${state.deal?.code} · ${state.deal?.target.legalName} · ${state.valuation}`}
      />
      <WorkspaceColumns state={state} actions={actions} />
      <WorkspaceOverlays state={state} actions={actions} />
    </div>
  );
}

function WorkspaceColumns({ state, actions }: AgenticWorkspaceController) {
  return (
    <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,2fr)_minmax(0,5fr)_minmax(0,3fr)] gap-6">
      <WorkspaceThreads state={state} actions={actions} />
      <WorkspaceConversation state={state} actions={actions} />
      <WorkspaceInsights state={state} actions={actions} />
    </div>
  );
}

function WorkspaceThreads({ state, actions }: AgenticWorkspaceController) {
  return (
    <AgentThreadSidebar
      activeAgent={state.activeAgent}
      activeThreadId={state.activeThreadId}
      threadTabs={state.threadTabs}
      visibleThreads={state.visibleThreads}
      onAgentChange={actions.selectAgent}
      onThreadSelect={actions.selectThread}
      onNewThread={actions.openThreadModal}
    />
  );
}

function WorkspaceConversation({ state, actions }: AgenticWorkspaceController) {
  return (
    <AgentConversationPanel
      activeAgent={state.activeAgent}
      activeThread={state.activeThread}
      activeThreadId={state.activeThreadId}
      messages={state.messages}
      historyLoading={state.historyLoading}
      prompt={state.prompt}
      reply={state.reply}
      onPromptChange={actions.setPrompt}
      onSend={() => void actions.send()}
      onCancelStream={actions.cancelStream}
      onRetry={() => void actions.retryLastStream()}
      onCopyPrompt={() => void actions.copyLastPrompt()}
      onDismissReply={actions.dismissReply}
      onCitationOpen={actions.openCitation}
    />
  );
}

function WorkspaceInsights({ state, actions }: AgenticWorkspaceController) {
  return (
    <AgenticInsightsPanel
      documents={state.vdrDocuments}
      selectedDocumentId={state.selectedVdrDocumentId}
      selectedCitation={state.selectedCitation}
      financialRisk={state.financialRisk}
      matchRun={state.matchRun}
      valuation={state.valuation}
      onDocumentSelect={actions.setSelectedVdrDocumentId}
      onRunFinancialRisk={() => void actions.runFinancialRisk()}
    />
  );
}

function WorkspaceOverlays({ state, actions }: AgenticWorkspaceController) {
  return (
    <AgenticOverlays
      threadModal={{
        open: state.threadModalOpen,
        creating: state.threadCreating,
        title: state.threadTitle,
        titleError: state.threadTitleError,
        activeAgent: state.activeAgent,
        onClose: actions.closeThreadModal,
        onCreate: () => void actions.createThread(),
        onTitleChange: actions.setThreadTitle,
        onTitleErrorChange: actions.setThreadTitleError,
        onAgentChange: actions.setActiveAgentFromValue,
      }}
      toast={state.toast}
      onToastClose={actions.clearToast}
    />
  );
}

function WorkspaceHeader(
  { title, subtitle }: { title: string; subtitle: string },
) {
  return (
    <header className="flex items-end justify-between gap-6">
      <div>
        <Badge variant="orange">Agentic deal workspace</Badge>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-ink-black">
          {title}
        </h1>
        <p className="mt-1 text-sm text-slate-gray">{subtitle}</p>
      </div>
      <Badge variant="outline">ONNX connected</Badge>
    </header>
  );
}
