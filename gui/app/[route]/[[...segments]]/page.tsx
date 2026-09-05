import { AppShell } from "@/app/_shell/AppShell";
import { ShellState } from "@/app/_shell/ShellState";
import {
  readScreenAdapter,
  type ScreenPreviousAdapters,
} from "@/lib/adapters/screen-data";
import { resolveRouteContext } from "@/lib/shell/route-context";
import type { ScreenDataSource } from "@/screens/screen-contracts";
import { cookies, headers } from "next/headers";
import { createDemoReadinessShellAdapter } from "@/lib/shell/demo-readiness-adapter";
import { serverSession } from "@/lib/auth/server-session";
import { createWorkspaceShellAdapter } from "@/lib/shell/workspace-shell-adapter";

const previousAdapterRegistry = {
  screens: {} satisfies ScreenPreviousAdapters,
};

export default async function ShellRoute(
  { params }: { params: Promise<{ route: string; segments?: string[] }> },
) {
  const { route, segments = [] } = await params;
  const demoEnabled = process.env.NEXT_PUBLIC_MAI_DEMO_READINESS_ENABLED ===
    "true";
  const dealId = segments[0] ?? process.env.MAI_LOCAL_DEAL_ID ??
    process.env.MAI_DEMO_DEAL_ID ??
    (demoEnabled ? "deal_serra-azul" : "");
  const requestHeaders = await demoRequestHeaders(dealId, process.env);
  const dataSource: ScreenDataSource =
    process.env.MAI_FRONTEND_DATA_SOURCE === "fixture" ? "fixture" : "v1";
  const v1ShellAdapter = demoEnabled && dealId !== ""
    ? createDemoReadinessShellAdapter(dealId, { headers: requestHeaders })
    : createWorkspaceShellAdapter({ headers: requestHeaders });
  const result = await resolveRouteContext([route, ...segments], {
    dataSource,
    environment: process.env,
    v1ShellAdapter,
  });
  if (result.kind !== "ready") return <ShellState result={result} />;
  const adapter = dataSource === "v1"
    ? await readScreenAdapter(result, {
      environment: process.env,
      previousAdapters: previousAdapterRegistry.screens,
      routeParameters: { dealId },
      headers: requestHeaders,
    })
    : undefined;
  return (
    <AppShell resolution={result} dataSource={dataSource} adapter={adapter} />
  );
}

async function demoRequestHeaders(
  dealId: string,
  environment: Readonly<Record<string, string | undefined>>,
): Promise<Headers> {
  const incoming = await headers();
  const session = serverSession(
    (await cookies()).get("mai_session")?.value,
    environment,
  );
  const authorization = incoming.get("authorization") ??
    (session === undefined ? undefined : `Bearer ${session}`);
  const result = new Headers();
  if (authorization !== undefined) result.set("Authorization", authorization);
  result.set("X-Deal-Id", dealId);
  result.set(
    "X-Correlation-Id",
    incoming.get("x-correlation-id") ??
      `cor_${crypto.randomUUID().replaceAll("-", "")}`,
  );
  return result;
}
