import { assertEquals } from "@std/assert";
import { createApiServer } from "../../../src/api/server.ts";

Deno.test("API router rejects new traffic after drain begins", async () => {
  const router = createApiServer();
  router.readiness.setDatabaseState(true);
  router.readiness.beginDrain();
  const response = await router.handle(
    new Request("http://localhost/api/v1/unknown"),
  );
  assertEquals(response.status, 503);
  assertEquals((await response.json()).error, "api_draining");
});
