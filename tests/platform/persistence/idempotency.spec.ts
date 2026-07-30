import { assertEquals } from "@std/assert";
import { payloadDigest } from "../../../src/platform/persistence/v1.ts";

Deno.test("payload digests are deterministic across object key order", async () => {
  const first = await payloadDigest({
    amount: 10,
    nested: { workspace: "workspace_a", enabled: true },
  });
  const second = await payloadDigest({
    nested: { enabled: true, workspace: "workspace_a" },
    amount: 10,
  });

  assertEquals(first, second);
  assertEquals(first.length, 64);
});
