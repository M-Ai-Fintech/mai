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
import {
  workManagementRuntimeGateMigration,
} from "./work_management_0007_runtime_gate.ts";
import {
  workManagementActorBindingMigration,
} from "./work_management_0008_actor_binding.ts";
import {
  workManagementCorrectiveUpgradeMigration,
} from "./work_management_0009_corrective_upgrade.ts";
import { workManagementAuthorityDenialsMigration } from "./work_management_0010_authority_denials.ts";

export const workManagementMigrations = Object.freeze([
  workManagementMigration,
  workManagementCorrectiveMigration,
  workManagementMembershipAuthorityMigration,
  workManagementMembershipAuthorityUpgradeMigration,
  workManagementAuthorityAndPreparedMigration,
  workManagementMembershipOperabilityMigration,
  workManagementRuntimeGateMigration,
  workManagementActorBindingMigration,
  workManagementCorrectiveUpgradeMigration,
  workManagementAuthorityDenialsMigration,
]);

export {
  workManagementActorBindingMigration,
  workManagementAuthorityAndPreparedMigration,
  workManagementAuthorityDenialsMigration,
  workManagementCorrectiveMigration,
  workManagementCorrectiveUpgradeMigration,
  workManagementMembershipAuthorityMigration,
  workManagementMembershipAuthorityUpgradeMigration,
  workManagementMembershipOperabilityMigration,
  workManagementMigration,
  workManagementRuntimeGateMigration,
};
