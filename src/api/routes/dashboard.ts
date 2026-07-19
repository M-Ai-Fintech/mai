import { z } from "zod";
import {
  DashboardWidget,
  DashboardWidgetType,
  jsonSuccess,
} from "../contracts.ts";
import {
  bodyAsJson,
  HttpRouteError,
  methodNotAllowed,
  MvpRouteContext,
  uuid,
} from "./shared.ts";

const widgetType = z.nativeEnum(DashboardWidgetType);

const widget = z.object({
  instanceId: uuid,
  type: widgetType,
  grid: z.object({
    x: z.number().int().nonnegative(),
    y: z.number().int().nonnegative(),
    w: z.number().int().positive(),
    h: z.number().int().positive(),
  }).strict(),
  config: z.record(z.string(), z.unknown()),
}).strict();

const putLayout = z.object({
  version: z.number().int().nonnegative(),
  widgets: z.array(widget),
}).strict();

export async function handleDashboardRoutes(
  context: MvpRouteContext,
): Promise<Response | null> {
  const { request, path, method, store } = context;
  const layoutMatch = path.match(
    /^\/api\/users\/me\/dashboard-layouts\/([^/]+)$/,
  );
  if (!layoutMatch) return null;

  const slug = decodeURIComponent(layoutMatch[1]);
  if (!/^[a-z0-9][a-z0-9-]{0,63}$/.test(slug)) {
    throw new HttpRouteError(
      400,
      "INVALID_SLUG",
      "Dashboard layout slug is invalid",
    );
  }
  if (method === "GET") return jsonSuccess(store.getDashboardLayout(slug));
  if (method === "PUT") {
    const input = putLayout.parse(await bodyAsJson(request));
    return jsonSuccess(
      store.putDashboardLayout(
        slug,
        input.version,
        input.widgets as DashboardWidget[],
      ),
    );
  }
  if (method === "DELETE") {
    return jsonSuccess(store.resetDashboardLayout(slug));
  }
  return methodNotAllowed(["GET", "PUT", "DELETE"]);
}
