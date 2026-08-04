import { dealManagementMigration } from "./deal_management_0001.ts";
import {
  reconciliationRoutingMigration,
} from "./deal_management_0002_reconciliation_routing.ts";
import {
  lifecycleMilestonesMigration,
} from "./deal_management_0003_lifecycle_milestones.ts";

export {
  dealManagementMigration,
  lifecycleMilestonesMigration,
  reconciliationRoutingMigration,
};

export const dealManagementMigrations = Object.freeze([
  dealManagementMigration,
  reconciliationRoutingMigration,
  lifecycleMilestonesMigration,
]);
