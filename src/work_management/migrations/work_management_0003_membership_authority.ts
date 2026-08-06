import { defineMigration } from "../../platform/persistence/v1.ts";

export const workManagementMembershipAuthorityMigration = defineMigration({
  owner: "work_management",
  schema: "work_management",
  id: "work_management-0003-membership-authority",
  version: 3,
  forwardNotes:
    "Fail closed on existing Workstream/Task membership divergence and enforce Workstream taskIds as authoritative with exact Task workstreamId back-references at transaction commit.",
  rollbackNotes:
    "Disable Work Management commands and retain all aggregate and history records; do not remove membership enforcement until divergent records are reconciled.",
  compatibleChecksums: [
    "5a26d7534f4852afa9b64671e4ebaa25e6c20b69fa6e7b9446efebca62b534bb",
  ],
  statements: [{
    schema: "work_management",
    sql: `
      CREATE FUNCTION work_management.membership_is_inconsistent()
      RETURNS boolean LANGUAGE sql STABLE AS $$
        WITH task_memberships AS (
          SELECT tenant_id AS task_tenant_id,
            workspace_id AS task_workspace_id, deal_id AS task_deal_id,
            workstream_id AS task_workstream_id, task_id AS referenced_task_id
          FROM work_management.tasks_current
        ), owner_memberships AS (
          SELECT tenant_id AS owner_tenant_id,
            workspace_id AS owner_workspace_id, deal_id AS owner_deal_id,
            workstream_id AS owner_workstream_id,
            document->'taskIds' AS owner_task_ids
          FROM work_management.workstreams_current
        ), authoritative_memberships AS (
          SELECT tenant_id AS authoritative_tenant_id,
            workspace_id AS authoritative_workspace_id,
            deal_id AS authoritative_deal_id,
            workstream_id AS authoritative_workstream_id,
            jsonb_array_elements_text(
              CASE WHEN jsonb_typeof(document->'taskIds') = 'array'
                THEN document->'taskIds' ELSE '[]'::jsonb END
            ) AS authoritative_task_id
          FROM work_management.workstreams_current
        ), resolved_memberships AS (
          SELECT tenant_id AS resolved_tenant_id,
            workspace_id AS resolved_workspace_id, deal_id AS resolved_deal_id,
            workstream_id AS resolved_workstream_id,
            task_id AS resolved_task_id
          FROM work_management.tasks_current
        )
        SELECT EXISTS (
          SELECT 1 FROM work_management.workstreams_current
          WHERE jsonb_typeof(document->'taskIds') IS DISTINCT FROM 'array'
        ) OR EXISTS (
          SELECT 1 FROM work_management.tasks_current
          WHERE document->>'workstreamId' IS DISTINCT FROM workstream_id
        ) OR EXISTS (
          SELECT 1 FROM task_memberships
          LEFT JOIN owner_memberships
            ON task_tenant_id = owner_tenant_id
           AND task_workspace_id = owner_workspace_id
           AND task_deal_id = owner_deal_id
           AND task_workstream_id = owner_workstream_id
          WHERE owner_workstream_id IS NULL
             OR NOT (owner_task_ids ? referenced_task_id)
        ) OR EXISTS (
          SELECT 1 FROM authoritative_memberships
          LEFT JOIN resolved_memberships
            ON authoritative_tenant_id = resolved_tenant_id
           AND authoritative_workspace_id = resolved_workspace_id
           AND authoritative_deal_id = resolved_deal_id
           AND authoritative_workstream_id = resolved_workstream_id
           AND authoritative_task_id = resolved_task_id
          WHERE resolved_task_id IS NULL
        ) OR EXISTS (
          SELECT 1 FROM authoritative_memberships
          GROUP BY authoritative_tenant_id, authoritative_workspace_id,
            authoritative_deal_id, authoritative_workstream_id,
            authoritative_task_id
          HAVING count(*) > 1
        )
      $$;
      -- Enforcement is installed only by 0004 after append-only findings are
      -- Keep legacy data untouched so this compatibility stream does not abort dirty records
    `,
  }],
});
