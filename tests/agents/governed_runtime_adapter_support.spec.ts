import { assertEquals, assertThrows } from "@std/assert";
import {
  aggregateRuntimeEvidence,
} from "../../src/agent/governed_runtime_adapter_support.ts";
import type {
  ResultRecord,
  SourceVersionReference,
} from "../../src/agent_runtime/model.ts";

Deno.test("durable evidence aggregation deduplicates identical receipts across results", () => {
  const first = source("document_version_alpha", 2, "a");
  const second = source("document_version_beta", 1, "b");
  const evidence = aggregateRuntimeEvidence([
    resultWithEvidence([first]),
    resultWithEvidence([first, second]),
  ]);

  assertEquals(evidence, [first, second]);
});

Deno.test("durable evidence aggregation rejects conflicting receipts across results", () => {
  const first = source("document_version_alpha", 2, "a");
  const conflict = source("document_version_alpha", 2, "b");

  assertThrows(
    () =>
      aggregateRuntimeEvidence([
        resultWithEvidence([first]),
        resultWithEvidence([conflict]),
      ]),
    Error,
    "conflicts",
  );
});

function resultWithEvidence(
  evidence: readonly SourceVersionReference[],
): ResultRecord {
  return { lineage: { evidence } } as ResultRecord;
}

function source(
  sourceId: string,
  version: number,
  checksum: string,
): SourceVersionReference {
  return {
    sourceType: "document_version",
    sourceId,
    version: version as SourceVersionReference["version"],
    checksum: checksum.repeat(64),
  };
}
