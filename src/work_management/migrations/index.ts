import { workManagementMigration } from "./work_management_0001.ts";
import { workManagementCorrectiveMigration } from "./work_management_0002_corrective.ts";
import {
  workManagementMembershipAuthorityMigration,
} from "./work_management_0003_membership_authority.ts";
import {
  workManagementAuthorityAndPreparedMigration,
} from "./work_management_0004_authority_and_prepared.ts";

export const workManagementMigrations = Object.freeze([
  workManagementMigration,
  workManagementCorrectiveMigration,
  workManagementMembershipAuthorityMigration,
  workManagementAuthorityAndPreparedMigration,
]);

export {
  workManagementAuthorityAndPreparedMigration,
  workManagementCorrectiveMigration,
  workManagementMembershipAuthorityMigration,
  workManagementMigration,
};
