import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Surface } from "./Surface";
describe("Surface", () => {
  it("renders semantic surface content", () =>
    expect(
      renderToStaticMarkup(
        createElement(Surface, { tone: "restricted" }, "Restricted"),
      ),
    ).toContain("Restricted"));
});
