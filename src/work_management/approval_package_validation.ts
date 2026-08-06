import { targetCommandType } from "./ids.ts";
import type {
  ApprovalPackage,
  AuthorityRequirement,
  AuthoritySnapshot,
} from "./model.ts";
import {
  assertScope,
  assertTargetReference,
  assertText,
  stableSerialize,
  WorkManagementError,
} from "./model.ts";

export function assertPackage(packageValue: ApprovalPackage): void {
  assertText(packageValue.id, "Approval package ID", 128);
  if (
    !Number.isSafeInteger(packageValue.version) || packageValue.version <= 0
  ) {
    throw new WorkManagementError(
      "INVALID_INPUT",
      `Approval package version "${packageValue.version}" is invalid; expected a positive integer.`,
    );
  }
  assertTargetReference(packageValue.target);
  assertText(packageValue.authority.commandType, "Target command type", 128);
  targetCommandType(packageValue.authority.commandType);
  assertTargetReference(packageValue.authority.target);
  assertText(packageValue.authority.namedApproverId, "Named approver ID", 128);
  assertText(packageValue.authority.policyVersion, "Policy version", 128);
  assertText(
    packageValue.authority.snapshotReference,
    "Authority snapshot reference",
    128,
  );
  if (packageValue.authority.humanOnly !== true) {
    throw new WorkManagementError(
      "HUMAN_AUTHORITY_REQUIRED",
      `Approval package "${packageValue.id}" is not human-only; expected humanOnly=true.`,
    );
  }
  assertScope(
    packageValue.target.scope,
    packageValue.authority.scope,
    `Approval package "${packageValue.id}" authority`,
  );
  if (
    stableSerialize(packageValue.target) !==
      stableSerialize(packageValue.authority.target)
  ) {
    throw new WorkManagementError(
      "REFERENCE_MISMATCH",
      `Approval package "${packageValue.id}" authority target differs from package target; expected the exact aggregate, ID, scope, and version binding.`,
    );
  }
  assertAuthorityWindow(packageValue.authority, packageValue.id);
  for (const limit of packageValue.authority.applicableLimits) {
    assertText(limit.name, "Authority limit name", 128);
    if (
      !["string", "number", "boolean"].includes(typeof limit.value) ||
      (typeof limit.value === "number" && !Number.isFinite(limit.value))
    ) {
      throw new WorkManagementError(
        "INVALID_INPUT",
        `Approval package "${packageValue.id}" authority limit "${limit.name}" value is invalid; expected string, number, or boolean.`,
      );
    }
  }
  assertAuthoritySnapshot(packageValue.authoritySnapshot, packageValue.id);
  if (
    packageValue.authority.snapshotReference !==
      packageValue.authoritySnapshot.snapshotId
  ) {
    throw new WorkManagementError(
      "REFERENCE_MISMATCH",
      `Approval package "${packageValue.id}" authority snapshot reference "${packageValue.authority.snapshotReference}" does not match snapshot "${packageValue.authoritySnapshot.snapshotId}"; expected one immutable snapshot reference.`,
    );
  }
  if (
    packageValue.authority.policyVersion !==
      packageValue.authoritySnapshot.policyVersion
  ) {
    throw new WorkManagementError(
      "REFERENCE_MISMATCH",
      `Approval package "${packageValue.id}" policy version "${packageValue.authority.policyVersion}" does not match snapshot policy version "${packageValue.authoritySnapshot.policyVersion}"; expected one policy snapshot.`,
    );
  }
  assertScope(
    packageValue.target.scope,
    packageValue.authoritySnapshot.scope,
    `Approval package "${packageValue.id}"`,
  );
  if (
    packageValue.authoritySnapshot.actorId !==
      packageValue.authority.namedApproverId
  ) {
    throw new WorkManagementError(
      "NAMED_APPROVER_REQUIRED",
      `Approval package "${packageValue.id}" snapshot actor "${packageValue.authoritySnapshot.actorId}" does not match named approver "${packageValue.authority.namedApproverId}"; expected one authority identity.`,
    );
  }
  if (!/^[0-9a-f]{64}$/.test(packageValue.contentDigest)) {
    throw new WorkManagementError(
      "INVALID_INPUT",
      `Approval package "${packageValue.id}" digest "${packageValue.contentDigest}" is invalid; expected lowercase SHA-256 hex.`,
    );
  }
}

export function assertAuthorityEffective(
  authority: AuthorityRequirement,
  at: string,
  packageId: string,
): void {
  assertAuthorityWindow(authority, packageId);
  const instant = canonicalInstant(at, `Approval package "${packageId}" check`);
  const effective = canonicalInstant(
    authority.effectiveAt,
    `Approval package "${packageId}" effective time`,
  );
  const expiry = canonicalInstant(
    authority.expiresAt,
    `Approval package "${packageId}" expiry time`,
  );
  if (instant >= effective && instant < expiry) return;
  throw new WorkManagementError(
    "HUMAN_AUTHORITY_REQUIRED",
    `Approval package "${packageId}" authority is not effective at "${at}"; expected an instant from "${authority.effectiveAt}" until before "${authority.expiresAt}".`,
  );
}

function assertAuthorityWindow(
  authority: AuthorityRequirement,
  packageId: string,
): void {
  const effective = canonicalInstant(
    authority.effectiveAt,
    `Approval package "${packageId}" effective time`,
  );
  const expiry = canonicalInstant(
    authority.expiresAt,
    `Approval package "${packageId}" expiry time`,
  );
  if (effective < expiry) return;
  throw new WorkManagementError(
    "INVALID_INPUT",
    `Approval package "${packageId}" authority window "${authority.effectiveAt}" to "${authority.expiresAt}" is invalid; expected ordered ISO-8601 instants.`,
  );
}

function canonicalInstant(value: string, label: string): number {
  const parsed = Date.parse(value);
  if (Number.isFinite(parsed) && new Date(parsed).toISOString() === value) {
    return parsed;
  }
  throw new WorkManagementError(
    "INVALID_INPUT",
    `${label} "${value}" is invalid; expected a canonical ISO-8601 UTC instant.`,
  );
}

function assertAuthoritySnapshot(
  snapshot: AuthoritySnapshot,
  packageId: string,
): void {
  assertText(snapshot.snapshotId, "Authority snapshot ID", 128);
  assertText(snapshot.actorId, "Authority snapshot actor ID", 128);
  assertText(snapshot.policyVersion, "Authority snapshot policy version", 128);
  assertText(snapshot.capturedAt, "Authority snapshot captured time", 64);
  if (snapshot.actorKind === "human") return;
  throw new WorkManagementError(
    "HUMAN_AUTHORITY_REQUIRED",
    `Approval package "${packageId}" authority snapshot actor kind "${snapshot.actorKind}" is invalid; expected human.`,
  );
}
