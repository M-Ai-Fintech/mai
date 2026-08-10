import { AppShell } from "@/app/_shell/AppShell";
import { ShellState } from "@/app/_shell/ShellState";
import { readScreenAdapter } from "@/lib/adapters/screen-data";
import { resolveRouteContext } from "@/lib/shell/route-context";
export default async function ShellRoute({ params }: { params: Promise<{ route: string; segments?: string[] }> }) {
  const { route, segments = [] } = await params;
  const result = await resolveRouteContext([route, ...segments]);
  if (result.kind !== "ready") return <ShellState result={result} />;
  const dataSource = process.env.MAI_FRONTEND_DATA_SOURCE === "fixture"
    ? "fixture"
    : "v1";
  const adapter = dataSource === "v1"
    ? await readScreenAdapter(result)
    : undefined;
  return <AppShell resolution={result} dataSource={dataSource} adapter={adapter} />;
}
