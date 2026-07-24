import { assertEquals } from "@std/assert";
import { DatabaseMemoryService } from "../../src/core/db/DatabaseMemoryService.ts";

Deno.test("DatabaseMemoryService retries transient connection failures", async () => {
  const db = new DatabaseMemoryService();
  let attempts = 0;
  (db as unknown as { pool: { query: () => Promise<never> } }).pool.query =
    () => {
      attempts++;
      return Promise.reject(
        Object.assign(new Error("connection refused"), {
          code: "ECONNREFUSED",
        }),
      );
    };

  const start = Date.now();
  try {
    await db.query("SELECT 1", [], 1);
    throw new Error("Should have thrown an error");
  } catch (err: any) {
    const duration = Date.now() - start;
    assertEquals(duration >= 1000, true);
    assertEquals(attempts, 2);
    assertEquals(err.code, "ECONNREFUSED");
  } finally {
    await db.close().catch(() => {});
  }
});
