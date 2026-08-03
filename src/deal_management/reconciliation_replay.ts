import type { Deal, DealCommandContext, DealScope } from "./contracts.ts";
import type { IdempotencyKey } from "../platform/api/v1.ts";
import type { DealId } from "./ids.ts";
import type { DealManagementService } from "./service.ts";
import type { DealRepository } from "./repository.ts";
import { DealError } from "./errors.ts";
import {
  canonicalJson,
  type LegacyIdentity,
  reconciliationIdempotencyKey,
} from "./migration_identity.ts";

/** Identifies an expected replay conflict that can become bounded evidence. */
export class ReconciliationApplyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ReconciliationApplyError";
  }
}

/**
 * Returns true only for expected apply failures safe to persist as evidence.
 * @example if (isExpectedReconciliationApplyFailure(error)) persist(error)
 */
export function isExpectedReconciliationApplyFailure(
  error: unknown,
): error is DealError | ReconciliationApplyError {
  return error instanceof DealError ||
    error instanceof ReconciliationApplyError;
}

/** Provides the replay seam for the canonical reconciliation key helper. */
export function replayExpectedIdempotencyKey(
  identity: LegacyIdentity,
  operation: string,
  legacyEntityId: string,
): Promise<IdempotencyKey> {
  return reconciliationIdempotencyKey(identity, operation, legacyEntityId);
}

/**
 * Replays one mapped Deal through the existing command service.
 *
 * Stable idempotency keys and persisted identity make an interrupted apply
 * safe to resume without creating a duplicate authoritative aggregate.
 *
 * @example await replayMappedDeal(intended, context, service, repository)
 */
export async function replayMappedDeal(
  intended: Deal,
  context: DealCommandContext,
  service: DealManagementService,
  repository: DealRepository,
  mayResumeExistingDeal: boolean,
  legacyIdentity: LegacyIdentity,
): Promise<Deal> {
  let current = await repository.find(scopeFor(context), intended.id);
  if (current === undefined) {
    current = await createMappedDeal(
      intended,
      context,
      service,
      repository,
      legacyIdentity,
    );
  } else {
    assertReplayClaim(current, intended, mayResumeExistingDeal);
  }
  current = await replayMandate(
    intended,
    current,
    context,
    service,
    legacyIdentity,
  );
  current = await replayParties(
    intended,
    current,
    context,
    service,
    legacyIdentity,
  );
  return await replayRoles(intended, current, context, service, legacyIdentity);
}

function assertReplayClaim(
  existingDeal: Deal,
  intendedDeal: Deal,
  mayResumeExistingDeal: boolean,
): void {
  if (!mayResumeExistingDeal) {
    throw new ReconciliationApplyError(
      `Authoritative Deal "${existingDeal.id}" already exists without a persisted reconciliation claim; expected an absent Deal or a resumable claim for the exact legacy record.`,
    );
  }
  if (
    !sameReplayBase(existingDeal, intendedDeal) ||
    !isCompatibleSubset(existingDeal.parties, intendedDeal.parties) ||
    !isCompatibleSubset(existingDeal.roles, intendedDeal.roles) ||
    !sameMandate(existingDeal, intendedDeal) ||
    existingDeal.authorityConstraints.length !== 0
  ) {
    throw new ReconciliationApplyError(
      `Authoritative Deal "${existingDeal.id}" conflicts with the mapped legacy candidate; expected matching base fields, empty authority constraints, and only matching party, role, and mandate state before replay.`,
    );
  }
}

function sameReplayBase(existingDeal: Deal, intendedDeal: Deal): boolean {
  return existingDeal.name === intendedDeal.name &&
    existingDeal.dealType === intendedDeal.dealType &&
    existingDeal.currency === intendedDeal.currency &&
    existingDeal.confidentiality === intendedDeal.confidentiality;
}

function sameMandate(existingDeal: Deal, intendedDeal: Deal): boolean {
  return canonicalJson(existingDeal.mandate) ===
      canonicalJson(intendedDeal.mandate) ||
    existingDeal.mandate === undefined;
}

function isCompatibleSubset<T extends { readonly id: string }>(
  existingValues: readonly T[],
  intendedValues: readonly T[],
): boolean {
  return existingValues.every((existingValue) =>
    intendedValues.some((intendedValue) =>
      canonicalJson(existingValue) === canonicalJson(intendedValue)
    )
  );
}

async function createMappedDeal(
  intended: Deal,
  context: DealCommandContext,
  service: DealManagementService,
  repository: DealRepository,
  legacyIdentity: LegacyIdentity,
): Promise<Deal> {
  await service.createDeal({
    type: "create_deal",
    context,
    idempotencyKey: await replayExpectedIdempotencyKey(
      legacyIdentity,
      "create",
      intended.id,
    ),
    dealId: intended.id,
    name: intended.name,
    dealType: intended.dealType,
    confidentiality: intended.confidentiality,
    currency: intended.currency,
  });
  return await requiredDeal(repository, context, intended.id);
}

async function replayMandate(
  intended: Deal,
  current: Deal,
  context: DealCommandContext,
  service: DealManagementService,
  legacyIdentity: LegacyIdentity,
): Promise<Deal> {
  if (intended.mandate === undefined || current.mandate !== undefined) {
    return current;
  }
  const result = await service.setMandate({
    type: "set_mandate",
    context,
    idempotencyKey: await replayExpectedIdempotencyKey(
      legacyIdentity,
      "mandate",
      intended.id,
    ),
    dealId: intended.id,
    expectedVersion: current.version,
    mandateId: intended.mandate.id,
    transactionValueCeiling: intended.mandate.transactionValueCeiling,
    authorityCeiling: intended.mandate.authorityCeiling,
  });
  return result.deal;
}

async function replayParties(
  intended: Deal,
  current: Deal,
  context: DealCommandContext,
  service: DealManagementService,
  legacyIdentity: LegacyIdentity,
): Promise<Deal> {
  let next = current;
  for (const party of intended.parties) {
    if (hasParty(next, party.reference)) continue;
    const result = await service.addDealParty({
      type: "add_deal_party",
      context,
      idempotencyKey: await replayExpectedIdempotencyKey(
        legacyIdentity,
        "party",
        party.id,
      ),
      dealId: intended.id,
      expectedVersion: next.version,
      partyId: party.id,
      reference: party.reference,
      side: party.side,
      label: party.label,
    });
    next = result.deal;
  }
  return next;
}

function hasParty(
  deal: Deal,
  reference: Deal["parties"][number]["reference"],
): boolean {
  return deal.parties.some((candidate) =>
    candidate.reference.kind === reference.kind &&
    candidate.reference.id === reference.id
  );
}

async function replayRoles(
  intended: Deal,
  current: Deal,
  context: DealCommandContext,
  service: DealManagementService,
  legacyIdentity: LegacyIdentity,
): Promise<Deal> {
  let next = current;
  for (const role of intended.roles) {
    if (hasRole(next, role.partyId, role.name)) continue;
    const result = await service.assignDealRole({
      type: "assign_deal_role",
      context,
      idempotencyKey: await replayExpectedIdempotencyKey(
        legacyIdentity,
        "role",
        role.id,
      ),
      dealId: intended.id,
      expectedVersion: next.version,
      roleId: role.id,
      partyId: role.partyId,
      name: role.name,
      authorityLevel: role.authorityLevel,
    });
    next = result.deal;
  }
  return next;
}

function hasRole(
  deal: Deal,
  partyId: Deal["roles"][number]["partyId"],
  name: Deal["roles"][number]["name"],
): boolean {
  return deal.roles.some((candidate) =>
    candidate.partyId === partyId && candidate.name === name
  );
}

async function requiredDeal(
  repository: DealRepository,
  context: DealCommandContext,
  dealId: DealId,
): Promise<Deal> {
  const deal = await repository.find(scopeFor(context), dealId);
  if (deal !== undefined) return deal;
  throw new Error(
    `Deal "${dealId}" was not persisted after reconciliation create; expected an authoritative row.`,
  );
}

/**
 * Compares persisted state with the mapped candidate while ignoring only the
 * expected authoritative version and update timestamp changes.
 *
 * @example const verified = await verifyMappedDeal(intended, repository, scope)
 */
export async function verifyMappedDeal(
  intended: Deal,
  repository: DealRepository,
  scope: DealScope,
): Promise<boolean> {
  const persisted = await repository.find(scope, intended.id);
  if (persisted === undefined) return false;
  return canonicalJson(persisted) === canonicalJson({
    ...intended,
    version: persisted.version,
    updatedAt: persisted.updatedAt,
  });
}

/** Compares mapped intent while ignoring persistence-only fields. */
export function sameMappedDealIntent(left: Deal, right: Deal): boolean {
  return canonicalJson(intentShape(left)) === canonicalJson(intentShape(right));
}

function intentShape(deal: Deal): unknown {
  const {
    version: _version,
    createdAt: _createdAt,
    updatedAt: _updatedAt,
    ...intent
  } = deal;
  return intent;
}

function scopeFor(context: DealCommandContext): DealScope {
  if (context.request.workspaceId === undefined) {
    throw new Error(
      `Reconciliation actor "${context.actor.id}" has no workspace; expected a scoped Deal command context.`,
    );
  }
  return {
    tenantId: context.request.tenantId,
    workspaceId: context.request.workspaceId,
  };
}
