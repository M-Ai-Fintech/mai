import { assert, assertEquals } from "@std/assert";
import { DealRepository } from "../../../src/core/db/DealRepository.ts";
import { handleLegacyRoute } from "../../../src/api/routes/legacy.ts";

function negotiateRequest(body: Record<string, unknown>): Request {
  return new Request("http://localhost/api/negotiate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const completeInput = {
  valuationMin: 80,
  valuationMax: 120,
  preferences: { cash: 0.4, equity: 0.3, earnOut: 0.2, escrow: 0.1 },
  financial: { ebitda: 5, debt: 15, interestExpense: 1 },
  maxLeverage: 4,
  minCoverage: 2.5,
  geneticConfig: { populationSize: 20, generations: 8 },
};

Deno.test("legacy negotiation API returns delegated alternatives", async () => {
  const response = await handleLegacyRoute(
    negotiateRequest(completeInput),
    {} as DealRepository,
    new Headers(),
  );

  assert(response instanceof Response);
  if (!(response instanceof Response)) return;
  const body = await response.json();
  assertEquals(response.status, 200);
  assert(Array.isArray(body));
  assert(body.length > 0);
});

Deno.test("legacy negotiation API exposes missing financial data", async () => {
  const response = await handleLegacyRoute(
    negotiateRequest({
      valuationMin: 80,
      valuationMax: 120,
      geneticConfig: { populationSize: 20, generations: 8 },
    }),
    {} as DealRepository,
    new Headers(),
  );

  assert(response instanceof Response);
  if (!(response instanceof Response)) return;
  const body = await response.json();
  assertEquals(body.status, "unavailable");
  assertEquals(body.error.code, "REQUIRED_DATA_UNAVAILABLE");
  assertEquals(body.alternatives, []);
});
