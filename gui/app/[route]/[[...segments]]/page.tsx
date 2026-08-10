import { AppShell } from "@/app/_shell/AppShell";
import { ShellState } from "@/app/_shell/ShellState";
import { fixtureShellAdapter } from "@/lib/shell/adapters";
import {
  readScreenAdapter,
  type ScreenPreviousAdapters,
} from "@/lib/adapters/screen-data";
import { resolveRouteContext } from "@/lib/shell/route-context";
import type { ScreenDataSource } from "@/screens/screen-contracts";

const previousAdapterRegistry = {
  shell: fixtureShellAdapter,
  screens: {} satisfies ScreenPreviousAdapters,
};

export default async function ShellRoute(
  { params }: { params: Promise<{ route: string; segments?: string[] }> },
) {
  const { route, segments = [] } = await params;
  const dataSource: ScreenDataSource =
    process.env.MAI_FRONTEND_DATA_SOURCE === "fixture" ? "fixture" : "v1";
  const result = await resolveRouteContext([route, ...segments], {
    dataSource,
    environment: process.env,
    previousShellAdapter: previousAdapterRegistry.shell,
  });
  if (result.kind !== "ready") return <ShellState result={result} />;
  const adapter = dataSource === "v1"
    ? await readScreenAdapter(result, {
      environment: process.env,
      previousAdapters: previousAdapterRegistry.screens,
    })
    : undefined;
  return (
    <AppShell resolution={result} dataSource={dataSource} adapter={adapter} />
  );
}
