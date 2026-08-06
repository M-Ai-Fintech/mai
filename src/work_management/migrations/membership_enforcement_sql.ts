export const membershipEnforcementSql = `
  CREATE FUNCTION work_management.lock_membership_authority(
    requested_tenant TEXT, requested_workspace TEXT, requested_deal TEXT,
    requested_workstream TEXT
  ) RETURNS VOID LANGUAGE sql AS $$
    SELECT pg_advisory_xact_lock(hashtextextended(concat_ws('|',
      'work_management:membership', requested_tenant, requested_workspace,
      requested_deal, requested_workstream), 0))
  $$;

  CREATE FUNCTION work_management.validate_workstream_membership(
    requested_tenant TEXT, requested_workspace TEXT, requested_deal TEXT,
    requested_workstream TEXT
  ) RETURNS VOID LANGUAGE plpgsql AS $$
  DECLARE
    stored_document JSONB;
    duplicate_task_id TEXT;
    missing_task_id TEXT;
    extra_task_id TEXT;
  BEGIN
    PERFORM work_management.lock_membership_authority(requested_tenant,
      requested_workspace, requested_deal, requested_workstream);
    SELECT document INTO stored_document
      FROM work_management.workstreams_current
      WHERE tenant_id = requested_tenant AND workspace_id = requested_workspace
        AND deal_id = requested_deal AND workstream_id = requested_workstream;
    IF NOT FOUND THEN
      SELECT task_id INTO extra_task_id FROM work_management.tasks_current
        WHERE tenant_id = requested_tenant AND workspace_id = requested_workspace
          AND deal_id = requested_deal AND workstream_id = requested_workstream
        LIMIT 1;
      IF FOUND THEN
        RAISE EXCEPTION 'workstream % is missing in scope %/%/% while Task % still references it',
          requested_workstream, requested_tenant, requested_workspace,
          requested_deal, extra_task_id;
      END IF;
      RETURN;
    END IF;
    IF jsonb_typeof(stored_document->'taskIds') IS DISTINCT FROM 'array' THEN
      RAISE EXCEPTION 'workstream % taskIds is %, expected an array',
        requested_workstream, stored_document->'taskIds';
    END IF;
    SELECT expanded_task_id INTO duplicate_task_id
      FROM jsonb_array_elements_text(stored_document->'taskIds')
        AS expanded_membership(expanded_task_id)
      GROUP BY expanded_task_id HAVING count(*) > 1 LIMIT 1;
    IF FOUND THEN
      RAISE EXCEPTION 'workstream % taskIds contains duplicate Task %, expected unique membership',
        requested_workstream, duplicate_task_id;
    END IF;
    SELECT expanded_task_id INTO missing_task_id
      FROM jsonb_array_elements_text(stored_document->'taskIds')
        AS expanded_membership(expanded_task_id)
      WHERE NOT EXISTS (
        SELECT 1 FROM work_management.tasks_current
        WHERE tenant_id = requested_tenant AND workspace_id = requested_workspace
          AND deal_id = requested_deal AND workstream_id = requested_workstream
          AND task_id = expanded_task_id
      ) LIMIT 1;
    IF FOUND THEN
      RAISE EXCEPTION 'workstream % references missing or mismatched Task %, expected exact scoped back-reference',
        requested_workstream, missing_task_id;
    END IF;
    SELECT task_id INTO extra_task_id FROM work_management.tasks_current
      WHERE tenant_id = requested_tenant AND workspace_id = requested_workspace
        AND deal_id = requested_deal AND workstream_id = requested_workstream
        AND NOT (stored_document->'taskIds' ? task_id) LIMIT 1;
    IF FOUND THEN
      RAISE EXCEPTION 'Task % references workstream % but authoritative taskIds omits it',
        extra_task_id, requested_workstream;
    END IF;
  END;
  $$;

  CREATE FUNCTION work_management.validate_task_membership(
    requested_tenant TEXT, requested_workspace TEXT, requested_deal TEXT,
    requested_workstream TEXT, requested_task TEXT
  ) RETURNS VOID LANGUAGE plpgsql AS $$
  DECLARE
    stored_document JSONB;
    stored_workstream TEXT;
    owner_document JSONB;
  BEGIN
    PERFORM work_management.lock_membership_authority(requested_tenant,
      requested_workspace, requested_deal, requested_workstream);
    SELECT document, workstream_id INTO stored_document, stored_workstream
      FROM work_management.tasks_current
      WHERE tenant_id = requested_tenant AND workspace_id = requested_workspace
        AND deal_id = requested_deal AND task_id = requested_task;
    IF NOT FOUND THEN
      SELECT document INTO owner_document
        FROM work_management.workstreams_current
        WHERE tenant_id = requested_tenant AND workspace_id = requested_workspace
          AND deal_id = requested_deal AND workstream_id = requested_workstream;
      IF FOUND AND owner_document->'taskIds' ? requested_task THEN
        RAISE EXCEPTION 'workstream % retains missing Task %, expected membership removal',
          requested_workstream, requested_task;
      END IF;
      RETURN;
    END IF;
    IF stored_workstream IS DISTINCT FROM requested_workstream THEN
      RETURN;
    END IF;
    IF stored_document->>'workstreamId' IS DISTINCT FROM stored_workstream THEN
      RAISE EXCEPTION 'Task % document workstreamId % conflicts with column %',
        requested_task, stored_document->>'workstreamId', stored_workstream;
    END IF;
    SELECT document INTO owner_document
      FROM work_management.workstreams_current
      WHERE tenant_id = requested_tenant AND workspace_id = requested_workspace
        AND deal_id = requested_deal AND workstream_id = stored_workstream;
    IF NOT FOUND OR jsonb_typeof(owner_document->'taskIds') IS DISTINCT FROM 'array'
      OR NOT (owner_document->'taskIds' ? requested_task) THEN
      RAISE EXCEPTION 'Task % has no exact authoritative membership in workstream % scope %/%/%',
        requested_task, stored_workstream, requested_tenant,
        requested_workspace, requested_deal;
    END IF;
  END;
  $$;

  CREATE FUNCTION work_management.enforce_workstream_membership_authority()
  RETURNS trigger LANGUAGE plpgsql AS $$
  DECLARE
    changed_row JSONB;
  BEGIN
    changed_row := CASE WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD) ELSE to_jsonb(NEW) END;
    PERFORM work_management.validate_workstream_membership(
      changed_row->>'tenant_id', changed_row->>'workspace_id',
      changed_row->>'deal_id', changed_row->>'workstream_id');
    RETURN NULL;
  END;
  $$;
  CREATE FUNCTION work_management.enforce_task_membership_authority()
  RETURNS trigger LANGUAGE plpgsql AS $$
  DECLARE
    changed_row JSONB;
    previous_row JSONB;
  BEGIN
    changed_row := CASE WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD) ELSE to_jsonb(NEW) END;
    PERFORM work_management.validate_task_membership(changed_row->>'tenant_id',
      changed_row->>'workspace_id', changed_row->>'deal_id',
      changed_row->>'workstream_id', changed_row->>'task_id');
    IF TG_OP = 'UPDATE' THEN
      previous_row := to_jsonb(OLD);
      IF previous_row->>'workstream_id' IS DISTINCT FROM changed_row->>'workstream_id' THEN
        PERFORM work_management.validate_workstream_membership(
          previous_row->>'tenant_id', previous_row->>'workspace_id',
          previous_row->>'deal_id', previous_row->>'workstream_id');
      END IF;
    END IF;
    RETURN NULL;
  END;
  $$;
  CREATE CONSTRAINT TRIGGER workstreams_membership_authority
    AFTER INSERT OR UPDATE OR DELETE ON work_management.workstreams_current
    DEFERRABLE INITIALLY DEFERRED FOR EACH ROW
    EXECUTE FUNCTION work_management.enforce_workstream_membership_authority();
  CREATE CONSTRAINT TRIGGER tasks_membership_authority
    AFTER INSERT OR UPDATE OR DELETE ON work_management.tasks_current
    DEFERRABLE INITIALLY DEFERRED FOR EACH ROW
    EXECUTE FUNCTION work_management.enforce_task_membership_authority();
`;
