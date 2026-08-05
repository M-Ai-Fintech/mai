import { assertEquals, assertMatch } from "@std/assert";
import { evidenceKnowledgeMigrations } from "../../src/evidence_knowledge/migrations/index.ts";

Deno.test("Evidence Knowledge migration owns additive append-only stream", () => {
  assertEquals(evidenceKnowledgeMigrations.length, 2);
  const [migration1, migration2] = evidenceKnowledgeMigrations;
  assertEquals(migration1.owner, "evidence_knowledge");
  assertEquals(migration1.schema, "evidence_knowledge");
  assertEquals(migration1.id, "evidence_knowledge-0001");
  assertMatch(migration1.forwardNotes, /additive/i);
  assertMatch(migration1.rollbackNotes, /retain/i);
  for (const statement of migration1.statements) {
    assertEquals(statement.schema, "evidence_knowledge");
    assertEquals(/\b(?:documents|platform)\./i.test(statement.sql), false);
  }
  assertEquals(
    migration1.statements.filter(({ sql }) => /no_update/i.test(sql)).length,
    14,
  );
  assertEquals(
    migration1.statements.some(({ sql }) =>
      sql.includes("fact_version_citations")
    ),
    true,
  );
  assertEquals(
    migration1.statements.some(({ sql }) =>
      sql.includes("classification, processing_version")
    ),
    true,
  );

  assertEquals(migration2.owner, "evidence_knowledge");
  assertEquals(migration2.schema, "evidence_knowledge");
  assertEquals(migration2.id, "evidence_knowledge-0002");
  assertMatch(migration2.forwardNotes, /current_fact_version_id/i);
  assertMatch(migration2.rollbackNotes, /retain/i);
  for (const statement of migration2.statements) {
    assertEquals(statement.schema, "evidence_knowledge");
    assertEquals(/\b(?:documents|platform)\./i.test(statement.sql), false);
  }
  assertEquals(
    migration2.statements.some(({ sql }) =>
      sql.includes("current_fact_version_id")
    ),
    true,
  );
});
