import { assertEquals } from "@std/assert";
import { DatabaseMemoryService } from "../../src/core/db/DatabaseMemoryService.ts";

Deno.test("DatabaseMemoryService retry mechanism", async () => {
  // Create an instance pointing to a non-existent DB to trigger ECONNREFUSED
  const db = new DatabaseMemoryService(
    "postgresql://postgres:postgres@localhost:5433/invalid_db",
  );

  // Attempt a query which should fail with ECONNREFUSED and trigger retries
  const start = Date.now();
  try {
    await db.query("SELECT 1", [], 1); // 1 retry to keep test fast
    throw new Error("Should have thrown an error");
  } catch (err: any) {
    // Assert it took at least some time (retries happened)
    const duration = Date.now() - start;
    assertEquals(duration >= 1000, true);
    assertEquals(
      err.code === "ECONNREFUSED" || err.message.includes("ECONNREFUSED"),
      true,
    );
  } finally {
    await db.close().catch(() => {});
  }
});
