import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { DataTableRow } from "./DataTableRow";
describe("DataTableRow", () => {
  it("communicates unavailable state to assistive technology", () => {
    const html = renderToStaticMarkup(createElement(DataTableRow, { state: "unavailable" }, createElement("td", null, "Unavailable")));
    expect(html).toContain('aria-label="Unavailable"');
    expect(html).toContain("Unavailable");
  });
});
