import { describe, expect, it } from "vitest";

import {
  EMPTY_ENTITY_FORM,
  entityArchiveSuccessNotice,
  entityToForm,
  firstEntityErrorField,
  firstFieldError,
  toEntityWrite,
  validateEntityForm,
} from "./entity-state";

const editableEntity = {
  id: "00000000-0000-4000-8000-000000000001",
  legalName: "Aurora Capital",
  taxId: "98.765.432/0001-10",
  sector: "financial_services",
  countryCode: "BR",
  roles: ["buyer"] as const,
  contactEmail: "ma@aurora.example",
  kybStatus: "approved" as const,
  regulatoryClearanceRequired: false,
  primaryAdvisorId: null,
  archivedAt: null,
  updatedAt: "2026-07-19T12:00:00Z",
  version: 1,
};

function expectRequiredEntityFields(): void {
  expect(validateEntityForm(EMPTY_ENTITY_FORM)).toEqual({
    legalName: "Corporate legal name is required.",
    taxId: "CNPJ / Tax ID is required.",
    sector: "Industry sector is required.",
    contactEmail: "Enter a valid contact email.",
  });
}

function expectNormalizedEntityWrite(): void {
  const result = toEntityWrite({
    ...EMPTY_ENTITY_FORM,
    legalName: "  Cobalt Software  ",
    taxId: " 11.222.333/0001-44 ",
    sector: " SaaS ",
    contactEmail: "deals@cobalt.example",
    roles: ["seller", "target"],
  });

  expect(result).toMatchObject({
    legalName: "Cobalt Software",
    taxId: "11.222.333/0001-44",
    sector: "SaaS",
    primaryAdvisorId: null,
    roles: ["seller", "target"],
  });
}

function expectIndependentEntityForm(): void {
  const form = entityToForm({
    ...editableEntity,
    roles: [...editableEntity.roles],
  });
  expect(form).toMatchObject({
    legalName: "Aurora Capital",
    roles: ["buyer"],
  });
  form.roles.push("institution");
  expect(editableEntity.roles).toEqual(["buyer"]);
}

function expectBackendFieldErrors(): void {
  expect(firstFieldError({ taxId: ["Tax ID already exists"], sector: [] }))
    .toEqual({
      taxId: "Tax ID already exists",
    });
}

function expectFirstInvalidEntityField(): void {
  expect(
    firstEntityErrorField({
      roles: "Choose a role",
      taxId: "Tax ID required",
    }),
  ).toBe("taxId");
  expect(firstEntityErrorField({})).toBeUndefined();
}

function expectArchiveNotice(): void {
  expect(entityArchiveSuccessNotice("Aurora Capital")).toEqual({
    title: "Entity archived",
    message: "Aurora Capital was removed from active results.",
  });
}

function registerEntityWriteTests(): void {
  it(
    "validates all required fields before submitting",
    expectRequiredEntityFields,
  );
  it(
    "normalizes a valid form to the frozen API contract",
    expectNormalizedEntityWrite,
  );
  it(
    "maps an entity to an independently editable form",
    expectIndependentEntityForm,
  );
}

function registerEntityErrorTests(): void {
  it(
    "uses backend field validation messages in the form",
    expectBackendFieldErrors,
  );
  it(
    "returns the first invalid field in visual form order",
    expectFirstInvalidEntityField,
  );
  it(
    "builds one archive handoff notice from the archived entity name",
    expectArchiveNotice,
  );
}

describe("entity CRUD state", () => {
  registerEntityWriteTests();
  registerEntityErrorTests();
});
