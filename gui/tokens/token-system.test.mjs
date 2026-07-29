import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import {
  generateCss,
  generateTypescript,
  readTokenSource,
  validateTokenSource,
} from "../scripts/generate-design-tokens.mjs";
import {
  hardCodedViolations,
  measureContrastPairs,
} from "../scripts/verify-design-tokens.mjs";

const source = await readTokenSource();

describe("MAI Figma token source", () => {
  it("validates the live schema, aliases, canonical values, and one mode", () => {
    expect(validateTokenSource(structuredClone(source))).toBeTruthy();
    expect(source.liveCounts).toEqual({
      collections: 5,
      variables: 193,
      modes: 5,
      textStyles: 14,
      paintStyles: 17,
      effectStyles: 2,
    });
  });

  it("rejects alias cycles", () => {
    const invalid = structuredClone(source);
    const aliases = invalid.variables.filter((variable) =>
      Object.values(variable.valuesByMode)[0].source.kind === "alias"
    );
    const first = aliases[0];
    const second = aliases[1];
    const firstMode = Object.values(first.valuesByMode)[0];
    const secondMode = Object.values(second.valuesByMode)[0];
    firstMode.source = { kind: "alias", target: { id: second.id, name: second.name } };
    secondMode.source = { kind: "alias", target: { id: first.id, name: first.name } };
    expect(() => validateTokenSource(invalid)).toThrow("Alias cycle");
  });

  it("rejects a multi-hop alias with a missing target", () => {
    const invalid = structuredClone(source);
    const aliases = invalid.variables.filter((variable) =>
      Object.values(variable.valuesByMode)[0].source.kind === "alias"
    );
    const first = aliases[0];
    const second = aliases[1];
    const firstMode = Object.values(first.valuesByMode)[0];
    const secondMode = Object.values(second.valuesByMode)[0];
    firstMode.source = { kind: "alias", target: { id: second.id, name: second.name } };
    secondMode.source = { kind: "alias", target: { id: "missing-variable", name: null } };
    expect(() => validateTokenSource(invalid)).toThrow("Missing alias target missing-variable");
  });

  it("rejects inconsistent stored alias-chain metadata", () => {
    const invalid = structuredClone(source);
    const alias = invalid.variables.find((variable) =>
      Object.values(variable.valuesByMode)[0].source.kind === "alias"
    );
    const mode = Object.values(alias.valuesByMode)[0];
    mode.aliasChain = [{ id: alias.id, name: alias.name }];
    expect(() => validateTokenSource(invalid)).toThrow("Stored aliasChain metadata differs");
  });

  it("rejects incompatible aliases", () => {
    const invalid = structuredClone(source);
    const alias = invalid.variables.find((variable) =>
      variable.resolvedType === "COLOR" &&
      Object.values(variable.valuesByMode)[0].source.kind === "alias"
    );
    const float = invalid.variables.find((variable) => variable.resolvedType === "FLOAT");
    Object.values(alias.valuesByMode)[0].source.target.id = float.id;
    expect(() => validateTokenSource(invalid)).toThrow("Alias type");
  });
});

describe("generated token contracts", () => {
  it("generates deterministic responsive and reduced-motion CSS", () => {
    const first = generateCss(source);
    expect(generateCss(source)).toBe(first);
    expect(first).toContain("@media (min-width: 768px)");
    expect(first).toContain("@media (min-width: 1280px)");
    expect(first).toContain("@media (prefers-reduced-motion: reduce)");
    expect(first).toContain("--mai-motion-standard: 0ms");
  });

  it("generates the typed path and breakpoint API deterministically", () => {
    const generated = generateTypescript(source);
    expect(generateTypescript(source)).toBe(generated);
    expect(generated).toContain('"tablet": 768');
    expect(generated).toContain("export type PublicTokenPath");
    expect(generated).toContain("function tokenVar");
  });

  it("keeps generated files synchronized", async () => {
    const css = await readFile(resolve("tokens/generated/tokens.css"), "utf8");
    const typescript = await readFile(resolve("tokens/generated/tokens.ts"), "utf8");
    expect(css).toBe(generateCss(source));
    expect(typescript).toBe(generateTypescript(source));
  });
});

describe("token policy verification", () => {
  it("rejects bounded raw visual and internal Core values", () => {
    const fixture = ".bad { color: #fff; padding: 16px; transition: all 200ms; color: var(--mai-core-color-ink-black); }";
    expect(hardCodedViolations("fixture.css", fixture)).toHaveLength(4);
  });

  it("measures every approved contrast pair at or above its threshold", () => {
    const measurements = measureContrastPairs(source);
    expect(measurements).toHaveLength(21);
    expect(measurements.every(({ ratio, minimumRatio }) => ratio >= minimumRatio)).toBe(true);
  });
});
