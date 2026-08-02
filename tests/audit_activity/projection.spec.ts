import { assertEquals, assertThrows } from "@std/assert";
import {
  ActivityProjectionBuilder,
  type AuditFieldClassification,
  type AuditScope,
} from "../../src/audit_activity/v1.ts";
import { fixtureEvent, fixtureOverlay, fixtureScope } from "./support.ts";

Deno.test("activity projection rebuilds deterministically from positions and overlays", () => {
  const eventOne = fixtureEvent(1, {
    occurredAt: new Date("2026-08-01T12:02:00.000Z"),
  });
  const eventTwo = fixtureEvent(2, {
    occurredAt: new Date("2026-08-01T12:01:00.000Z"),
  });
  const overlay = fixtureOverlay(3, eventOne.eventId, ["restricted"]);
  const input = {
    scope: fixtureScope(),
    events: [eventTwo, eventOne],
    overlays: [overlay],
    allowedClassifications: ["public"] as readonly AuditFieldClassification[],
  };
  const builder = new ActivityProjectionBuilder();

  const first = builder.rebuild(input);
  const second = builder.rebuild({
    ...input,
    events: [eventOne, eventTwo],
    overlays: [overlay],
  });

  assertEquals(first, second);
  assertEquals(first.entries.map((entry) => entry.eventId), [
    eventOne.eventId,
    eventTwo.eventId,
  ]);
  assertEquals(first.entries[0].payload, { visible: "visible-1" });
  assertEquals(first.entries[0].redactedFields, ["restricted"]);
  assertEquals(first.watermark, { eventPosition: 2, overlayPosition: 3 });
  assertEquals(first.projectionAsOf, new Date("2026-08-01T12:02:00.000Z"));
});

Deno.test("projection filters restricted fields even when a redaction overlay is absent", () => {
  const event = fixtureEvent(1);
  const projection = new ActivityProjectionBuilder().rebuild({
    scope: fixtureScope(),
    events: [event],
    overlays: [],
    allowedClassifications: ["public"],
  });

  assertEquals(projection.entries[0].payload, { visible: "visible-1" });
  assertEquals(projection.entries[0].redactedFields, []);
});

Deno.test("projection preserves nested JSON payload values after filtering", () => {
  const event = fixtureEvent(1, {
    payload: {
      visible: { items: [{ code: "A", score: 2 }], enabled: true },
      restricted: "hidden",
    },
    classifications: { visible: "public", restricted: "restricted" },
  });
  const projection = new ActivityProjectionBuilder().rebuild({
    scope: fixtureScope(),
    events: [event],
    overlays: [],
    allowedClassifications: ["public"],
  });

  assertEquals(projection.entries[0].payload, {
    visible: { items: [{ code: "A", score: 2 }], enabled: true },
  });
});

Deno.test("projection rejects a record from another requested scope", () => {
  const event = fixtureEvent(
    1,
    {},
    fixtureScope({ dealId: "deal_other" as AuditScope["dealId"] }),
  );

  assertThrows(
    () =>
      new ActivityProjectionBuilder().rebuild({
        scope: fixtureScope(),
        events: [event],
        overlays: [],
        allowedClassifications: ["public"],
      }),
    Error,
    "does not match requested deal",
  );
});
