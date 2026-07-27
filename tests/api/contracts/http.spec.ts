import {
  jsonError,
  jsonListSuccess,
  jsonSuccess,
  parseBooleanQuery,
  parsePaginationQuery,
} from "../../../src/api/contracts.ts";
import { assertEquals } from "@std/assert";

Deno.test("parsePaginationQuery applies defaults, trims filters, and caps page size", () => {
  const params = new URLSearchParams({
    page: "2",
    pageSize: "500",
    search: "  Horizon  ",
    sort: "updatedAt:desc",
  });

  assertEquals(parsePaginationQuery(params), {
    page: 2,
    pageSize: 100,
    search: "Horizon",
    sort: "updatedAt:desc",
  });
  assertEquals(
    parsePaginationQuery(new URLSearchParams("page=0&pageSize=invalid")),
    { page: 1, pageSize: 10 },
  );
});

Deno.test("parseBooleanQuery accepts only explicit boolean strings", () => {
  assertEquals(parseBooleanQuery("true"), true);
  assertEquals(parseBooleanQuery("false"), false);
  assertEquals(parseBooleanQuery("1"), undefined);
  assertEquals(parseBooleanQuery(null), undefined);
});

Deno.test(
  "JSON response helpers use stable success, list, and error envelopes",
  verifyJsonResponseEnvelopes,
);

async function verifyJsonResponseEnvelopes(): Promise<void> {
  await verifySuccessEnvelope();
  await verifyListEnvelope();
  await verifyErrorEnvelope();
}

async function verifySuccessEnvelope(): Promise<void> {
  const success = jsonSuccess({ id: "deal-id" }, { status: 201 });
  assertEquals(success.status, 201);
  assertEquals(
    success.headers.get("content-type"),
    "application/json; charset=utf-8",
  );
  assertEquals(await success.json(), { data: { id: "deal-id" } });
}

async function verifyListEnvelope(): Promise<void> {
  const list = jsonListSuccess([{ id: "deal-id" }], {
    page: 1,
    pageSize: 10,
    total: 1,
    totalPages: 1,
  });
  assertEquals(await list.json(), {
    data: [{ id: "deal-id" }],
    meta: { page: 1, pageSize: 10, total: 1, totalPages: 1 },
  });
}

async function verifyErrorEnvelope(): Promise<void> {
  const error = jsonError(
    409,
    "ENTITY_TAX_ID_CONFLICT",
    "An entity with this tax ID already exists",
    { taxId: ["Already in use"] },
  );
  assertEquals(error.status, 409);
  assertEquals(await error.json(), {
    error: {
      code: "ENTITY_TAX_ID_CONFLICT",
      message: "An entity with this tax ID already exists",
      fieldErrors: { taxId: ["Already in use"] },
    },
  });
}
