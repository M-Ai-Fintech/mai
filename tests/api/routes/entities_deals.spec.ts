import { assert, assertEquals } from "@std/assert";
import { MVP_SEED_IDS, MvpStore } from "../../../src/api/mvp_store.ts";
import { entityInput, route } from "../support/route.ts";

Deno.test("MVP entity routes expose CRUD, filters, validation, and stable errors", async () => {
  const store = new MvpStore();
  const createdResponse = await route(
    store,
    "/api/entities",
    "POST",
    entityInput,
  );
  assertEquals(createdResponse.status, 201);
  const created = (await createdResponse.json()).data;
  assertEquals(created.version, 1);

  const list = await (await route(
    store,
    "/api/entities?role=target&search=cobalt&page=1&pageSize=1",
  )).json();
  assertEquals(list.meta, { page: 1, pageSize: 1, total: 1, totalPages: 1 });
  assertEquals(list.data[0].id, created.id);

  const updatedResponse = await route(
    store,
    `/api/entities/${created.id}`,
    "PATCH",
    {
      legalName: "Cobalt Software S.A.",
      version: 1,
    },
  );
  assertEquals((await updatedResponse.json()).data.version, 2);

  const conflict = await route(store, `/api/entities/${created.id}`, "PATCH", {
    sector: "fintech",
    version: 1,
  });
  assertEquals(conflict.status, 409);
  assertEquals((await conflict.json()).error.code, "RESOURCE_VERSION_CONFLICT");

  const archived = await route(
    store,
    `/api/entities/${created.id}?version=2`,
    "DELETE",
  );
  assert((await archived.json()).data.archivedAt);

  const invalid = await route(store, "/api/entities", "POST", {
    ...entityInput,
    countryCode: "Brazil",
  });
  assertEquals(invalid.status, 422);
  assertEquals((await invalid.json()).error.code, "VALIDATION_ERROR");

  const disallowed = await route(store, "/api/entities", "PUT", {});
  assertEquals(disallowed.status, 405);
  assertEquals(disallowed.headers.get("allow"), "GET, POST");
});

Deno.test("MVP deal routes expose CRUD, filters, transitions, and archive state", async () => {
  const store = new MvpStore();
  const createResponse = await route(store, "/api/deals", "POST", {
    code: "CB-2026",
    title: "Project Cobalt",
    dealType: "buy_side",
    targetId: MVP_SEED_IDS.entityAurora,
    valuationRange: {
      min: { amountMinor: "42000000000", currency: "USD" },
      max: { amountMinor: "89000000000", currency: "USD" },
    },
    leadAdvisorId: MVP_SEED_IDS.advisorAna,
    financialStructure: { cashPercent: 70 },
  });
  assertEquals(createResponse.status, 201);
  const created = (await createResponse.json()).data;
  assertEquals(created.currentPhase, "sourcing");
  assertEquals(created.status, "active");
  assertEquals(created.version, 1);

  const list = await (await route(
    store,
    "/api/deals?status=active&phase=sourcing&search=cobalt&pageSize=1",
  )).json();
  assertEquals(list.meta.total, 1);
  assertEquals(list.data[0].id, created.id);

  const patched = await route(store, `/api/deals/${created.id}`, "PATCH", {
    title: "Project Cobalt Updated",
    version: 1,
  });
  assertEquals((await patched.json()).data.version, 2);

  const transitioned = await route(
    store,
    `/api/deals/${created.id}/phase-transitions`,
    "POST",
    { toPhase: "due_diligence", comment: "VDR opened", version: 2 },
  );
  const transitionedDeal = (await transitioned.json()).data;
  assertEquals(transitionedDeal.currentPhase, "due_diligence");
  assertEquals(transitionedDeal.phaseHistory.at(-1).comment, "VDR opened");
  assertEquals(transitionedDeal.version, 3);

  const invalidTransition = await route(
    store,
    `/api/deals/${created.id}/phase-transitions`,
    "POST",
    { toPhase: "closing", comment: "Skip ahead", version: 3 },
  );
  assertEquals(invalidTransition.status, 422);
  assertEquals(
    (await invalidTransition.json()).error.code,
    "DEAL_PHASE_TRANSITION_INVALID",
  );

  const archived = await route(
    store,
    `/api/deals/${created.id}?version=3`,
    "DELETE",
  );
  const archivedDeal = (await archived.json()).data;
  assertEquals(archivedDeal.status, "archived");
  assertEquals(archivedDeal.version, 4);

  const invalidRange = await route(store, "/api/deals", "POST", {
    code: "BAD-1",
    title: "Invalid range",
    dealType: "buy_side",
    targetId: MVP_SEED_IDS.entityAurora,
    valuationRange: {
      min: { amountMinor: "900", currency: "USD" },
      max: { amountMinor: "100", currency: "USD" },
    },
    leadAdvisorId: null,
    financialStructure: null,
  });
  assertEquals(invalidRange.status, 422);
  assertEquals((await invalidRange.json()).error.code, "VALIDATION_ERROR");
});

Deno.test("MVP team routes paginate members and replace deal-scoped assignments", async () => {
  const store = new MvpStore();
  const team =
    await (await route(store, "/api/team-members?search=ana&pageSize=1"))
      .json();
  assertEquals(team.meta.total, 1);
  assertEquals(team.data[0].id, MVP_SEED_IDS.advisorAna);

  const replaced = await route(
    store,
    `/api/deals/${MVP_SEED_IDS.dealAtlas}/team-assignments`,
    "PUT",
    {
      version: 1,
      assignments: [{
        teamMemberId: MVP_SEED_IDS.advisorBruno,
        assignmentRole: "legal_due_diligence",
        side: "target",
        isLead: true,
      }],
    },
  );
  assertEquals(replaced.headers.get("x-resource-version"), "2");
  const assignment = (await replaced.json()).data[0];
  assertEquals(assignment.teamMember.displayName, "Bruno Lima");
  assertEquals(assignment.side, "target");
});
