import { assertThrows } from "@std/assert";
import { createDocumentsComposition } from "../../src/documents/composition.ts";

Deno.test("configured document storage refuses a fixture fallback", () => {
  assertThrows(
    () =>
      createDocumentsComposition({
        pool: {} as never,
        authorization: {} as never,
        adaptersEnabled: true,
      }),
    Error,
    "refusing fixture fallback",
  );
});
