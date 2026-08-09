import { assertEquals, assertThrows } from "@std/assert";
import {
  createNormalizedIntegrationFailure,
  normalizeIntegrationFailure,
} from "../../src/integrations/failures.ts";

Deno.test("provider HTTP statuses normalize to safe retry semantics", () => {
  const authentication = normalizeIntegrationFailure({
    provider: "papermark",
    operation: "list_documents",
    error: { status: 401, message: "Bearer do-not-echo" },
  });
  const denied = normalizeIntegrationFailure({
    provider: "papermark",
    operation: "list_documents",
    error: { status: 403 },
  });
  const rateLimited = normalizeIntegrationFailure({
    provider: "papermark",
    operation: "list_documents",
    error: { status: 429 },
  });
  const unavailable = normalizeIntegrationFailure({
    provider: "papermark",
    operation: "list_documents",
    error: { status: 503 },
  });

  assertEquals(authentication.code, "AUTHENTICATION_FAILED");
  assertEquals(authentication.retryable, false);
  assertEquals(denied.code, "AUTHORIZATION_DENIED");
  assertEquals(rateLimited.code, "RATE_LIMITED");
  assertEquals(rateLimited.retryable, true);
  assertEquals(unavailable.code, "UNAVAILABLE");
  assertEquals(unavailable.retryable, true);
});

Deno.test("transport and malformed response errors are normalized without raw messages", () => {
  const timeout = normalizeIntegrationFailure({
    provider: "papermark",
    operation: "download_document",
    error: new Error("request timed out with token=do-not-echo"),
  });
  const malformed = normalizeIntegrationFailure({
    provider: "papermark",
    operation: "discover_capabilities",
    error: new Error("invalid JSON body: private-secret"),
  });

  assertEquals(timeout.code, "TIMEOUT");
  assertEquals(timeout.retryable, true);
  assertEquals(malformed.code, "MALFORMED_RESPONSE");
  assertEquals(timeout.message.includes("do-not-echo"), false);
  assertEquals(malformed.message.includes("private-secret"), false);
  assertEquals(JSON.stringify(timeout).includes("token"), false);
});

Deno.test("explicit normalized failures preserve only safe metadata", () => {
  const failure = createNormalizedIntegrationFailure({
    provider: "papermark",
    operation: "list_documents",
    code: "NOT_CONFIGURED",
    occurredAt: new Date("2026-08-08T12:00:00.000Z"),
    providerRequestId: "request-123",
  });

  assertEquals(failure, {
    code: "NOT_CONFIGURED",
    provider: "papermark",
    operation: "list_documents",
    message: "The provider is not configured.",
    retryable: false,
    occurredAt: new Date("2026-08-08T12:00:00.000Z"),
    providerRequestId: "request-123",
  });
  assertEquals(Object.isFrozen(failure), true);
});

Deno.test("unknown provider failures remain generic and do not retain response bodies", () => {
  const secret = "raw-provider-secret";
  const failure = normalizeIntegrationFailure({
    provider: "papermark",
    operation: "upload_document",
    error: { body: secret, message: `provider response ${secret}` },
  });

  assertEquals(failure.code, "UNKNOWN");
  assertEquals(JSON.stringify(failure).includes(secret), false);
});

Deno.test("invalid normalized failure metadata is rejected", () => {
  assertThrows(
    () =>
      createNormalizedIntegrationFailure({
        provider: "papermark",
        operation: " ",
        code: "UNKNOWN",
        occurredAt: new Date("2026-08-08T12:00:00.000Z"),
      }),
    Error,
    "operation",
  );
  assertThrows(
    () =>
      createNormalizedIntegrationFailure({
        provider: "papermark",
        operation: "list_documents",
        code: "UNKNOWN",
        occurredAt: new Date("2026-08-08T12:00:00.000Z"),
        providerRequestId: "request with spaces",
      }),
    Error,
    "request ID",
  );
});

Deno.test("normalized failure timestamps are defensive copies", () => {
  const failure = createNormalizedIntegrationFailure({
    provider: "fixture",
    operation: "list_documents",
    code: "UNKNOWN",
    occurredAt: new Date("2026-08-08T12:00:00.000Z"),
  });
  failure.occurredAt.setFullYear(2099);
  assertEquals(
    failure.occurredAt.toISOString(),
    "2026-08-08T12:00:00.000Z",
  );
});
