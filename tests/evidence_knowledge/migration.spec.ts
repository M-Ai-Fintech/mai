import { assertEquals, assertMatch } from "@std/assert";
import { evidenceKnowledgeMigrations } from "../../src/evidence_knowledge/migrations/index.ts";
import { migrationChecksum } from "../../src/platform/persistence/migration_runner.ts";

Deno.test("Evidence Knowledge migration owns additive append-only stream", () => {
  assertEquals(evidenceKnowledgeMigrations.length, 4);
  const [migration1, migration2, migration3, migration4] =
    evidenceKnowledgeMigrations;

  assertEquals(migration1.owner, "evidence_knowledge");
  assertEquals(migration1.schema, "evidence_knowledge");
  assertEquals(migration1.id, "evidence_knowledge-0001");
  assertMatch(migration1.forwardNotes, /additive/i);
  assertMatch(migration1.rollbackNotes, /retain/i);

  assertEquals(migration2.owner, "evidence_knowledge");
  assertEquals(migration2.schema, "evidence_knowledge");
  assertEquals(migration2.id, "evidence_knowledge-0002");

  assertEquals(migration3.owner, "evidence_knowledge");
  assertEquals(migration3.schema, "evidence_knowledge");
  assertEquals(migration3.id, "evidence_knowledge-0003");
  assertMatch(migration3.forwardNotes, /corrective/i);
  assertMatch(migration3.rollbackNotes, /retain/i);
  for (const statement of migration3.statements) {
    assertEquals(statement.schema, "evidence_knowledge");
    assertEquals(/\b(?:documents|platform)\./i.test(statement.sql), false);
  }

  assertEquals(migration4.owner, "evidence_knowledge");
  assertEquals(migration4.schema, "evidence_knowledge");
  assertEquals(migration4.id, "evidence_knowledge-0004");
  assertMatch(migration4.forwardNotes, /corrective/i);
  assertMatch(migration4.rollbackNotes, /retain/i);
  for (const statement of migration4.statements) {
    assertEquals(statement.schema, "evidence_knowledge");
    assertEquals(/\b(?:documents|platform)\./i.test(statement.sql), false);
  }
});

Deno.test("Evidence Knowledge published corrective migrations retain their checksums", async () => {
  const [, , migration3, migration4] = evidenceKnowledgeMigrations;

  assertEquals(
    await migrationChecksum(migration3),
    "ab437ce0efa822b79402e2015c1bcba73f364d984c5c86f75206c6ec56d64f93",
  );
  assertEquals(
    await migrationChecksum(migration4),
    "5f728f555875ecefd40011a243c743ad55d980077066e755364174081b7fd2bd",
  );
});
