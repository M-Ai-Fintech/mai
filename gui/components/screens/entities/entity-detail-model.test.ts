import { describe, expect, it } from "vitest";

import type { EntityDetail as EntityDetailData } from "../../../lib/api-client";

import {
  archiveReturnQuery,
  buildBreadcrumbs,
} from "./entity-detail-route-model";

const detailEntity: EntityDetailData = {
  id: "00000000-0000-4000-8000-000000000010",
  legalName: "Aurora Capital",
  taxId: "98.765.432/0001-10",
  sector: "financial_services",
  countryCode: "BR",
  roles: ["buyer"],
  contactEmail: "ma@aurora.example",
  kybStatus: "approved",
  regulatoryClearanceRequired: false,
  primaryAdvisorId: null,
  archivedAt: null,
  createdAt: "2026-07-19T12:00:00Z",
  updatedAt: "2026-07-20T12:00:00Z",
  version: 3,
};

describe("entity detail model", () => {
  it("builds breadcrumbs only after the entity is loaded", () => {
    expect(buildBreadcrumbs(null)).toBeNull();
    expect(buildBreadcrumbs(detailEntity)).toEqual([
      { label: "Home", href: "/" },
      { label: "Entities", href: "/entities" },
      { label: "Aurora Capital" },
    ]);
  });

  it("builds the archive handoff query from the loaded entity", () => {
    expect(archiveReturnQuery(detailEntity)).toBe(
      "role=buyer&country=BR&notice=archived&entity=Aurora+Capital",
    );
  });
});
