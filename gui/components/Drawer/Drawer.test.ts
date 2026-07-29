import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { Drawer } from "./Drawer";

describe("Drawer", () => {
  it("exposes labelled modal semantics and a named close control", () => {
    const html = renderToStaticMarkup(createElement(
      Drawer,
      { description: "Context", onOpenChange: vi.fn(), open: false, title: "Evidence" },
      "Details",
    ));
    expect(html).toContain("aria-labelledby=");
    expect(html).toContain("aria-describedby=");
    expect(html).toContain('aria-label="Close drawer"');
  });
});
