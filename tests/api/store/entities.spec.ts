import { MVP_SEED_IDS, MvpStore } from "../../../src/api/mvp_store.ts";
import { EntityRole } from "../../../src/api/contracts.ts";
import { assert, assertEquals } from "@std/assert";
import { expectStoreError, newEntity } from "../support/store.ts";

Deno.test(
  "MvpStore entity CRUD is deterministic, paginated, filtered, and defensively copied",
  verifyEntityCrud,
);

Deno.test(
  "MvpStore normalizes tax IDs and blocks archive for entities in active deals",
  verifyEntityConflicts,
);

function verifyEntityCrud(): void {
  const firstStore = new MvpStore();
  const secondStore = new MvpStore();
  const first = firstStore.createEntity(newEntity());
  const repeated = secondStore.createEntity(newEntity());
  assertDeterministicEntity(first, repeated);
  assertFilteredEntity(firstStore, first.id);
  const updated = updateEntity(firstStore, first.id, first.version);
  assertStaleEntityUpdate(firstStore, first.id);
  assertArchivedEntity(firstStore, first.id, updated.version);
}

function assertDeterministicEntity(
  first: ReturnType<MvpStore["createEntity"]>,
  repeated: ReturnType<MvpStore["createEntity"]>,
): void {
  assertEquals(first.id, repeated.id);
  assertEquals(first.createdAt, repeated.createdAt);
  assertEquals(first.version, 1);
}

function assertFilteredEntity(store: MvpStore, entityId: string): void {
  const filtered = store.listEntities({
    role: EntityRole.Target,
    search: "cobalt",
    page: 1,
    pageSize: 1,
  });
  assertEquals(filtered.meta, {
    page: 1,
    pageSize: 1,
    total: 1,
    totalPages: 1,
  });
  assertEquals(filtered.data[0].id, entityId);
  filtered.data[0].legalName = "mutated outside store";
  assertEquals(store.getEntity(entityId).legalName, "Cobalt Software Ltda.");
}

function updateEntity(
  store: MvpStore,
  entityId: string,
  version: number,
): ReturnType<MvpStore["updateEntity"]> {
  const updated = store.updateEntity(entityId, {
    legalName: "Cobalt Software S.A.",
    version,
  });
  assertEquals(updated.legalName, "Cobalt Software S.A.");
  assertEquals(updated.version, 2);
  return updated;
}

function assertStaleEntityUpdate(store: MvpStore, entityId: string): void {
  expectStoreError(
    () => store.updateEntity(entityId, { sector: "fintech", version: 1 }),
    "RESOURCE_VERSION_CONFLICT",
    409,
  );
}

function assertArchivedEntity(
  store: MvpStore,
  entityId: string,
  version: number,
): void {
  const archived = store.archiveEntity(entityId, version);
  assert(archived.archivedAt);
  assertEquals(
    store.listEntities().data.some((entity) => entity.id === entityId),
    false,
  );
  assertEquals(
    store.listEntities({ includeArchived: true }).data.some((entity) =>
      entity.id === entityId
    ),
    true,
  );
}

function verifyEntityConflicts(): void {
  const store = new MvpStore();
  const conflict = expectStoreError(
    () => store.createEntity(newEntity({ taxId: "12345678000190" })),
    "ENTITY_TAX_ID_CONFLICT",
    409,
  );
  assertEquals(conflict.fieldErrors, { taxId: ["Tax ID must be unique"] });

  expectStoreError(
    () => store.archiveEntity(MVP_SEED_IDS.entityNexus),
    "ENTITY_HAS_ACTIVE_DEALS",
    409,
  );
}
