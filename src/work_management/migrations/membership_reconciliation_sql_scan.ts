export const membershipReconciliationScanSql = `
  CREATE OR REPLACE FUNCTION work_management.insert_membership_finding(
    requested_scan_id TEXT, requested_class TEXT, requested_tenant TEXT,
    requested_workspace TEXT, requested_deal TEXT, requested_workstream TEXT,
    requested_workstream_version BIGINT, requested_task TEXT,
    requested_task_version BIGINT, requested_values JSONB,
    requested_detected_at TIMESTAMPTZ
  ) RETURNS VOID LANGUAGE plpgsql AS $$
  DECLARE
    finding_scope JSONB;
    generated_finding_id TEXT;
  BEGIN
    finding_scope := jsonb_build_object('tenantId', requested_tenant,
      'workspaceId', requested_workspace, 'dealId', requested_deal,
      'workstreamId', requested_workstream, 'taskId', requested_task);
    generated_finding_id := work_management.membership_finding_identity(
      requested_scan_id, requested_class, finding_scope, requested_values);
    INSERT INTO work_management.membership_reconciliation_findings (
      finding_id, scan_id, finding_class, severity, action, status, resolution,
      required_human_action,
      tenant_id, workspace_id, deal_id, workstream_id, workstream_version,
      task_id, task_version, detected_values, detected_at
    ) VALUES (
      generated_finding_id, requested_scan_id, requested_class, 'blocking',
      'block_commands', 'unresolved', NULL,
      CASE
        WHEN requested_class = 'ambiguous_legacy_ownership'
          THEN 'review_ambiguous_ownership'
        WHEN requested_class IN ('authoritative_task_missing',
          'authoritative_task_wrong_workstream',
          'authoritative_task_scope_mismatch')
          THEN 'map_membership'
        ELSE 'repair_membership'
      END,
      requested_tenant,
      requested_workspace, requested_deal, requested_workstream,
      requested_workstream_version, requested_task, requested_task_version,
      requested_values, requested_detected_at
    );
  END;
  $$;

  CREATE OR REPLACE FUNCTION work_management.scan_membership_authority(
    requested_scan_id TEXT, requested_detected_at TIMESTAMPTZ
  ) RETURNS BIGINT LANGUAGE plpgsql SECURITY DEFINER AS $$
  DECLARE
    existing_detected_at TIMESTAMPTZ;
    source_record RECORD;
    finding_count BIGINT;
  BEGIN
    SELECT detected_at INTO existing_detected_at
      FROM work_management.membership_reconciliation_scans
      WHERE scan_id = requested_scan_id;
    IF FOUND THEN
      IF existing_detected_at IS DISTINCT FROM requested_detected_at THEN
        RAISE EXCEPTION 'membership scan identity % was recorded at %, expected exact replay at %',
          requested_scan_id, existing_detected_at, requested_detected_at;
      END IF;
      SELECT count(*) INTO finding_count
        FROM work_management.membership_reconciliation_findings
        WHERE scan_id = requested_scan_id;
      RETURN finding_count;
    END IF;
    PERFORM set_config(
      'work_management.membership_writer',
      md5(current_user || txid_current()::text || 'work-management-scan-writer-v1'),
      true);
    INSERT INTO work_management.membership_reconciliation_scans
      (scan_id, detected_at, completed_at, scope, status)
      VALUES (requested_scan_id, requested_detected_at, CURRENT_TIMESTAMP,
        '{"scope":"all"}'::jsonb, 'completed');

    FOR source_record IN
      SELECT tenant_id, workspace_id, deal_id, workstream_id, version,
        document FROM work_management.workstreams_current
      WHERE jsonb_typeof(document->'taskIds') IS DISTINCT FROM 'array'
    LOOP
      PERFORM work_management.insert_membership_finding(requested_scan_id,
        'malformed_workstream_task_ids', to_jsonb(source_record)->>'tenant_id',
        to_jsonb(source_record)->>'workspace_id', to_jsonb(source_record)->>'deal_id',
        to_jsonb(source_record)->>'workstream_id', (to_jsonb(source_record)->>'version')::bigint, NULL, NULL,
        jsonb_build_object('taskIds', to_jsonb(source_record)->'document'->'taskIds'),
        requested_detected_at);
    END LOOP;

    FOR source_record IN
      SELECT tenant_id, workspace_id, deal_id, workstream_id, version,
        document
      FROM work_management.workstreams_current
      WHERE jsonb_typeof(document->'taskIds') = 'array'
        AND EXISTS (
          SELECT 1
          FROM jsonb_array_elements(document->'taskIds') AS task_member
          WHERE jsonb_typeof(task_member) <> 'string'
             OR length(task_member #>> '{}') > 64
             OR task_member #>> '{}' !~ '^task_[a-z0-9]+(?:-[a-z0-9]+)*$'
        )
    LOOP
      PERFORM work_management.insert_membership_finding(requested_scan_id,
        'malformed_workstream_task_ids', to_jsonb(source_record)->>'tenant_id',
        to_jsonb(source_record)->>'workspace_id', to_jsonb(source_record)->>'deal_id',
        to_jsonb(source_record)->>'workstream_id',
        (to_jsonb(source_record)->>'version')::bigint, NULL, NULL,
        jsonb_build_object('taskIds', to_jsonb(source_record)->'document'->'taskIds',
          'reason', 'invalid_task_id_element'), requested_detected_at);
    END LOOP;

    FOR source_record IN
      SELECT tenant_id, workspace_id, deal_id, workstream_id, task_id, version
      FROM work_management.tasks_current
      WHERE length(task_id) > 64
        OR task_id !~ '^task_[a-z0-9]+(?:-[a-z0-9]+)*$'
    LOOP
      PERFORM work_management.insert_membership_finding(requested_scan_id,
        'malformed_task_id', to_jsonb(source_record)->>'tenant_id',
        to_jsonb(source_record)->>'workspace_id', to_jsonb(source_record)->>'deal_id',
        to_jsonb(source_record)->>'workstream_id', NULL,
        to_jsonb(source_record)->>'task_id',
        (to_jsonb(source_record)->>'version')::bigint,
        jsonb_build_object('taskId', to_jsonb(source_record)->>'task_id'),
        requested_detected_at);
    END LOOP;

    FOR source_record IN
      WITH expanded_memberships AS (
        SELECT tenant_id, workspace_id, deal_id, workstream_id, version,
          jsonb_array_elements_text(document->'taskIds') AS expanded_task_id
        FROM work_management.workstreams_current
        WHERE jsonb_typeof(document->'taskIds') = 'array'
      )
      SELECT tenant_id, workspace_id, deal_id, workstream_id, version,
        expanded_task_id, count(*)::bigint AS occurrence_count
      FROM expanded_memberships
      GROUP BY tenant_id, workspace_id, deal_id, workstream_id, version,
        expanded_task_id HAVING count(*) > 1
    LOOP
      PERFORM work_management.insert_membership_finding(requested_scan_id,
        'duplicate_authoritative_task_id', to_jsonb(source_record)->>'tenant_id',
        to_jsonb(source_record)->>'workspace_id', to_jsonb(source_record)->>'deal_id',
        to_jsonb(source_record)->>'workstream_id', (to_jsonb(source_record)->>'version')::bigint,
        to_jsonb(source_record)->>'expanded_task_id', NULL,
        jsonb_build_object('occurrences', (to_jsonb(source_record)->>'occurrence_count')::bigint),
        requested_detected_at);
    END LOOP;

    FOR source_record IN
      WITH expanded_memberships AS (
        SELECT tenant_id, workspace_id, deal_id, workstream_id, version,
          jsonb_array_elements_text(document->'taskIds') AS task_id
        FROM work_management.workstreams_current
        WHERE jsonb_typeof(document->'taskIds') = 'array'
      )
      SELECT tenant_id, workspace_id, deal_id, task_id,
        min(workstream_id) AS workstream_id, max(version) AS version,
        count(*)::bigint AS owner_count,
        jsonb_agg(workstream_id ORDER BY workstream_id) AS owners
      FROM expanded_memberships
      GROUP BY tenant_id, workspace_id, deal_id, task_id
      HAVING count(DISTINCT workstream_id) > 1
    LOOP
      PERFORM work_management.insert_membership_finding(requested_scan_id,
        'ambiguous_legacy_ownership', to_jsonb(source_record)->>'tenant_id',
        to_jsonb(source_record)->>'workspace_id', to_jsonb(source_record)->>'deal_id',
        to_jsonb(source_record)->>'workstream_id',
        (to_jsonb(source_record)->>'version')::bigint,
        to_jsonb(source_record)->>'task_id', NULL,
        jsonb_build_object('owners', to_jsonb(source_record)->'owners',
          'ownerCount', (to_jsonb(source_record)->>'owner_count')::bigint),
        requested_detected_at);
    END LOOP;

    FOR source_record IN
      SELECT tenant_id, workspace_id, deal_id, workstream_id, task_id, version,
        document FROM work_management.tasks_current
      WHERE document->>'workstreamId' IS DISTINCT FROM workstream_id
    LOOP
      PERFORM work_management.insert_membership_finding(requested_scan_id,
        'task_document_back_reference_mismatch', to_jsonb(source_record)->>'tenant_id',
        to_jsonb(source_record)->>'workspace_id', to_jsonb(source_record)->>'deal_id',
        to_jsonb(source_record)->>'workstream_id', NULL, to_jsonb(source_record)->>'task_id',
        (to_jsonb(source_record)->>'version')::bigint, jsonb_build_object('columnWorkstreamId',
          to_jsonb(source_record)->>'workstream_id', 'documentWorkstreamId',
          to_jsonb(source_record)->'document'->>'workstreamId'), requested_detected_at);
    END LOOP;

    FOR source_record IN
      WITH task_owners AS (
        SELECT tenant_id AS task_tenant_id, workspace_id AS task_workspace_id,
          deal_id AS task_deal_id, workstream_id AS task_workstream_id,
          task_id AS owned_task_id, version AS owned_task_version
        FROM work_management.tasks_current
      ), workstream_owners AS (
        SELECT tenant_id AS owner_tenant_id,
          workspace_id AS owner_workspace_id, deal_id AS owner_deal_id,
          workstream_id AS owner_workstream_id
        FROM work_management.workstreams_current
      )
      SELECT task_tenant_id AS tenant_id, task_workspace_id AS workspace_id,
        task_deal_id AS deal_id, task_workstream_id AS workstream_id,
        owned_task_id AS task_id, owned_task_version AS version
      FROM task_owners LEFT JOIN workstream_owners
        ON task_tenant_id = owner_tenant_id
        AND task_workspace_id = owner_workspace_id
        AND task_deal_id = owner_deal_id
        AND task_workstream_id = owner_workstream_id
      WHERE owner_workstream_id IS NULL
    LOOP
      PERFORM work_management.insert_membership_finding(requested_scan_id,
        CASE WHEN EXISTS (
          SELECT 1 FROM work_management.workstreams_current
          WHERE workstream_id = to_jsonb(source_record)->>'workstream_id'
        ) THEN 'task_owner_scope_mismatch' ELSE 'task_owner_workstream_missing' END,
        to_jsonb(source_record)->>'tenant_id', to_jsonb(source_record)->>'workspace_id',
        to_jsonb(source_record)->>'deal_id', to_jsonb(source_record)->>'workstream_id', NULL,
        to_jsonb(source_record)->>'task_id', (to_jsonb(source_record)->>'version')::bigint,
        jsonb_build_object('expectedScope', jsonb_build_object('tenantId',
          to_jsonb(source_record)->>'tenant_id', 'workspaceId', to_jsonb(source_record)->>'workspace_id',
          'dealId', to_jsonb(source_record)->>'deal_id')), requested_detected_at);
    END LOOP;

    FOR source_record IN
      WITH task_owners AS (
        SELECT tenant_id AS task_tenant_id, workspace_id AS task_workspace_id,
          deal_id AS task_deal_id, workstream_id AS task_workstream_id,
          task_id AS owned_task_id, version AS owned_task_version
        FROM work_management.tasks_current
      ), workstream_owners AS (
        SELECT tenant_id AS owner_tenant_id,
          workspace_id AS owner_workspace_id, deal_id AS owner_deal_id,
          workstream_id AS owner_workstream_id, version AS owner_workstream_version,
          document AS owner_document
        FROM work_management.workstreams_current
      )
      SELECT task_tenant_id AS tenant_id, task_workspace_id AS workspace_id,
        task_deal_id AS deal_id, task_workstream_id AS workstream_id,
        owner_workstream_version AS workstream_version,
        owned_task_id AS task_id, owned_task_version AS task_version
      FROM task_owners JOIN workstream_owners
        ON task_tenant_id = owner_tenant_id
        AND task_workspace_id = owner_workspace_id
        AND task_deal_id = owner_deal_id
        AND task_workstream_id = owner_workstream_id
      WHERE jsonb_typeof(owner_document->'taskIds') = 'array'
        AND NOT (owner_document->'taskIds' ? owned_task_id)
    LOOP
      PERFORM work_management.insert_membership_finding(requested_scan_id,
        'task_missing_from_authoritative_membership', to_jsonb(source_record)->>'tenant_id',
        to_jsonb(source_record)->>'workspace_id', to_jsonb(source_record)->>'deal_id',
        to_jsonb(source_record)->>'workstream_id',
        (to_jsonb(source_record)->>'workstream_version')::bigint,
        to_jsonb(source_record)->>'task_id',
        (to_jsonb(source_record)->>'task_version')::bigint, jsonb_build_object('taskWorkstreamId',
          to_jsonb(source_record)->>'workstream_id'), requested_detected_at);
    END LOOP;

    FOR source_record IN
      SELECT owner_tenant_id AS tenant_id, owner_workspace_id AS workspace_id,
        owner_deal_id AS deal_id, owner_workstream_id AS workstream_id,
        owner_version AS workstream_version, task_id, task_version,
        owner_state AS workstream_state, task_state
      FROM (
        SELECT tenant_id AS owner_tenant_id, workspace_id AS owner_workspace_id,
          deal_id AS owner_deal_id, workstream_id AS owner_workstream_id,
          version AS owner_version, document->>'state' AS owner_state
        FROM work_management.workstreams_current
      ) AS owners
      JOIN (
        SELECT tenant_id AS task_tenant_id, workspace_id AS task_workspace_id,
          deal_id AS task_deal_id, workstream_id AS task_workstream_id,
          task_id, version AS task_version, document->>'state' AS task_state
        FROM work_management.tasks_current
      ) AS tasks ON task_tenant_id = owner_tenant_id
        AND task_workspace_id = owner_workspace_id
        AND task_deal_id = owner_deal_id
        AND task_workstream_id = owner_workstream_id
      WHERE owner_state = 'completed'
        AND (task_state IS NULL OR task_state NOT IN ('completed', 'cancelled'))
    LOOP
      PERFORM work_management.insert_membership_finding(requested_scan_id,
        'terminal_workstream_non_terminal_task', to_jsonb(source_record)->>'tenant_id',
        to_jsonb(source_record)->>'workspace_id', to_jsonb(source_record)->>'deal_id',
        to_jsonb(source_record)->>'workstream_id',
        (to_jsonb(source_record)->>'workstream_version')::bigint,
        to_jsonb(source_record)->>'task_id',
        (to_jsonb(source_record)->>'task_version')::bigint,
        jsonb_build_object('workstreamState', to_jsonb(source_record)->>'workstream_state',
          'taskState', to_jsonb(source_record)->>'task_state'), requested_detected_at);
    END LOOP;

    FOR source_record IN
      WITH expanded_memberships AS (
        SELECT tenant_id AS authoritative_tenant_id,
          workspace_id AS authoritative_workspace_id,
          deal_id AS authoritative_deal_id,
          workstream_id AS authoritative_workstream_id,
          version AS authoritative_workstream_version,
          jsonb_array_elements_text(document->'taskIds') AS authoritative_task_id
        FROM work_management.workstreams_current
        WHERE jsonb_typeof(document->'taskIds') = 'array'
      ), resolved_tasks AS (
        SELECT tenant_id AS resolved_tenant_id,
          workspace_id AS resolved_workspace_id,
          deal_id AS resolved_deal_id, task_id AS resolved_task_id,
          workstream_id AS resolved_workstream_id
        FROM work_management.tasks_current
      )
      SELECT DISTINCT authoritative_tenant_id AS tenant_id,
        authoritative_workspace_id AS workspace_id,
        authoritative_deal_id AS deal_id,
        authoritative_workstream_id AS workstream_id,
        authoritative_workstream_version AS version,
        authoritative_task_id AS expanded_task_id FROM expanded_memberships
      LEFT JOIN resolved_tasks ON authoritative_tenant_id = resolved_tenant_id
        AND authoritative_workspace_id = resolved_workspace_id
        AND authoritative_deal_id = resolved_deal_id
        AND authoritative_task_id = resolved_task_id
        AND authoritative_workstream_id = resolved_workstream_id
      WHERE resolved_task_id IS NULL
    LOOP
      PERFORM work_management.insert_membership_finding(requested_scan_id,
        CASE
          WHEN EXISTS (SELECT 1 FROM work_management.tasks_current
            WHERE tenant_id = to_jsonb(source_record)->>'tenant_id'
              AND workspace_id = to_jsonb(source_record)->>'workspace_id'
              AND deal_id = to_jsonb(source_record)->>'deal_id'
              AND task_id = to_jsonb(source_record)->>'expanded_task_id')
            THEN 'authoritative_task_wrong_workstream'
          WHEN EXISTS (SELECT 1 FROM work_management.tasks_current
            WHERE task_id = to_jsonb(source_record)->>'expanded_task_id')
            THEN 'authoritative_task_scope_mismatch'
          ELSE 'authoritative_task_missing'
        END, to_jsonb(source_record)->>'tenant_id', to_jsonb(source_record)->>'workspace_id',
        to_jsonb(source_record)->>'deal_id', to_jsonb(source_record)->>'workstream_id',
        (to_jsonb(source_record)->>'version')::bigint, to_jsonb(source_record)->>'expanded_task_id', NULL,
        jsonb_build_object('authoritativeWorkstreamId',
          to_jsonb(source_record)->>'workstream_id'), requested_detected_at);
    END LOOP;

    SELECT count(*) INTO finding_count
      FROM work_management.membership_reconciliation_findings
      WHERE scan_id = requested_scan_id;
    PERFORM set_config(
      'work_management.activation_writer',
      md5(current_user || txid_current()::text || 'work-management-activation-writer-v1'),
      true);
    UPDATE work_management.membership_reconciliation_activation
      SET mode = 'read_only', latest_scan_id = requested_scan_id,
        unresolved_blocking_count = (
          SELECT count(*) FROM work_management.membership_reconciliation_status
          WHERE severity = 'blocking' AND current_status = 'unresolved'
        ), recorded_at = requested_detected_at
      WHERE activation_id = TRUE;
    PERFORM set_config('work_management.membership_writer', 'forbidden', true);
    PERFORM set_config('work_management.activation_writer', 'forbidden', true);
    RETURN finding_count;
  END;
  $$;

`;
