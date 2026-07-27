import { describe, expect, it } from "vitest";

import {
  appendAnchoredSchema,
  createPresetSchemas,
  createSynthesizedSchema,
} from "./generative-schema-model";

const t = (key: string, variables?: Record<string, string | number>) =>
  variables?.prompt ? `${key}:${variables.prompt}` : key;

function actionNodeIds(): string[] {
  const synthesized = createSynthesizedSchema("acquirer risk", t);
  const rootChildren = "children" in synthesized.root
    ? synthesized.root.children
    : [];
  const actionCard = Array.isArray(rootChildren) ? rootChildren[1] : undefined;
  const actionChildren = actionCard && "children" in actionCard
    ? actionCard.children
    : [];
  return Array.isArray(actionChildren)
    ? actionChildren.map((node) => node.id)
    : [];
}

function expectTypedSchemas(): void {
  const presets = createPresetSchemas(t);
  const synthesized = createSynthesizedSchema("acquirer risk", t);
  expect(presets.valuation.root.type).toBe("Grid");
  expect(presets.dueDiligence.root.type).toBe("Card");
  expect(synthesized.title).toContain("acquirer risk");
  expect(actionNodeIds()).toEqual(["sb2", "st2", "sbtn"]);
}

function expectAnchoredSchemaRecovery(): void {
  const schema = createPresetSchemas(t).valuation;
  const saved = appendAnchoredSchema("{broken", schema);
  const appended = appendAnchoredSchema(saved, schema);
  expect(JSON.parse(appended)).toHaveLength(2);
}

describe("generative schema model", () => {
  it("creates typed preset and synthesized schemas", expectTypedSchemas);
  it(
    "preserves valid anchored schemas and ignores malformed storage",
    expectAnchoredSchemaRecovery,
  );
});
