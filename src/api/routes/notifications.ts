import { z } from "zod";
import { jsonSuccess, parseBooleanQuery } from "../contracts.ts";
import {
  bodyAsJson,
  HttpRouteError,
  methodNotAllowed,
  MvpRouteContext,
  parseLimit,
  validateId,
} from "./shared.ts";

const markRead = z.object({ read: z.literal(true) }).strict();

export async function handleNotificationRoutes(
  context: MvpRouteContext,
): Promise<Response | null> {
  return listNotifications(context) ?? await updateNotification(context);
}

function listNotifications(context: MvpRouteContext): Response | null {
  if (context.path !== "/api/notifications") return null;
  if (context.method !== "GET") return methodNotAllowed(["GET"]);
  const result = context.store.listNotifications({
    unreadOnly: unreadOnlyQuery(context.url),
    cursor: context.url.searchParams.get("cursor") || undefined,
    limit: parseLimit(context.url.searchParams.get("limit"), 20),
  });
  return jsonResult(result);
}

function unreadOnlyQuery(url: URL): boolean | undefined {
  const value = url.searchParams.get("unreadOnly");
  const parsed = parseBooleanQuery(value);
  if (value === null || parsed !== undefined) return parsed;
  throw new HttpRouteError(
    400,
    "INVALID_QUERY",
    `unreadOnly value "${value}" is invalid; expected "true" or "false"`,
  );
}

async function updateNotification(
  context: MvpRouteContext,
): Promise<Response | null> {
  const match = context.path.match(/^\/api\/notifications\/([^/]+)$/);
  if (!match) return null;
  if (context.method !== "PATCH") return methodNotAllowed(["PATCH"]);
  const id = validateId(decodeURIComponent(match[1]), "notificationId");
  const input = markRead.parse(await bodyAsJson(context.request));
  return jsonSuccess(context.store.markNotificationRead(id, input.read));
}

function jsonResult(value: unknown): Response {
  return new Response(JSON.stringify(value), {
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}
