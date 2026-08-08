import { assertEquals, assertThrows } from "@std/assert";
import { assertLoopbackPublishedPorts } from "../../../scripts/local_compose_policy.ts";

Deno.test("local Compose policy accepts explicit loopback bindings", () => {
  assertEquals(
    assertLoopbackPublishedPorts(
      'services:\n  api:\n    ports:\n      - "127.0.0.1:${PORT}:8000"\n',
    ),
    undefined,
  );
});

Deno.test("local Compose policy rejects non-loopback bindings", () => {
  for (const binding of ["${PORT}:8000", "0.0.0.0:${PORT}:8000", ":::8000"]) {
    assertThrows(
      () =>
        assertLoopbackPublishedPorts(
          `services:\n  api:\n    ports:\n      - "${binding}"\n`,
        ),
      Error,
      "loopback-only",
    );
  }
});
