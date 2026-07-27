import type {
  ComponentSchemaNode,
  GenerativeUISchema,
} from "@/lib/generative-ui-engine";

export type SchemaTranslator = (
  key: string,
  variables?: Record<string, string | number>,
) => string;

function valuationMetric(t: SchemaTranslator): ComponentSchemaNode {
  return {
    id: "s1",
    type: "Stat",
    props: {
      label: t("generativeUi.presetData.valuation.stat1Label"),
      value: t("generativeUi.presetData.valuation.stat1Value"),
      subtext: t("generativeUi.presetData.valuation.stat1Sub"),
    },
  };
}

function valuationCard(t: SchemaTranslator): ComponentSchemaNode {
  return {
    id: "card-1",
    type: "Card",
    props: { variant: "default" },
    children: [
      {
        id: "b1",
        type: "Badge",
        props: { variant: "default" },
        children: t("generativeUi.presetData.valuation.badge1"),
      },
      valuationMetric(t),
    ],
  };
}

function synergyMetric(t: SchemaTranslator): ComponentSchemaNode {
  return {
    id: "s2",
    type: "Stat",
    props: {
      label: t("generativeUi.presetData.valuation.stat2Label"),
      value: t("generativeUi.presetData.valuation.stat2Value"),
      subtext: t("generativeUi.presetData.valuation.stat2Sub"),
    },
  };
}

function synergyCard(t: SchemaTranslator): ComponentSchemaNode {
  return {
    id: "card-2",
    type: "Card",
    props: { variant: "orange" },
    children: [
      {
        id: "b2",
        type: "Badge",
        props: { variant: "orange" },
        children: t("generativeUi.presetData.valuation.badge2"),
      },
      synergyMetric(t),
    ],
  };
}

function valuationSchema(t: SchemaTranslator): GenerativeUISchema {
  return {
    title: t("generativeUi.presetData.valuation.title"),
    description: t("generativeUi.presetData.valuation.description"),
    root: {
      id: "root-grid",
      type: "Grid",
      props: { cols: 2 },
      children: [valuationCard(t), synergyCard(t)],
    },
  };
}

function diligenceText(t: SchemaTranslator): ComponentSchemaNode[] {
  return [
    {
      id: "t1",
      type: "Text",
      props: { className: "text-base font-semibold text-ink-black mt-2 mb-1" },
      children: t("generativeUi.presetData.dueDiligence.text1"),
    },
    {
      id: "t2",
      type: "Text",
      props: { className: "text-xs text-slate-gray mb-4" },
      children: t("generativeUi.presetData.dueDiligence.text2"),
    },
  ];
}

function diligenceChildren(t: SchemaTranslator): ComponentSchemaNode[] {
  return [
    {
      id: "b-dd",
      type: "Badge",
      props: { variant: "dark" },
      children: t("generativeUi.presetData.dueDiligence.badge"),
    },
    ...diligenceText(t),
    {
      id: "btn-act",
      type: "Button",
      props: { variant: "consent" },
      children: t("generativeUi.presetData.dueDiligence.btn"),
    },
  ];
}

function diligenceSchema(t: SchemaTranslator): GenerativeUISchema {
  return {
    title: t("generativeUi.presetData.dueDiligence.title"),
    description: t("generativeUi.presetData.dueDiligence.description"),
    root: {
      id: "root-card",
      type: "Card",
      props: { variant: "default" },
      children: diligenceChildren(t),
    },
  };
}

export function createPresetSchemas(t: SchemaTranslator) {
  return {
    valuation: valuationSchema(t),
    dueDiligence: diligenceSchema(t),
  };
}

function synthesizedMetric(
  prompt: string,
  t: SchemaTranslator,
): ComponentSchemaNode {
  return {
    id: "ss1",
    type: "Stat",
    props: {
      label: t("generativeUi.presetData.synthesized.stat1Label"),
      value: t("generativeUi.presetData.synthesized.stat1Value"),
      subtext: t("generativeUi.presetData.synthesized.stat1Sub", { prompt }),
    },
  };
}

function synthesizedMetricCard(
  prompt: string,
  t: SchemaTranslator,
): ComponentSchemaNode {
  return {
    id: "synth-card-1",
    type: "Card",
    props: { variant: "default" },
    children: [
      {
        id: "sb1",
        type: "Badge",
        props: { variant: "default" },
        children: t("generativeUi.presetData.synthesized.badge1"),
      },
      synthesizedMetric(prompt, t),
    ],
  };
}

function synthesizedActionCard(t: SchemaTranslator): ComponentSchemaNode {
  return {
    id: "synth-card-2",
    type: "Card",
    props: { variant: "default" },
    children: synthesizedActionChildren(t),
  };
}

function synthesizedActionChildren(t: SchemaTranslator): ComponentSchemaNode[] {
  return [
    synthesizedActionBadge(t),
    synthesizedActionText(t),
    synthesizedActionButton(t),
  ];
}

function synthesizedActionBadge(t: SchemaTranslator): ComponentSchemaNode {
  return {
    id: "sb2",
    type: "Badge",
    props: { variant: "dark" },
    children: t("generativeUi.presetData.synthesized.badge2"),
  };
}

function synthesizedActionText(t: SchemaTranslator): ComponentSchemaNode {
  return {
    id: "st2",
    type: "Text",
    props: { className: "text-xs text-slate-gray my-2" },
    children: t("generativeUi.presetData.synthesized.text2"),
  };
}

function synthesizedActionButton(t: SchemaTranslator): ComponentSchemaNode {
  return {
    id: "sbtn",
    type: "Button",
    props: { variant: "primary", size: "sm" },
    children: t("generativeUi.presetData.synthesized.btn"),
  };
}

export function createSynthesizedSchema(
  prompt: string,
  t: SchemaTranslator,
): GenerativeUISchema {
  return {
    title: t("generativeUi.presetData.synthesized.title", { prompt }),
    description: t("generativeUi.presetData.synthesized.description"),
    root: {
      id: "synth-root",
      type: "Grid",
      props: { cols: 2 },
      children: [
        synthesizedMetricCard(prompt, t),
        synthesizedActionCard(t),
      ],
    },
  };
}

function isGenerativeSchema(value: unknown): value is GenerativeUISchema {
  if (!value || typeof value !== "object") return false;
  return "title" in value && typeof value.title === "string" &&
    "root" in value && typeof value.root === "object" && value.root !== null;
}

export function appendAnchoredSchema(
  serialized: string | null,
  schema: GenerativeUISchema,
): string {
  let parsed: unknown = [];
  try {
    parsed = serialized ? JSON.parse(serialized) : [];
  } catch {
    parsed = [];
  }
  const schemas = Array.isArray(parsed)
    ? parsed.filter(isGenerativeSchema)
    : [];
  return JSON.stringify([...schemas, schema]);
}
