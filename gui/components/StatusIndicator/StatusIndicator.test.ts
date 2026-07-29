import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { StatusIndicator } from "./StatusIndicator";
describe("StatusIndicator", () => {
  it("includes textual status alongside decorative icon", () => {
    const html = renderToStaticMarkup(
      createElement(StatusIndicator, { role: "restricted" }, "Restricted"),
    );
    expect(html).toContain("Restricted");
    expect(html).toContain('aria-hidden="true"');
  });
});
