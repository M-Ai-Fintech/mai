import { assertEquals, assertThrows } from "@std/assert";
import {
  defineMigration,
  orderMigrations,
} from "../../../src/platform/persistence/v1.ts";

const PLATFORM_STATEMENT = {
  schema: "platform",
  sql: "CREATE TABLE platform.example (id TEXT PRIMARY KEY)",
};

Deno.test("context migrations are deterministic and reject foreign schema ownership", () => {
  const second = defineMigration({
    owner: "platform",
    schema: "platform",
    id: "platform-0002",
    version: 2,
    forwardNotes: "Add the second platform fixture.",
    rollbackNotes: "Disable its consumer and retain the row.",
    statements: [PLATFORM_STATEMENT],
  });
  const first = defineMigration({
    owner: "platform",
    schema: "platform",
    id: "platform-0001",
    version: 1,
    forwardNotes: "Add the first platform fixture.",
    rollbackNotes: "Disable its consumer and retain the row.",
    statements: [PLATFORM_STATEMENT],
  });

  assertEquals(orderMigrations([second, first]).map(({ id }) => id), [
    "platform-0001",
    "platform-0002",
  ]);
  assertThrows(
    () =>
      defineMigration({
        owner: "platform",
        schema: "platform",
        id: "platform-0003",
        version: 3,
        forwardNotes: "Invalid cross-context statement.",
        rollbackNotes: "Not applicable.",
        statements: [{
          schema: "deals",
          sql: "CREATE TABLE deals.bad(id TEXT)",
        }],
      }),
    Error,
    'Migration "platform-0003" statement schema "deals"',
  );
  assertThrows(
    () =>
      defineMigration({
        owner: "platform",
        schema: "platform",
        id: "platform-0004",
        version: 4,
        forwardNotes: "Invalid hidden cross-context statement.",
        rollbackNotes: "Not applicable.",
        statements: [{
          schema: "platform",
          sql: "CREATE TABLE deals.hidden(id TEXT)",
        }],
      }),
    Error,
    'references schema "deals"',
  );
  assertThrows(
    () =>
      defineMigration({
        owner: "platform",
        schema: "platform",
        id: "platform-0005",
        version: 5,
        forwardNotes: "Invalid quoted cross-context statement.",
        rollbackNotes: "Not applicable.",
        statements: [{
          schema: "platform",
          sql: 'CREATE TABLE "deals".hidden(id TEXT)',
        }],
      }),
    Error,
    'references schema "deals"',
  );
  assertThrows(
    () =>
      defineMigration({
        owner: "platform",
        schema: "platform",
        id: "platform-0006",
        version: 6,
        forwardNotes: "Invalid search-path mutation.",
        rollbackNotes: "Not applicable.",
        statements: [{
          schema: "platform",
          sql: "SET LOCAL search_path = deals",
        }],
      }),
    Error,
    "changes search_path or uses dynamic SQL",
  );
});
