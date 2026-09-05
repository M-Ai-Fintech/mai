import {
  assertEquals,
  assertRejects,
  assertStringIncludes,
  assertThrows,
} from "@std/assert";
import { demoScope } from "../../src/demo_readiness/runner.ts";
import {
  assertLocalMvpSeedTarget,
  localMvpIdentity,
  type LocalMvpSqlPort,
  seedLocalMvpIdentity,
} from "../../src/local_mvp/identity_seed.ts";

class RecordingLocalMvpSql implements LocalMvpSqlPort {
  readonly queries: {
    readonly text: string;
    readonly values: readonly unknown[];
  }[] = [];

  constructor(private readonly rowCount = 1) {}

  query(text: string, values: readonly unknown[] = []) {
    this.queries.push({ text, values });
    return Promise.resolve({ rowCount: this.rowCount });
  }
}

Deno.test("local MVP seed permits only the named loopback database", () => {
  assertEquals(
    assertLocalMvpSeedTarget({
      LOCAL_RUNTIME_PROFILE: "local",
      DATABASE_URL: "postgresql://mai:secret@127.0.0.1:55438/mai_local",
    }).port,
    "55438",
  );
  for (
    const databaseUrl of [
      "postgresql://mai:secret@db.example.com:55438/mai_local",
      "postgresql://mai:secret@127.0.0.1:5432/mai_local",
      "postgresql://mai:secret@127.0.0.1:55438/other",
    ]
  ) {
    assertThrows(
      () =>
        assertLocalMvpSeedTarget({
          LOCAL_RUNTIME_PROFILE: "local",
          DATABASE_URL: databaseUrl,
        }),
      Error,
      "loopback:55438/mai_local",
    );
  }
});

Deno.test("local MVP identity uses the governed demo scope", async () => {
  const sql = new RecordingLocalMvpSql();
  await seedLocalMvpIdentity(
    sql,
    "2026-08-12T12:00:00.000Z",
    "2099-08-12T12:00:00.000Z",
  );

  assertEquals(localMvpIdentity.tenantId, demoScope.tenantId);
  assertEquals(localMvpIdentity.workspaceId, demoScope.workspaceId);
  assertEquals(sql.queries.length, 6);
  assertStringIncludes(sql.queries[0].text, "iam.institutions");
  assertStringIncludes(String(sql.queries[0].values), "Atlas M&A Advisory");
  assertStringIncludes(sql.queries[1].text, "iam.workspaces");
  assertStringIncludes(sql.queries[4].text, "iam.sessions");
  assertStringIncludes(String(sql.queries[4].values), "actor_demo-banker");
  assertStringIncludes(sql.queries[5].text, "access.role_policies");
  assertStringIncludes(String(sql.queries[5].values), "transition_lifecycle");
  assertStringIncludes(String(sql.queries[5].values), "submit_proposal");
});

Deno.test("local MVP identity fails closed on a cross-scope collision", async () => {
  await assertRejects(
    () => seedLocalMvpIdentity(new RecordingLocalMvpSql(0)),
    Error,
    "conflicts with another scope",
  );
});
