import { assertEquals, assertMatch } from "@std/assert";
import { evidenceKnowledgeMigrations } from "../../src/evidence_knowledge/migrations/index.ts";

Deno.test("Evidence Knowledge migration owns one additive append-only stream", () => {
  assertEquals(evidenceKnowledgeMigrations.length, 1);
  const [migration] = evidenceKnowledgeMigrations;
  assertEquals(migration.owner, "evidence_knowledge");
  assertEquals(migration.schema, "evidence_knowledge");
  assertEquals(migration.id, "evidence_knowledge-0001");
  assertMatch(migration.forwardNotes, /additive/i);
  assertMatch(migration.rollbackNotes, /retain/i);
  for (const statement of migration.statements) {
    assertEquals(statement.schema, "evidence_knowledge");
    assertEquals(/\b(?:documents|platform)\./i.test(statement.sql), false);
  }
  assertEquals(
    migration.statements.filter(({ sql }) => /no_update/i.test(sql)).length,
    14,
  );
  assertEquals(
    migration.statements.some(({ sql }) =>
      sql.includes("fact_version_citations")
    ),
    true,
  );
  assertEquals(
    migration.statements.some(({ sql }) =>
      sql.includes("classification, processing_version")
    ),
    true,
  );
});
