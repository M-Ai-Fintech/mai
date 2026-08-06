export const membershipReconciliationRolloutSql = `
  CREATE OR REPLACE VIEW work_management.membership_reconciliation_status AS
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

  CREATE OR REPLACE FUNCTION work_management.resolve_membership_finding(
    requested_resolution_id TEXT, requested_finding_id TEXT,
    verification_scan_id TEXT, requested_resolution JSONB,
    requested_actor TEXT, requested_recorded_at TIMESTAMPTZ
  ) RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
  DECLARE
    finding_record JSONB;
    verification_detected_at TIMESTAMPTZ;
    existing_resolution JSONB;
  BEGIN
    PERFORM work_management.assert_operator_actor(requested_actor);
    PERFORM set_config(
      'work_management.membership_writer',
      md5(current_user || txid_current()::text || 'work-management-resolution-writer-v1'),
      true);
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
      PERFORM set_config('work_management.membership_writer', 'forbidden', true);
      RETURN;
    END IF;
    IF requested_resolution->>'action' NOT IN ('mapped', 'retained')
      OR requested_resolution->>'retained' IS DISTINCT FROM 'true'
      OR jsonb_typeof(requested_resolution->'evidence') IS DISTINCT FROM 'object' THEN
      RAISE EXCEPTION 'membership resolution % must retain immutable evidence with action mapped or retained and an evidence object',
        requested_resolution_id;
    END IF;
    IF finding_record->>'finding_class' = 'ambiguous_legacy_ownership'
      AND requested_resolution->>'action' IS DISTINCT FROM 'retained' THEN
      RAISE EXCEPTION 'ambiguous membership finding % requires retained review evidence',
        requested_finding_id;
    END IF;
    INSERT INTO work_management.membership_reconciliation_resolutions
      (resolution_id, finding_id, action, status, resolution, resolved_by,
        recorded_at) VALUES (requested_resolution_id, requested_finding_id,
        'resolve', 'resolved', requested_resolution, requested_actor,
        requested_recorded_at);
    PERFORM set_config(
      'work_management.activation_writer',
      md5(current_user || txid_current()::text || 'work-management-activation-writer-v1'),
      true);
    UPDATE work_management.membership_reconciliation_activation
      SET mode = CASE WHEN mode = 'commands' THEN 'read_only' ELSE mode END,
        unresolved_blocking_count = (
          SELECT count(*) FROM work_management.membership_reconciliation_status
          WHERE severity = 'blocking' AND current_status = 'unresolved'
        ), recorded_at = requested_recorded_at
      WHERE activation_id = TRUE;
    PERFORM set_config('work_management.membership_writer', 'forbidden', true);
    PERFORM set_config('work_management.activation_writer', 'forbidden', true);
  END;
  $$;

  CREATE OR REPLACE FUNCTION work_management.set_membership_rollout_mode(
    requested_event_id TEXT, requested_mode TEXT, requested_scan_id TEXT,
    requested_actor TEXT, requested_recorded_at TIMESTAMPTZ
  ) RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
  DECLARE
    existing_event JSONB;
    current_activation_scan_id TEXT;
    current_activation_unresolved_count BIGINT;
  BEGIN
    PERFORM work_management.assert_operator_actor(requested_actor);
    IF current_setting('work_management.operator_actor', true)
      IS DISTINCT FROM requested_actor THEN
      RAISE EXCEPTION 'membership rollout actor must come from the governed operator session';
    END IF;
    PERFORM work_management.lock_membership_rollout();
    PERFORM set_config(
      'work_management.rollout_writer',
      md5(current_user || txid_current()::text || 'work-management-governed-rollout-v1'),
      true);
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
      PERFORM set_config('work_management.rollout_writer', 'forbidden', true);
      RETURN;
    END IF;
    IF requested_mode = 'commands' THEN
      IF requested_scan_id IS NULL THEN
        RAISE EXCEPTION 'command activation requires a completed reconciliation scan';
      END IF;
      SELECT latest_scan_id, unresolved_blocking_count
        INTO current_activation_scan_id, current_activation_unresolved_count
        FROM work_management.membership_reconciliation_activation
        WHERE activation_id = TRUE;
      IF current_activation_scan_id IS DISTINCT FROM requested_scan_id THEN
        RAISE EXCEPTION 'command activation scan % is stale; expected latest scan %',
          requested_scan_id, current_activation_scan_id;
      END IF;
      IF NOT EXISTS (
        SELECT 1 FROM work_management.membership_reconciliation_scans
        WHERE scan_id = requested_scan_id AND status = 'completed'
      ) THEN
        RAISE EXCEPTION 'command activation scan % is missing or incomplete', requested_scan_id;
      END IF;
      IF current_activation_unresolved_count <> 0 THEN
        RAISE EXCEPTION 'Work Management commands are blocked by unresolved membership findings';
      END IF;
      IF EXISTS (
        SELECT 1 FROM work_management.membership_reconciliation_findings
        WHERE scan_id = requested_scan_id
      ) THEN
        RAISE EXCEPTION 'command activation scan % is not clean; expected zero findings',
          requested_scan_id;
      END IF;
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'work_management.membership_rollout_events'::regclass
          AND conname = 'membership_rollout_commands_scan_check'
          AND convalidated
      ) THEN
        IF EXISTS (
          SELECT 1 FROM work_management.membership_rollout_events
          WHERE mode = 'commands' AND scan_id IS NULL
            AND NOT EXISTS (
              SELECT finding_id
              FROM work_management.membership_reconciliation_findings
              WHERE finding_class = 'legacy_rollout_missing_scan'
                AND detected_values->>'eventId' = event_id
                AND finding_id IN (
                  SELECT finding_id
                  FROM work_management.membership_reconciliation_resolutions
                )
            )
        ) THEN
          RAISE EXCEPTION 'command activation is blocked by legacy rollout events without a reconciliation scan';
        END IF;
      END IF;
    END IF;
    INSERT INTO work_management.membership_rollout_events
      (event_id, mode, scan_id, actor_id, recorded_at)
      VALUES (requested_event_id, requested_mode, requested_scan_id,
        requested_actor, requested_recorded_at);
    PERFORM set_config(
      'work_management.activation_writer',
      md5(current_user || txid_current()::text || 'work-management-activation-writer-v1'),
      true);
    UPDATE work_management.membership_reconciliation_activation
      SET mode = requested_mode, latest_scan_id = requested_scan_id,
        recorded_at = requested_recorded_at
      WHERE activation_id = TRUE;
    PERFORM set_config('work_management.rollout_writer', 'forbidden', true);
    PERFORM set_config('work_management.activation_writer', 'forbidden', true);
  END;
  $$;

  CREATE OR REPLACE FUNCTION work_management.membership_commands_available()
  RETURNS boolean LANGUAGE sql STABLE AS $$
    SELECT COALESCE((SELECT mode = 'commands'
      AND latest_scan_id IS NOT NULL
      AND unresolved_blocking_count = 0
      AND EXISTS (SELECT 1 FROM work_management.membership_reconciliation_scans
        WHERE scan_id = latest_scan_id AND status = 'completed')
      AND (
        EXISTS (SELECT 1 FROM pg_constraint
          WHERE conrelid = 'work_management.membership_rollout_events'::regclass
            AND conname = 'membership_rollout_commands_scan_check'
            AND convalidated)
        OR NOT EXISTS (
          SELECT 1 FROM work_management.membership_rollout_events
          WHERE mode = 'commands' AND scan_id IS NULL
            AND NOT EXISTS (
              SELECT finding_id
              FROM work_management.membership_reconciliation_findings
              WHERE finding_class = 'legacy_rollout_missing_scan'
                AND detected_values->>'eventId' = event_id
                AND finding_id IN (
                  SELECT finding_id
                  FROM work_management.membership_reconciliation_resolutions
                )
            )
        )
      )
      FROM work_management.membership_reconciliation_activation
      WHERE activation_id = TRUE), false)
  $$;

  DO $$
  BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mai_work_management_owner')
      OR NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mai_work_management_runtime')
      OR NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mai_work_management_operator') THEN
      RAISE EXCEPTION 'MAI-114 roles must be pre-provisioned by platform operations before migration';
    END IF;
  END
  $$;
  CREATE TABLE IF NOT EXISTS work_management.membership_operator_actor_bindings (
    session_role TEXT NOT NULL,
    actor_id TEXT NOT NULL,
    PRIMARY KEY (session_role, actor_id),
    active BOOLEAN NOT NULL DEFAULT TRUE
  );
  REVOKE ALL ON work_management.membership_operator_actor_bindings FROM PUBLIC;
  DROP TRIGGER IF EXISTS membership_operator_actor_bindings_no_update_or_delete
    ON work_management.membership_operator_actor_bindings;
  CREATE OR REPLACE FUNCTION work_management.reject_operator_actor_binding_mutation()
  RETURNS trigger LANGUAGE plpgsql AS $$
  BEGIN
    RAISE EXCEPTION 'operator actor bindings are append-only; expected governed provisioning';
  END;
  $$;
  CREATE TRIGGER membership_operator_actor_bindings_no_update_or_delete
    BEFORE UPDATE OR DELETE ON work_management.membership_operator_actor_bindings
    FOR EACH ROW EXECUTE FUNCTION work_management.reject_operator_actor_binding_mutation();
  CREATE TABLE IF NOT EXISTS work_management.membership_operator_actor_binding_events (
    event_id TEXT PRIMARY KEY,
    event_sequence BIGINT GENERATED ALWAYS AS IDENTITY UNIQUE,
    session_role TEXT NOT NULL,
    actor_id TEXT NOT NULL,
    action TEXT NOT NULL CHECK (action IN ('bind', 'revoke')),
    recorded_at TIMESTAMPTZ NOT NULL,
    UNIQUE (session_role, actor_id, event_id)
  );
  REVOKE ALL ON work_management.membership_operator_actor_binding_events FROM PUBLIC;
  DROP TRIGGER IF EXISTS membership_operator_actor_binding_events_no_update_or_delete
    ON work_management.membership_operator_actor_binding_events;
  CREATE OR REPLACE FUNCTION work_management.reject_operator_actor_binding_event_mutation()
  RETURNS trigger LANGUAGE plpgsql AS $$
  BEGIN
    RAISE EXCEPTION 'operator actor binding events are append-only';
  END;
  $$;
  CREATE TRIGGER membership_operator_actor_binding_events_no_update_or_delete
    BEFORE UPDATE OR DELETE ON work_management.membership_operator_actor_binding_events
    FOR EACH ROW EXECUTE FUNCTION work_management.reject_operator_actor_binding_event_mutation();
  CREATE OR REPLACE FUNCTION work_management.assert_operator_actor(requested_actor TEXT)
  RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
  BEGIN
    IF COALESCE((
      SELECT action = 'bind'
      FROM work_management.membership_operator_actor_binding_events
      WHERE session_role = session_user AND actor_id = requested_actor
        AND (session_role, actor_id) IN (
          SELECT session_role, actor_id
          FROM work_management.membership_operator_actor_bindings
        )
      ORDER BY event_sequence DESC LIMIT 1
    ), false) IS NOT TRUE THEN
      RAISE EXCEPTION 'operator actor % is not bound to authenticated database session %', requested_actor, session_user;
    END IF;
  END;
  $$;

  REVOKE ALL PRIVILEGES ON FUNCTION
    work_management.scan_membership_authority(TEXT,TIMESTAMPTZ) FROM PUBLIC;
  GRANT ALL PRIVILEGES ON FUNCTION
    work_management.scan_membership_authority(TEXT,TIMESTAMPTZ) TO CURRENT_USER;
  REVOKE ALL PRIVILEGES ON FUNCTION
    work_management.resolve_membership_finding(TEXT,TEXT,TEXT,JSONB,TEXT,TIMESTAMPTZ)
    FROM PUBLIC;
  GRANT ALL PRIVILEGES ON FUNCTION
    work_management.resolve_membership_finding(TEXT,TEXT,TEXT,JSONB,TEXT,TIMESTAMPTZ)
    TO CURRENT_USER;
  REVOKE ALL PRIVILEGES ON FUNCTION
    work_management.set_membership_rollout_mode(TEXT,TEXT,TEXT,TEXT,TIMESTAMPTZ)
    FROM PUBLIC;
  GRANT ALL PRIVILEGES ON FUNCTION
    work_management.set_membership_rollout_mode(TEXT,TEXT,TEXT,TEXT,TIMESTAMPTZ)
    TO CURRENT_USER;
  REVOKE ALL PRIVILEGES ON FUNCTION
    work_management.membership_commands_available() FROM PUBLIC;
  GRANT ALL PRIVILEGES ON FUNCTION
    work_management.membership_commands_available() TO CURRENT_USER;
  GRANT USAGE ON SCHEMA work_management TO mai_work_management_runtime, mai_work_management_operator;
  GRANT SELECT ON work_management.membership_reconciliation_activation TO mai_work_management_runtime;
  GRANT SELECT ON work_management.membership_reconciliation_scans,
    work_management.membership_rollout_events,
    work_management.membership_reconciliation_findings,
    work_management.membership_reconciliation_resolutions
    TO mai_work_management_runtime;
  GRANT ALL PRIVILEGES ON FUNCTION work_management.membership_commands_available() TO mai_work_management_runtime;
  GRANT SELECT ON work_management.membership_reconciliation_scans,
    work_management.membership_reconciliation_findings,
    work_management.membership_reconciliation_resolutions,
    work_management.membership_rollout_events TO mai_work_management_operator;
  GRANT ALL PRIVILEGES ON FUNCTION work_management.scan_membership_authority(TEXT,TIMESTAMPTZ),
    work_management.resolve_membership_finding(TEXT,TEXT,TEXT,JSONB,TEXT,TIMESTAMPTZ),
    work_management.set_membership_rollout_mode(TEXT,TEXT,TEXT,TEXT,TIMESTAMPTZ)
    TO mai_work_management_operator;
`;
