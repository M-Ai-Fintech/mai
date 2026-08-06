import {
  membershipReconciliationRolloutSql,
} from "./membership_reconciliation_sql_rollout.ts";
import {
  membershipReconciliationScanSql,
} from "./membership_reconciliation_sql_scan.ts";
import {
  membershipReconciliationSchemaSql,
} from "./membership_reconciliation_sql_schema.ts";

export const membershipReconciliationSql = [
  membershipReconciliationSchemaSql,
  membershipReconciliationScanSql,
  membershipReconciliationRolloutSql,
].join("\n");
