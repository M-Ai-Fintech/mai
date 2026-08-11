import { assertEquals } from "@std/assert";
import {
  apiCorsHeaders,
  withMvpPersistenceHeaders,
} from "../../src/api/server_runtime.ts";

Deno.test("API CORS contract exposes correlation and concurrency headers", () => {
  const headers = apiCorsHeaders();
  assertEquals(headers.get("Access-Control-Allow-Origin"), "*");
  assertEquals(
    headers.get("Access-Control-Expose-Headers"),
    "ETag, X-Correlation-Id",
  );
  assertEquals(
    headers.get("Access-Control-Allow-Headers")?.includes("If-Match"),
    true,
  );
});

Deno.test("retained MVP responses remain explicitly mock-backed", async () => {
  const response = withMvpPersistenceHeaders(
    Response.json({ status: "synthetic" }),
    apiCorsHeaders(),
  );
  assertEquals(
    response.headers.get("X-MAI-Persistence"),
    "mock-backed-in-memory",
  );
  assertEquals(await response.json(), { status: "synthetic" });
});
