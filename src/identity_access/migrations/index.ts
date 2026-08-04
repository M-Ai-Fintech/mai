import { accessPolicyMigration } from "./access_0001_policy_access.ts";
import { iamIdentityMigration } from "./iam_0001_identity_access.ts";
import { iamSessionIdentityMigration } from "./iam_0002_session_identity.ts";

export {
  accessPolicyMigration,
  iamIdentityMigration,
  iamSessionIdentityMigration,
};

export const identityAccessMigrations = Object.freeze([
  iamIdentityMigration,
  iamSessionIdentityMigration,
  accessPolicyMigration,
]);
