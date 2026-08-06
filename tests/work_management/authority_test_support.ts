import { createApprovalPackage } from "../../src/work_management/approval_requests.ts";
import {
  actor,
  aggregateVersion,
  approvalDecisionId,
  approvalPackageId,
  approvalRequestId,
  deal,
  targetCommandType,
  tenant,
  type WorkScope,
  workspace,
} from "../../src/work_management/ids.ts";
import type { AuthorityFacts } from "../../src/work_management/authority_facts.ts";
import type {
  ApprovalPackage,
  AuthorityLimit,
} from "../../src/work_management/model.ts";
import type { TargetCommandDispatch } from "../../src/work_management/target_commands.ts";

export const authorityScope: WorkScope = {
  tenantId: tenant("tenant_authority-proof"),
  workspaceId: workspace("workspace_authority-proof"),
  dealId: deal("deal_authority-proof"),
};

export const authorityApprover = actor("actor_authority-approver");

export async function authorityPackage(
  limits: readonly AuthorityLimit[],
  options: { readonly expiresAt?: string; readonly targetVersion?: number } =
    {},
): Promise<ApprovalPackage> {
  const target = {
    aggregateType: "deal_execution",
    aggregateId: "execution_authority-one",
    expectedVersion: aggregateVersion(options.targetVersion ?? 7),
    scope: authorityScope,
  };
  return await createApprovalPackage({
    id: approvalPackageId("package_authority-proof"),
    version: 3,
    target,
    evidence: [],
    authority: {
      commandType: targetCommandType("approve_execution"),
      target,
      namedApproverId: authorityApprover,
      policyVersion: "policy-authority-v4",
      snapshotReference: "authority-snapshot-v9",
      scope: authorityScope,
      effectiveAt: "2026-08-06T11:00:00.000Z",
      expiresAt: options.expiresAt ?? "2026-08-06T13:00:00.000Z",
      applicableLimits: limits,
      humanOnly: true,
    },
    authoritySnapshot: {
      snapshotId: "authority-snapshot-v9",
      actorId: authorityApprover,
      actorKind: "human",
      policyVersion: "policy-authority-v4",
      capturedAt: "2026-08-06T11:30:00.000Z",
      scope: authorityScope,
    },
    payload: { selector: "execution_authority-one" },
  });
}

export function authorityFacts(
  overrides: Partial<AuthorityFacts> = {},
): AuthorityFacts {
  const target = {
    aggregateType: "deal_execution",
    aggregateId: "execution_authority-one",
    expectedVersion: aggregateVersion(7),
    scope: authorityScope,
  };
  return {
    target,
    scope: authorityScope,
    amount: { minorUnits: 100_000, currency: "USD" },
    percentageBasisPoints: 2_500,
    mandate: {
      mandateId: "mandate-one",
      version: "mandate-v3",
      active: true,
      scope: authorityScope,
    },
    category: "acquisition",
    source: {
      sourceId: "trusted-deal-snapshot",
      sourceVersion: "snapshot-v12",
      capturedAt: "2026-08-06T11:59:00.000Z",
    },
    ...overrides,
  };
}

export function authorityDispatch(
  packageValue: ApprovalPackage,
): TargetCommandDispatch {
  return {
    dispatchId: "work_target_command_authority-proof",
    ...authorityScope,
    approvalRequestId: approvalRequestId("approval_authority-proof"),
    approvalRequestVersion: aggregateVersion(4),
    decisionId: approvalDecisionId("decision_authority-proof"),
    outcome: "approved",
    targetAggregateType: packageValue.target.aggregateType,
    targetAggregateId: packageValue.target.aggregateId,
    expectedTargetVersion: packageValue.target.expectedVersion,
    packageId: packageValue.id,
    packageVersion: packageValue.version,
    packageDigest: packageValue.contentDigest,
    authoritySnapshotReference: packageValue.authority.snapshotReference,
    actor: { id: authorityApprover, kind: "human", state: "active" },
    commandType: packageValue.authority.commandType,
    correlationId:
      "cor_authority-proof" as TargetCommandDispatch["correlationId"],
    causationId: "work_event_authority-proof",
    idempotencyIdentity:
      "tenant_authority-proof|workspace_authority-proof|deal_authority-proof|actor_authority-approver|approve_approval_request|approval_authority-proof|idem_authority-proof",
    recordedAt: "2026-08-06T12:00:00.000Z",
  };
}

export const completeLimits: readonly AuthorityLimit[] = [
  { name: "amount_minor_ceiling", value: 100_000 },
  { name: "currency", value: "USD" },
  { name: "percentage_bps_ceiling", value: 2_500 },
  { name: "mandate_required", value: true },
  { name: "mandate_id", value: "mandate-one" },
  { name: "mandate_version", value: "mandate-v3" },
  { name: "category", value: "acquisition" },
  { name: "deal_scope", value: authorityScope.dealId },
];
