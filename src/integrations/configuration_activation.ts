import {
  assertKnownKeys,
  assertRecord,
  rejectInlineCredentialKeys,
} from "./configuration_validation.ts";

const ACTIVATION_KEYS = new Set([
  "approvalReference",
  "providerVersion",
  "license",
  "deploymentModel",
  "region",
  "storageTopology",
  "rollbackOperator",
]);
const LINEAR_ISSUE_ID = /(?:^|[^A-Za-z0-9])MAI-\d+(?:$|[^A-Za-z0-9])/i;

export interface OwnerApprovedActivation {
  readonly approvalReference: string;
  readonly providerVersion: string;
  readonly license: string;
  readonly deploymentModel: string;
  readonly region: string;
  readonly storageTopology: string;
  readonly rollbackOperator: string;
}

/**
 * Parses credential-free owner approval metadata for an enabled provider.
 *
 * @example parseOwnerApprovedActivation({ approvalReference: "approval_papermark_local", providerVersion: "papermark-1.0.0", license: "AGPLv3", deploymentModel: "self-hosted", region: "local", storageTopology: "postgres-object-store", rollbackOperator: "platform-on-call" })
 */
export function parseOwnerApprovedActivation(
  value: unknown,
): OwnerApprovedActivation {
  assertRecord(value, "provider activation");
  rejectInlineCredentialKeys(value);
  assertKnownKeys(value, ACTIVATION_KEYS, "provider activation");
  return Object.freeze({
    ...parseActivationApproval(value),
    ...parseActivationDeployment(value),
    ...parseActivationRollback(value),
  });
}

function parseActivationField(
  value: Record<string, unknown>,
  key: string,
  label: string,
): string {
  return parseActivationText(value[key], label);
}

function parseActivationApproval(
  value: Record<string, unknown>,
): Pick<
  OwnerApprovedActivation,
  "approvalReference" | "providerVersion" | "license"
> {
  return {
    approvalReference: parseActivationField(
      value,
      "approvalReference",
      "approval reference",
    ),
    providerVersion: parseActivationField(
      value,
      "providerVersion",
      "provider version",
    ),
    license: parseActivationField(value, "license", "license"),
  };
}

function parseActivationDeployment(
  value: Record<string, unknown>,
): Pick<
  OwnerApprovedActivation,
  "deploymentModel" | "region" | "storageTopology"
> {
  return {
    deploymentModel: parseActivationField(
      value,
      "deploymentModel",
      "deployment model",
    ),
    region: parseActivationField(value, "region", "region"),
    storageTopology: parseActivationField(
      value,
      "storageTopology",
      "storage topology",
    ),
  };
}

function parseActivationRollback(
  value: Record<string, unknown>,
): Pick<OwnerApprovedActivation, "rollbackOperator"> {
  return {
    rollbackOperator: parseActivationField(
      value,
      "rollbackOperator",
      "rollback operator",
    ),
  };
}

function parseActivationText(value: unknown, label: string): string {
  if (
    typeof value === "string" && value.length > 0 && value.length <= 255 &&
    value.trim() === value && !/[\r\n]/.test(value) &&
    !LINEAR_ISSUE_ID.test(value)
  ) return value;
  throw new Error(
    `Provider activation ${label} is invalid; expected credential-free approved metadata without project issue IDs.`,
  );
}
