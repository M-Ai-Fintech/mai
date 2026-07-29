import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { InlineNotice } from "./InlineNotice";
describe("InlineNotice", () => {
  it("reserves assertive announcements for critical notices", () => {
    const html = renderToStaticMarkup(
      createElement(InlineNotice, { role: "critical", title: "Critical" }),
    );
    expect(html).toContain('aria-live="assertive"');
  });
});
