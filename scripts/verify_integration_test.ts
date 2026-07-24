import { assertThrows } from "@std/assert";
import { integrationConfig } from "./verify_integration.ts";

Deno.test("live integration profile rejects missing configuration instead of using mocks", () => {
  assertThrows(
    () => integrationConfig({}),
    Error,
    "verify:integration requires real service configuration",
  );
});

Deno.test("live integration profile rejects placeholder credentials", () => {
  assertThrows(
    () =>
      integrationConfig({
        DATABASE_URL: "postgresql://localhost/mai",
        GEMINI_API_KEY: "sua_chave_aqui",
        PAPERMARK_API_KEY: "mock-key-for-dry-run",
        PAPERMARK_API_URL: "https://api.papermark.io",
        PAPERMARK_ROOM_ID: "room-id",
      }),
    Error,
    "GEMINI_API_KEY, PAPERMARK_API_KEY",
  );
});
