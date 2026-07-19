import { assertEquals } from "@std/assert";
import { handleMvpRoute } from "../../../src/api/mvp_routes.ts";
import { MvpStore } from "../../../src/api/mvp_store.ts";
import { request, route } from "../support/route.ts";

Deno.test("MVP router returns null for unrelated paths and rejects malformed IDs", async () => {
  assertEquals(
    await handleMvpRoute(request("/api/legacy"), { store: new MvpStore() }),
    null,
  );
  const invalid = await route(new MvpStore(), "/api/entities/not-an-id");
  assertEquals(invalid.status, 400);
  assertEquals((await invalid.json()).error.code, "INVALID_ID");
});
