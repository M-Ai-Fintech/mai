import { assertEquals, assertThrows } from "@std/assert";
import pg from "pg";
import { assertDemoPoolTarget } from "../../scripts/investor_demo_database.ts";
import { assertSafeDemoDatabaseUrl } from "../../src/demo_readiness/reset.ts";

const target = {
  environment: "test" as const,
  databaseName: "mai_demo_readiness" as const,
};

Deno.test("demo database URL accepts only the approved loopback target", () => {
  const url = assertSafeDemoDatabaseUrl(
    "postgresql://demo:secret@127.0.0.1:55435/mai_demo_readiness",
    target,
  );
  assertEquals(url.hostname, "127.0.0.1");
});

Deno.test("demo database URL rejects remote and misleading targets", () => {
  for (
    const value of [
      "postgresql://demo:secret@db.example.com:55435/mai_demo_readiness",
      "postgresql://demo:secret@127.0.0.1:5432/mai_demo_readiness",
      "https://127.0.0.1:55435/mai_demo_readiness",
      "postgresql://demo:secret@127.0.0.1:55435/mai",
    ]
  ) {
    assertThrows(
      () => assertSafeDemoDatabaseUrl(value, target),
      Error,
      "unsafe",
    );
  }
});

Deno.test("demo mutation guard rejects a pool that differs from its safe URL", async () => {
  const safeUrl = "postgresql://demo:secret@127.0.0.1:55435/mai_demo_readiness";
  const mismatched = new pg.Pool({
    connectionString:
      "postgresql://demo:secret@127.0.0.1:5432/mai_demo_readiness",
  });
  try {
    assertThrows(
      () => assertDemoPoolTarget(mismatched, safeUrl, target),
      Error,
      "unsafe",
    );
  } finally {
    await mismatched.end();
  }
});
