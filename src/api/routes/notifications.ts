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
  const { request, url, path, method, store } = context;

  if (path === "/api/notifications") {
    if (method !== "GET") return methodNotAllowed(["GET"]);
    const unreadOnlyValue = url.searchParams.get("unreadOnly");
    const unreadOnly = parseBooleanQuery(unreadOnlyValue);
    if (unreadOnlyValue !== null && unreadOnly === undefined) {
      throw new HttpRouteError(
        400,
        "INVALID_QUERY",
        "unreadOnly must be true or false",
      );
    }
    const result = store.listNotifications({
      unreadOnly,
      cursor: url.searchParams.get("cursor") || undefined,
      limit: parseLimit(url.searchParams.get("limit"), 20),
    });
    return new Response(JSON.stringify(result), {
      headers: { "content-type": "application/json; charset=utf-8" },
    });
  }

  const notificationMatch = path.match(/^\/api\/notifications\/([^/]+)$/);
  if (notificationMatch) {
    const id = validateId(
      decodeURIComponent(notificationMatch[1]),
      "notificationId",
    );
    if (method !== "PATCH") return methodNotAllowed(["PATCH"]);
    const input = markRead.parse(await bodyAsJson(request));
    return jsonSuccess(store.markNotificationRead(id, input.read));
  }

  return null;
}
