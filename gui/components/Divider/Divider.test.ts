import { createElement } from "react"; import { renderToStaticMarkup } from "react-dom/server"; import { describe, expect, it } from "vitest"; import { Divider } from "./Divider";
describe("Divider", () => { it("uses a semantic rule", () => expect(renderToStaticMarkup(createElement(Divider))).toContain("<hr")); });
