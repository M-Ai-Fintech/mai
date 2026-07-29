import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { classNames } from "./classNames";
import { InternalIcon } from "./icons";
import { useComponentId } from "./ids";

function IdSpecimen({ suppliedId }: { suppliedId?: string }) {
  return createElement("span", { id: useComponentId(suppliedId, "specimen") });
}

describe("component internals", () => {
  it("joins only enabled class names", () => {
    expect(classNames("base", false, undefined, "active")).toBe("base active");
  });

  it("renders internal icons as decorative", () => {
    const html = renderToStaticMarkup(createElement(InternalIcon, { name: "check" }));
    expect(html).toContain('aria-hidden="true"');
    expect(html).toContain('focusable="false"');
  });

  it("preserves supplied IDs and generates stable prefixed IDs", () => {
    expect(renderToStaticMarkup(createElement(IdSpecimen, { suppliedId: "known" })))
      .toContain('id="known"');
    expect(renderToStaticMarkup(createElement(IdSpecimen))).toContain('id="specimen-');
  });
});
