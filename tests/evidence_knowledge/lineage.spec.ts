import { assertEquals, assertThrows } from "@std/assert";
import {
  parseEvidenceId,
  parseFactVersionId,
  parseProvenanceId,
} from "../../src/evidence_knowledge/ids.ts";
import {
  createProvenanceLink,
  traverseLineage,
} from "../../src/evidence_knowledge/provenance.ts";
import {
  parseDealId,
  parseTenantId,
  parseWorkspaceId,
} from "../../src/platform/api/v1.ts";

Deno.test("lineage traversal follows immutable links and terminates cycles", () => {
  const evidence = {
    kind: "evidence" as const,
    id: required("evidence_source", parseEvidenceId),
  };
  const fact = {
    kind: "fact_version" as const,
    id: required("factver_source-v1", parseFactVersionId),
  };
  const links = [
    link("prov_source-fact", evidence, fact),
    link("prov_fact-source", fact, evidence),
  ];

  assertEquals(traverseLineage(evidence, links), [fact]);
});

Deno.test("lineage links reject self references", () => {
  const node = {
    kind: "evidence" as const,
    id: required("evidence_source", parseEvidenceId),
  };
  assertThrows(() => link("prov_self", node, node), Error, "self-target");
});

function link(
  id: string,
  source: Parameters<typeof createProvenanceLink>[0]["source"],
  target: Parameters<typeof createProvenanceLink>[0]["target"],
) {
  return createProvenanceLink({
    provenanceId: required(id, parseProvenanceId),
    scope: {
      tenantId: required("tenant_acme", parseTenantId),
      workspaceId: required("workspace_dealroom", parseWorkspaceId),
      dealId: required("deal_horizon", parseDealId),
    },
    relation: "derived_from",
    source,
    target,
    createdAt: new Date("2026-08-04T12:00:00.000Z"),
  });
}

function required<T>(
  value: string,
  parser: (
    value: unknown,
  ) => { readonly ok: true; readonly value: T } | { readonly ok: false },
): T {
  const result = parser(value);
  if (result.ok) return result.value;
  throw new Error(`Fixture identifier "${value}" is invalid.`);
}
