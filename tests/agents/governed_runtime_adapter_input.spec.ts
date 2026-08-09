import { assertEquals } from "@std/assert";
import { mapGovernedToolInput } from "../../src/agent/governed_runtime_adapter_input.ts";
import {
  evidenceHit,
  exactReference,
  scope,
} from "./governed_evidence_fakes.ts";

Deno.test("adapter maps exact document and citation inputs for production tools", () => {
  const metadata = mapGovernedToolInput(
    "document.metadata.read",
    { context: { reference: exactReference } },
    scope,
  );
  const content = mapGovernedToolInput(
    "document.content.read",
    { context: { reference: exactReference } },
    scope,
  );
  const source = evidenceHit(exactReference, 4).source;
  const citation = mapGovernedToolInput(
    "citation.propose",
    { context: { source, excerpt: "Signed consent." } },
    scope,
  );

  assertEquals(metadata, {
    status: "ready",
    input: { scope, reference: exactReference },
  });
  assertEquals(content, {
    status: "ready",
    input: { scope, reference: exactReference },
  });
  assertEquals(citation, {
    status: "ready",
    input: { scope, source, excerpt: "Signed consent." },
  });
});

Deno.test("adapter rejects missing or malformed exact tool inputs before execution", () => {
  const missingDocument = mapGovernedToolInput(
    "document.metadata.read",
    { context: {} },
    scope,
  );
  const malformedDocument = mapGovernedToolInput(
    "document.content.read",
    {
      context: {
        reference: {
          ...exactReference,
          checksum: { algorithm: "sha256", value: "bad" },
        },
      },
    },
    scope,
  );
  const missingCitation = mapGovernedToolInput(
    "citation.propose",
    { context: { excerpt: "No source." } },
    scope,
  );

  assertEquals(missingDocument.status, "unavailable");
  assertEquals(malformedDocument.status, "unavailable");
  assertEquals(missingCitation.status, "unavailable");
});
