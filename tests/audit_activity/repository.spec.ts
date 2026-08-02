import { assert, assertEquals } from "@std/assert";
import {
  ActivityProjectionBuilder,
  auditEventDigest,
  type AuditEventDraft,
  freezeAuditEvent,
  type RedactionOverlayDraft,
} from "../../src/audit_activity/v1.ts";
import { PostgresAuditEventRepository } from "../../src/audit_activity/repository.ts";
import type { TransactionHandle } from "../../src/platform/persistence/transaction.ts";
import { fixtureEvent, fixtureOverlay, fixtureScope } from "./support.ts";

type DatabaseRows = readonly Record<string, unknown>[];

class DatabaseRowTransaction implements TransactionHandle {
  readonly metadata: Readonly<Record<string, string>> = {};
  readonly queries: Array<{
    readonly text: string;
    readonly parameters: readonly unknown[];
  }> = [];
  private readonly responses: DatabaseRows[];

  constructor(initialResponses: readonly DatabaseRows[] = []) {
    this.responses = initialResponses.map((rows) => [...rows]);
  }

  enqueueRows(rows: DatabaseRows): void {
    this.responses.push([...rows]);
  }

  query<TRow>(
    text: string,
    parameters: readonly unknown[] = [],
  ): Promise<{ rows: TRow[]; rowCount: number }> {
    const rows = this.responses.shift();
    if (rows === undefined) {
      throw new Error(
        `Database row response for query "${text}" was not queued; expected a named test response.`,
      );
    }
    this.queries.push({ text, parameters });
    return Promise.resolve({ rows: rows as TRow[], rowCount: rows.length });
  }
}

Deno.test(
  "postgres repository hydrates snapshot timestamps and preserves redaction projection",
  async () => {
    const repository = new PostgresAuditEventRepository();
    const transaction = new DatabaseRowTransaction([[{ position: "7" }]]);
    const storedFixture = fixtureEvent(1);
    const { position: _position, ...baseDraft } = storedFixture;
    const draftWithPlaceholder: AuditEventDraft = {
      ...baseDraft,
      contentDigest: "0".repeat(64),
    };
    const contentDigest = await auditEventDigest(draftWithPlaceholder);
    const eventDraft: AuditEventDraft = {
      ...draftWithPlaceholder,
      contentDigest,
    };

    await repository.append(transaction, eventDraft);
    const eventInsert = transaction.queries[0];
    assert(eventInsert);
    assertPersistedTimestamp(
      eventInsert.parameters[14],
      "authority snapshot",
      eventDraft.authoritySnapshot.capturedAt,
    );
    assertPersistedTimestamp(
      eventInsert.parameters[15],
      "evidence snapshot",
      eventDraft.evidenceSnapshot.capturedAt,
    );
    transaction.enqueueRows([
      databaseEventRow(eventDraft, eventInsert.parameters),
    ]);

    const [event] = await repository.list(transaction, {
      ...fixtureScope(),
      limit: 10,
    });
    assert(event);
    assert(event.authoritySnapshot.capturedAt instanceof Date);
    assert(event.evidenceSnapshot.capturedAt instanceof Date);
    assertEquals(event.contentDigest, contentDigest);
    const { position: _hydratedPosition, ...hydratedDraft } = event;
    assertEquals(await auditEventDigest(hydratedDraft), contentDigest);
    assertEquals(freezeAuditEvent(event).contentDigest, contentDigest);

    const storedOverlay = fixtureOverlay(2, event.eventId, ["restricted"]);
    const { position: _overlayPosition, ...overlayDraft } = storedOverlay;
    const redactionDraft: RedactionOverlayDraft = overlayDraft;
    transaction.enqueueRows([{ position: "8" }]);
    await repository.appendRedaction(transaction, redactionDraft);
    const overlayInsert = transaction.queries[2];
    assert(overlayInsert);
    assertPersistedTimestamp(
      overlayInsert.parameters[6],
      "redaction authority snapshot",
      redactionDraft.authoritySnapshot.capturedAt,
    );
    transaction.enqueueRows([
      databaseRedactionRow(redactionDraft, overlayInsert.parameters),
    ]);

    const [overlay] = await repository.listRedactions(
      transaction,
      event.tenantId,
      [event.eventId],
    );
    assert(overlay);
    assert(overlay.authoritySnapshot.capturedAt instanceof Date);
    assertEquals(
      overlay.authoritySnapshot.capturedAt,
      storedOverlay.authoritySnapshot.capturedAt,
    );

    const projection = new ActivityProjectionBuilder().rebuild({
      scope: fixtureScope(),
      events: [event],
      overlays: [overlay],
      allowedClassifications: ["public"],
    });
    assertEquals(projection.entries[0]?.payload, { visible: "visible-1" });
    assertEquals(projection.entries[0]?.redactedFields, ["restricted"]);
  },
);

function assertPersistedTimestamp(
  value: unknown,
  label: string,
  expected: Date,
): void {
  assert(
    typeof value === "string",
    `${label} was not serialized as a JSON string; expected database JSON/JSONB representation.`,
  );
  const persisted = JSON.parse(value) as { readonly capturedAt?: unknown };
  assertEquals(persisted.capturedAt, expected.toISOString());
}

function databaseEventRow(
  event: AuditEventDraft,
  parameters: readonly unknown[],
): Record<string, unknown> {
  return {
    position: "7",
    eventId: event.eventId,
    tenantId: event.tenantId,
    workspaceId: event.workspaceId ?? null,
    dealId: event.dealId ?? null,
    actorId: event.actorId,
    actorKind: event.actorKind,
    origin: event.origin,
    correlationId: event.correlationId,
    causationId: event.causationId ?? null,
    aggregateType: event.aggregateType,
    aggregateId: event.aggregateId,
    aggregateVersion: String(event.aggregateVersion),
    eventType: event.eventType,
    schemaVersion: event.schemaVersion,
    authoritySnapshot: parameters[14],
    evidenceSnapshot: parameters[15],
    provenance: parameters[16],
    payload: parameters[17],
    classifications: parameters[18],
    contentDigest: event.contentDigest,
    occurredAt: event.occurredAt.toISOString(),
  };
}

function databaseRedactionRow(
  overlay: RedactionOverlayDraft,
  parameters: readonly unknown[],
): Record<string, unknown> {
  return {
    position: "8",
    overlayId: overlay.overlayId,
    tenantId: overlay.tenantId,
    workspaceId: overlay.workspaceId ?? null,
    dealId: overlay.dealId ?? null,
    targetEventId: overlay.targetEventId,
    actorId: overlay.actorId,
    authoritySnapshot: parameters[6],
    reason: overlay.reason,
    fields: parameters[8],
    appliedAt: overlay.appliedAt.toISOString(),
  };
}
