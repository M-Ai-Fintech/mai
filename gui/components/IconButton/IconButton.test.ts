import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { IconButton } from "./IconButton";
describe("IconButton", () => {
  it("exposes its required accessible name", () =>
    expect(
      renderToStaticMarkup(createElement(IconButton, { label: "Close" }, "×")),
    ).toContain('aria-label="Close"'));
});
