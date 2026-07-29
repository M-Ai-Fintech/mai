import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { DataTableCell } from "./DataTableCell";
describe("DataTableCell", () => {
  it("uses a native data cell for financial content", () => {
    const html = renderToStaticMarkup(createElement(DataTableCell, { kind: "financial" }, "$0"));
    expect(html).toContain("<td");
    expect(html).toContain("$0");
  });
});
