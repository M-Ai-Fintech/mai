import type { FormEvent } from "react";
import type { ChatMessage, ChatThread } from "@/lib/api-client";
import { Accordion } from "@/components/Accordion/Accordion";
import { Avatar } from "@/components/Avatar/Avatar";
import { Badge } from "@/components/Badge/Badge";
import { Button } from "@/components/Button/Button";
import { Card } from "@/components/Card/Card";
import { EmptyState } from "@/components/EmptyState/EmptyState";
import { Icon } from "@/components/Icon/Icon";
import { Input } from "@/components/Input/Input";
import { Skeleton } from "@/components/Skeleton/Skeleton";
import type { AgentId, StreamedReply } from "./agentic-workspace-model";
import type { StreamCitation } from "./agentic-workspace-types";
import { agentLabels, messageContent } from "./agentic-workspace-view-model";
import { AssistantResponse } from "./AssistantResponse";

interface AgentConversationPanelProps {
  activeAgent: AgentId;
  activeThread: ChatThread | null;
  activeThreadId: string | null;
  messages: ChatMessage[];
  historyLoading: boolean;
  prompt: string;
  reply: StreamedReply;
  onPromptChange: (prompt: string) => void;
  onSend: () => void;
  onCancelStream: () => void;
  onRetry: () => void;
  onCopyPrompt: () => void;
  onDismissReply: () => void;
  onCitationOpen: (citation: StreamCitation) => void;
}

export function AgentConversationPanel(props: AgentConversationPanelProps) {
  return (
    <Card padding="none" className="flex min-h-0 flex-col">
      <ConversationHeader
        activeAgent={props.activeAgent}
        activeThread={props.activeThread}
      />
      <MessageList {...props} />
      <PromptForm {...props} />
    </Card>
  );
}

function ConversationHeader(
  { activeAgent, activeThread }: {
    activeAgent: AgentId;
    activeThread: ChatThread | null;
  },
) {
  return (
    <div className="border-b border-dust-taupe p-5">
      <div className="flex items-center gap-2">
        <Badge variant="dark">{agentLabels[activeAgent]}Agent</Badge>
        <h2 className="truncate font-bold">
          {activeThread?.title ?? "No active thread"}
        </h2>
      </div>
      <p className="mt-1 text-xs text-slate-gray">
        Grounded in deal memory, engines, and VDR metadata
      </p>
    </div>
  );
}

function MessageList(props: AgentConversationPanelProps) {
  return (
    <div aria-live="polite" className="flex-1 space-y-4 overflow-y-auto p-6">
      {props.historyLoading
        ? <HistorySkeleton />
        : <ConversationBody {...props} />}
      {props.reply.status !== "idle" && <StreamedReplyCard {...props} />}
    </div>
  );
}

function ConversationBody(props: AgentConversationPanelProps) {
  if (props.messages.length === 0 && props.reply.status === "idle") {
    return <ConversationEmpty activeThreadId={props.activeThreadId} />;
  }
  return props.messages.map((message) => (
    <StoredMessage key={message.id} message={message} />
  ));
}

function HistorySkeleton() {
  return (
    <div aria-label="Loading conversation history" className="space-y-6">
      <div className="flex gap-3">
        <Skeleton variant="circular" width={32} height={32} />
        <Skeleton variant="rectangular" width="70%" height={88} />
      </div>
      <div className="flex justify-end gap-3">
        <Skeleton variant="rectangular" width="56%" height={72} />
        <Skeleton variant="circular" width={32} height={32} />
      </div>
    </div>
  );
}

function ConversationEmpty(
  { activeThreadId }: { activeThreadId: string | null },
) {
  return (
    <EmptyState
      title="Start a deal conversation"
      description={activeThreadId
        ? "Ask a scoped question. Final decisions remain with the deal team."
        : "Create a new thread before sending a deal-scoped question."}
    />
  );
}

function StoredMessage({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";
  return (
    <div className={`flex gap-3 ${isUser ? "flex-row-reverse" : ""}`}>
      <Avatar size="sm" fallback={isUser ? "YOU" : "AI"} />
      <Card
        variant={isUser ? "dark" : "raised"}
        padding="sm"
        className="max-w-[78%] text-sm"
      >
        {message.role === "assistant"
          ? <AssistantResponse content={message.content} />
          : <p className="break-words">{messageContent(message)}</p>}
      </Card>
    </div>
  );
}

function StreamedReplyCard(props: AgentConversationPanelProps) {
  return (
    <div className="flex gap-3">
      <Avatar size="sm" fallback="AI" />
      <Card variant="raised" padding="sm" className="max-w-[78%] text-sm">
        <StreamStatusBadge status={props.reply.status} />
        <StreamContent reply={props.reply} />
        <ToolAccordion reply={props.reply} />
        <CitationButtons reply={props.reply} onOpen={props.onCitationOpen} />
        <StoppedActions reply={props.reply} onCopyPrompt={props.onCopyPrompt} />
        <FailedActions {...props} />
      </Card>
    </div>
  );
}

function StreamStatusBadge({ status }: { status: StreamedReply["status"] }) {
  if (status !== "streaming" && status !== "reconnecting") return null;
  return (
    <Badge variant="orange">
      {status === "reconnecting" ? "Reconnecting" : "Responding"}
    </Badge>
  );
}

function StreamContent({ reply }: { reply: StreamedReply }) {
  if (reply.content) {
    return (
      <div className="mt-2">
        <AssistantResponse content={reply.content} />
        {reply.status === "reconnecting" && (
          <Skeleton className="mt-3" width="72%" />
        )}
      </div>
    );
  }
  return (
    <div className="mt-3 space-y-2">
      <Skeleton width={240} />
      <Skeleton width={200} />
      <Skeleton width={220} />
    </div>
  );
}

function ToolAccordion({ reply }: { reply: StreamedReply }) {
  if ((reply.tools?.length ?? 0) === 0) return null;
  return (
    <div className="mt-4">
      <Accordion
        variant="bordered"
        defaultOpenIds={reply.tools?.filter((tool) => tool.status === "running")
          .map((tool) => tool.id)}
        items={(reply.tools ?? []).map((tool) => ({
          id: tool.id,
          title: tool.name,
          badge: tool.status,
          content: <ToolResult result={tool.result} />,
        }))}
      />
    </div>
  );
}

function ToolResult({ result }: { result: unknown }) {
  return (
    <pre className="whitespace-pre-wrap text-xs">
      {result === undefined ? "Running…" : JSON.stringify(result, null, 2)}
    </pre>
  );
}

function CitationButtons(
  { reply, onOpen }: {
    reply: StreamedReply;
    onOpen: (citation: StreamCitation) => void;
  },
) {
  const citations = reply.citations ?? [];
  if (citations.length === 0) return null;
  return (
    <div className="mt-4 flex flex-wrap gap-2">
      {citations.map((citation) => (
        <CitationButton key={citation.id} citation={citation} onOpen={onOpen} />
      ))}
    </div>
  );
}

function CitationButton(
  { citation, onOpen }: {
    citation: StreamCitation;
    onOpen: (citation: StreamCitation) => void;
  },
) {
  return (
    <Button size="sm" variant="secondary" onClick={() => onOpen(citation)}>
      View citation
    </Button>
  );
}

function StoppedActions(
  { reply, onCopyPrompt }: {
    reply: StreamedReply;
    onCopyPrompt: () => void;
  },
) {
  if (reply.status !== "stopped") return null;
  return (
    <div className="mt-3">
      <Badge variant="default">Stopped</Badge>
      <CopyPromptButton className="ml-2" onCopyPrompt={onCopyPrompt} />
    </div>
  );
}

function CopyPromptButton(
  { className, onCopyPrompt }: {
    className?: string;
    onCopyPrompt: () => void;
  },
) {
  return (
    <Button
      className={className}
      size="sm"
      variant="secondary"
      onClick={onCopyPrompt}
    >
      Copy prompt
    </Button>
  );
}

function FailedActions(props: AgentConversationPanelProps) {
  if (props.reply.status !== "failed") return null;
  return (
    <div className="mt-3">
      <Icon name="alert" size="md" className="text-signal-orange" />
      <p className="mt-2 font-bold text-red-700">Response interrupted</p>
      <p className="mt-1 text-xs text-slate-gray">{props.reply.error}</p>
      <FailedActionButtons {...props} />
    </div>
  );
}

function FailedActionButtons(props: AgentConversationPanelProps) {
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      <Button size="sm" variant="primary" onClick={props.onRetry}>
        Retry
      </Button>
      <CopyPromptButton onCopyPrompt={props.onCopyPrompt} />
      <Button size="sm" variant="secondary" onClick={props.onDismissReply}>
        Dismiss
      </Button>
    </div>
  );
}

function PromptForm(props: AgentConversationPanelProps) {
  const disabled = promptDisabled(props);
  return (
    <form
      className="flex gap-3 border-t border-dust-taupe bg-white p-4"
      onSubmit={(event) => submitPromptForm(event, props.onSend)}
    >
      <Input
        variant="pill"
        value={props.prompt}
        onChange={(event) => props.onPromptChange(event.target.value)}
        placeholder="Ask the agent…"
        disabled={disabled}
      />
      <PromptButton {...props} disabled={disabled} />
    </form>
  );
}

function promptDisabled(props: AgentConversationPanelProps): boolean {
  return !props.activeThreadId || props.historyLoading ||
    props.reply.status === "streaming" || props.reply.status === "reconnecting";
}

function submitPromptForm(
  event: FormEvent<HTMLFormElement>,
  onSend: () => void,
) {
  event.preventDefault();
  onSend();
}

function PromptButton(
  props: AgentConversationPanelProps & { disabled: boolean },
) {
  if (streamingPromptStatus(props.reply.status)) {
    return <CancelPromptButton {...props} />;
  }
  return <SendPromptButton {...props} />;
}

function streamingPromptStatus(status: StreamedReply["status"]): boolean {
  return status === "streaming" || status === "reconnecting";
}

function CancelPromptButton(props: AgentConversationPanelProps) {
  return (
    <Button type="button" variant="secondary" onClick={props.onCancelStream}>
      Cancel response
    </Button>
  );
}

function SendPromptButton(
  props: AgentConversationPanelProps & { disabled: boolean },
) {
  return (
    <Button
      type="submit"
      variant="primary"
      disabled={props.disabled || !props.prompt.trim()}
    >
      Send
    </Button>
  );
}
