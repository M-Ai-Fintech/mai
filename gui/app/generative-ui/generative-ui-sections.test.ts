import { describe, expect, it } from "vitest";

import {
  createPresetSchemas,
  type SchemaTranslator,
} from "./generative-schema-model";
import {
  createPresetButtonModels,
  synthesizeButtonLabelKey,
} from "./generative-ui-section-model";

const t: SchemaTranslator = (key) => key;

describe("generative UI sections", () => {
  it("selects synthesize button labels from state", () => {
    expect(synthesizeButtonLabelKey(false)).toBe("generativeUi.synthesizeBtn");
    expect(synthesizeButtonLabelKey(true)).toBe("generativeUi.synthesizing");
  });

  it("creates preset button models in display order", () => {
    const choices = createPresetSchemas(t);
    const buttons = createPresetButtonModels(choices);

    expect(buttons.map((button) => button.labelKey)).toEqual([
      "generativeUi.presetValuation",
      "generativeUi.presetCompliance",
    ]);
    expect(buttons[0]?.schema).toBe(choices.valuation);
  });
});
