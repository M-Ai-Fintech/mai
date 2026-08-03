import type { TransactionHandle } from "../platform/persistence/v1.ts";
import type { IdempotencyKey } from "../platform/api/v1.ts";
import type {
  ReconciliationEvidenceResult,
  ReconciliationEvidenceVerifier,
} from "./legacy_contracts.ts";
import type { DealTransactionRunner } from "./repository.ts";
import { commandFingerprint } from "./receipts.ts";
import { reconciliationIdempotencyKey } from "./migration_identity.ts";
import { canonicalJson, type LegacyIdentity } from "./migration_identity.ts";
import type {
  AddDealPartyCommand,
  AssignDealRoleCommand,
  CreateDealCommand,
  SetMandateCommand,
} from "./commands.ts";

/** Provides the evidence seam for the canonical reconciliation key helper. */
export function verificationExpectedIdempotencyKey(
  identity: LegacyIdentity,
  operation: string,
  legacyEntityId: string,
): Promise<IdempotencyKey> {
  return reconciliationIdempotencyKey(identity, operation, legacyEntityId);
}

export type ReconciliationEvidenceMismatchCode =
  | "CLAIM_COUNT"
  | "RECEIPT_COUNT"
  | "CLAIM_NOT_COMPLETED"
  | "CLAIM_FINGERPRINT"
  | "RECEIPT_FINGERPRINT"
  | "RESULT_MISMATCH"
  | "COMMAND_TYPE"
  | "TARGET"
  | "HISTORY_COUNT"
  | "HISTORY_VERSION"
  | "EVENT_TYPE"
  | "EVENT_SCHEMA"
  | "HISTORY_SCOPE"
  | "OUTBOX_COUNT"
  | "OUTBOX_LINK"
  | "OUTBOX_SCOPE"
  | "AUDIT_COUNT"
  | "AUDIT_LINK"
  | "AUDIT_SCOPE"
  | "UNEXPECTED_OPERATION";

export interface ReconciliationEvidenceMismatch {
  readonly code: ReconciliationEvidenceMismatchCode;
  readonly operation: string;
  readonly detail: string;
}

/** Verifies one exact migration operation per durable evidence stream. */
export class PostgresReconciliationEvidenceVerifier
  implements ReconciliationEvidenceVerifier {
  constructor(private readonly transactions: DealTransactionRunner) {}

  verify(
    input: Parameters<ReconciliationEvidenceVerifier["verify"]>[0],
  ): Promise<ReconciliationEvidenceResult> {
    return this.transactions.run((transaction) =>
      verifyEvidence(transaction, input)
    );
  }

  verifyInTransaction(
    transaction: TransactionHandle,
    input: Parameters<ReconciliationEvidenceVerifier["verify"]>[0],
  ): Promise<ReconciliationEvidenceResult> {
    return verifyEvidence(transaction, input);
  }
}

interface ExpectedOperation {
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

interface ClaimRow {
  readonly fingerprint: string;
  readonly state: string;
  readonly result: unknown;
}

interface ReceiptRow {
  readonly command: string;
  readonly target: string;
  readonly fingerprint: string;
  readonly result: unknown;
}

interface EventRow {
  readonly eventId: string;
  readonly tenantId: string;
  readonly workspaceId: string;
  readonly dealId: string;
  readonly aggregateVersion: number;
  readonly eventType: string;
  readonly schemaVersion: number;
}

interface LinkedEventRow {
  readonly eventId: string;
  readonly tenantId: string;
  readonly workspaceId: string | null;
  readonly aggregateId: string;
  readonly aggregateVersion: number;
  readonly eventType: string;
  readonly schemaVersion: number;
  readonly auditEventId?: string;
}

async function verifyEvidence(
  transaction: TransactionHandle,
  input: Parameters<ReconciliationEvidenceVerifier["verify"]>[0],
): Promise<ReconciliationEvidenceResult> {
  const expected = await buildMigrationManifest(input);
  const mismatches: ReconciliationEvidenceMismatch[] = [];
  const expectedClaimKeys = new Set(
    expected.map((operation) => operation.rawKey),
  );
  const expectedReceiptKeys = new Set(
    expected.map((operation) => operation.key),
  );

  for (const operation of expected) {
    await verifyOperation(transaction, input, operation, mismatches);
  }
  await verifyUnexpectedOperations(
    transaction,
    input,
    expectedClaimKeys,
    mismatches,
  );
  await verifyUnexpectedReceipts(
    transaction,
    input,
    expectedReceiptKeys,
    mismatches,
  );
  return mismatches.length === 0
    ? { ok: true }
    : { ok: false, missing: mismatches.map(formatMismatch) };
}

async function buildMigrationManifest(
  input: Parameters<ReconciliationEvidenceVerifier["verify"]>[0],
): Promise<readonly ExpectedOperation[]> {
  const context = input.operator.commandContext;
  const identity = {
    source: input.legacySource,
    legacyDealId: input.legacyDealId,
  };
  const base: CreateDealCommand = {
    type: "create_deal",
    context,
    idempotencyKey: await verificationExpectedIdempotencyKey(
      identity,
      "create",
      input.intendedDeal.id,
    ),
    dealId: input.intendedDeal.id,
    name: input.intendedDeal.name,
    dealType: input.intendedDeal.dealType,
    confidentiality: input.intendedDeal.confidentiality,
    currency: input.intendedDeal.currency,
  };
  const commands: Array<{
    name: string;
    command:
      | CreateDealCommand
      | SetMandateCommand
      | AddDealPartyCommand
      | AssignDealRoleCommand;
    event: string;
    resultOperation: string;
  }> = [{
    name: "create_deal",
    command: base,
    event: "DealCreated",
    resultOperation: "created",
  }];

  let version = 1;
  if (input.intendedDeal.mandate !== undefined) {
    const mandate = input.intendedDeal.mandate;
    commands.push({
      name: "set_mandate",
      command: {
        type: "set_mandate",
        context,
        idempotencyKey: await verificationExpectedIdempotencyKey(
          identity,
          "mandate",
          input.intendedDeal.id,
        ),
        dealId: input.intendedDeal.id,
        expectedVersion: version,
        mandateId: mandate.id,
        transactionValueCeiling: mandate.transactionValueCeiling,
        authorityCeiling: mandate.authorityCeiling,
      },
      event: "MandateSet",
      resultOperation: "mandate_set",
    });
    version++;
  }
  for (const party of input.intendedDeal.parties) {
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
        dealId: input.intendedDeal.id,
        expectedVersion: version,
        partyId: party.id,
        reference: party.reference,
        side: party.side,
        label: party.label,
      },
      event: "DealPartyAdded",
      resultOperation: "party_added",
    });
    version++;
  }
  for (const role of input.intendedDeal.roles) {
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
        dealId: input.intendedDeal.id,
        expectedVersion: version,
        roleId: role.id,
        partyId: role.partyId,
        name: role.name,
        authorityLevel: role.authorityLevel,
      },
      event: "DealRoleAssigned",
      resultOperation: "role_assigned",
    });
    version++;
  }

  const operations: ExpectedOperation[] = [];
  for (const [index, entry] of commands.entries()) {
    const rawKey = entry.command.idempotencyKey;
    operations.push({
      name: `${entry.name}[${index}]`,
      command: entry.command.type,
      target: input.intendedDeal.id,
      rawKey,
      key: durableKey(input, entry.command.type, input.intendedDeal.id, rawKey),
      fingerprint: commandFingerprint(entry.command),
      version: index + 1,
      event: entry.event,
      schema: 1,
      resultOperation: entry.resultOperation,
    });
  }
  return operations;
}

function durableKey(
  input: Parameters<ReconciliationEvidenceVerifier["verify"]>[0],
  command: string,
  target: string,
  rawKey: string,
): string {
  return [
    input.scope.tenantId,
    input.scope.workspaceId,
    input.operator.actorId,
    command,
    target,
    rawKey,
  ].join(":");
}

async function verifyOperation(
  transaction: TransactionHandle,
  input: Parameters<ReconciliationEvidenceVerifier["verify"]>[0],
  operation: ExpectedOperation,
  mismatches: ReconciliationEvidenceMismatch[],
): Promise<void> {
  const claims = await loadClaims(transaction, input, operation);
  const receipts = await loadReceipts(transaction, input, operation);
  const history = await loadHistory(transaction, input, operation);
  const outbox = await loadOutbox(transaction, input, operation);
  const audit = await loadAudit(transaction, input, operation);

  if (claims.length !== 1) {
    add(mismatches, "CLAIM_COUNT", operation, `${claims.length}`);
  }
  if (receipts.length !== 1) {
    add(mismatches, "RECEIPT_COUNT", operation, `${receipts.length}`);
  }
  if (history.length !== 1) {
    add(mismatches, "HISTORY_COUNT", operation, `${history.length}`);
  }
  if (outbox.length !== 1) {
    add(mismatches, "OUTBOX_COUNT", operation, `${outbox.length}`);
  }
  if (audit.length !== 1) {
    add(mismatches, "AUDIT_COUNT", operation, `${audit.length}`);
  }

  const claim = claims[0];
  const receipt = receipts[0];
  const event = history[0];
  const outboxEvent = outbox[0];
  const auditEvent = audit[0];
  if (claim !== undefined) {
    if (claim.state !== "completed") {
      add(mismatches, "CLAIM_NOT_COMPLETED", operation, claim.state);
    }
    if (claim.fingerprint !== operation.fingerprint) {
      add(mismatches, "CLAIM_FINGERPRINT", operation, claim.fingerprint);
    }
  }
  if (receipt !== undefined) {
    if (receipt.command !== operation.command) {
      add(mismatches, "COMMAND_TYPE", operation, receipt.command);
    }
    if (receipt.target !== operation.target) {
      add(mismatches, "TARGET", operation, receipt.target);
    }
    if (receipt.fingerprint !== operation.fingerprint) {
      add(mismatches, "RECEIPT_FINGERPRINT", operation, receipt.fingerprint);
    }
  }
  if (claim !== undefined && receipt !== undefined) {
    if (canonicalJson(claim.result) !== canonicalJson(receipt.result)) {
      add(mismatches, "RESULT_MISMATCH", operation, "claim_receipt");
    }
    checkResultShape(claim.result, operation, mismatches);
  }
  if (event !== undefined) {
    if (event.aggregateVersion !== operation.version) {
      add(
        mismatches,
        "HISTORY_VERSION",
        operation,
        `${event.aggregateVersion}`,
      );
    }
    if (event.eventType !== operation.event) {
      add(mismatches, "EVENT_TYPE", operation, event.eventType);
    }
    if (event.schemaVersion !== operation.schema) {
      add(mismatches, "EVENT_SCHEMA", operation, `${event.schemaVersion}`);
    }
    if (
      event.tenantId !== input.scope.tenantId ||
      event.workspaceId !== input.scope.workspaceId ||
      event.dealId !== operation.target
    ) add(mismatches, "HISTORY_SCOPE", operation, event.eventId);
  }
  if (outboxEvent !== undefined && event !== undefined) {
    if (
      outboxEvent.eventId !== event.eventId ||
      outboxEvent.eventType !== operation.event ||
      outboxEvent.aggregateVersion !== operation.version ||
      outboxEvent.schemaVersion !== operation.schema
    ) add(mismatches, "OUTBOX_LINK", operation, outboxEvent.eventId);
    if (
      outboxEvent.tenantId !== input.scope.tenantId ||
      outboxEvent.workspaceId !== input.scope.workspaceId ||
      outboxEvent.aggregateId !== operation.target
    ) add(mismatches, "OUTBOX_SCOPE", operation, outboxEvent.eventId);
    if (outboxEvent.auditEventId !== event.eventId) {
      add(
        mismatches,
        "OUTBOX_LINK",
        operation,
        String(outboxEvent.auditEventId),
      );
    }
  }
  if (auditEvent !== undefined && event !== undefined) {
    if (
      auditEvent.eventId !== event.eventId ||
      auditEvent.eventType !== operation.event ||
      auditEvent.aggregateVersion !== operation.version ||
      auditEvent.schemaVersion !== operation.schema
    ) add(mismatches, "AUDIT_LINK", operation, auditEvent.eventId);
    if (
      auditEvent.tenantId !== input.scope.tenantId ||
      auditEvent.workspaceId !== input.scope.workspaceId ||
      auditEvent.aggregateId !== operation.target
    ) add(mismatches, "AUDIT_SCOPE", operation, auditEvent.eventId);
  }
}

function checkResultShape(
  result: unknown,
  operation: ExpectedOperation,
  mismatches: ReconciliationEvidenceMismatch[],
): void {
  if (typeof result !== "object" || result === null || Array.isArray(result)) {
    add(mismatches, "RESULT_MISMATCH", operation, "not_object");
    return;
  }
  const value = result as Record<string, unknown>;
  const deal = value.deal;
  if (
    value.operation !== operation.resultOperation || typeof deal !== "object" ||
    deal === null
  ) {
    add(mismatches, "RESULT_MISMATCH", operation, "shape");
    return;
  }
  const storedDeal = deal as Record<string, unknown>;
  if (
    storedDeal.id !== operation.target ||
    storedDeal.version !== operation.version ||
    typeof storedDeal.tenantId !== "string" ||
    typeof storedDeal.workspaceId !== "string"
  ) add(mismatches, "RESULT_MISMATCH", operation, "aggregate_identity");
}

async function loadClaims(
  transaction: TransactionHandle,
  input: Parameters<ReconciliationEvidenceVerifier["verify"]>[0],
  operation: ExpectedOperation,
): Promise<ClaimRow[]> {
  const result = await transaction.query<ClaimRow>(
    `SELECT fingerprint, state, result FROM deal_management.command_claims
     WHERE tenant_id=$1 AND workspace_id=$2 AND actor_id=$3
       AND command_type=$4 AND target_id=$5 AND idempotency_key=$6`,
    [
      input.scope.tenantId,
      input.scope.workspaceId,
      input.operator.actorId,
      operation.command,
      operation.target,
      operation.rawKey,
    ],
  );
  return result.rows;
}

async function loadReceipts(
  transaction: TransactionHandle,
  input: Parameters<ReconciliationEvidenceVerifier["verify"]>[0],
  operation: ExpectedOperation,
): Promise<ReceiptRow[]> {
  const result = await transaction.query<ReceiptRow>(
    `SELECT command_type AS command, target_id AS target, fingerprint, result
     FROM deal_management.command_receipts
     WHERE tenant_id=$1 AND workspace_id=$2 AND actor_id=$3
       AND command_type=$4 AND target_id=$5 AND idempotency_key=$6`,
    [
      input.scope.tenantId,
      input.scope.workspaceId,
      input.operator.actorId,
      operation.command,
      operation.target,
      operation.key,
    ],
  );
  return result.rows;
}

async function loadHistory(
  transaction: TransactionHandle,
  input: Parameters<ReconciliationEvidenceVerifier["verify"]>[0],
  operation: ExpectedOperation,
): Promise<EventRow[]> {
  const result = await transaction.query<EventRow>(
    `SELECT event_id AS "eventId", tenant_id AS "tenantId", workspace_id AS "workspaceId",
       deal_id AS "dealId", aggregate_version::int AS "aggregateVersion",
       event_type AS "eventType", schema_version AS "schemaVersion"
     FROM deal_management.aggregate_history
     WHERE tenant_id=$1 AND workspace_id=$2 AND deal_id=$3
       AND aggregate_version=$4`,
    [
      input.scope.tenantId,
      input.scope.workspaceId,
      operation.target,
      operation.version,
    ],
  );
  return result.rows;
}

async function loadOutbox(
  transaction: TransactionHandle,
  input: Parameters<ReconciliationEvidenceVerifier["verify"]>[0],
  operation: ExpectedOperation,
): Promise<LinkedEventRow[]> {
  const result = await transaction.query<LinkedEventRow>(
    `SELECT event_id AS "eventId", tenant_id AS "tenantId", workspace_id AS "workspaceId",
       aggregate_id AS "aggregateId", aggregate_version::int AS "aggregateVersion",
       event_type AS "eventType", schema_version AS "schemaVersion",
       payload->>'auditEventId' AS "auditEventId"
     FROM platform.outbox
     WHERE tenant_id=$1 AND workspace_id=$2 AND aggregate_id=$3
       AND aggregate_version=$4 AND event_type=$5 AND schema_version=$6`,
    [
      input.scope.tenantId,
      input.scope.workspaceId,
      operation.target,
      operation.version,
      operation.event,
      operation.schema,
    ],
  );
  return result.rows;
}

async function loadAudit(
  transaction: TransactionHandle,
  input: Parameters<ReconciliationEvidenceVerifier["verify"]>[0],
  operation: ExpectedOperation,
): Promise<LinkedEventRow[]> {
  const result = await transaction.query<LinkedEventRow>(
    `SELECT event_id AS "eventId", tenant_id AS "tenantId", workspace_id AS "workspaceId",
       aggregate_id AS "aggregateId", aggregate_version::int AS "aggregateVersion",
       event_type AS "eventType", schema_version AS "schemaVersion"
     FROM audit_activity.audit_events
     WHERE tenant_id=$1 AND workspace_id=$2 AND aggregate_id=$3
       AND aggregate_version=$4 AND event_type=$5 AND schema_version=$6`,
    [
      input.scope.tenantId,
      input.scope.workspaceId,
      operation.target,
      operation.version,
      operation.event,
      operation.schema,
    ],
  );
  return result.rows;
}

async function verifyUnexpectedOperations(
  transaction: TransactionHandle,
  input: Parameters<ReconciliationEvidenceVerifier["verify"]>[0],
  expectedKeys: ReadonlySet<string>,
  mismatches: ReconciliationEvidenceMismatch[],
): Promise<void> {
  const result = await transaction.query<{ key: string }>(
    `SELECT idempotency_key AS key FROM deal_management.command_claims
     WHERE tenant_id=$1 AND workspace_id=$2 AND actor_id=$3 AND target_id=$4
       AND command_type IN ('create_deal','set_mandate','add_deal_party','assign_deal_role')
       AND state='completed'`,
    [
      input.scope.tenantId,
      input.scope.workspaceId,
      input.operator.actorId,
      input.intendedDeal.id,
    ],
  );
  for (const row of result.rows) {
    if (!expectedKeys.has(row.key)) {
      add(mismatches, "UNEXPECTED_OPERATION", "manifest", row.key);
    }
  }
}

async function verifyUnexpectedReceipts(
  transaction: TransactionHandle,
  input: Parameters<ReconciliationEvidenceVerifier["verify"]>[0],
  expectedKeys: ReadonlySet<string>,
  mismatches: ReconciliationEvidenceMismatch[],
): Promise<void> {
  const result = await transaction.query<{ key: string }>(
    `SELECT idempotency_key AS key FROM deal_management.command_receipts
     WHERE tenant_id=$1 AND workspace_id=$2 AND actor_id=$3 AND target_id=$4
       AND command_type IN ('create_deal','set_mandate','add_deal_party','assign_deal_role')`,
    [
      input.scope.tenantId,
      input.scope.workspaceId,
      input.operator.actorId,
      input.intendedDeal.id,
    ],
  );
  for (const row of result.rows) {
    if (!expectedKeys.has(row.key)) {
      add(mismatches, "UNEXPECTED_OPERATION", "manifest", row.key);
    }
  }
}

function add(
  mismatches: ReconciliationEvidenceMismatch[],
  code: ReconciliationEvidenceMismatchCode,
  operation: ExpectedOperation | string,
  detail: string,
): void {
  mismatches.push({
    code,
    operation: typeof operation === "string" ? operation : operation.name,
    detail,
  });
}

function formatMismatch(mismatch: ReconciliationEvidenceMismatch): string {
  return `${mismatch.code}:${mismatch.operation}:${mismatch.detail}`;
}
