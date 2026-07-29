import { createElement } from "react"; import { renderToStaticMarkup } from "react-dom/server"; import { describe, expect, it } from "vitest"; import { TextField } from "./TextField";
describe("TextField", () => { it("retains native input semantics", () => expect(renderToStaticMarkup(createElement(TextField, { "aria-label": "Name" }))).toContain("<input")); });
