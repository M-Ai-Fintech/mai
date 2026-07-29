import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Select } from "./Select";
describe("Select", () => {
  it("retains native select semantics", () =>
    expect(
      renderToStaticMarkup(
        createElement(
          Select,
          { "aria-label": "Stage" },
          createElement("option", null, "Review"),
        ),
      ),
    ).toContain("<select"));
});
