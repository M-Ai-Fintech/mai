import { assertEquals } from "@std/assert";
import {
  createGovernedEvidenceSearchTool,
} from "../../src/agent/tools/governed_evidence_tools.ts";
import { ToolGateway } from "../../src/agent_runtime/tool_gateway.ts";
import type { SourceVersionReference } from "../../src/agent_runtime/model.ts";
import type {
  EvidenceSearchHit,
  ExactDocumentVersionReference,
} from "../../src/agent/tools/governed_evidence_tools.ts";
import {
  allowDecision,
  evidenceHit,
  exactReference,
  RecordingEvidenceSearchPort,
  request,
  sourceVersion,
  ToggleSourceVersionPort,
} from "./governed_evidence_fakes.ts";

Deno.test("evidence search deduplicates receipts across hits for one version", async () => {
  const tool = createGovernedEvidenceSearchTool(
    new RecordingEvidenceSearchPort([
      evidenceHit(exactReference, 4),
      evidenceHit(exactReference, 5),
    ]),
    new ToggleSourceVersionPort(),
  );
  const gateway = new ToolGateway([tool], {
    authorize: () => allowDecision(),
  });

  const result = await gateway.invoke(
    request(tool.name, "search_evidence", { query: "consent" }),
  );

  assertEquals(result.status, "succeeded");
  if (result.status === "succeeded") {
    assertEquals(result.output.discoveredSourceVersions, [sourceVersion]);
    assertEquals(
      (result.output.value.results as readonly EvidenceSearchHit[]).length,
      2,
    );
  }
});

Deno.test("evidence search fails on conflicting receipts for one version", async () => {
  const conflictingReference = {
    ...exactReference,
    checksum: { algorithm: "sha256" as const, value: "b".repeat(64) },
  };
  const tool = createGovernedEvidenceSearchTool(
    new RecordingEvidenceSearchPort([
      evidenceHit(exactReference, 4),
      evidenceHit(conflictingReference, 5),
    ]),
    new ToggleSourceVersionPort(),
  );
  const gateway = new ToolGateway([tool], {
    authorize: () => allowDecision(),
  });

  const result = await gateway.invoke(
    request(tool.name, "search_evidence", { query: "consent" }),
  );

  assertEquals(result, {
    status: "failed",
    reason: "TOOL_EXECUTION_FAILED",
  });
});

Deno.test("evidence search preserves receipts for distinct versions", async () => {
  const secondReference: ExactDocumentVersionReference = {
    documentVersionId: "docv_schedule_v1",
    version: 1,
    checksum: { algorithm: "sha256", value: "b".repeat(64) },
  };
  const secondSourceVersion: SourceVersionReference = {
    sourceType: "document_version",
    sourceId: secondReference.documentVersionId,
    version: secondReference.version as SourceVersionReference["version"],
    checksum: secondReference.checksum.value,
  };
  const tool = createGovernedEvidenceSearchTool(
    new RecordingEvidenceSearchPort([
      evidenceHit(exactReference, 4),
      evidenceHit(secondReference, 1),
    ]),
    new ToggleSourceVersionPort(),
  );
  const gateway = new ToolGateway([tool], {
    authorize: () => allowDecision(),
  });

  const result = await gateway.invoke(
    request(tool.name, "search_evidence", { query: "consent" }),
  );

  assertEquals(result.status, "succeeded");
  if (result.status === "succeeded") {
    assertEquals(result.output.discoveredSourceVersions, [
      sourceVersion,
      secondSourceVersion,
    ]);
  }
});
