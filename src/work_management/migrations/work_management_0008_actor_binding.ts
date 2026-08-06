import { defineMigration } from "../../platform/persistence/v1.ts";

/** Removes legacy session-GUC bypass from operator attribution. */
export const workManagementActorBindingMigration = defineMigration({
  owner: "work_management",
  schema: "work_management",
  id: "work_management-0008-actor-binding",
  version: 8,
  forwardNotes:
    "Require every operator actor to match an append-only session binding; migration bootstrap settings cannot forge attribution.",
  rollbackNotes:
    "Disable commands activation and retain binding evidence when the actor-binding correction is rolled back.",
  statements: [{
    schema: "work_management",
    sql: `
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
    `,
  }],
});
