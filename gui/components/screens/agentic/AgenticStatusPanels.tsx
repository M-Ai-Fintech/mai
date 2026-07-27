import { Button } from "@/components/Button/Button";
import { Card } from "@/components/Card/Card";
import { Icon } from "@/components/Icon/Icon";
import { Skeleton } from "@/components/Skeleton/Skeleton";

export function AgenticLoading() {
  return (
    <div
      className="mx-auto grid min-h-[calc(100vh-96px)] max-w-[2200px] grid-cols-[minmax(0,2fr)_minmax(0,5fr)_minmax(0,3fr)] gap-6 p-8"
      aria-label="Loading agentic workspace"
    >
      <AgenticSidebarLoading />
      <AgenticConversationLoading />
      <AgenticInsightsLoading />
    </div>
  );
}

function AgenticSidebarLoading() {
  return (
    <Card>
      <Skeleton height={32} />
      <Skeleton height={560} className="mt-5" variant="rectangular" />
    </Card>
  );
}

function AgenticConversationLoading() {
  return (
    <Card>
      <Skeleton height={40} />
      <div className="mt-8 space-y-5">
        <Skeleton width="72%" />
        <Skeleton width="52%" />
        <Skeleton width="80%" />
      </div>
    </Card>
  );
}

function AgenticInsightsLoading() {
  return (
    <div className="space-y-5">
      <Skeleton height={220} variant="rectangular" />
      <Skeleton height={180} variant="rectangular" />
    </div>
  );
}

export function AgenticError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="mx-auto grid min-h-[calc(100vh-96px)] max-w-[2200px] grid-cols-[minmax(0,2fr)_minmax(0,5fr)_minmax(0,3fr)] gap-6 p-8">
      <AgenticThreadErrorPanel />
      <AgenticErrorMessage onRetry={onRetry} />
      <AgenticAnalyticsErrorPanel />
    </div>
  );
}

function AgenticThreadErrorPanel() {
  return (
    <Card>
      <h2 className="font-bold">Agents & threads</h2>
      <Skeleton className="mt-5" height={300} variant="rectangular" />
    </Card>
  );
}

function AgenticErrorMessage({ onRetry }: { onRetry: () => void }) {
  return (
    <Card
      variant="raised"
      className="flex flex-col items-center justify-center text-center"
    >
      <Icon name="alert" size="xl" className="text-signal-orange" />
      <h1 className="mt-4 text-xl font-bold">Agentic workspace unavailable</h1>
      <p className="mt-2 text-sm text-slate-gray">
        The selected deal and conversation were preserved.
      </p>
      <Button className="mt-5" variant="primary" onClick={onRetry}>
        Retry
      </Button>
    </Card>
  );
}

function AgenticAnalyticsErrorPanel() {
  return (
    <Card>
      <h2 className="font-bold">Engine analytics</h2>
      <Skeleton className="mt-5" height={220} variant="rectangular" />
    </Card>
  );
}
