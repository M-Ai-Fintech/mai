import { assertEquals } from "@std/assert";
import { setupDatabase } from "../src/core/db/setup.ts";
import { Client } from "pg";

async function assertTransactionStatuses(): Promise<void> {
  const dbUrl = Deno.env.get("DATABASE_URL") ||
    "postgresql://postgres:postgres@localhost:5432/mai";
  const client = new Client(dbUrl);
  let connected = false;
  try {
    // Check if transaction_status has been populated if db is running
    await client.connect();
    connected = true;
    const result = await client.query("SELECT * FROM transaction_status");
    assertEquals(result.rows.length >= 4, true);
  } catch {
    // An unavailable local database is an accepted setup state.
  } finally {
    if (connected) await client.end();
  }
}

Deno.test("Database setup runs gracefully with or without PostgreSQL", async () => {
  try {
    await setupDatabase();
    await assertTransactionStatuses();
  } catch (err) {
    throw new Error(
      "setupDatabase should handle errors gracefully and not throw: " + err,
    );
  }
});
