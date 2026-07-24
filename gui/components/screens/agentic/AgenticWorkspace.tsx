"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ApiClient,
  type ChatMessage,
  type ChatThread,
  type DealDetail,
  type EngineRun,
} from "@/lib/api-client";
import { Accordion } from "@/components/Accordion/Accordion";
import { Avatar } from "@/components/Avatar/Avatar";
import { Badge } from "@/components/Badge/Badge";
import { Button } from "@/components/Button/Button";
import { Card } from "@/components/Card/Card";
import { EmptyState } from "@/components/EmptyState/EmptyState";
import { FormField } from "@/components/FormField/FormField";
import { Icon } from "@/components/Icon/Icon";
import { Input } from "@/components/Input/Input";
import { Dropdown } from "@/components/Dropdown/Dropdown";
import { Modal } from "@/components/Modal/Modal";
import { Skeleton } from "@/components/Skeleton/Skeleton";
import { Tabs } from "@/components/Tabs/Tabs";
import {
  Table,
  TableCell,
  TableHead,
  TableRow,
} from "@/components/Table/Table";
import { Toast } from "@/components/Toast/Toast";
import {
  type AgentId,
  AGENTS,
  decideStreamAction,
  formatCompactMoney,
  reduceStreamedReply,
  type StreamedReply,
  structureAssistantContent,
} from "./agentic-workspace-model";

interface AgenticWorkspaceProps {
  dealId: string;
}

type LoadState = "loading" | "ready" | "empty" | "error";
type ToastState = {
  title: string;
  message: string;
  variant: "success" | "error" | "info";
};

interface StreamRequestIdentity {
  threadId: string;
  agentId: AgentId;
  message: string;
  clientMessageId: string;
}
type StreamCitation = NonNullable<StreamedReply["citations"]>[number];

const agentLabels: Record<AgentId, string> = {
  BrokerOrchestratorAgent: "BrokerOrchestrator",
  FinancialRiskAgent: "FinancialRisk",
  LegalDueDiligenceAgent: "LegalDD",
  NegotiationAgent: "Negotiation",
};

function isAgentId(value: string): value is AgentId {
  return (AGENTS as readonly string[]).includes(value);
}

function messageContent(message: ChatMessage): string {
  if (
    message.role === "user" || message.role === "assistant" ||
    message.role === "system"
  ) {
    return message.content;
  }
  return `${message.toolName}: ${message.status}`;
}

function AssistantResponse({ content }: { content: string }) {
  const structured = structureAssistantContent(content);
  return (
    <div className="space-y-3 break-words">
      {structured.heading && (
        <h3 className="text-base font-bold text-ink-black">
          {structured.heading}
        </h3>
      )}
      {structured.paragraphs.map((paragraph, index) => (
        <p key={`${index}-${paragraph.slice(0, 24)}`}>{paragraph}</p>
      ))}
      {structured.bullets.length > 0 && (
        <ul className="list-disc space-y-1 pl-5">
          {structured.bullets.map((bullet, index) => (
            <li key={`${index}-${bullet.slice(0, 24)}`}>{bullet}</li>
          ))}
        </ul>
      )}
      {structured.table && (
        <Table className="text-xs">
          <TableHead>
            <TableRow isHeader>
              {structured.table.headers.map((header) => (
                <TableCell key={header} isHeader className="p-2">
                  {header}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <tbody>
            {structured.table.rows.map((row, rowIndex) => (
              <TableRow key={`${rowIndex}-${row.join("-")}`}>
                {row.map((cell, cellIndex) => (
                  <TableCell
                    key={`${cellIndex}-${cell}`}
                    className="p-2"
                    maxWidthClassName="max-w-[180px]"
                  >
                    {cell}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </tbody>
        </Table>
      )}
    </div>
  );
}

export function AgenticWorkspace({ dealId }: AgenticWorkspaceProps) {
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [deal, setDeal] = useState<DealDetail | null>(null);
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [activeAgent, setActiveAgent] = useState<AgentId>(AGENTS[0]);
  const [engineRuns, setEngineRuns] = useState<EngineRun[]>([]);
  const [vdrDocuments, setVdrDocuments] = useState<
    Array<{ id: string; name: string; mimeType: string }>
  >([]);
  const [prompt, setPrompt] = useState("");
  const [lastSubmittedPrompt, setLastSubmittedPrompt] = useState("");
  const [reply, setReply] = useState<StreamedReply>({
    content: "",
    status: "idle",
  });
  const [toast, setToast] = useState<ToastState | null>(null);
  const [threadModalOpen, setThreadModalOpen] = useState(false);
  const [threadTitle, setThreadTitle] = useState("");
  const [threadTitleError, setThreadTitleError] = useState<string | null>(null);
  const [threadCreating, setThreadCreating] = useState(false);
  const [engineStarting, setEngineStarting] = useState(false);
  const [engineError, setEngineError] = useState<string | null>(null);
  const [selectedVdrDocumentId, setSelectedVdrDocumentId] = useState<
    string | null
  >(null);
  const [selectedCitation, setSelectedCitation] = useState<
    StreamCitation | null
  >(null);
  const streamController = useRef<AbortController | null>(null);
  const streamSession = useRef(0);
  const lastStreamRequest = useRef<StreamRequestIdentity | null>(null);
  const lastEventId = useRef<string | undefined>(undefined);

  const load = useCallback(async () => {
    setLoadState("loading");
    try {
      const [dealData, threadData, runPage, documentPage] = await Promise.all([
        ApiClient.getDealDetail(dealId),
        ApiClient.listChatThreads(dealId),
        ApiClient.listDealEngineRuns(dealId, { pageSize: 20 }),
        ApiClient.listVdrDocuments(dealId, { pageSize: 20 }),
      ]);
      setDeal(dealData);
      setThreads(threadData);
      setEngineRuns(runPage.data);
      setVdrDocuments(documentPage.data);
      const firstThread = threadData.find((thread) =>
        thread.agentId === AGENTS[0]
      ) ?? null;
      streamSession.current += 1;
      streamController.current?.abort();
      lastStreamRequest.current = null;
      lastEventId.current = undefined;
      setReply({ content: "", status: "idle" });
      setMessages([]);
      setHistoryLoading(Boolean(firstThread));
      setActiveThreadId(firstThread?.id ?? null);
      setActiveAgent(AGENTS[0]);
      setLoadState(firstThread ? "ready" : "empty");
    } catch {
      setLoadState("error");
    }
  }, [dealId]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  useEffect(() => {
    if (!activeThreadId) return;
    let active = true;
    ApiClient.listChatMessages(dealId, activeThreadId)
      .then((result) => {
        if (active) setMessages(result.data);
      })
      .catch(() => {
        if (active) {
          setToast({
            title: "Conversation unavailable",
            message: "Retry by selecting this thread again.",
            variant: "error",
          });
        }
      })
      .finally(() => {
        if (active) setHistoryLoading(false);
      });
    return () => {
      active = false;
    };
  }, [activeThreadId, dealId]);

  const selectAgent = (id: string) => {
    if (!isAgentId(id)) return;
    setActiveAgent(id);
    const nextThreadId = threads.find((thread) => thread.agentId === id)?.id ??
      null;
    streamSession.current += 1;
    streamController.current?.abort();
    lastStreamRequest.current = null;
    lastEventId.current = undefined;
    setReply({ content: "", status: "idle" });
    setMessages([]);
    setHistoryLoading(Boolean(nextThreadId));
    setActiveThreadId(nextThreadId);
  };

  const selectThread = (threadId: string) => {
    if (threadId === activeThreadId) return;
    streamSession.current += 1;
    streamController.current?.abort();
    lastStreamRequest.current = null;
    lastEventId.current = undefined;
    setReply({ content: "", status: "idle" });
    setMessages([]);
    setHistoryLoading(true);
    setActiveThreadId(threadId);
  };

  const createThread = async () => {
    if (!threadTitle.trim()) {
      setThreadTitleError("Thread title is required.");
      return;
    }
    setThreadCreating(true);
    try {
      const thread = await ApiClient.createChatThread(dealId, {
        title: threadTitle.trim(),
        agentId: activeAgent,
      });
      setThreads((current) => [thread, ...current]);
      streamSession.current += 1;
      streamController.current?.abort();
      lastStreamRequest.current = null;
      lastEventId.current = undefined;
      setReply({ content: "", status: "idle" });
      setMessages([]);
      setHistoryLoading(true);
      setActiveThreadId(thread.id);
      setLoadState("ready");
      setThreadModalOpen(false);
      setToast({
        title: "Thread created",
        message: `${thread.title} is ready.`,
        variant: "success",
      });
    } catch {
      setToast({
        title: "Thread not created",
        message: "The workspace could not start a new conversation.",
        variant: "error",
      });
    } finally {
      setThreadCreating(false);
    }
  };

  const executeStream = async (
    request: StreamRequestIdentity,
    resume = false,
  ) => {
    const sessionId = streamSession.current + 1;
    streamSession.current = sessionId;
    lastStreamRequest.current = request;
    if (!resume) lastEventId.current = undefined;

    let reconnectCount = 0;
    while (streamSession.current === sessionId) {
      const reconnecting = resume || reconnectCount > 0;
      setReply((current) =>
        reconnecting
          ? { ...current, status: "reconnecting", error: undefined }
          : { content: "", status: "streaming", tools: [], citations: [] }
      );
      if (reconnecting) {
        setToast({
          title: "Reconnecting to response",
          message: `Resume attempt ${
            reconnectCount + 1
          } of 3 is using the same message identity.`,
          variant: "info",
        });
      }

      const controller = new AbortController();
      streamController.current = controller;
      let terminal: "completed" | "failed" | null = null;
      let retryable = true;
      let failureMessage = "The response stream closed before completion.";

      try {
        await ApiClient.streamChat(
          dealId,
          request.threadId,
          {
            agentId: request.agentId,
            message: request.message,
            clientMessageId: request.clientMessageId,
          },
          {
            signal: controller.signal,
            lastEventId: reconnecting ? lastEventId.current : undefined,
            onEvent: (event) => {
              if (streamSession.current !== sessionId) return;
              lastEventId.current = event.eventId;
              if (event.event === "response.completed") terminal = "completed";
              if (event.event === "response.failed") {
                terminal = "failed";
                retryable = event.data.retryable;
                failureMessage = event.data.message;
              }
              setReply((current) => reduceStreamedReply(current, event));
            },
          },
        );
      } catch (cause) {
        failureMessage = cause instanceof Error
          ? cause.message
          : "Connection lost";
      } finally {
        if (streamController.current === controller) {
          streamController.current = null;
        }
      }

      if (streamSession.current !== sessionId) return;
      if (controller.signal.aborted) {
        setReply((current) => ({
          ...current,
          status: "stopped",
          error: undefined,
        }));
        return;
      }
      const action = decideStreamAction(terminal, retryable, reconnectCount);
      if (action === "complete") {
        setToast({
          title: "Response complete",
          message: `${agentLabels[request.agentId]} finished the response.`,
          variant: "success",
        });
        return;
      }
      if (action === "reconnect") {
        reconnectCount += 1;
        resume = true;
        continue;
      }

      setReply((current) => ({
        ...current,
        status: "failed",
        error: failureMessage,
      }));
      setToast({
        title: "Stream interrupted",
        message:
          "Automatic reconnects were exhausted. The prompt and partial response are preserved.",
        variant: "error",
      });
      return;
    }
  };

  const send = async () => {
    const text = prompt.trim();
    if (
      !text || !activeThreadId || historyLoading ||
      reply.status === "streaming" || reply.status === "reconnecting"
    ) return;
    setPrompt("");
    setLastSubmittedPrompt(text);
    const clientMessageId = crypto.randomUUID();
    const optimistic: ChatMessage = {
      id: crypto.randomUUID(),
      threadId: activeThreadId,
      role: "user",
      content: text,
      clientMessageId,
      createdAt: new Date().toISOString(),
    };
    setMessages((current) => [...current, optimistic]);
    await executeStream({
      threadId: activeThreadId,
      agentId: activeAgent,
      message: text,
      clientMessageId,
    });
  };

  const retryLastStream = async () => {
    const request = lastStreamRequest.current;
    if (!request || request.threadId !== activeThreadId) return;
    await executeStream(request, true);
  };

  const copyLastPrompt = async () => {
    try {
      await navigator.clipboard.writeText(
        lastStreamRequest.current?.message ?? lastSubmittedPrompt,
      );
      setToast({
        title: "Prompt copied",
        message: "The last submitted prompt is on your clipboard.",
        variant: "success",
      });
    } catch {
      setToast({
        title: "Prompt not copied",
        message: "Clipboard access is unavailable in this browser.",
        variant: "error",
      });
    }
  };

  const openCitation = (citation: StreamCitation) => {
    setSelectedCitation(citation);
    setSelectedVdrDocumentId(citation.documentId);
    setToast({
      title: "Citation opened",
      message: `${citation.label}${
        citation.page ? ` · page ${citation.page}` : ""
      }`,
      variant: "info",
    });
  };

  const runFinancialRisk = async () => {
    setEngineStarting(true);
    setEngineError(null);
    try {
      const run = await ApiClient.runDealEngine(dealId, {
        engine: "financial_risk",
        input: {},
      });
      setEngineRuns((current) => [run, ...current]);
      setToast({
        title: "Analysis started",
        message: "Financial risk results are linked to this deal.",
        variant: "success",
      });
    } catch (cause) {
      setEngineError(
        cause instanceof Error
          ? cause.message
          : "Financial risk analysis failed.",
      );
    } finally {
      setEngineStarting(false);
    }
  };

  const financialRun = engineRuns.find((run) =>
    run.engine === "financial_risk"
  );
  const financialRunning = engineStarting ||
    financialRun?.status === "queued" || financialRun?.status === "running";
  const financialFailure = engineError ??
    (financialRun?.status === "failed"
      ? financialRun.error?.message ?? "Financial risk analysis failed."
      : null);
  const financialScore = typeof financialRun?.result?.score === "number"
    ? financialRun.result.score.toFixed(1)
    : "2.4";
  const matchRun = engineRuns.find((run) =>
    run.engine === "portfolio_match" && run.status === "completed"
  );
  const valuation = deal
    ? `${
      formatCompactMoney(
        deal.valuationRange.min.amountMinor,
        deal.valuationRange.min.currency,
      )
    }–${
      formatCompactMoney(
        deal.valuationRange.max.amountMinor,
        deal.valuationRange.max.currency,
      )
    }`
    : "—";
  const threadTabs = AGENTS.map((agent) => ({
    id: agent,
    label: agentLabels[agent],
    disabled: agent !== AGENTS[0],
  }));
  const visibleThreads = threads.filter((thread) =>
    thread.agentId === activeAgent
  );
  const activeThread = threads.find((thread) => thread.id === activeThreadId) ??
    null;
  const documentItems = vdrDocuments.map((document) => ({
    id: document.id,
    title: document.name,
    subtitle: document.mimeType,
    badge: "VDR",
    content: (
      <div className="space-y-3">
        <p>Confidential source metadata. Content remains inside the VDR.</p>
        {selectedCitation?.documentId === document.id && (
          <div className="border-t border-dust-taupe pt-3">
            <p className="font-bold">
              {selectedCitation.label}
              {selectedCitation.page ? ` · page ${selectedCitation.page}` : ""}
            </p>
            {selectedCitation.excerpt && (
              <p className="mt-1 text-slate-gray">{selectedCitation.excerpt}</p>
            )}
          </div>
        )}
        <Button
          size="sm"
          variant="secondary"
          onClick={() => setSelectedVdrDocumentId(document.id)}
        >
          View citation
        </Button>
      </div>
    ),
  }));

  if (loadState === "loading") {
    return <AgenticLoading />;
  }

  if (loadState === "error") {
    return <AgenticError onRetry={() => void load()} />;
  }

  return (
    <div className="mx-auto flex min-h-[calc(100vh-96px)] max-w-[2200px] flex-col gap-6 p-8 text-left">
      <header className="flex items-end justify-between gap-6">
        <div>
          <Badge variant="orange">Agentic deal workspace</Badge>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-ink-black">
            {deal?.title ?? "Deal workspace"}
          </h1>
          <p className="mt-1 text-sm text-slate-gray">
            {deal?.code} · {deal?.target.legalName} · {valuation}
          </p>
        </div>
        <Badge variant="outline">ONNX connected</Badge>
      </header>

      <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,2fr)_minmax(0,5fr)_minmax(0,3fr)] gap-6">
        <Card padding="sm" className="flex min-h-0 flex-col">
          <div className="flex items-center justify-between gap-3 px-1 pb-4">
            <h2 className="font-bold">Agents & threads</h2>
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                setThreadTitle("");
                setThreadTitleError(null);
                setThreadModalOpen(true);
              }}
            >
              New thread
            </Button>
          </div>
          <Tabs
            tabs={threadTabs}
            activeTab={activeAgent}
            onChange={selectAgent}
            className="max-w-full overflow-x-auto"
          />
          <div className="mt-4 space-y-2 overflow-y-auto">
            {visibleThreads.length === 0
              ? (
                <EmptyState
                  title="No threads yet"
                  description={`Start a ${
                    agentLabels[activeAgent]
                  } conversation.`}
                  actionLabel="New thread"
                  onAction={() => {
                    setThreadTitle("");
                    setThreadTitleError(null);
                    setThreadModalOpen(true);
                  }}
                />
              )
              : visibleThreads.map((thread) => (
                <Button
                  key={thread.id}
                  variant={thread.id === activeThreadId
                    ? "primary"
                    : "secondary"}
                  onClick={() => selectThread(thread.id)}
                  className="w-full justify-start rounded-lg p-3 text-left"
                >
                  <span className="block truncate text-sm font-bold">
                    {thread.title}
                  </span>
                  <span className="mt-1 block text-xs opacity-70">
                    {new Date(thread.updatedAt).toLocaleString()}
                  </span>
                </Button>
              ))}
          </div>
        </Card>

        <Card padding="none" className="flex min-h-0 flex-col">
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
          <div
            aria-live="polite"
            className="flex-1 space-y-4 overflow-y-auto p-6"
          >
            {historyLoading
              ? (
                <div
                  aria-label="Loading conversation history"
                  className="space-y-6"
                >
                  <div className="flex gap-3">
                    <Skeleton variant="circular" width={32} height={32} />
                    <Skeleton variant="rectangular" width="70%" height={88} />
                  </div>
                  <div className="flex justify-end gap-3">
                    <Skeleton variant="rectangular" width="56%" height={72} />
                    <Skeleton variant="circular" width={32} height={32} />
                  </div>
                </div>
              )
              : messages.length === 0 && reply.status === "idle"
              ? (
                <EmptyState
                  title="Start a deal conversation"
                  description={activeThreadId
                    ? "Ask a scoped question. Final decisions remain with the deal team."
                    : "Create a new thread before sending a deal-scoped question."}
                />
              )
              : messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex gap-3 ${
                    message.role === "user" ? "flex-row-reverse" : ""
                  }`}
                >
                  <Avatar
                    size="sm"
                    fallback={message.role === "user" ? "YOU" : "AI"}
                  />
                  <Card
                    variant={message.role === "user" ? "dark" : "raised"}
                    padding="sm"
                    className="max-w-[78%] text-sm"
                  >
                    {message.role === "assistant"
                      ? <AssistantResponse content={message.content} />
                      : <p className="break-words">{messageContent(message)}
                      </p>}
                  </Card>
                </div>
              ))}
            {reply.status !== "idle" && (
              <div className="flex gap-3">
                <Avatar size="sm" fallback="AI" />
                <Card
                  variant="raised"
                  padding="sm"
                  className="max-w-[78%] text-sm"
                >
                  {(reply.status === "streaming" ||
                    reply.status === "reconnecting") && (
                    <Badge variant="orange">
                      {reply.status === "reconnecting"
                        ? "Reconnecting"
                        : "Responding"}
                    </Badge>
                  )}
                  {reply.content
                    ? (
                      <div className="mt-2">
                        <AssistantResponse content={reply.content} />
                      </div>
                    )
                    : (
                      <div className="mt-3 space-y-2">
                        <Skeleton width={240} />
                        <Skeleton width={200} />
                        <Skeleton width={220} />
                      </div>
                    )}
                  {reply.status === "reconnecting" && reply.content && (
                    <Skeleton className="mt-3" width="72%" />
                  )}
                  {(reply.tools?.length ?? 0) > 0 && (
                    <div className="mt-4">
                      <Accordion
                        variant="bordered"
                        defaultOpenIds={reply.tools?.filter((tool) =>
                          tool.status === "running"
                        ).map((tool) => tool.id)}
                        items={(reply.tools ?? []).map((tool) => ({
                          id: tool.id,
                          title: tool.name,
                          badge: tool.status,
                          content: (
                            <pre className="whitespace-pre-wrap text-xs">{tool.result === undefined ? "Running…" : JSON.stringify(tool.result, null, 2)}</pre>
                          ),
                        }))}
                      />
                    </div>
                  )}
                  {(reply.citations?.length ?? 0) > 0 && (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {reply.citations?.map((citation) => (
                        <Button
                          key={citation.id}
                          size="sm"
                          variant="secondary"
                          onClick={() => openCitation(citation)}
                        >
                          View citation
                        </Button>
                      ))}
                    </div>
                  )}
                  {reply.status === "stopped" && (
                    <div className="mt-3">
                      <Badge variant="default">Stopped</Badge>
                      <Button
                        className="ml-2"
                        size="sm"
                        variant="secondary"
                        onClick={() => void copyLastPrompt()}
                      >
                        Copy prompt
                      </Button>
                    </div>
                  )}
                  {reply.status === "failed" && (
                    <div className="mt-3">
                      <Icon
                        name="alert"
                        size="md"
                        className="text-signal-orange"
                      />
                      <p className="mt-2 font-bold text-red-700">
                        Response interrupted
                      </p>
                      <p className="mt-1 text-xs text-slate-gray">
                        {reply.error}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          variant="primary"
                          onClick={() => void retryLastStream()}
                        >
                          Retry
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => void copyLastPrompt()}
                        >
                          Copy prompt
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() =>
                            setReply({ content: "", status: "idle" })}
                        >
                          Dismiss
                        </Button>
                      </div>
                    </div>
                  )}
                </Card>
              </div>
            )}
          </div>
          <form
            className="flex gap-3 border-t border-dust-taupe bg-white p-4"
            onSubmit={(event) => {
              event.preventDefault();
              void send();
            }}
          >
            <Input
              variant="pill"
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              placeholder="Ask the agent…"
              disabled={!activeThreadId || historyLoading ||
                reply.status === "streaming" || reply.status === "reconnecting"}
            />
            {(reply.status === "streaming" || reply.status === "reconnecting")
              ? (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => streamController.current?.abort()}
                >
                  Cancel response
                </Button>
              )
              : (
                <Button
                  type="submit"
                  variant="primary"
                  disabled={!activeThreadId || historyLoading || !prompt.trim()}
                >
                  Send
                </Button>
              )}
          </form>
        </Card>

        <aside className="space-y-5 overflow-y-auto">
          {financialRunning
            ? (
              <Card variant="raised">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-bold">Financial risk</p>
                  <Button size="sm" variant="secondary" disabled>
                    Run analysis
                  </Button>
                </div>
                <div
                  aria-label="Financial risk analysis running"
                  className="mt-4 space-y-2"
                >
                  <Skeleton variant="rectangular" height={72} />
                  <Skeleton width="70%" />
                </div>
              </Card>
            )
            : financialFailure
            ? (
              <Card variant="raised">
                <Icon name="alert" size="lg" className="text-signal-orange" />
                <h3 className="mt-3 font-bold">Financial risk failed</h3>
                <p role="alert" className="mt-2 text-sm text-slate-gray">
                  {financialFailure}
                </p>
                <Button
                  className="mt-4"
                  size="sm"
                  variant="primary"
                  onClick={() => void runFinancialRisk()}
                >
                  Retry
                </Button>
              </Card>
            )
            : financialRun?.status === "completed"
            ? (
              <Card variant="raised">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-gray">
                  Financial risk score
                </p>
                <div className="mt-4 flex items-end justify-between">
                  <strong className="text-4xl">
                    {financialScore}
                    <span className="text-base text-slate-gray">/ 5.0</span>
                  </strong>
                  <Badge variant="orange">Moderate risk</Badge>
                </div>
                {financialRun.completedAt && (
                  <p className="mt-4 text-xs text-slate-gray">
                    Completed{" "}
                    {new Intl.DateTimeFormat("en-US", { dateStyle: "medium" })
                      .format(new Date(financialRun.completedAt))}
                  </p>
                )}
                <div className="mt-4">
                  <Accordion
                    variant="bordered"
                    items={[{
                      id: financialRun.id,
                      title: "Analysis details",
                      subtitle: "Deal-derived engine output",
                      content: (
                        <pre className="whitespace-pre-wrap text-xs">{JSON.stringify(financialRun.result, null, 2)}</pre>
                      ),
                    }]}
                  />
                </div>
              </Card>
            )
            : (
              <Card variant="raised">
                <EmptyState
                  title="No financial risk run"
                  description="Run a deal-scoped analysis to populate this card."
                  actionLabel="Run analysis"
                  onAction={() => void runFinancialRisk()}
                />
              </Card>
            )}
          <Card variant="raised">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-gray">
              Deal match score
            </p>
            <p className="mt-3 text-2xl font-bold">
              {matchRun ? valuation : "Not calculated"}
            </p>
            <p className="mt-1 text-xs text-slate-gray">
              Portfolio optimization range
            </p>
          </Card>
          <Card>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-bold">VDR documents ingested</h3>
              <Badge variant="default">{vdrDocuments.length}</Badge>
            </div>
            {documentItems.length
              ? (
                <Accordion
                  key={selectedVdrDocumentId ?? "vdr-closed"}
                  items={documentItems}
                  variant="bordered"
                  defaultOpenIds={selectedVdrDocumentId
                    ? [selectedVdrDocumentId]
                    : []}
                />
              )
              : (
                <EmptyState
                  title="No VDR documents"
                  description="Upload source documents before requesting cited analysis."
                />
              )}
          </Card>
        </aside>
      </div>
      <Modal
        isOpen={threadModalOpen}
        onClose={() => !threadCreating && setThreadModalOpen(false)}
        size="md"
        title="New agent thread"
        subtitle="Create a deal-scoped conversation using an approved agent."
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setThreadModalOpen(false)}
              disabled={threadCreating}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={() => void createThread()}
              disabled={threadCreating}
            >
              {threadCreating ? "Creating…" : "Create thread"}
            </Button>
          </>
        }
      >
        <div className="space-y-5">
          <FormField
            label="Title"
            required
            error={threadTitleError ?? undefined}
          >
            <Input
              autoFocus
              value={threadTitle}
              hasError={Boolean(threadTitleError)}
              onChange={(event) => {
                setThreadTitle(event.target.value);
                setThreadTitleError(null);
              }}
            />
          </FormField>
          <FormField label="Agent" required>
            <Dropdown
              options={AGENTS.map((agent) => ({
                value: agent,
                label: agentLabels[agent],
                disabled: agent !== AGENTS[0],
              }))}
              value={activeAgent}
              onChange={(value) => {
                const next = Array.isArray(value) ? value[0] : value;
                if (isAgentId(next)) setActiveAgent(next);
              }}
            />
          </FormField>
        </div>
      </Modal>
      {toast && (
        <div className="fixed bottom-6 right-6 z-50">
          <Toast {...toast} onClose={() => setToast(null)} />
        </div>
      )}
    </div>
  );
}

function AgenticLoading() {
  return (
    <div
      className="mx-auto grid min-h-[calc(100vh-96px)] max-w-[2200px] grid-cols-[minmax(0,2fr)_minmax(0,5fr)_minmax(0,3fr)] gap-6 p-8"
      aria-label="Loading agentic workspace"
    >
      <Card>
        <Skeleton height={32} />
        <Skeleton height={560} className="mt-5" variant="rectangular" />
      </Card>
      <Card>
        <Skeleton height={40} />
        <div className="mt-8 space-y-5">
          <Skeleton width="72%" />
          <Skeleton width="52%" />
          <Skeleton width="80%" />
        </div>
      </Card>
      <div className="space-y-5">
        <Skeleton height={220} variant="rectangular" />
        <Skeleton height={180} variant="rectangular" />
      </div>
    </div>
  );
}

function AgenticError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="mx-auto grid min-h-[calc(100vh-96px)] max-w-[2200px] grid-cols-[minmax(0,2fr)_minmax(0,5fr)_minmax(0,3fr)] gap-6 p-8">
      <Card>
        <h2 className="font-bold">Agents & threads</h2>
        <Skeleton className="mt-5" height={300} variant="rectangular" />
      </Card>
      <Card
        variant="raised"
        className="flex flex-col items-center justify-center text-center"
      >
        <Icon name="alert" size="xl" className="text-signal-orange" />
        <h1 className="mt-4 text-xl font-bold">
          Agentic workspace unavailable
        </h1>
        <p className="mt-2 text-sm text-slate-gray">
          The selected deal and conversation were preserved.
        </p>
        <Button className="mt-5" variant="primary" onClick={onRetry}>
          Retry
        </Button>
      </Card>
      <Card>
        <h2 className="font-bold">Engine analytics</h2>
        <Skeleton className="mt-5" height={220} variant="rectangular" />
      </Card>
    </div>
  );
}
