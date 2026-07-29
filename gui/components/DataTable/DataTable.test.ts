import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { DataTable } from "./DataTable";
describe("DataTable", () => {
  it("keeps loading state inside semantic table markup", () => {
    const html = renderToStaticMarkup(
      createElement(
        DataTable,
        { columnCount: 2, state: "loading" },
        createElement("thead", null, createElement("tr", null, createElement("th", null, "Company"))),
      ),
    );
    expect(html).toContain("<table");
    expect(html).toContain("<tbody>");
    expect(html).toContain("<thead>");
    expect(html).toContain('aria-busy="true"');
  });
});
