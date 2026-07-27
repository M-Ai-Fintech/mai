import { describe, expect, it } from "vitest";

import { buildUnassignedAdvisorOptions } from "./select-options";

describe("select options", () => {
  it("builds advisor names after the unassigned option", () => {
    const options = buildUnassignedAdvisorOptions([{
      id: "advisor-1",
      displayName: "Ana Silva",
      email: "ana@example.com",
      role: "Partner",
      firmName: "MAI Partners",
      avatarUrl: null,
      active: true,
    }]);

    expect(options).toEqual([
      { value: "", label: "Unassigned" },
      { value: "advisor-1", label: "Ana Silva" },
    ]);
  });
});
