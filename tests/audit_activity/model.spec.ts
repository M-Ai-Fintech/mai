import { assertEquals, assertRejects } from "@std/assert";
import {
  auditEventDigest,
  type AuditEventDraft,
} from "../../src/audit_activity/v1.ts";
import { fixtureEvent } from "./support.ts";

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
