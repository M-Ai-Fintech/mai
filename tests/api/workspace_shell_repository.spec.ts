import { assertEquals, assertStringIncludes } from "@std/assert";
import { tenantId, workspaceId } from "../../src/identity_access/v1.ts";
import {
  PostgresWorkspaceShellProjection,
  type WorkspaceShellQueryPort,
} from "../../src/api/workspace_shell_repository.ts";

class FixedWorkspaceShellQuery implements WorkspaceShellQueryPort {
  statement = "";
  values: readonly unknown[] = [];

  constructor(private readonly present = true) {}

  query<T>(text: string, values: readonly unknown[] = []) {
    this.statement = text;
    this.values = values;
    const rows = this.present
      ? [{
        institutionId: "institution_atlas",
        institutionDocument: { name: "Atlas M&A Advisory" },
        workspaceId: "workspace_atlas",
        workspaceDocument: { name: "Atlas Deal Team" },
      } as T]
      : [];
    return Promise.resolve({ rows, rowCount: rows.length });
  }
}

Deno.test("workspace shell repository reads institution and workspace scope", async () => {
  const query = new FixedWorkspaceShellQuery();
  const repository = new PostgresWorkspaceShellProjection(query);

  const projection = await repository.find(
    tenantId("tenant_atlas"),
    workspaceId("workspace_atlas"),
  );

  assertEquals(projection, {
    organization: { id: "institution_atlas", name: "Atlas M&A Advisory" },
    workspace: { id: "workspace_atlas", name: "Atlas Deal Team" },
  });
  assertEquals(query.values, ["tenant_atlas", "workspace_atlas"]);
  assertStringIncludes(query.statement, "JOIN iam.institutions");
});

Deno.test("workspace shell repository protects an absent scoped projection", async () => {
  const repository = new PostgresWorkspaceShellProjection(
    new FixedWorkspaceShellQuery(false),
  );

  assertEquals(
    await repository.find(
      tenantId("tenant_atlas"),
      workspaceId("workspace_missing"),
    ),
    undefined,
  );
});
