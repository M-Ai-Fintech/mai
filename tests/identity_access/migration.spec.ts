import { assert, assertEquals, assertFalse, assertMatch } from "@std/assert";
import {
  accessPolicyMigration,
  iamIdentityMigration,
  identityAccessMigrations,
} from "../../src/identity_access/v1.ts";

Deno.test("identity access migrations own iam and access separately and retain rollback evidence", () => {
  assertEquals(identityAccessMigrations.map(({ id }) => id), [
    "iam-0001-identity-access",
    "access-0001-policy-access",
  ]);
  assertEquals(iamIdentityMigration.schema, "iam");
  assertEquals(accessPolicyMigration.schema, "access");
  assert(iamIdentityMigration.forwardNotes.includes("identity"));
  assert(iamIdentityMigration.rollbackNotes.includes("retaining"));
  assert(accessPolicyMigration.rollbackNotes.includes("retaining"));
  const statements = identityAccessMigrations.flatMap(({ statements }) =>
    statements
  );
  assert(statements.some(({ sql }) => sql.includes("iam.institutions")));
  assert(statements.some(({ sql }) => sql.includes("iam.sessions")));
  assert(
    statements.some(({ sql }) => sql.includes("access.permission_grants")),
  );
  assert(statements.some(({ sql }) => sql.includes("access.restrictions")));
  assertFalse(
    statements.some(({ sql }) => /ENABLE ROW LEVEL SECURITY/i.test(sql)),
  );
  for (const statement of statements) {
    assertMatch(statement.sql, /CREATE|ALTER|INSERT|DROP/i);
  }
});
