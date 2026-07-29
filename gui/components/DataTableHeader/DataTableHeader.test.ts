import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { DataTableHeader } from "./DataTableHeader";
describe("DataTableHeader", () => {
  it("uses a button and aria-sort for sortable headers", () => {
    const html = renderToStaticMarkup(createElement(DataTableHeader, { sortDirection: "ascending", onSort: () => {} }, "Company"));
    expect(html).toContain("<button");
    expect(html).toContain('aria-sort="ascending"');
  });
});
