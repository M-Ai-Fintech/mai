import { assertEquals, assertRejects } from "@std/assert";
import {
  InMemoryOrganizationRegistryRepository,
  OrganizationRegistryReadModel,
  OrganizationRegistryService,
  RegistryDuplicateIdentityError,
  RegistryIdempotencyConflictError,
  RegistryInvariantError,
  RegistryNotFoundError,
  RegistryVersionConflictError,
} from "../../src/organization_registry/v1.ts";
import {
  contextFor,
  FixedRegistryClock,
  keyFor,
  scopeFor,
  SequentialRegistryIdFactory,
} from "./support.ts";

Deno.test("registry creates versioned organization, legal entity, and person aggregates", async () => {
  const fixture = registryFixture();
  const context = contextFor();
  const organization = await fixture.service.createOrganization({
    context,
    idempotencyKey: keyFor("organization-create"),
    name: "Northstar Holdings",
  });
  const legalEntity = await fixture.service.createLegalEntity({
    context,
    idempotencyKey: keyFor("legal-create"),
    organizationId: organization.id,
    legalName: "Northstar Holdings S.A.",
    jurisdictionCode: "BR",
    registrationNumber: "12.345.678/0001-90",
  });
  const person = await fixture.service.createPerson({
    context,
    idempotencyKey: keyFor("person-create"),
    organizationId: organization.id,
    givenName: "Ada",
    familyName: "Northstar",
    email: "ada@example.test",
    nationalId: "restricted-123",
  });

  assertEquals(organization.version, 1);
  assertEquals(legalEntity.version, 1);
  assertEquals(person.version, 1);
  assertEquals(organization.state, "active");
  assertEquals(legalEntity.organizationId, organization.id);
  assertEquals(person.organizationId, organization.id);
  assertEquals(person.scope, scopeFor(context));
});

Deno.test("registry rejects invalid identity invariants and stale updates", async () => {
  const fixture = registryFixture();
  const context = contextFor();
  await assertRejects(
    () =>
      fixture.service.createOrganization({
        context,
        idempotencyKey: keyFor("invalid-organization"),
        name: "   ",
      }),
    Error,
    'organization name" received "   "',
  );
  const organization = await fixture.service.createOrganization({
    context,
    idempotencyKey: keyFor("organization"),
    name: "Northstar Holdings",
  });

  const updated = await fixture.service.updateOrganization({
    context,
    idempotencyKey: keyFor("organization-update"),
    organizationId: organization.id,
    expectedVersion: organization.version,
    patch: { name: "Northstar Holdings Group" },
  });
  assertEquals(updated.version, 2);
  await assertRejects(
    () =>
      fixture.service.updateOrganization({
        context,
        idempotencyKey: keyFor("organization-stale"),
        organizationId: organization.id,
        expectedVersion: organization.version,
        patch: { name: "Stale Name" },
      }),
    RegistryVersionConflictError,
    'organization "org_fixture-1" expected version "1" but current version is "2"',
  );
});

Deno.test("registry merge appends history, versions both aggregates, and preserves source reads", async () => {
  const fixture = registryFixture();
  const context = contextFor();
  const source = await fixture.service.createOrganization({
    context,
    idempotencyKey: keyFor("source"),
    name: "Northstar Legacy",
  });
  const target = await fixture.service.createOrganization({
    context,
    idempotencyKey: keyFor("target"),
    name: "Northstar Holdings",
  });

  const merged = await fixture.service.mergeOrganizations({
    context,
    idempotencyKey: keyFor("merge"),
    sourceId: source.id,
    targetId: target.id,
    sourceExpectedVersion: source.version,
    targetExpectedVersion: target.version,
    reason: "Duplicate registry identity",
  });
  assertEquals(merged.source.state, "merged");
  assertEquals(merged.source.version, 2);
  assertEquals(merged.target.version, 2);
  assertEquals(merged.source.mergedIntoId, target.id);
  assertEquals(merged.history.sourceId, source.id);
  assertEquals(merged.history.targetId, target.id);

  const historical = await fixture.readModel.read({
    context,
    kind: "organization",
    id: source.id,
    route: "historical",
  });
  const canonical = await fixture.readModel.read({
    context,
    kind: "organization",
    id: source.id,
    route: "canonical",
  });
  assertEquals(historical?.id, source.id);
  assertEquals(historical?.state, "merged");
  assertEquals(canonical?.id, target.id);
  assertEquals(await fixture.repository.listMergeHistory(scopeFor(context)), [
    merged.history,
  ]);
});

Deno.test("registry hides cross-tenant aggregates as protected not found", async () => {
  const fixture = registryFixture();
  const ownerContext = contextFor("tenant_northstar");
  const otherContext = contextFor("tenant_other");
  const organization = await fixture.service.createOrganization({
    context: ownerContext,
    idempotencyKey: keyFor("owner-organization"),
    name: "Northstar Holdings",
  });

  const hidden = await fixture.readModel.read({
    context: otherContext,
    kind: "organization",
    id: organization.id,
    route: "canonical",
  });
  assertEquals(hidden, undefined);
  await assertRejects(
    () =>
      fixture.service.updateOrganization({
        context: otherContext,
        idempotencyKey: keyFor("cross-tenant-update"),
        organizationId: organization.id,
        expectedVersion: organization.version,
        patch: { name: "Should not update" },
      }),
    RegistryNotFoundError,
  );
});

Deno.test("registry command replay returns the original result without creating a second aggregate", async () => {
  const fixture = registryFixture();
  const context = contextFor();
  const command = {
    context,
    idempotencyKey: keyFor("replay"),
    name: "Northstar Holdings",
  } as const;
  const first = await fixture.service.createOrganization(command);
  const replay = await fixture.service.createOrganization(command);

  assertEquals(replay, first);
  assertEquals(
    (await fixture.repository.list(scopeFor(context), "organization")).length,
    1,
  );
  await assertRejects(
    () =>
      fixture.service.createOrganization({
        ...command,
        name: "Different command payload",
      }),
    RegistryIdempotencyConflictError,
  );
});

Deno.test("registry enforces legal-entity and person reference invariants", async () => {
  const fixture = registryFixture();
  const context = contextFor();
  const organization = await fixture.service.createOrganization({
    context,
    idempotencyKey: keyFor("reference-organization"),
    name: "Northstar Holdings",
  });

  await assertRejects(
    () =>
      fixture.service.createLegalEntity({
        context,
        idempotencyKey: keyFor("invalid-jurisdiction"),
        organizationId: organization.id,
        legalName: "Northstar Holdings S.A.",
        jurisdictionCode: "Brazil",
        registrationNumber: "123",
      }),
    RegistryInvariantError,
  );
  await assertRejects(
    () =>
      fixture.service.createPerson({
        context,
        idempotencyKey: keyFor("invalid-email"),
        organizationId: organization.id,
        givenName: "Ada",
        familyName: "Northstar",
        email: "not-an-email",
      }),
    RegistryInvariantError,
  );

  const legalEntity = await fixture.service.createLegalEntity({
    context,
    idempotencyKey: keyFor("valid-legal-entity"),
    organizationId: organization.id,
    legalName: "Northstar Holdings S.A.",
    jurisdictionCode: "BR",
    registrationNumber: "123",
  });
  await assertRejects(
    () =>
      fixture.service.createLegalEntity({
        context,
        idempotencyKey: keyFor("duplicate-registration"),
        organizationId: organization.id,
        legalName: "Northstar Holdings S.A. Duplicate",
        jurisdictionCode: "BR",
        registrationNumber: "123",
      }),
    RegistryDuplicateIdentityError,
  );
  assertEquals(legalEntity.version, 1);
});

Deno.test("registry merges legal entities and people through their own versioned histories", async () => {
  const fixture = registryFixture();
  const context = contextFor();
  const organization = await fixture.service.createOrganization({
    context,
    idempotencyKey: keyFor("merge-reference-organization"),
    name: "Northstar Holdings",
  });
  const legalSource = await createLegalEntity(
    fixture.service,
    context,
    organization.id,
    "legal-source",
    "123",
  );
  const legalTarget = await createLegalEntity(
    fixture.service,
    context,
    organization.id,
    "legal-target",
    "456",
  );
  const legalMerge = await fixture.service.mergeLegalEntities({
    context,
    idempotencyKey: keyFor("merge-legal-entity"),
    sourceId: legalSource.id,
    targetId: legalTarget.id,
    sourceExpectedVersion: legalSource.version,
    targetExpectedVersion: legalTarget.version,
    reason: "Consolidated registration",
  });
  const personSource = await fixture.service.createPerson({
    context,
    idempotencyKey: keyFor("merge-person-source"),
    givenName: "Ada",
    familyName: "Legacy",
  });
  const personTarget = await fixture.service.createPerson({
    context,
    idempotencyKey: keyFor("merge-person-target"),
    givenName: "Ada",
    familyName: "Northstar",
  });
  const personMerge = await fixture.service.mergePeople({
    context,
    idempotencyKey: keyFor("merge-person"),
    sourceId: personSource.id,
    targetId: personTarget.id,
    sourceExpectedVersion: personSource.version,
    targetExpectedVersion: personTarget.version,
    reason: "Consolidated person identity",
  });

  assertEquals(legalMerge.history.kind, "legal_entity");
  assertEquals(personMerge.history.kind, "person");
  assertEquals(
    (await fixture.repository.listMergeHistory(scopeFor(context))).length,
    2,
  );
});

function createLegalEntity(
  service: OrganizationRegistryService,
  context: ReturnType<typeof contextFor>,
  organizationId: Parameters<
    OrganizationRegistryService["createLegalEntity"]
  >[0]["organizationId"],
  key: string,
  registrationNumber: string,
) {
  return service.createLegalEntity({
    context,
    idempotencyKey: keyFor(key),
    organizationId,
    legalName: `Northstar ${key}`,
    jurisdictionCode: "BR",
    registrationNumber,
  });
}

function registryFixture() {
  const repository = new InMemoryOrganizationRegistryRepository();
  const clock = new FixedRegistryClock();
  const ids = new SequentialRegistryIdFactory();
  const service = new OrganizationRegistryService(repository, clock, ids);
  const readModel = new OrganizationRegistryReadModel(repository);
  return { repository, service, readModel };
}
