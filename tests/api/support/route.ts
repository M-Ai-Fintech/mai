import { assert } from "@std/assert";
import { handleMvpRoute } from "../../../src/api/mvp_routes.ts";
import { MVP_SEED_IDS, type MvpStore } from "../../../src/api/mvp_store.ts";

const base = "http://localhost:8000";

export function request(
  path: string,
  method = "GET",
  body?: unknown,
): Request {
  return new Request(`${base}${path}`, {
    method,
    headers: body === undefined
      ? undefined
      : { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

export async function route(
  store: MvpStore,
  path: string,
  method = "GET",
  body?: unknown,
): Promise<Response> {
  const response = await handleMvpRoute(request(path, method, body), { store });
  assert(response);
  return response;
}

export const entityInput = {
  legalName: "Cobalt Software Ltda.",
  taxId: "11.222.333/0001-44",
  sector: "saas",
  countryCode: "BR",
  roles: ["target"],
  contactEmail: "deals@cobalt.example",
  kybStatus: "pending",
  regulatoryClearanceRequired: false,
  primaryAdvisorId: MVP_SEED_IDS.advisorAna,
};
