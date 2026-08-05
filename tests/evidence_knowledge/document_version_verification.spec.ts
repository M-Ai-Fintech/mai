import { assertEquals, assertRejects } from "@std/assert";
import type { DocumentVersion } from "../../src/documents/version.ts";
import { parseDocumentVersionId } from "../../src/documents/ids.ts";
import {
  DocumentsExactVersionVerificationAdapter,
  FakeExactDocumentVersionVerificationPort,
} from "../../src/evidence_knowledge/document_version_verification.ts";
import { VerifiedCitationWriter } from "../../src/evidence_knowledge/citation_service.ts";
import type { Citation } from "../../src/evidence_knowledge/citation.ts";
import {
  createExactDocumentVersionReference,
} from "../../src/evidence_knowledge/v1.ts";
import {
  parseActorId,
  parseCorrelationId,
  parseDealId,
  parseTenantId,
  parseWorkspaceId,
  type RequestContext,
} from "../../src/platform/api/v1.ts";

Deno.test("exact version verification accepts the matching immutable snapshot", async () => {
  const context = fixtureContext();
  const scope = fixtureScope();
  const reference = createExactDocumentVersionReference({
    documentVersionId: required("docver_contract-v1", parseDocumentVersionId),
    checksum: { algorithm: "sha256", value: "a".repeat(64) },
    location: { kind: "page", page: 1 },
    classification: "financial",
    processingVersion: "extractor-v1",
  });
  const version = {
    documentVersionId: reference.documentVersionId,
    scope,
    checksum: reference.checksum,
    classification: reference.classification,
  } as DocumentVersion;
  const result = await new FakeExactDocumentVersionVerificationPort([version])
    .verify(context, scope, reference);
  assertEquals(result.version.documentVersionId, reference.documentVersionId);
});

Deno.test("missing, cross-scope, checksum, and classification sources are protected", async () => {
  const context = fixtureContext();
  const scope = fixtureScope();
  const reference = createExactDocumentVersionReference({
    documentVersionId: required("docver_missing-v1", parseDocumentVersionId),
    checksum: { algorithm: "sha256", value: "b".repeat(64) },
    location: { kind: "artifact", artifactId: "artifact-1" },
    classification: "legal",
    processingVersion: "extractor-v1",
  });
  const port = new FakeExactDocumentVersionVerificationPort([]);
  await assertRejects(
    () => port.verify(context, scope, reference),
    Error,
    "protected outcome",
  );
});

Deno.test("all exact-version mismatches use the same protected error shape", async () => {
  const context = fixtureContext();
  const scope = fixtureScope();
  const otherScope = { ...scope, dealId: required("deal_other", parseDealId) };
  const matching = reference("docver_shape-v1", "a", "financial");
  const version = {
    documentVersionId: matching.documentVersionId,
    scope,
    checksum: matching.checksum,
    classification: matching.classification,
  } as DocumentVersion;
  const cases = [
    new FakeExactDocumentVersionVerificationPort([]),
    new FakeExactDocumentVersionVerificationPort([{
      ...version,
      scope: otherScope,
    }]),
    new FakeExactDocumentVersionVerificationPort([version]),
    new FakeExactDocumentVersionVerificationPort([version]),
  ];
  const references = [
    reference("docver_shape-missing", "a", "financial"),
    matching,
    reference("docver_shape-v1", "b", "financial"),
    reference("docver_shape-v1", "a", "legal"),
  ];
  const messages: string[] = [];
  for (let index = 0; index < cases.length; index += 1) {
    const error = await assertRejects(
      () => cases[index].verify(context, scope, references[index]),
      Error,
    );
    messages.push(error.message);
  }
  assertEquals(
    messages.every((message) =>
      message.includes("protected outcome") &&
      !/(checksum-mismatch|classification-mismatch|scope-mismatch)/.test(
        message,
      )
    ),
    true,
  );
});

Deno.test("Documents adapter consumes the public exact-version read seam", async () => {
  const context = fixtureContext();
  const scope = fixtureScope();
  const reference = createExactDocumentVersionReference({
    documentVersionId: required("docver_contract-v1", parseDocumentVersionId),
    checksum: { algorithm: "sha256", value: "c".repeat(64) },
    location: { kind: "artifact", artifactId: "artifact-1" },
    classification: "operational",
    processingVersion: "extractor-v2",
  });
  const adapter = new DocumentsExactVersionVerificationAdapter({
    findAccessibleVersion: () => Promise.resolve(undefined),
  });
  await assertRejects(
    () => adapter.verify(context, scope, reference),
    Error,
    "protected outcome",
  );
});

Deno.test("citation persistence is not reached when exact verification rejects", async () => {
  const scope = fixtureScope();
  const citation = {
    citationId: "citation_rejected",
    scope,
    source: {
      documentVersionId: required("docver_missing-v1", parseDocumentVersionId),
      checksum: { algorithm: "sha256", value: "d".repeat(64) },
      location: { kind: "artifact", artifactId: "artifact-1" },
      classification: "financial",
      processingVersion: "extractor-v1",
    },
    freshness: {
      state: "current",
      checkedAt: new Date("2026-01-01T00:00:00Z"),
    },
    createdAt: new Date("2026-01-01T00:00:00Z"),
  } as Citation;
  let writes = 0;
  const writer = new VerifiedCitationWriter(
    new FakeExactDocumentVersionVerificationPort([]),
    {
      insertCitation: () => {
        writes += 1;
        return Promise.resolve();
      },
    },
  );
  await assertRejects(
    () => writer.insert(fixtureContext(), scope, citation),
    Error,
  );
  assertEquals(writes, 0);
});

function fixtureContext(): RequestContext {
  return {
    actorId: required("actor_alice", parseActorId),
    tenantId: required("tenant_acme", parseTenantId),
    workspaceId: required("workspace_dealroom", parseWorkspaceId),
    dealId: required("deal_horizon", parseDealId),
    correlationId: required("cor_test", parseCorrelationId),
    origin: "http",
  };
}

function fixtureScope() {
  return {
    tenantId: required("tenant_acme", parseTenantId),
    workspaceId: required("workspace_dealroom", parseWorkspaceId),
    dealId: required("deal_horizon", parseDealId),
  };
}

function reference(
  id: string,
  checksum: string,
  classification: "financial" | "legal",
) {
  return createExactDocumentVersionReference({
    documentVersionId: required(id, parseDocumentVersionId),
    checksum: { algorithm: "sha256", value: checksum.repeat(64) },
    location: { kind: "artifact", artifactId: "artifact-shape" },
    classification,
    processingVersion: "extractor-v1",
  });
}

function required<T>(
  value: string,
  parser: (value: unknown) => { ok: true; value: T } | { ok: false },
): T {
  const result = parser(value);
  if (result.ok) return result.value;
  throw new Error(`Fixture identifier "${value}" is invalid.`);
}
