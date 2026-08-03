import {
  assertEquals,
  assertInstanceOf,
  assertRejects,
  assertThrows,
} from "@std/assert";
import { PostgresIdentityAccessAuthentication } from "../../src/api/deal_management_bootstrap.ts";
import { createExecutableApiServer } from "../../src/api/server.ts";

Deno.test("executable API bootstrap fails startup without database configuration", () => {
  const error = assertThrows(
    () => createExecutableApiServer({}),
    Error,
    "expected MAI106_DATABASE_URL or DATABASE_URL",
  );
  assertEquals(error.message.includes("password"), false);
});

Deno.test("executable API bootstrap rejects non-PostgreSQL configuration", () => {
  assertThrows(
    () => createExecutableApiServer({ DATABASE_URL: "https://db.invalid" }),
    Error,
    "expected postgres or postgresql",
  );
});

Deno.test("authentication failure never reflects the supplied credential", async () => {
  const pool = {
    query: () => Promise.resolve({ rowCount: 0, rows: [] }),
  } as never;
  const credential = "session_unique-secret-value";
  const authentication = new PostgresIdentityAccessAuthentication(pool);
  const error = await assertRejects(
    () => authentication.authenticate({ credential }),
  );
  assertInstanceOf(error, Error);
  assertEquals(
    error.message.includes(
      "Authentication failed; expected a valid active session credential.",
    ),
    true,
  );
  assertEquals(error.message.includes(credential), false);
});
