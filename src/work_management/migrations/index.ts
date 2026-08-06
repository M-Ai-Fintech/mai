import { workManagementMigration } from "./work_management_0001.ts";
import { workManagementCorrectiveMigration } from "./work_management_0002_corrective.ts";
import {
  workManagementMembershipAuthorityMigration,
} from "./work_management_0003_membership_authority.ts";
import {
  workManagementAuthorityAndPreparedMigration,
} from "./work_management_0004_authority_and_prepared.ts";
import {
  workManagementMembershipAuthorityUpgradeMigration,
} from "./work_management_0004_membership_authority.ts";
import {
  workManagementMembershipOperabilityMigration,
} from "./work_management_0006_membership_operability.ts";

export const workManagementMigrations = Object.freeze([
  workManagementMigration,
  workManagementCorrectiveMigration,
  workManagementMembershipAuthorityMigration,
  workManagementMembershipAuthorityUpgradeMigration,
  workManagementAuthorityAndPreparedMigration,
  workManagementMembershipOperabilityMigration,
]);

export {
  workManagementAuthorityAndPreparedMigration,
  workManagementCorrectiveMigration,
  workManagementMembershipAuthorityMigration,
  workManagementMembershipAuthorityUpgradeMigration,
  workManagementMembershipOperabilityMigration,
  workManagementMigration,
};
