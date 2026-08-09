import { assertEquals, assertThrows } from "@std/assert";
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
      }),
    Error,
    "GEMINI_API_KEY",
  );
});

Deno.test("live integration profile ignores the retired Papermark contract", () => {
  const config = integrationConfig({
    DATABASE_URL: "postgresql://localhost/mai",
    GEMINI_API_KEY: "synthetic-gemini-key",
    PAPERMARK_API_KEY: "legacy-key-is-ignored",
    PAPERMARK_API_URL: "https://arbitrary.example",
    PAPERMARK_ROOM_ID: "legacy-room-is-ignored",
  });

  assertEquals(Object.keys(config), [
    "databaseUrl",
    "geminiApiKey",
    "geminiModel",
  ]);
});
