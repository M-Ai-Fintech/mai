import type { TenantId, WorkspaceId } from "../shared/contracts/identifiers.ts";
import type {
  WorkspaceShellOrganization,
  WorkspaceShellWorkspace,
} from "./contracts/workspace_shell.ts";

export interface WorkspaceShellProjection {
  readonly organization: WorkspaceShellOrganization;
  readonly workspace: WorkspaceShellWorkspace;
}

export interface WorkspaceShellProjectionPort {
  find(
    tenantId: TenantId,
    workspaceId: WorkspaceId,
  ): Promise<WorkspaceShellProjection | undefined>;
}

export interface WorkspaceShellQueryPort {
  query<T>(
    text: string,
    values?: readonly unknown[],
  ): Promise<{ readonly rows: readonly T[]; readonly rowCount: number | null }>;
}

interface WorkspaceShellRow {
  readonly institutionId: string;
  readonly institutionDocument: unknown;
  readonly workspaceId: WorkspaceId;
  readonly workspaceDocument: unknown;
}

export class PostgresWorkspaceShellProjection
  implements WorkspaceShellProjectionPort {
  constructor(private readonly query: WorkspaceShellQueryPort) {}

  /** Reads the exact active institution/workspace projection for one scope. */
  async find(
    tenantId: TenantId,
    workspaceId: WorkspaceId,
  ): Promise<WorkspaceShellProjection | undefined> {
    const result = await this.query.query<WorkspaceShellRow>(projectionQuery, [
      tenantId,
      workspaceId,
    ]);
    if (result.rowCount !== 1) return undefined;
    return projectionFromRow(result.rows[0]);
  }
}

function projectionFromRow(
  row: WorkspaceShellRow | undefined,
): WorkspaceShellProjection | undefined {
  if (row === undefined) return undefined;
  const institution = record(row.institutionDocument);
  const workspace = record(row.workspaceDocument);
  if (!named(institution) || !named(workspace)) return undefined;
  return {
    organization: { id: row.institutionId, name: institution.name },
    workspace: { id: row.workspaceId, name: workspace.name },
  };
}

function named(
  value: Readonly<Record<string, unknown>>,
): value is Readonly<Record<string, unknown>> & { readonly name: string } {
  return typeof value.name === "string" && value.name.trim() !== "";
}

function record(value: unknown): Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? value as Readonly<Record<string, unknown>>
    : {};
}

const projectionQuery = `SELECT
    workspace.workspace_id AS "workspaceId",
    workspace.document AS "workspaceDocument",
    institution.aggregate_id AS "institutionId",
    institution.document AS "institutionDocument"
  FROM iam.workspaces AS workspace
  JOIN iam.institutions AS institution
    ON institution.tenant_id = workspace.tenant_id
   AND institution.aggregate_id = workspace.document->>'institutionId'
   AND institution.state = 'active'
  WHERE workspace.tenant_id = $1 AND workspace.workspace_id = $2
    AND workspace.state = 'active'`;
