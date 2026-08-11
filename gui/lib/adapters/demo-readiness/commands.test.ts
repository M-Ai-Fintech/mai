import { afterEach, describe, expect, it, vi } from "vitest";
import { executeDemoReadiness } from "./commands";

afterEach(() => vi.unstubAllGlobals());

describe("demo readiness human command", () => {
  it("sends identity scope and idempotency to the registered execute route", async () => {
    const requests: Request[] = [];
    vi.stubGlobal(
      "fetch",
      async (input: RequestInfo | URL, init?: RequestInit) => {
        const request = new Request(input, init);
        requests.push(request);
        return Response.json({
          data: {
            datasetId: "serra-azul-synthetic-sell-side",
            datasetDigest: "f".repeat(64),
            auditEventId: "audit_demo-readiness-ffffffff",
            labels: {
              synthetic: true,
              customerData: false,
              provider: "managed_local",
              persistence: "postgres_context_records",
            },
            authority: {
              agentDecisionRejected: true,
              humanDecisionRecordId: "decision_record_demo-readiness",
            },
            artifact: {
              deliverableId: "deliverable_investor-dossier",
              versionId: "delivver_investor-dossier-v1",
              sourceSnapshotId: "snapshot_investor-dossier-v1",
              sourceChecksums: ["a".repeat(64)],
            },
          },
          meta: { correlationId: "cor_demo-command", freshness: "current" },
        });
      },
    );

    const result = await executeDemoReadiness({
      idempotencyKey: "idem_demo-human-command",
      headers: {
        Authorization: "Bearer session_demo",
        "X-Deal-Id": "deal_serra-azul",
      },
    });

    expect(result.authority.agentDecisionRejected).toBe(true);
    expect(requests).toHaveLength(1);
    expect(requests[0].method).toBe("POST");
    expect(requests[0].url).toContain("/commands/demo-readiness/execute");
    expect(requests[0].headers.get("Idempotency-Key")).toBe(
      "idem_demo-human-command",
    );
    expect(requests[0].headers.get("Authorization")).toBe(
      "Bearer session_demo",
    );
    expect(requests[0].headers.get("X-Deal-Id")).toBe("deal_serra-azul");
  });
});
