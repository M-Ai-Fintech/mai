import { describe, expect, it } from "vitest";

import {
  approvedComponentFamilies,
  componentViolations,
} from "../scripts/verify-components.mjs";

describe("MAI-97 component boundary", () => {
  it("pins the exact approved public family inventory", () => {
    expect(approvedComponentFamilies).toHaveLength(21);
    expect(approvedComponentFamilies).toContain("Dialog");
    expect(approvedComponentFamilies).toContain("Drawer");
    expect(approvedComponentFamilies).not.toContain("AppShell");
  });

  it("contains no unapproved family, incomplete triad, hard-coded value, or MAI-98 path", () => {
    expect(componentViolations()).toEqual([]);
  });
});
