import { defineMigration } from "../../platform/persistence/v1.ts";

/** Grants runtime the bounded scan visibility required by the command gate. */
export const workManagementRuntimeGateMigration = defineMigration({
  owner: "work_management",
  schema: "work_management",
  id: "work_management-0007-runtime-gate",
  version: 7,
  forwardNotes:
    "Reserve the runtime-gate ledger step; the additive corrective upgrade applies its privilege after reconstructing legacy relations.",
  rollbackNotes:
    "Revoke runtime scan visibility and keep Work Management commands in read-only mode while retaining evidence.",
  statements: [{
    schema: "work_management",
    sql: "SELECT 1;",
  }],
});
