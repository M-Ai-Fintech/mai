import { dealManagementMigration } from "./deal_management_0001.ts";
import {
  reconciliationRoutingMigration,
} from "./deal_management_0002_reconciliation_routing.ts";

export { dealManagementMigration, reconciliationRoutingMigration };

export const dealManagementMigrations = Object.freeze([
  dealManagementMigration,
  reconciliationRoutingMigration,
]);
