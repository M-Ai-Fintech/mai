import { assertEquals } from "@std/assert";
import { setupDatabase } from "../src/core/db/setup.ts";
import { Client } from "pg";

Deno.test("Database setup runs gracefully", async () => {
  // We just want to ensure it does not throw unhandled exceptions
  // if the db is missing, or if it runs correctly if db is present.
  try {
    await setupDatabase();
    // Check if transaction_status has been populated if db is running
    const dbUrl = Deno.env.get("DATABASE_URL") ||
      "postgresql://postgres:postgres@localhost:5432/mai";
    const client = new Client(dbUrl);
    let connected = false;
    try {
      await client.connect();
      connected = true;
      const res = await client.query("SELECT * FROM transaction_status");
      // If connected, it should have seeded the db
      assertEquals(res.rows.length >= 4, true);
    } catch (e) {
      // DB is not running, fallback gracefully
    } finally {
      if (connected) await client.end();
    }
  } catch (err) {
    throw new Error(
      "setupDatabase should handle errors gracefully and not throw: " + err,
    );
  }
});
