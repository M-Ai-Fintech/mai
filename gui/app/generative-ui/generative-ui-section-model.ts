import type { GenerativeUISchema } from "@/lib/generative-ui-engine";

export interface SchemaChoices {
  valuation: GenerativeUISchema;
  dueDiligence: GenerativeUISchema;
}

export interface PresetButtonModel {
  labelKey: string;
  schema: GenerativeUISchema;
}

export function synthesizeButtonLabelKey(synthesizing: boolean): string {
  return synthesizing
    ? "generativeUi.synthesizing"
    : "generativeUi.synthesizeBtn";
}

export function createPresetButtonModels(
  choices: SchemaChoices,
): PresetButtonModel[] {
  return [
    { labelKey: "generativeUi.presetValuation", schema: choices.valuation },
    { labelKey: "generativeUi.presetCompliance", schema: choices.dueDiligence },
  ];
}
