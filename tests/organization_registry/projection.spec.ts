import { assert, assertEquals } from "@std/assert";
import {
  defaultRegistryFieldMask,
  InMemoryOrganizationRegistryRepository,
  InMemoryRegistryCommandReceiptStore,
  OrganizationRegistryService,
  projectRegistryAggregate,
} from "../../src/organization_registry/v1.ts";
import {
  action,
  field,
  type FieldClassification,
  type FieldMask,
} from "../../src/platform/authz/v1.ts";
import {
  contextFor,
  FixedRegistryClock,
  keyFor,
  SequentialRegistryIdFactory,
} from "./support.ts";

Deno.test("registry default projection omits restricted person fields", async () => {
  const person = await createPerson();
  const projected = projectRegistryAggregate(person, defaultRegistryFieldMask);

  assertEquals(projected, {
    id: person.id,
    version: 1,
    state: "active",
    givenName: "Ada",
    familyName: "Northstar",
    createdAt: "2026-08-01T12:00:00.000Z",
    updatedAt: "2026-08-01T12:00:00.000Z",
  });
  assert(!("email" in projected));
  assert(!("nationalId" in projected));
  assertEquals(JSON.stringify(projected).includes("restricted-123"), false);
  assert(Object.isFrozen(projected));
});

Deno.test("registry projection requires both field inclusion and approved classification", async () => {
  const person = await createPerson();
  const mismatchedMask = maskFor([
    ["email", "public"],
    ["given_name", "external_shareable"],
  ]);
  const projected = projectRegistryAggregate(person, mismatchedMask, [
    action("read"),
  ]);

  assertEquals(projected, {
    givenName: "Ada",
    allowedActions: [action("read")],
  });
  assert(!("email" in projected));
});

Deno.test("registry projection can include restricted fields only with explicit restricted approval", async () => {
  const person = await createPerson();
  const approvedMask = maskFor([
    ["email", "restricted"],
    ["national_id", "restricted"],
  ]);
  const projected = projectRegistryAggregate(person, approvedMask);

  assertEquals(projected, {
    email: "ada@example.test",
    nationalId: "restricted-123",
  });
});

Deno.test("registry projection honors explicit omission over a broad approval", async () => {
  const person = await createPerson();
  const mask = maskFor([["email", "restricted"]]);
  const projected = projectRegistryAggregate(person, {
    ...mask,
    omit: [field("email")],
  });

  assertEquals(projected, {});
});

function createPerson() {
  const service = new OrganizationRegistryService(
    new InMemoryOrganizationRegistryRepository(),
    new FixedRegistryClock(),
    new SequentialRegistryIdFactory(),
    new InMemoryRegistryCommandReceiptStore(),
  );
  return service.createPerson({
    context: contextFor(),
    idempotencyKey: keyFor("projection-person"),
    givenName: "Ada",
    familyName: "Northstar",
    email: "ada@example.test",
    nationalId: "restricted-123",
  });
}

function maskFor(
  fields: readonly (readonly [string, FieldClassification])[],
): FieldMask {
  return {
    include: fields.map(([name]) => field(name)),
    omit: [],
    redact: [],
    approvedClassifications: fields.map(([name, classification]) => ({
      name: field(name),
      classification,
    })),
  };
}
