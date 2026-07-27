import { Button } from "@/components/Button/Button";

export function DashboardHeader(
  { loading, onCreate }: { loading: boolean; onCreate: () => void },
) {
  return (
    <section className="flex flex-wrap items-end justify-between gap-4">
      <DashboardHeaderText />
      <Button variant="primary" size="md" onClick={onCreate} disabled={loading}>
        Create Deal
      </Button>
    </section>
  );
}

function DashboardHeaderText() {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-wider text-signal-orange">
        Executive pipeline
      </p>
      <h1 className="mt-1 text-3xl font-semibold tracking-tight text-ink-black">
        M&amp;A Pipeline
      </h1>
      <p className="mt-1 text-sm text-slate-gray">
        Monitor active mandates from sourcing through closing.
      </p>
    </div>
  );
}
