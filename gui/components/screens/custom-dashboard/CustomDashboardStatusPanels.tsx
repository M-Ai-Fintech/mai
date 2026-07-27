import { Button } from "@/components/Button/Button";
import { Card } from "@/components/Card/Card";
import { Icon } from "@/components/Icon/Icon";
import { Skeleton } from "@/components/Skeleton/Skeleton";

export function DashboardLoading() {
  return (
    <div className="p-8" aria-label="Loading custom dashboard">
      <StaticDashboardToolbar />
      <div className="mt-6 grid grid-cols-3 gap-6">
        <Skeleton height={190} variant="rectangular" />
        <Skeleton height={190} variant="rectangular" />
        <Skeleton height={190} variant="rectangular" />
      </div>
      <Skeleton height={300} variant="rectangular" className="mt-6" />
      <div className="mt-6 grid grid-cols-2 gap-6">
        <Skeleton height={260} variant="rectangular" />
        <Skeleton height={260} variant="rectangular" />
      </div>
    </div>
  );
}

export function DashboardError(
  { onRetry, onReset }: { onRetry: () => void; onReset: () => void },
) {
  return (
    <div className="p-8">
      <StaticDashboardToolbar />
      <DashboardErrorCard onRetry={onRetry} onReset={onReset} />
    </div>
  );
}

function DashboardErrorCard(
  { onRetry, onReset }: { onRetry: () => void; onReset: () => void },
) {
  return (
    <Card
      variant="raised"
      className="flex min-h-[320px] flex-col items-center justify-center text-center"
    >
      <DashboardErrorMessage />
      <DashboardErrorActions onRetry={onRetry} onReset={onReset} />
    </Card>
  );
}

function DashboardErrorMessage() {
  return (
    <>
      <Icon name="alert" size="xl" className="text-signal-orange" />
      <h1 className="mt-4 text-xl font-bold">
        Dashboard layout could not be loaded
      </h1>
      <p className="mt-2 text-sm text-slate-gray">
        The saved layout remains unchanged.
      </p>
    </>
  );
}

function DashboardErrorActions(
  { onRetry, onReset }: { onRetry: () => void; onReset: () => void },
) {
  return (
    <div className="mt-5 flex gap-3">
      <Button variant="primary" onClick={onRetry}>Retry</Button>
      <Button variant="secondary" onClick={onReset}>Use default layout</Button>
    </div>
  );
}

export function StaticDashboardToolbar() {
  return (
    <div className="mb-6 flex items-center justify-between rounded-xl border border-dust-taupe bg-canvas-cream p-4">
      <h1 className="text-3xl font-bold">My dashboard layout</h1>
      <div className="flex gap-3">
        <Button variant="secondary" disabled>Edit layout</Button>
        <Button variant="primary" disabled>Save layout</Button>
      </div>
    </div>
  );
}
