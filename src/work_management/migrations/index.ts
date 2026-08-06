import { workManagementMigration } from "./work_management_0001.ts";
import { workManagementCorrectiveMigration } from "./work_management_0002_corrective.ts";
import {
  workManagementMembershipAuthorityMigration,
} from "./work_management_0003_membership_authority.ts";

export const workManagementMigrations = Object.freeze([
  workManagementMigration,
  workManagementCorrectiveMigration,
  workManagementMembershipAuthorityMigration,
]);

export {
  workManagementCorrectiveMigration,
  workManagementMembershipAuthorityMigration,
  workManagementMigration,
};
