import { assert, assertEquals } from "@std/assert";
import { MVP_SEED_IDS, MvpStore } from "../../../src/api/mvp_store.ts";
import { entityInput, route } from "../support/route.ts";

interface CreatedResource {
  id: string;
  version: number;
}

Deno.test(
  "MVP entity routes expose CRUD, filters, validation, and stable errors",
  verifyEntityRoutes,
);

Deno.test(
  "MVP deal routes expose CRUD, filters, transitions, and archive state",
  verifyDealRoutes,
);

Deno.test(
  "MVP team routes paginate members and replace deal-scoped assignments",
  verifyTeamRoutes,
);

async function verifyEntityRoutes(): Promise<void> {
  const store = new MvpStore();
  const created = await createEntity(store);
  await assertEntityList(store, created.id);
  await updateAndArchiveEntity(store, created);
  await assertEntityRouteErrors(store);
}

async function createEntity(store: MvpStore): Promise<CreatedResource> {
  const response = await route(store, "/api/entities", "POST", entityInput);
  assertEquals(response.status, 201);
  const created = (await response.json() as { data: CreatedResource }).data;
  assertEquals(created.version, 1);
  return created;
}

async function assertEntityList(
  store: MvpStore,
  entityId: string,
): Promise<void> {
  const list = await (await route(
    store,
    "/api/entities?role=target&search=cobalt&page=1&pageSize=1",
  )).json();
  assertEquals(list.meta, { page: 1, pageSize: 1, total: 1, totalPages: 1 });
  assertEquals(list.data[0].id, entityId);
}

async function updateAndArchiveEntity(
  store: MvpStore,
  created: CreatedResource,
): Promise<void> {
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
  await assertStaleEntityUpdate(store, created.id);
  await assertArchivedEntity(store, created.id);
}

async function assertStaleEntityUpdate(
  store: MvpStore,
  entityId: string,
): Promise<void> {
  const conflict = await route(store, `/api/entities/${entityId}`, "PATCH", {
    sector: "fintech",
    version: 1,
  });
  assertEquals(conflict.status, 409);
  assertEquals((await conflict.json()).error.code, "RESOURCE_VERSION_CONFLICT");
}

async function assertArchivedEntity(
  store: MvpStore,
  entityId: string,
): Promise<void> {
  const archived = await route(
    store,
    `/api/entities/${entityId}?version=2`,
    "DELETE",
  );
  assert((await archived.json()).data.archivedAt);
}

async function assertEntityRouteErrors(store: MvpStore): Promise<void> {
  const invalid = await route(store, "/api/entities", "POST", {
    ...entityInput,
    countryCode: "Brazil",
  });
  assertEquals(invalid.status, 422);
  assertEquals((await invalid.json()).error.code, "VALIDATION_ERROR");

  const disallowed = await route(store, "/api/entities", "PUT", {});
  assertEquals(disallowed.status, 405);
  assertEquals(disallowed.headers.get("allow"), "GET, POST");
}

async function verifyDealRoutes(): Promise<void> {
  const store = new MvpStore();
  const created = await createDeal(store);
  await assertDealListAndUpdate(store, created.id);
  await transitionAndArchiveDeal(store, created.id);
  await assertInvalidDealRange(store);
}

async function createDeal(store: MvpStore): Promise<CreatedResource> {
  const response = await route(store, "/api/deals", "POST", {
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
  assertEquals(response.status, 201);
  const created = (await response.json()).data;
  assertEquals(created.currentPhase, "sourcing");
  assertEquals(created.status, "active");
  assertEquals(created.version, 1);
  return created;
}

async function assertDealListAndUpdate(
  store: MvpStore,
  dealId: string,
): Promise<void> {
  const list = await (await route(
    store,
    "/api/deals?status=active&phase=sourcing&search=cobalt&pageSize=1",
  )).json();
  assertEquals(list.meta.total, 1);
  assertEquals(list.data[0].id, dealId);
  const patched = await route(store, `/api/deals/${dealId}`, "PATCH", {
    title: "Project Cobalt Updated",
    version: 1,
  });
  assertEquals((await patched.json()).data.version, 2);
}

async function transitionAndArchiveDeal(
  store: MvpStore,
  dealId: string,
): Promise<void> {
  const transitionedDeal = await transitionDeal(store, dealId);
  assertEquals(transitionedDeal.currentPhase, "due_diligence");
  const latestPhase = transitionedDeal.phaseHistory.at(-1);
  assert(latestPhase);
  assertEquals(latestPhase.comment, "VDR opened");
  assertEquals(transitionedDeal.version, 3);
  await assertInvalidTransition(store, dealId);
  const archived = await route(
    store,
    `/api/deals/${dealId}?version=3`,
    "DELETE",
  );
  const archivedDeal = (await archived.json()).data;
  assertEquals(archivedDeal.status, "archived");
  assertEquals(archivedDeal.version, 4);
}

async function transitionDeal(store: MvpStore, dealId: string): Promise<{
  currentPhase: string;
  phaseHistory: Array<{ comment: string }>;
  version: number;
}> {
  const transitioned = await route(
    store,
    `/api/deals/${dealId}/phase-transitions`,
    "POST",
    { toPhase: "due_diligence", comment: "VDR opened", version: 2 },
  );
  return (await transitioned.json()).data;
}

async function assertInvalidTransition(
  store: MvpStore,
  dealId: string,
): Promise<void> {
  const invalidTransition = await route(
    store,
    `/api/deals/${dealId}/phase-transitions`,
    "POST",
    { toPhase: "closing", comment: "Skip ahead", version: 3 },
  );
  assertEquals(invalidTransition.status, 422);
  assertEquals(
    (await invalidTransition.json()).error.code,
    "DEAL_PHASE_TRANSITION_INVALID",
  );
}

async function assertInvalidDealRange(store: MvpStore): Promise<void> {
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
}

async function verifyTeamRoutes(): Promise<void> {
  const store = new MvpStore();
  await assertPaginatedTeam(store);
  await assertReplacedAssignments(store);
}

async function assertPaginatedTeam(store: MvpStore): Promise<void> {
  const response = await route(
    store,
    "/api/team-members?search=ana&pageSize=1",
  );
  const team = await response.json();
  assertEquals(team.meta.total, 1);
  assertEquals(team.data[0].id, MVP_SEED_IDS.advisorAna);
}

async function assertReplacedAssignments(store: MvpStore): Promise<void> {
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
}
