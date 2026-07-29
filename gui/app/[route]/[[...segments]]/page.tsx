import { AppShell } from "@/app/_shell/AppShell";
import { ShellState } from "@/app/_shell/ShellState";
import { resolveRouteContext } from "@/lib/shell/route-context";
export default async function ShellRoute({ params }: { params: Promise<{ route: string; segments?: string[] }> }) { const { route, segments = [] } = await params; const result = await resolveRouteContext([route, ...segments]); return result.kind === "ready" ? <AppShell resolution={result} /> : <ShellState result={result} />; }
