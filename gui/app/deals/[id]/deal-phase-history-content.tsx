import type { DealDetail } from "@/lib/api-client";

export function DealPhaseHistoryContent(
  { entry }: { entry: DealDetail["phaseHistory"][number] },
) {
  return (
    <div className="space-y-2">
      <p>{entry.comment ?? "No transition comment."}</p>
      <p className="text-slate-gray">
        Changed by {entry.changedBy?.displayName ?? "System"}
      </p>
    </div>
  );
}
