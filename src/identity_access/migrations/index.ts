import { accessPolicyMigration } from "./access_0001_policy_access.ts";
import { iamIdentityMigration } from "./iam_0001_identity_access.ts";

export { accessPolicyMigration, iamIdentityMigration };

export const identityAccessMigrations = Object.freeze([
  iamIdentityMigration,
  accessPolicyMigration,
]);
