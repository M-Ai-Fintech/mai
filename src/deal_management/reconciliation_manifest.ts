import type { IdempotencyKey } from "../platform/api/v1.ts";
import type { ReconciliationEvidenceVerifier } from "./legacy_contracts.ts";
import {
  type LegacyIdentity,
  reconciliationIdempotencyKey,
} from "./migration_identity.ts";
import { commandFingerprint } from "./receipts.ts";
import type {
  AddDealPartyCommand,
  AssignDealRoleCommand,
  CreateDealCommand,
  SetMandateCommand,
} from "./commands.ts";

export interface ExpectedOperation {
  readonly name: string;
  readonly command: string;
  readonly target: string;
  readonly rawKey: string;
  readonly key: string;
  readonly fingerprint: string;
  readonly version: number;
  readonly event: string;
  readonly schema: number;
  readonly resultOperation: string;
}

export function expectedResultMismatch(
  result: unknown,
  operation: ExpectedOperation,
): string | undefined {
  if (!isRecord(result)) return "not_object";
  if (
    !isRecord(result.deal) || result.operation !== operation.resultOperation
  ) {
    return "shape";
  }
  return matchesAggregateIdentity(result.deal, operation)
    ? undefined
    : "aggregate_identity";
}

function matchesAggregateIdentity(
  deal: Record<string, unknown>,
  operation: ExpectedOperation,
): boolean {
  return deal.id === operation.target && deal.version === operation.version &&
    typeof deal.tenantId === "string" &&
    typeof deal.workspaceId === "string";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Provides the evidence seam for the canonical reconciliation key helper. */
export function verificationExpectedIdempotencyKey(
  identity: LegacyIdentity,
  operation: string,
  legacyEntityId: string,
): Promise<IdempotencyKey> {
  return reconciliationIdempotencyKey(identity, operation, legacyEntityId);
}

export async function buildMigrationManifest(
  input: Parameters<ReconciliationEvidenceVerifier["verify"]>[0],
): Promise<readonly ExpectedOperation[]> {
  const context = input.operator.commandContext;
  const identity = {
    source: input.legacySource,
    legacyDealId: input.legacyDealId,
  };
  const commands = await migrationCommands(input, identity, context);
  return commands.map((entry, index) => ({
    name: `${entry.name}[${index}]`,
    command: entry.command.type,
    target: input.intendedDeal.id,
    rawKey: entry.command.idempotencyKey,
    key: durableKey(input, entry.command.type, entry.command.idempotencyKey),
    fingerprint: commandFingerprint(entry.command),
    version: index + 1,
    event: entry.event,
    schema: 1,
    resultOperation: entry.resultOperation,
  }));
}

type MigrationCommand =
  | CreateDealCommand
  | SetMandateCommand
  | AddDealPartyCommand
  | AssignDealRoleCommand;
interface ManifestCommand {
  readonly name: string;
  readonly command: MigrationCommand;
  readonly event: string;
  readonly resultOperation: string;
}

async function migrationCommands(
  input: Parameters<ReconciliationEvidenceVerifier["verify"]>[0],
  identity: LegacyIdentity,
  context: CreateDealCommand["context"],
): Promise<ManifestCommand[]> {
  const deal = input.intendedDeal;
  const commands: ManifestCommand[] = [{
    name: "create_deal",
    command: {
      type: "create_deal",
      context,
      idempotencyKey: await verificationExpectedIdempotencyKey(
        identity,
        "create",
        deal.id,
      ),
      dealId: deal.id,
      name: deal.name,
      dealType: deal.dealType,
      confidentiality: deal.confidentiality,
      currency: deal.currency,
    },
    event: "DealCreated",
    resultOperation: "created",
  }];
  let version = 1;
  if (deal.mandate !== undefined) {
    commands.push({
      name: "set_mandate",
      command: {
        type: "set_mandate",
        context,
        idempotencyKey: await verificationExpectedIdempotencyKey(
          identity,
          "mandate",
          deal.id,
        ),
        dealId: deal.id,
        expectedVersion: version++,
        mandateId: deal.mandate.id,
        transactionValueCeiling: deal.mandate.transactionValueCeiling,
        authorityCeiling: deal.mandate.authorityCeiling,
      },
      event: "MandateSet",
      resultOperation: "mandate_set",
    });
  }
  for (const party of deal.parties) {
    commands.push({
      name: "add_deal_party",
      command: {
        type: "add_deal_party",
        context,
        idempotencyKey: await verificationExpectedIdempotencyKey(
          identity,
          "party",
          party.id,
        ),
        dealId: deal.id,
        expectedVersion: version++,
        partyId: party.id,
        reference: party.reference,
        side: party.side,
        label: party.label,
      },
      event: "DealPartyAdded",
      resultOperation: "party_added",
    });
  }
  for (const role of deal.roles) {
    commands.push({
      name: "assign_deal_role",
      command: {
        type: "assign_deal_role",
        context,
        idempotencyKey: await verificationExpectedIdempotencyKey(
          identity,
          "role",
          role.id,
        ),
        dealId: deal.id,
        expectedVersion: version++,
        roleId: role.id,
        partyId: role.partyId,
        name: role.name,
        authorityLevel: role.authorityLevel,
      },
      event: "DealRoleAssigned",
      resultOperation: "role_assigned",
    });
  }
  return commands;
}

function durableKey(
  input: Parameters<ReconciliationEvidenceVerifier["verify"]>[0],
  command: string,
  rawKey: string,
): string {
  return [
    input.scope.tenantId,
    input.scope.workspaceId,
    input.operator.actorId,
    command,
    input.intendedDeal.id,
    rawKey,
  ].join(":");
}
