import { MVP_SEED_IDS, MvpStore } from "../../../src/api/mvp_store.ts";
import { EntityRole } from "../../../src/api/contracts.ts";
import { assert, assertEquals } from "@std/assert";
import { expectStoreError, newEntity } from "../support/store.ts";

Deno.test("MvpStore entity CRUD is deterministic, paginated, filtered, and defensively copied", () => {
  const firstStore = new MvpStore();
  const secondStore = new MvpStore();
  const first = firstStore.createEntity(newEntity());
  const repeated = secondStore.createEntity(newEntity());

  assertEquals(first.id, repeated.id);
  assertEquals(first.createdAt, repeated.createdAt);
  assertEquals(first.version, 1);

  const filtered = firstStore.listEntities({
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
  assertEquals(filtered.data[0].id, first.id);

  filtered.data[0].legalName = "mutated outside store";
  assertEquals(
    firstStore.getEntity(first.id).legalName,
    "Cobalt Software Ltda.",
  );

  const updated = firstStore.updateEntity(first.id, {
    legalName: "Cobalt Software S.A.",
    version: first.version,
  });
  assertEquals(updated.legalName, "Cobalt Software S.A.");
  assertEquals(updated.version, 2);

  expectStoreError(
    () => firstStore.updateEntity(first.id, { sector: "fintech", version: 1 }),
    "RESOURCE_VERSION_CONFLICT",
    409,
  );

  const archived = firstStore.archiveEntity(first.id, updated.version);
  assert(archived.archivedAt);
  assertEquals(
    firstStore.listEntities().data.some((entity) => entity.id === first.id),
    false,
  );
  assertEquals(
    firstStore.listEntities({ includeArchived: true }).data.some((entity) =>
      entity.id === first.id
    ),
    true,
  );
});

Deno.test("MvpStore normalizes tax IDs and blocks archive for entities in active deals", () => {
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
});
