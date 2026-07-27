"use client";

import { useMemo, useState } from "react";

import { useTranslation } from "@/lib/i18n/I18nProvider";
import type { GenerativeUISchema } from "@/lib/generative-ui-engine";
import {
  GenerativeHeader,
  GenerativePreview,
  GenerativePromptPanel,
} from "./generative-ui-sections";
import {
  appendAnchoredSchema,
  createPresetSchemas,
  createSynthesizedSchema,
  type SchemaTranslator,
} from "./generative-schema-model";

interface GenerativeUIState {
  choices: ReturnType<typeof createPresetSchemas>;
  prompt: string;
  synthesizing: boolean;
  schema: GenerativeUISchema;
  setPrompt: (prompt: string) => void;
  setSchema: (schema: GenerativeUISchema) => void;
  synthesize: (event: React.FormEvent) => void;
  anchor: () => void;
}

interface SchemaSelectionState {
  choices: ReturnType<typeof createPresetSchemas>;
  schema: GenerativeUISchema;
  setSchema: (schema: GenerativeUISchema) => void;
}

interface PromptSynthesisState {
  prompt: string;
  synthesizing: boolean;
  setPrompt: (prompt: string) => void;
  synthesize: (event: React.FormEvent) => void;
}

function scheduleSynthesis(
  prompt: string,
  t: SchemaTranslator,
  onComplete: (schema: GenerativeUISchema) => void,
): void {
  setTimeout(() => onComplete(createSynthesizedSchema(prompt, t)), 600);
}

function useGenerativeUIState(t: SchemaTranslator): GenerativeUIState {
  const schemaState = useSchemaSelectionState(t);
  const promptState = usePromptSynthesisState(t, schemaState.setSchema);
  const anchor = createAnchorHandler(t, schemaState.schema);

  return { ...schemaState, ...promptState, anchor };
}

function useSchemaSelectionState(t: SchemaTranslator): SchemaSelectionState {
  const choices = useMemo(() => createPresetSchemas(t), [t]);
  const [schema, setSchema] = useState(choices.valuation);

  return { choices, schema, setSchema };
}

function usePromptSynthesisState(
  t: SchemaTranslator,
  setSchema: (schema: GenerativeUISchema) => void,
): PromptSynthesisState {
  const [prompt, setPrompt] = useState("");
  const [synthesizing, setSynthesizing] = useState(false);
  const synthesize = createSynthesizeHandler(
    prompt,
    t,
    setSchema,
    setSynthesizing,
  );

  return { prompt, synthesizing, setPrompt, synthesize };
}

function createSynthesizeHandler(
  prompt: string,
  t: SchemaTranslator,
  setSchema: (schema: GenerativeUISchema) => void,
  setSynthesizing: (synthesizing: boolean) => void,
): (event: React.FormEvent) => void {
  return (event) => {
    event.preventDefault();
    if (!prompt.trim()) return;
    setSynthesizing(true);
    scheduleSynthesis(prompt, t, (nextSchema) => {
      setSchema(nextSchema);
      setSynthesizing(false);
    });
  };
}

function createAnchorHandler(
  t: SchemaTranslator,
  schema: GenerativeUISchema,
): () => void {
  return () => {
    const saved = localStorage.getItem("mai_anchored_widgets");
    localStorage.setItem(
      "mai_anchored_widgets",
      appendAnchoredSchema(saved, schema),
    );
    alert(t("generativeUi.successAlert"));
  };
}

export default function GenerativeUIPage() {
  const { t } = useTranslation();
  const state = useGenerativeUIState(t);

  return (
    <div className="p-8 max-w-7xl mx-auto text-left">
      <GenerativeHeader t={t} />
      <GenerativePromptPanel
        prompt={state.prompt}
        synthesizing={state.synthesizing}
        choices={state.choices}
        t={t}
        onPromptChange={state.setPrompt}
        onSubmit={state.synthesize}
        onSelect={state.setSchema}
      />
      <GenerativePreview schema={state.schema} t={t} onAnchor={state.anchor} />
    </div>
  );
}
