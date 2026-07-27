import { describe, expect, it } from "vitest";
import {
  dashboardInitials,
  fieldErrorsToDealDraftErrors,
  formatDashboardDate,
} from "./dashboard-model";

describe("dashboard clean-code helpers", () => {
  it("keeps advisor initials stable for repeated dashboard surfaces", () => {
    expect(dashboardInitials("Maria Alvarez Silva")).toBe("MA");
    expect(dashboardInitials("Single")).toBe("S");
  });

  it("maps API field errors to deal draft errors", () => {
    expect(fieldErrorsToDealDraftErrors({ title: ["Required"] })).toEqual({
      title: "Required",
    });
  });

  it("formats deal dates with the shared dashboard formatter", () => {
    expect(formatDashboardDate("2026-07-19T12:00:00.000Z")).toContain("2026");
  });
});
