import { describe, expect, it } from "vitest";

import {
  buildAdvisorOptions,
  entityRoleValues,
  firstDropdownValue,
  humanizeEntityValue,
  isEntityRole,
  statusVariant,
} from "./entity-options";

function expectHumanizedEntityValue(): void {
  expect(humanizeEntityValue("financial_services")).toBe(
    "Financial Services",
  );
}

function expectNormalizedDropdownValues(): void {
  expect(firstDropdownValue(["buyer"])).toBe("buyer");
  expect(firstDropdownValue([])).toBe("");
  expect(entityRoleValues("seller")).toEqual(["seller"]);
}

function expectSupportedEntityRoles(): void {
  expect(isEntityRole("target")).toBe(true);
  expect(isEntityRole("all")).toBe(false);
}

function expectStatusVariants(): void {
  expect(statusVariant("approved")).toBe("dark");
  expect(statusVariant("pending")).toBe("orange");
  expect(statusVariant("rejected")).toBe("outline");
}

function expectAdvisorOptions(): void {
  expect(
    buildAdvisorOptions([
      {
        id: "advisor-1",
        displayName: "Ana Silva",
        email: "ana@example.com",
        role: "Partner",
        firmName: "MAI Partners",
        avatarUrl: null,
        active: true,
      },
    ]),
  ).toEqual([
    { value: "", label: "Unassigned" },
    { value: "advisor-1", label: "Ana Silva — Partner" },
  ]);
}

describe("entity options", () => {
  it("humanizes stored entity values for labels", expectHumanizedEntityValue);
  it(
    "normalizes dropdown values from single and multi-select controls",
    expectNormalizedDropdownValues,
  );
  it(
    "guards supported entity roles before filter state changes",
    expectSupportedEntityRoles,
  );
  it("maps status values to badge variants", expectStatusVariants);
  it(
    "builds advisor options with the unassigned sentinel first",
    expectAdvisorOptions,
  );
});
