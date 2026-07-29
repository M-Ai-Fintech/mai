import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Button } from "./Button";
describe("Button", () => {
  it("marks loading buttons busy and disabled", () => {
    const html = renderToStaticMarkup(
      createElement(Button, { loading: true }, "Save"),
    );
    expect(html).toContain('aria-busy="true"');
    expect(html).toContain('disabled=""');
  });
});
