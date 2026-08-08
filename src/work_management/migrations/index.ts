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
import { prepareWorkManagementMigration } from "../migration_compatibility.ts";
import type { MigrationApplyOptions } from "../../platform/persistence/migration_runner.ts";

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

/**
 * Returns the explicit composition hook required when applying this stream.
 *
 * @example runner.apply(workManagementMigrations, workManagementMigrationOptions())
 */
export function workManagementMigrationOptions(): MigrationApplyOptions {
  return { beforeMigration: prepareWorkManagementMigration };
}

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
