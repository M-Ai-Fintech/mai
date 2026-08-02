import { assertEquals, assertRejects } from "@std/assert";
import {
  auditEventDigest,
  type AuditEventDraft,
  type AuditPosition,
  freezeAuditEvent,
} from "../../src/audit_activity/v1.ts";
import { fixtureEvent } from "./support.ts";

class CustomPayloadValue {
  constructor(readonly value: string) {}
}

Deno.test("audit event digest is stable across object key order", async () => {
  const first = fixtureEvent(1);
  const second: AuditEventDraft = {
    ...first,
    payload: {
      restricted: first.payload.restricted,
      visible: first.payload.visible,
    },
    classifications: {
      restricted: "restricted",
      visible: "public",
    },
  };

  assertEquals(await auditEventDigest(first), await auditEventDigest(second));
});

Deno.test("audit event rejects an unclassified payload field", async () => {
  const event = fixtureEvent(1);
  const invalid: AuditEventDraft = {
    ...event,
    payload: { ...event.payload, unclassified: "secret" },
  };

  await assertRejects(
    () => auditEventDigest(invalid),
    Error,
    'payload field "unclassified" has no classification',
  );
});

Deno.test("audit event rejects nested Date payload values", async () => {
  const invalid: AuditEventDraft = {
    ...fixtureEvent(1),
    payload: {
      metadata: { capturedAt: new Date("2026-08-01T12:00:00.000Z") },
    } as unknown as AuditEventDraft["payload"],
    classifications: { metadata: "internal" },
  };

  await assertRejects(
    () => auditEventDigest(invalid),
    Error,
    'payload value at "$.metadata.capturedAt"',
  );
});

Deno.test("audit event rejects nested undefined payload values", async () => {
  const invalid: AuditEventDraft = {
    ...fixtureEvent(1),
    payload: {
      metadata: { optional: undefined },
    } as unknown as AuditEventDraft[
      "payload"
    ],
    classifications: { metadata: "internal" },
  };

  await assertRejects(
    () => auditEventDigest(invalid),
    Error,
    'payload value at "$.metadata.optional"',
  );
});

Deno.test("audit event rejects every nonfinite number in payload values", async () => {
  for (
    const value of [
      Number.NaN,
      Number.POSITIVE_INFINITY,
      Number.NEGATIVE_INFINITY,
    ]
  ) {
    const invalid: AuditEventDraft = {
      ...fixtureEvent(1),
      payload: { metadata: { values: [value] } } as unknown as AuditEventDraft[
        "payload"
      ],
      classifications: { metadata: "internal" },
    };

    await assertRejects(
      () => auditEventDigest(invalid),
      Error,
      'payload value at "$.metadata.values[0]"',
    );
  }
});

Deno.test("audit event rejects custom payload class instances", async () => {
  const invalid: AuditEventDraft = {
    ...fixtureEvent(1),
    payload: {
      metadata: new CustomPayloadValue("opaque"),
    } as unknown as AuditEventDraft["payload"],
    classifications: { metadata: "internal" },
  };

  await assertRejects(
    () => auditEventDigest(invalid),
    Error,
    'payload value at "$.metadata"',
  );
});

Deno.test("audit event rejects functions and symbol payload values", async () => {
  for (const value of [() => "not-json", Symbol("not-json")]) {
    const invalid: AuditEventDraft = {
      ...fixtureEvent(1),
      payload: { metadata: value } as unknown as AuditEventDraft["payload"],
      classifications: { metadata: "internal" },
    };

    await assertRejects(
      () => auditEventDigest(invalid),
      Error,
      'payload value at "$.metadata"',
    );
  }
});

Deno.test("audit payload supports nested arrays and plain records", async () => {
  const draft: AuditEventDraft = {
    ...fixtureEvent(1),
    payload: {
      metadata: {
        enabled: true,
        tags: ["alpha", { score: 2, note: null }],
      },
    },
    classifications: { metadata: "internal" },
  };

  const contentDigest = await auditEventDigest(draft);
  const frozen = freezeAuditEvent({
    ...draft,
    contentDigest,
    position: 1 as AuditPosition,
  });
  const persistedPayload = JSON.parse(
    JSON.stringify(frozen.payload),
  ) as Readonly<
    Record<string, unknown>
  >;

  assertEquals(frozen.payload, draft.payload);
  assertEquals(await auditEventDigest(frozen), contentDigest);
  assertEquals(
    await auditEventDigest({
      ...frozen,
      payload: persistedPayload as unknown as AuditEventDraft["payload"],
    }),
    contentDigest,
  );
  assertEquals(persistedPayload, frozen.payload);
});
