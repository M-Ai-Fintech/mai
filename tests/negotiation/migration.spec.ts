import { assert, assertEquals, assertMatch } from "@std/assert";
import { migrationChecksum } from "../../src/platform/persistence/migration_runner.ts";
import {
  negotiationControlMigration,
  negotiationEvidenceMigration,
  negotiationMigrations,
} from "../../src/negotiation/migrations/index.ts";

Deno.test("Negotiation migration is additive, owned, and retention-safe", async () => {
  assertEquals(negotiationMigrations, [
    negotiationControlMigration,
    negotiationEvidenceMigration,
  ]);
  assertEquals(negotiationControlMigration.owner, "negotiation");
  assertEquals(negotiationControlMigration.schema, "negotiation");
  assertEquals(negotiationControlMigration.version, 1);
  assertMatch(negotiationControlMigration.forwardNotes, /additive/i);
  assertMatch(negotiationControlMigration.rollbackNotes, /retain/i);
  const sql = negotiationControlMigration.statements.map((statement) =>
    statement.sql
  ).join("\n");
  assert(sql.includes("negotiation.rounds"));
  assert(sql.includes("negotiation.approvals"));
  assert(sql.includes("negotiation.delivery_receipts"));
  assert(sql.includes("negotiation.effect_records"));
  assert(!/\b(?:DROP|TRUNCATE|DELETE\s+FROM|ALTER\s+TABLE)\b/i.test(sql));
  assert(
    !/\b(?:platform|work_management|deal_management|closing)\s*\./i.test(sql),
  );
  assert(
    negotiationControlMigration.statements.every((statement) =>
      statement.schema === "negotiation"
    ),
  );
  assertEquals(
    await migrationChecksum(negotiationControlMigration),
    "f86562c3ecab3e6b05fda6f2b8a8c410d201a06e8fc511e307ea36c5ae12632e",
  );
});

Deno.test("Negotiation evidence migration is additive and append-only", () => {
  assertEquals(negotiationEvidenceMigration.version, 2);
  assertMatch(negotiationEvidenceMigration.forwardNotes, /evidence/i);
  assertMatch(negotiationEvidenceMigration.rollbackNotes, /retain/i);
  const sql = negotiationEvidenceMigration.statements.map((statement) =>
    statement.sql
  ).join("\n");
  assert(sql.includes("negotiation.evidence_events"));
  assert(sql.includes("reject_evidence_mutation"));
  assert(
    sql.includes("FOREIGN KEY (tenant_id, workspace_id, deal_id, round_id)"),
  );
  assert(!/\bDROP\s+TABLE\b|\bTRUNCATE\b/i.test(sql));
});
