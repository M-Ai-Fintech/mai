export const membershipReconciliationSchemaSql = `
  CREATE TABLE IF NOT EXISTS work_management.membership_reconciliation_scans (
    scan_id TEXT PRIMARY KEY,
    scan_sequence BIGINT GENERATED ALWAYS AS IDENTITY UNIQUE,
    detected_at TIMESTAMPTZ NOT NULL,
    completed_at TIMESTAMPTZ NOT NULL,
    scope JSONB NOT NULL CHECK (scope = '{"scope":"all"}'::jsonb),
    status TEXT NOT NULL CHECK (status = 'completed')
  );
  CREATE TABLE IF NOT EXISTS work_management.membership_reconciliation_findings (
    finding_id TEXT PRIMARY KEY,
    scan_id TEXT NOT NULL REFERENCES work_management.membership_reconciliation_scans(scan_id),
    finding_class TEXT NOT NULL CHECK (finding_class IN (
      'malformed_workstream_task_ids', 'malformed_task_id',
      'duplicate_authoritative_task_id',
      'task_document_back_reference_mismatch', 'task_owner_workstream_missing',
      'task_owner_scope_mismatch', 'task_missing_from_authoritative_membership',
      'authoritative_task_missing', 'authoritative_task_wrong_workstream',
      'authoritative_task_scope_mismatch', 'ambiguous_legacy_ownership',
      'terminal_workstream_non_terminal_task', 'legacy_rollout_missing_scan'
    )),
    severity TEXT NOT NULL CHECK (severity = 'blocking'),
    action TEXT NOT NULL CHECK (action = 'block_commands'),
    required_human_action TEXT NOT NULL CHECK (required_human_action IN
      ('repair_membership', 'map_membership', 'review_ambiguous_ownership')),
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
  CREATE INDEX IF NOT EXISTS work_management_membership_findings_scan_idx
    ON work_management.membership_reconciliation_findings
    (scan_id, severity, finding_class, tenant_id, workspace_id, deal_id, workstream_id, task_id);
  CREATE TABLE IF NOT EXISTS work_management.membership_reconciliation_resolutions (
    resolution_id TEXT PRIMARY KEY,
    finding_id TEXT NOT NULL UNIQUE REFERENCES work_management.membership_reconciliation_findings(finding_id),
    action TEXT NOT NULL CHECK (action = 'resolve'),
    status TEXT NOT NULL CHECK (status = 'resolved'),
    resolution JSONB NOT NULL CHECK (jsonb_typeof(resolution) = 'object'),
    resolved_by TEXT NOT NULL,
    recorded_at TIMESTAMPTZ NOT NULL
  );
  REVOKE INSERT ON work_management.membership_reconciliation_scans FROM PUBLIC;
  REVOKE INSERT ON work_management.membership_reconciliation_findings FROM PUBLIC;
  REVOKE INSERT ON work_management.membership_reconciliation_resolutions FROM PUBLIC;
  CREATE TABLE IF NOT EXISTS work_management.membership_reconciliation_activation (
    activation_id BOOLEAN PRIMARY KEY DEFAULT TRUE CHECK (activation_id = TRUE),
    mode TEXT NOT NULL CHECK (mode IN ('disabled', 'read_only', 'commands')),
    latest_scan_id TEXT REFERENCES work_management.membership_reconciliation_scans(scan_id),
    unresolved_blocking_count BIGINT NOT NULL CHECK (unresolved_blocking_count >= 0),
    recorded_at TIMESTAMPTZ NOT NULL,
    CHECK (mode <> 'commands' OR latest_scan_id IS NOT NULL)
  );
  INSERT INTO work_management.membership_reconciliation_activation
    (activation_id, mode, latest_scan_id, unresolved_blocking_count, recorded_at)
    VALUES (TRUE, 'read_only', NULL, 0, CURRENT_TIMESTAMP)
    ON CONFLICT (activation_id) DO NOTHING;
  REVOKE INSERT, UPDATE, DELETE ON
    work_management.membership_reconciliation_activation FROM PUBLIC;
  GRANT SELECT ON work_management.membership_reconciliation_activation TO PUBLIC;
  DROP TRIGGER IF EXISTS membership_activation_no_direct_mutation
    ON work_management.membership_reconciliation_activation;
  CREATE OR REPLACE FUNCTION work_management.reject_direct_activation_mutation()
  RETURNS trigger LANGUAGE plpgsql AS $$
  DECLARE
    owner_name TEXT;
    expected_capability TEXT;
  BEGIN
    SELECT pg_get_userbyid(relowner) INTO owner_name
      FROM pg_class WHERE oid = 'work_management.membership_reconciliation_activation'::regclass;
    expected_capability := md5(current_user || txid_current()::text ||
      'work-management-activation-writer-v1');
    IF NOT (
      current_user = 'postgres' AND session_user = 'postgres'
    ) AND (
      current_user IS DISTINCT FROM owner_name
      OR current_setting('work_management.activation_writer', true)
        IS DISTINCT FROM expected_capability
    ) THEN
      RAISE EXCEPTION 'membership activation changes require the governed migration or rollout function';
    END IF;
    RETURN COALESCE(NEW, OLD);
  END;
  $$;
  CREATE TRIGGER membership_activation_no_direct_mutation
    BEFORE INSERT OR UPDATE OR DELETE
    ON work_management.membership_reconciliation_activation
    FOR EACH ROW EXECUTE FUNCTION work_management.reject_direct_activation_mutation();
  CREATE TABLE IF NOT EXISTS work_management.membership_rollout_events (
    event_id TEXT PRIMARY KEY,
    event_sequence BIGINT GENERATED ALWAYS AS IDENTITY UNIQUE,
    mode TEXT NOT NULL CHECK (mode IN ('disabled', 'read_only', 'commands')),
    scan_id TEXT REFERENCES work_management.membership_reconciliation_scans(scan_id),
    actor_id TEXT NOT NULL,
    recorded_at TIMESTAMPTZ NOT NULL,
    CHECK (mode <> 'commands' OR scan_id IS NOT NULL)
  );
  CREATE INDEX IF NOT EXISTS work_management_membership_rollout_latest_idx
    ON work_management.membership_rollout_events (event_sequence DESC);
  DROP TRIGGER IF EXISTS membership_scans_no_direct_insert
    ON work_management.membership_reconciliation_scans;
  DROP TRIGGER IF EXISTS membership_findings_no_direct_insert
    ON work_management.membership_reconciliation_findings;
  DROP TRIGGER IF EXISTS membership_resolutions_no_direct_insert
    ON work_management.membership_reconciliation_resolutions;
  DROP TRIGGER IF EXISTS membership_scans_no_update_or_delete
    ON work_management.membership_reconciliation_scans;
  DROP TRIGGER IF EXISTS membership_findings_no_update_or_delete
    ON work_management.membership_reconciliation_findings;
  DROP TRIGGER IF EXISTS membership_resolutions_no_update_or_delete
    ON work_management.membership_reconciliation_resolutions;
  DROP TRIGGER IF EXISTS membership_rollout_no_update_or_delete
    ON work_management.membership_rollout_events;
  DROP TRIGGER IF EXISTS membership_rollout_no_direct_insert
    ON work_management.membership_rollout_events;
  REVOKE INSERT ON work_management.membership_rollout_events FROM PUBLIC;

  CREATE OR REPLACE FUNCTION work_management.membership_finding_identity(
    requested_scan_id TEXT, requested_class TEXT, requested_scope JSONB,
    requested_values JSONB
  ) RETURNS TEXT LANGUAGE sql IMMUTABLE AS $$
    SELECT 'membership-finding:' || md5(concat_ws('|', requested_scan_id,
      requested_class, requested_scope::text, requested_values::text))
  $$;

  CREATE OR REPLACE FUNCTION work_management.reject_membership_evidence_mutation()
  RETURNS trigger LANGUAGE plpgsql AS $$
  BEGIN
    RAISE EXCEPTION 'work_management membership reconciliation evidence is append-only';
  END;
  $$;
  CREATE OR REPLACE FUNCTION work_management.reject_direct_membership_evidence_insert()
  RETURNS trigger LANGUAGE plpgsql AS $$
  DECLARE
    expected_capability TEXT;
  BEGIN
    expected_capability := md5(current_user || txid_current()::text ||
      CASE WHEN TG_TABLE_NAME = 'membership_reconciliation_resolutions'
        THEN 'work-management-resolution-writer-v1'
        ELSE 'work-management-scan-writer-v1' END);
    IF current_setting('work_management.membership_writer', true)
      IS DISTINCT FROM expected_capability THEN
      RAISE EXCEPTION 'membership reconciliation evidence requires the governed scan or resolution function';
    END IF;
    RETURN NEW;
  END;
  $$;
  CREATE TRIGGER membership_scans_no_direct_insert
    BEFORE INSERT ON work_management.membership_reconciliation_scans
    FOR EACH ROW EXECUTE FUNCTION work_management.reject_direct_membership_evidence_insert();
  CREATE TRIGGER membership_findings_no_direct_insert
    BEFORE INSERT ON work_management.membership_reconciliation_findings
    FOR EACH ROW EXECUTE FUNCTION work_management.reject_direct_membership_evidence_insert();
  CREATE TRIGGER membership_resolutions_no_direct_insert
    BEFORE INSERT ON work_management.membership_reconciliation_resolutions
    FOR EACH ROW EXECUTE FUNCTION work_management.reject_direct_membership_evidence_insert();
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

  CREATE OR REPLACE FUNCTION work_management.reject_direct_rollout_insert()
  RETURNS trigger LANGUAGE plpgsql AS $$
    DECLARE
    current_scan_id TEXT;
    current_unresolved_count BIGINT;
  BEGIN
    IF current_setting('work_management.rollout_writer', true) IS DISTINCT FROM
        md5(current_user || txid_current()::text || 'work-management-governed-rollout-v1')
      OR current_user IS DISTINCT FROM (
        SELECT pg_get_userbyid(proowner) FROM pg_proc
        WHERE oid = 'work_management.set_membership_rollout_mode(text,text,text,text,timestamp with time zone)'::regprocedure
      ) THEN
      RAISE EXCEPTION 'membership rollout events require the governed activation function';
    END IF;
    IF to_jsonb(NEW)->>'mode' = 'commands' THEN
      SELECT latest_scan_id, unresolved_blocking_count
        INTO current_scan_id, current_unresolved_count
        FROM work_management.membership_reconciliation_activation
        WHERE activation_id = TRUE;
      IF to_jsonb(NEW)->>'scan_id' IS NULL
        OR current_scan_id IS DISTINCT FROM to_jsonb(NEW)->>'scan_id'
        OR current_unresolved_count <> 0
        OR EXISTS (SELECT 1 FROM work_management.membership_reconciliation_findings
          WHERE scan_id = to_jsonb(NEW)->>'scan_id') THEN
        RAISE EXCEPTION 'command rollout event requires the latest clean reconciliation scan';
      END IF;
    END IF;
    RETURN NEW;
  END;
  $$;
  CREATE TRIGGER membership_rollout_no_direct_insert
    BEFORE INSERT ON work_management.membership_rollout_events
    FOR EACH ROW EXECUTE FUNCTION work_management.reject_direct_rollout_insert();

  CREATE OR REPLACE FUNCTION work_management.lock_membership_rollout()
  RETURNS VOID LANGUAGE sql AS $$
    SELECT pg_advisory_xact_lock(hashtextextended(
      'work_management:membership-rollout', 0))
  $$;

  CREATE OR REPLACE FUNCTION work_management.lock_membership_rollout_shared()
  RETURNS VOID LANGUAGE sql AS $$
    SELECT pg_advisory_xact_lock_shared(hashtextextended(
      'work_management:membership-rollout', 0))
  $$;

`;
