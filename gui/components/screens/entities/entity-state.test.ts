import { describe, expect, it } from "vitest";

import {
  EMPTY_ENTITY_FORM,
  entityToForm,
  entityArchiveSuccessNotice,
  firstEntityErrorField,
  firstFieldError,
  toEntityWrite,
  validateEntityForm,
} from "./entity-state";

describe("entity CRUD state", () => {
  it("validates all required fields before submitting", () => {
    expect(validateEntityForm(EMPTY_ENTITY_FORM)).toEqual({
      legalName: "Corporate legal name is required.",
      taxId: "CNPJ / Tax ID is required.",
      sector: "Industry sector is required.",
      contactEmail: "Enter a valid contact email.",
    });
  });

  it("normalizes a valid form to the frozen API contract", () => {
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
  });

  it("maps an entity to an independently editable form", () => {
    const roles = ["buyer"] as const;
    const form = entityToForm({
      id: "00000000-0000-4000-8000-000000000001",
      legalName: "Aurora Capital",
      taxId: "98.765.432/0001-10",
      sector: "financial_services",
      countryCode: "BR",
      roles: [...roles],
      contactEmail: "ma@aurora.example",
      kybStatus: "approved",
      regulatoryClearanceRequired: false,
      primaryAdvisorId: null,
      archivedAt: null,
      updatedAt: "2026-07-19T12:00:00Z",
      version: 1,
    });

    expect(form).toMatchObject({ legalName: "Aurora Capital", roles: ["buyer"] });
    form.roles.push("institution");
    expect(roles).toEqual(["buyer"]);
  });

  it("uses backend field validation messages in the form", () => {
    expect(firstFieldError({ taxId: ["Tax ID already exists"], sector: [] })).toEqual({
      taxId: "Tax ID already exists",
    });
  });

  it("returns the first invalid field in visual form order", () => {
    expect(firstEntityErrorField({ roles: "Choose a role", taxId: "Tax ID required" })).toBe("taxId");
    expect(firstEntityErrorField({})).toBeUndefined();
  });

  it("builds one archive handoff notice from the archived entity name", () => {
    expect(entityArchiveSuccessNotice("Aurora Capital")).toEqual({
      title: "Entity archived",
      message: "Aurora Capital was removed from active results.",
    });
  });
});
