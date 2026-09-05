import { InlineNotice } from "@/components";
import type { RouteResolution } from "@/lib/shell/route-context";

export function ShellState(
  { result }: { result: Exclude<RouteResolution, { kind: "ready" }> },
) {
  const restricted = result.kind === "forbidden" ||
    result.kind === "protected-not-found";
  return (
    <main data-capability-state={result.kind}>
      <InlineNotice
        role={restricted ? "restricted" : "warning"}
        title={titleFor(result.kind)}
      >
        {"reason" in result
          ? result.reason ?? "No protected context was rendered."
          : actionFor(result.kind)}
      </InlineNotice>
    </main>
  );
}

function titleFor(kind: Exclude<RouteResolution, { kind: "ready" }>["kind"]): string {
  if (kind === "not-found") return "Route not found";
  if (kind === "invalid-context") return "Invalid context";
  if (kind === "forbidden") return "Permission required";
  if (kind === "protected-not-found") return "Protected resource not found";
  return "Resource unavailable";
}

function actionFor(kind: Exclude<RouteResolution, { kind: "ready" }>["kind"]): string {
  if (kind === "forbidden") return "Request the required permission.";
  if (kind === "protected-not-found") return "Return to an authorized workspace.";
  return "No protected context was rendered.";
}
