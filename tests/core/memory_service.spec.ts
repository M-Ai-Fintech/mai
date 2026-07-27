import { assertEquals } from "@std/assert";
import { DatabaseMemoryService } from "../../src/core/db/DatabaseMemoryService.ts";

interface QueryPool {
  query: () => Promise<never>;
}

function rejectQueries(
  db: DatabaseMemoryService,
  incrementAttempts: () => void,
): void {
  const pool = (db as unknown as { pool: QueryPool }).pool;
  pool.query = () => {
    incrementAttempts();
    return Promise.reject(
      Object.assign(new Error("connection refused"), {
        code: "ECONNREFUSED",
      }),
    );
  };
}

async function assertRetryFailure(
  db: DatabaseMemoryService,
  startedAt: number,
  attempts: () => number,
): Promise<void> {
  try {
    await db.query("SELECT 1", [], 1);
    throw new Error("Should have thrown an error");
  } catch (error: unknown) {
    assertEquals(Date.now() - startedAt >= 1000, true);
    assertEquals(attempts(), 2);
    const code = error instanceof Error && "code" in error
      ? error.code
      : undefined;
    assertEquals(code, "ECONNREFUSED");
  }
}

Deno.test("DatabaseMemoryService retries transient connection failures", async () => {
  let attempts = 0;
  const db = new DatabaseMemoryService();
  rejectQueries(db, () => attempts++);
  try {
    await assertRetryFailure(db, Date.now(), () => attempts);
  } finally {
    await db.close().catch(() => {});
  }
});
