export const membershipReconciliationSql = `
  CREATE TABLE work_management.membership_reconciliation_scans (
    scan_id TEXT PRIMARY KEY,
    detected_at TIMESTAMPTZ NOT NULL,
    completed_at TIMESTAMPTZ NOT NULL,
    scope JSONB NOT NULL CHECK (scope = '{"scope":"all"}'::jsonb),
    status TEXT NOT NULL CHECK (status = 'completed')
  );
  CREATE TABLE work_management.membership_reconciliation_findings (
    finding_id TEXT PRIMARY KEY,
    scan_id TEXT NOT NULL REFERENCES work_management.membership_reconciliation_scans(scan_id),
    finding_class TEXT NOT NULL CHECK (finding_class IN (
      'malformed_workstream_task_ids', 'duplicate_authoritative_task_id',
      'task_document_back_reference_mismatch', 'task_owner_workstream_missing',
      'task_owner_scope_mismatch', 'task_missing_from_authoritative_membership',
      'authoritative_task_missing', 'authoritative_task_wrong_workstream',
      'authoritative_task_scope_mismatch'
    )),
    severity TEXT NOT NULL CHECK (severity = 'blocking'),
    action TEXT NOT NULL CHECK (action = 'block_commands'),
    status TEXT NOT NULL CHECK (status = 'unresolved'),
    resolution JSONB CHECK (resolution IS NULL),
    tenant_id TEXT,
    workspace_id TEXT,
    deal_id TEXT,
    workstream_id TEXT,
    workstream_version BIGINT CHECK (workstream_version IS NULL OR workstream_version > 0),
    task_id TEXT,
    task_version BIGINT CHECK (task_version IS NULL OR task_version > 0),
    detected_values JSONB NOT NULL CHECK (jsonb_typeof(detected_values) = 'object'),
    detected_at TIMESTAMPTZ NOT NULL,
    UNIQUE (scan_id, finding_class, tenant_id, workspace_id, deal_id, workstream_id, task_id)
  );
  CREATE INDEX work_management_membership_findings_scan_idx
    ON work_management.membership_reconciliation_findings
    (scan_id, severity, finding_class, tenant_id, workspace_id, deal_id, workstream_id, task_id);
  CREATE TABLE work_management.membership_reconciliation_resolutions (
    resolution_id TEXT PRIMARY KEY,
    finding_id TEXT NOT NULL UNIQUE REFERENCES work_management.membership_reconciliation_findings(finding_id),
    action TEXT NOT NULL CHECK (action = 'resolve'),
    status TEXT NOT NULL CHECK (status = 'resolved'),
    resolution JSONB NOT NULL CHECK (jsonb_typeof(resolution) = 'object'),
    resolved_by TEXT NOT NULL,
    recorded_at TIMESTAMPTZ NOT NULL
  );
  CREATE TABLE work_management.membership_rollout_events (
    event_id TEXT PRIMARY KEY,
    mode TEXT NOT NULL CHECK (mode IN ('disabled', 'read_only', 'commands')),
    scan_id TEXT REFERENCES work_management.membership_reconciliation_scans(scan_id),
    actor_id TEXT NOT NULL,
    recorded_at TIMESTAMPTZ NOT NULL
  );
  CREATE INDEX work_management_membership_rollout_latest_idx
    ON work_management.membership_rollout_events (recorded_at DESC, event_id DESC);

  CREATE FUNCTION work_management.membership_finding_identity(
    requested_scan_id TEXT, requested_class TEXT, requested_scope JSONB,
    requested_values JSONB
  ) RETURNS TEXT LANGUAGE sql IMMUTABLE AS $$
    SELECT 'membership-finding:' || md5(concat_ws('|', requested_scan_id,
      requested_class, requested_scope::text, requested_values::text))
  $$;

  CREATE FUNCTION work_management.reject_membership_evidence_mutation()
  RETURNS trigger LANGUAGE plpgsql AS $$
  BEGIN
    RAISE EXCEPTION 'work_management membership reconciliation evidence is append-only';
  END;
  $$;
  CREATE TRIGGER membership_scans_no_update_or_delete
    BEFORE UPDATE OR DELETE ON work_management.membership_reconciliation_scans
    FOR EACH ROW EXECUTE FUNCTION work_management.reject_membership_evidence_mutation();
  CREATE TRIGGER membership_findings_no_update_or_delete
    BEFORE UPDATE OR DELETE ON work_management.membership_reconciliation_findings
    FOR EACH ROW EXECUTE FUNCTION work_management.reject_membership_evidence_mutation();
  CREATE TRIGGER membership_resolutions_no_update_or_delete
    BEFORE UPDATE OR DELETE ON work_management.membership_reconciliation_resolutions
    FOR EACH ROW EXECUTE FUNCTION work_management.reject_membership_evidence_mutation();
  CREATE TRIGGER membership_rollout_no_update_or_delete
    BEFORE UPDATE OR DELETE ON work_management.membership_rollout_events
    FOR EACH ROW EXECUTE FUNCTION work_management.reject_membership_evidence_mutation();

  CREATE FUNCTION work_management.insert_membership_finding(
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
      tenant_id, workspace_id, deal_id, workstream_id, workstream_version,
      task_id, task_version, detected_values, detected_at
    ) VALUES (
      generated_finding_id, requested_scan_id, requested_class, 'blocking',
      'block_commands', 'unresolved', NULL, requested_tenant,
      requested_workspace, requested_deal, requested_workstream,
      requested_workstream_version, requested_task, requested_task_version,
      requested_values, requested_detected_at
    );
  END;
  $$;

  CREATE FUNCTION work_management.scan_membership_authority(
    requested_scan_id TEXT, requested_detected_at TIMESTAMPTZ
  ) RETURNS BIGINT LANGUAGE plpgsql AS $$
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
          workstream_id AS owner_workstream_id, document AS owner_document
        FROM work_management.workstreams_current
      )
      SELECT task_tenant_id AS tenant_id, task_workspace_id AS workspace_id,
        task_deal_id AS deal_id, task_workstream_id AS workstream_id,
        owned_task_id AS task_id, owned_task_version AS version
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
        to_jsonb(source_record)->>'workstream_id', NULL, to_jsonb(source_record)->>'task_id',
        (to_jsonb(source_record)->>'version')::bigint, jsonb_build_object('taskWorkstreamId',
          to_jsonb(source_record)->>'workstream_id'), requested_detected_at);
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
    RETURN finding_count;
  END;
  $$;

  CREATE VIEW work_management.membership_reconciliation_status AS
    WITH resolved_findings AS (
      SELECT finding_id AS resolved_finding_id
      FROM work_management.membership_reconciliation_resolutions
    )
    SELECT finding_id, scan_id, finding_class, severity, tenant_id,
      workspace_id, deal_id, workstream_id, workstream_version, task_id,
      task_version, detected_values, detected_at,
      CASE WHEN resolved_finding_id IS NOT NULL
        THEN 'resolved' ELSE 'unresolved' END AS current_status
    FROM work_management.membership_reconciliation_findings
    LEFT JOIN resolved_findings ON finding_id = resolved_finding_id;

  CREATE FUNCTION work_management.resolve_membership_finding(
    requested_resolution_id TEXT, requested_finding_id TEXT,
    verification_scan_id TEXT, requested_resolution JSONB,
    requested_actor TEXT, requested_recorded_at TIMESTAMPTZ
  ) RETURNS VOID LANGUAGE plpgsql AS $$
  DECLARE
    finding_record JSONB;
    verification_detected_at TIMESTAMPTZ;
    existing_resolution JSONB;
  BEGIN
    SELECT to_jsonb(membership_reconciliation_findings) INTO finding_record
      FROM work_management.membership_reconciliation_findings
      WHERE finding_id = requested_finding_id;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'membership finding % is missing; expected immutable evidence',
        requested_finding_id;
    END IF;
    SELECT detected_at INTO verification_detected_at
      FROM work_management.membership_reconciliation_scans
      WHERE scan_id = verification_scan_id;
    IF NOT FOUND OR verification_detected_at <
      (finding_record->>'detected_at')::timestamptz THEN
      RAISE EXCEPTION 'verification scan % is missing or predates finding %',
        verification_scan_id, requested_finding_id;
    END IF;
    IF EXISTS (
      SELECT 1 FROM work_management.membership_reconciliation_findings
      WHERE scan_id = verification_scan_id
        AND finding_class = finding_record->>'finding_class'
        AND tenant_id IS NOT DISTINCT FROM finding_record->>'tenant_id'
        AND workspace_id IS NOT DISTINCT FROM finding_record->>'workspace_id'
        AND deal_id IS NOT DISTINCT FROM finding_record->>'deal_id'
        AND workstream_id IS NOT DISTINCT FROM finding_record->>'workstream_id'
        AND task_id IS NOT DISTINCT FROM finding_record->>'task_id'
    ) THEN
      RAISE EXCEPTION 'membership finding % remains present in verification scan %',
        requested_finding_id, verification_scan_id;
    END IF;
    SELECT to_jsonb(membership_reconciliation_resolutions)
      INTO existing_resolution
      FROM work_management.membership_reconciliation_resolutions
      WHERE resolution_id = requested_resolution_id;
    IF FOUND THEN
      IF existing_resolution->>'finding_id' IS DISTINCT FROM requested_finding_id
        OR existing_resolution->'resolution' IS DISTINCT FROM requested_resolution
        OR existing_resolution->>'resolved_by' IS DISTINCT FROM requested_actor
        OR (existing_resolution->>'recorded_at')::timestamptz IS DISTINCT FROM
          requested_recorded_at THEN
        RAISE EXCEPTION 'membership resolution identity % conflicts with immutable evidence',
          requested_resolution_id;
      END IF;
      RETURN;
    END IF;
    INSERT INTO work_management.membership_reconciliation_resolutions
      (resolution_id, finding_id, action, status, resolution, resolved_by,
        recorded_at) VALUES (requested_resolution_id, requested_finding_id,
        'resolve', 'resolved', requested_resolution, requested_actor,
        requested_recorded_at);
  END;
  $$;

  CREATE FUNCTION work_management.set_membership_rollout_mode(
    requested_event_id TEXT, requested_mode TEXT, requested_scan_id TEXT,
    requested_actor TEXT, requested_recorded_at TIMESTAMPTZ
  ) RETURNS VOID LANGUAGE plpgsql AS $$
  DECLARE
    existing_event JSONB;
    latest_scan_id TEXT;
  BEGIN
    SELECT to_jsonb(membership_rollout_events) INTO existing_event
      FROM work_management.membership_rollout_events
      WHERE event_id = requested_event_id;
    IF FOUND THEN
      IF existing_event->>'mode' IS DISTINCT FROM requested_mode
        OR existing_event->>'scan_id' IS DISTINCT FROM requested_scan_id
        OR existing_event->>'actor_id' IS DISTINCT FROM requested_actor
        OR (existing_event->>'recorded_at')::timestamptz IS DISTINCT FROM
          requested_recorded_at THEN
        RAISE EXCEPTION 'membership rollout event identity % conflicts with immutable evidence',
          requested_event_id;
      END IF;
      RETURN;
    END IF;
    IF requested_mode = 'commands' THEN
      SELECT scan_id INTO latest_scan_id
        FROM work_management.membership_reconciliation_scans
        ORDER BY detected_at DESC, scan_id DESC LIMIT 1;
      IF latest_scan_id IS DISTINCT FROM requested_scan_id THEN
        RAISE EXCEPTION 'command activation scan % is stale; expected latest scan %',
          requested_scan_id, latest_scan_id;
      END IF;
      IF EXISTS (
        SELECT 1 FROM work_management.membership_reconciliation_status
        WHERE severity = 'blocking' AND current_status = 'unresolved'
      ) THEN
        RAISE EXCEPTION 'Work Management commands are blocked by unresolved membership findings';
      END IF;
      IF EXISTS (
        SELECT 1 FROM work_management.membership_reconciliation_findings
        WHERE scan_id = requested_scan_id
      ) THEN
        RAISE EXCEPTION 'command activation scan % is not clean; expected zero findings',
          requested_scan_id;
      END IF;
    END IF;
    INSERT INTO work_management.membership_rollout_events
      (event_id, mode, scan_id, actor_id, recorded_at)
      VALUES (requested_event_id, requested_mode, requested_scan_id,
        requested_actor, requested_recorded_at);
  END;
  $$;

  CREATE FUNCTION work_management.membership_commands_available()
  RETURNS boolean LANGUAGE sql STABLE AS $$
    SELECT COALESCE((SELECT mode = 'commands'
      FROM work_management.membership_rollout_events
      ORDER BY recorded_at DESC, event_id DESC LIMIT 1), false)
      AND NOT EXISTS (
        SELECT 1 FROM work_management.membership_reconciliation_status
        WHERE severity = 'blocking' AND current_status = 'unresolved'
      )
  $$;
`;
