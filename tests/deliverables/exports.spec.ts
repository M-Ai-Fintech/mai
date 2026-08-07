import { assertEquals, assertThrows } from "@std/assert";
import {
  assertRenderedExport,
  type DeliverableRenderer,
} from "../../src/deliverables/v1.ts";

Deno.test("renderer port accepts only an authorized, checksum-bound artifact", async () => {
  const renderer = new FakeDeliverableRenderer();
  const request = {
    version: approvedVersionReference(),
    format: "pdf" as const,
    filename: "diligence-v1.pdf",
  };
  const artifact = await renderer.render(request);
  assertRenderedExport(request, artifact);
  assertEquals(renderer.calls, 1);
});

Deno.test("renderer port rejects provider output with a mismatched format", () => {
  const request = {
    version: approvedVersionReference(),
    format: "pdf" as const,
    filename: "diligence-v1.pdf",
  };
  assertThrows(
    () =>
      assertRenderedExport(request, {
        format: "docx",
        filename: request.filename,
        artifactReference: "object://deliverables/diligence-v1.pdf",
        artifactChecksum: "a".repeat(64),
      }),
    Error,
    "does not match",
  );
});

class FakeDeliverableRenderer implements DeliverableRenderer {
  calls = 0;

  render(
    input: Parameters<DeliverableRenderer["render"]>[0],
  ): Promise<Awaited<ReturnType<DeliverableRenderer["render"]>>> {
    this.calls += 1;
    return Promise.resolve({
      format: input.format,
      filename: input.filename,
      artifactReference: "object://deliverables/diligence-v1.pdf",
      artifactChecksum: "a".repeat(64),
    });
  }
}

function approvedVersionReference() {
  return {
    versionId: "delivver_diligence-v1" as never,
  } as unknown as Parameters<DeliverableRenderer["render"]>[0]["version"];
}
