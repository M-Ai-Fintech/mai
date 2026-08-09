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
const APPROVED_LICENSES = new Set([
  "AGPLv3",
  "commercial",
  "commercial-license",
]);
const APPROVED_DEPLOYMENTS = new Set([
  "self-hosted",
  "managed",
  "managed-service",
]);

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
  const text = parseActivationText(value[key], label);
  if (activationFieldMatches(key, text)) return text;
  throw new Error(
    `Provider activation ${label} is invalid; expected an approved semantic value.`,
  );
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
    !LINEAR_ISSUE_ID.test(value) && !looksCredentialLike(value)
  ) return value;
  throw new Error(
    `Provider activation ${label} is invalid; expected credential-free approved metadata without project issue IDs.`,
  );
}

function activationFieldMatches(key: string, value: string): boolean {
  if (key === "approvalReference") {
    return /^approval_[a-z0-9]+(?:[-_][a-z0-9]+)*$/.test(value);
  }
  if (key === "providerVersion") {
    return /^(?:[a-z][a-z0-9]*(?:-[a-z0-9]+)*)?-?v?[0-9]+\.[0-9]+\.[0-9]+(?:[-+][a-z0-9.-]+)?$/i
      .test(value) ||
      /^commit-[a-z0-9][a-z0-9._-]{0,127}$/i.test(value);
  }
  if (key === "license") return APPROVED_LICENSES.has(value);
  if (key === "deploymentModel") return APPROVED_DEPLOYMENTS.has(value);
  if (key === "region") {
    return value === "local" ||
      /^[a-z][a-z0-9]*(?:-[a-z0-9]+)+$/.test(value);
  }
  if (key === "storageTopology") {
    return /^[a-z][a-z0-9]*(?:-[a-z0-9]+)+$/.test(value);
  }
  if (key === "rollbackOperator") {
    return /^[a-z][a-z0-9]*(?:-[a-z0-9]+)+$/.test(value);
  }
  return false;
}

function looksCredentialLike(value: string): boolean {
  if (
    /^(?:sk|pk|rk|ghp|gho|ghs|glpat|xox[abp]|AIza|AKIA|ya29|eyJ)/i.test(
      value,
    )
  ) return true;
  const mixedClasses = /[A-Z]/.test(value) && /[a-z]/.test(value) &&
    /[0-9]/.test(value) && /[^A-Za-z0-9]/.test(value);
  return value.length >= 32 && (mixedClasses || new Set(value).size >= 20);
}
