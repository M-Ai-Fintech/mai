import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { Dialog } from "./Dialog";

describe("Dialog", () => {
  it("connects its title and description to native dialog semantics", () => {
    const html = renderToStaticMarkup(createElement(
      Dialog,
      { description: "Read before continuing", onOpenChange: vi.fn(), open: false, title: "Confirm" },
      "Details",
    ));
    expect(html).toContain("aria-labelledby=");
    expect(html).toContain("aria-describedby=");
    expect(html).toContain('aria-label="Close dialog"');
  });
});
