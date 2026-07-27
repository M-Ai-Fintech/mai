import type { ChatThread } from "@/lib/api-client";
import { Button } from "@/components/Button/Button";
import { Card } from "@/components/Card/Card";
import { EmptyState } from "@/components/EmptyState/EmptyState";
import { Tabs } from "@/components/Tabs/Tabs";
import type { AgentId } from "./agentic-workspace-model";
import { agentLabels } from "./agentic-workspace-view-model";

interface AgentThreadSidebarProps {
  activeAgent: AgentId;
  activeThreadId: string | null;
  threadTabs: Array<{ id: AgentId; label: string; disabled: boolean }>;
  visibleThreads: ChatThread[];
  onAgentChange: (id: string) => void;
  onThreadSelect: (threadId: string) => void;
  onNewThread: () => void;
}

export function AgentThreadSidebar(props: AgentThreadSidebarProps) {
  return (
    <Card padding="sm" className="flex min-h-0 flex-col">
      <ThreadSidebarHeader onNewThread={props.onNewThread} />
      <Tabs
        tabs={props.threadTabs}
        activeTab={props.activeAgent}
        onChange={props.onAgentChange}
        className="max-w-full overflow-x-auto"
      />
      <div className="mt-4 space-y-2 overflow-y-auto">
        <ThreadList {...props} />
      </div>
    </Card>
  );
}

function ThreadSidebarHeader({ onNewThread }: { onNewThread: () => void }) {
  return (
    <div className="flex items-center justify-between gap-3 px-1 pb-4">
      <h2 className="font-bold">Agents & threads</h2>
      <Button variant="primary" size="sm" onClick={onNewThread}>
        New thread
      </Button>
    </div>
  );
}

function ThreadList(props: AgentThreadSidebarProps) {
  if (props.visibleThreads.length === 0) {
    return (
      <EmptyState
        title="No threads yet"
        description={`Start a ${agentLabels[props.activeAgent]} conversation.`}
        actionLabel="New thread"
        onAction={props.onNewThread}
      />
    );
  }
  return props.visibleThreads.map((thread) => (
    <ThreadButton
      key={thread.id}
      thread={thread}
      selected={thread.id === props.activeThreadId}
      onSelect={props.onThreadSelect}
    />
  ));
}

function ThreadButton(
  { thread, selected, onSelect }: {
    thread: ChatThread;
    selected: boolean;
    onSelect: (threadId: string) => void;
  },
) {
  return (
    <Button
      variant={selected ? "primary" : "secondary"}
      onClick={() => onSelect(thread.id)}
      className="w-full justify-start rounded-lg p-3 text-left"
    >
      <span className="block truncate text-sm font-bold">{thread.title}</span>
      <span className="mt-1 block text-xs opacity-70">
        {new Date(thread.updatedAt).toLocaleString()}
      </span>
    </Button>
  );
}
