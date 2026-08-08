DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mai_work_management_owner') THEN
    CREATE ROLE mai_work_management_owner NOLOGIN NOINHERIT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mai_work_management_runtime') THEN
    CREATE ROLE mai_work_management_runtime NOLOGIN NOINHERIT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mai_work_management_operator') THEN
    CREATE ROLE mai_work_management_operator NOLOGIN NOINHERIT;
  END IF;
END
$$;

GRANT mai_work_management_runtime, mai_work_management_operator TO CURRENT_USER;
