import { assertEquals } from "@std/assert";
import {
  parseProjectionWatermark,
} from "../../../src/platform/persistence/v1.ts";
import { parseAggregateVersion } from "../../../src/platform/api/v1.ts";

Deno.test("projection watermarks remain distinct from aggregate versions", () => {
  const watermark = parseProjectionWatermark("projection_fixture:42");
  const version = parseAggregateVersion(42);

  assertEquals(
    watermark.ok && String(watermark.value),
    "projection_fixture:42",
  );
  assertEquals(version.ok && typeof version.value, "number");
});
