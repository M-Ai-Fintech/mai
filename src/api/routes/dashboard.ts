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
  const { path, method, store } = context;
  const layoutMatch = path.match(
    /^\/api\/users\/me\/dashboard-layouts\/([^/]+)$/,
  );
  if (!layoutMatch) return null;

  const slug = validatedSlug(layoutMatch[1]);
  if (method === "GET") return jsonSuccess(store.getDashboardLayout(slug));
  if (method === "PUT") return await updateLayout(context, slug);
  if (method === "DELETE") {
    return jsonSuccess(store.resetDashboardLayout(slug));
  }
  return methodNotAllowed(["GET", "PUT", "DELETE"]);
}

function validatedSlug(encodedSlug: string): string {
  const slug = decodeURIComponent(encodedSlug);
  if (/^[a-z0-9][a-z0-9-]{0,63}$/.test(slug)) return slug;
  throw new HttpRouteError(
    400,
    "INVALID_SLUG",
    `Dashboard layout slug "${slug}" is invalid; expected lowercase letters, numbers, or hyphens`,
  );
}

async function updateLayout(
  context: MvpRouteContext,
  slug: string,
): Promise<Response> {
  const input = putLayout.parse(await bodyAsJson(context.request));
  return jsonSuccess(
    context.store.putDashboardLayout(
      slug,
      input.version,
      input.widgets as DashboardWidget[],
    ),
  );
}
