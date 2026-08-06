import { assertEquals } from "@std/assert";
import pg from "pg";
import { createEvidenceKnowledgeComposition } from "../../src/evidence_knowledge/composition.ts";
import { FakeExactDocumentVersionVerificationPort } from "../../src/evidence_knowledge/document_version_verification.ts";
import { postgresIntegrationTestDatabaseUrl } from "../platform/support/postgres.ts";

Deno.test("Evidence Knowledge composition exposes only its owned migration stream", async () => {
  const pool = new pg.Pool({
    connectionString: postgresIntegrationTestDatabaseUrl() ??
      "postgres://postgres:postgres@localhost:55432/mai_test_postgres_integration",
  });
  const composition = createEvidenceKnowledgeComposition({ pool });
  assertEquals(composition.migrations.map(({ owner }) => owner), [
    "evidence_knowledge",
    "evidence_knowledge",
    "evidence_knowledge",
    "evidence_knowledge",
  ]);
  assertEquals(composition.migrations.map(({ id }) => id), [
    "evidence_knowledge-0001",
    "evidence_knowledge-0002",
    "evidence_knowledge-0003",
    "evidence_knowledge-0004",
  ]);
  await composition.close();
});

Deno.test("composition exposes verified writes only when authorization and verification are configured", async () => {
  const pool = new pg.Pool({
    connectionString: "postgres://postgres:postgres@127.0.0.1:1/unused",
  });
  const unconfigured = createEvidenceKnowledgeComposition({ pool });
  assertEquals(unconfigured.writes, undefined);
  await unconfigured.close();
  const configured = createEvidenceKnowledgeComposition({
    pool,
    evidenceWriteAuthorization: { authorize: () => Promise.resolve(true) },
    documentVersionVerifier: new FakeExactDocumentVersionVerificationPort([]),
  });
  assertEquals(configured.writes !== undefined, true);
  await configured.close();
});
