import { assertEquals } from "@std/assert";
import { DatabaseMemoryService } from "../../../src/core/db/DatabaseMemoryService.ts";

Deno.test("DatabaseMemoryService - Instantiation and connection attempt", async (t) => {
  const dbService = new DatabaseMemoryService();

  await t.step("should attempt to connect and return a boolean", async () => {
    const result = await dbService.connect();
    assertEquals(typeof result, "boolean");
  });

  await t.step("should close connection pool gracefully", async () => {
    await dbService.close();
  });
});
