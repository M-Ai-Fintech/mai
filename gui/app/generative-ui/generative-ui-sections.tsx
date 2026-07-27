import { Button } from "@/components/Button/Button";
import { Card } from "@/components/Card/Card";
import {
  GenerativeUIRenderer,
  type GenerativeUISchema,
} from "@/lib/generative-ui-engine";
import {
  createPresetButtonModels,
  type PresetButtonModel,
  type SchemaChoices,
  synthesizeButtonLabelKey,
} from "./generative-ui-section-model";
import type { SchemaTranslator } from "./generative-schema-model";

export { createPresetButtonModels, synthesizeButtonLabelKey };

export function GenerativeHeader({ t }: { t: SchemaTranslator }) {
  return (
    <header className="mb-8">
      <div className="flex items-center gap-2 mb-1">
        <span className="w-2 h-2 rounded-full bg-signal-orange" />
        <p className="text-xs font-bold text-slate-gray uppercase tracking-wider">
          {t("generativeUi.headerBadge")}
        </p>
      </div>
      <h1 className="text-3xl font-medium text-ink-black tracking-tight">
        {t("generativeUi.title")}
      </h1>
      <p className="text-slate-gray mt-1 text-sm">
        {t("generativeUi.description")}
      </p>
    </header>
  );
}

function PromptForm(props: {
  prompt: string;
  synthesizing: boolean;
  t: SchemaTranslator;
  onPromptChange: (value: string) => void;
  onSubmit: (event: React.FormEvent) => void;
}) {
  return (
    <form onSubmit={props.onSubmit} className="flex gap-3">
      <PromptInput {...props} />
      <SynthesizeButton synthesizing={props.synthesizing} t={props.t} />
    </form>
  );
}

function PromptInput(props: {
  prompt: string;
  t: SchemaTranslator;
  onPromptChange: (value: string) => void;
}) {
  return (
    <input
      type="text"
      value={props.prompt}
      onChange={(event) => props.onPromptChange(event.target.value)}
      placeholder={props.t("generativeUi.placeholder")}
      className="flex-1 bg-canvas-cream border border-dust-taupe rounded-full px-4 py-3 text-sm text-ink-black focus:outline-none focus:ring-2 focus:ring-ink-black"
    />
  );
}

function SynthesizeButton(props: {
  synthesizing: boolean;
  t: SchemaTranslator;
}) {
  return (
    <Button type="submit" variant="primary" disabled={props.synthesizing}>
      {props.t(synthesizeButtonLabelKey(props.synthesizing))}
    </Button>
  );
}

function PresetButtons(props: {
  choices: SchemaChoices;
  t: SchemaTranslator;
  onSelect: (schema: GenerativeUISchema) => void;
}) {
  return (
    <div className="flex items-center gap-2 mt-4 pt-3 border-t border-dust-taupe/40 text-xs">
      <PresetLabel t={props.t} />
      <PresetButtonList {...props} />
    </div>
  );
}

function PresetLabel({ t }: { t: SchemaTranslator }) {
  return (
    <span className="font-bold text-slate-gray uppercase">
      {t("generativeUi.presets")}
    </span>
  );
}

function PresetButtonList(props: {
  choices: SchemaChoices;
  t: SchemaTranslator;
  onSelect: (schema: GenerativeUISchema) => void;
}) {
  const buttons = createPresetButtonModels(props.choices);

  return buttons.map((button) => (
    <PresetButton
      key={button.labelKey}
      button={button}
      t={props.t}
      onSelect={props.onSelect}
    />
  ));
}

function PresetButton(props: {
  button: PresetButtonModel;
  t: SchemaTranslator;
  onSelect: (schema: GenerativeUISchema) => void;
}) {
  return (
    <button
      onClick={() => props.onSelect(props.button.schema)}
      className="px-3 py-1 bg-canvas-cream rounded-full border border-dust-taupe hover:bg-lifted-cream font-medium cursor-pointer"
    >
      {props.t(props.button.labelKey)}
    </button>
  );
}

export function GenerativePromptPanel(props: {
  prompt: string;
  synthesizing: boolean;
  choices: SchemaChoices;
  t: SchemaTranslator;
  onPromptChange: (value: string) => void;
  onSubmit: (event: React.FormEvent) => void;
  onSelect: (schema: GenerativeUISchema) => void;
}) {
  return (
    <Card variant="default" padding="md" className="mb-8">
      <PromptForm {...props} />
      <PresetButtons
        choices={props.choices}
        t={props.t}
        onSelect={props.onSelect}
      />
    </Card>
  );
}

function SchemaPreview(props: {
  schema: GenerativeUISchema;
  t: SchemaTranslator;
  onAnchor: () => void;
}) {
  return (
    <div className="lg:col-span-2">
      <SchemaPreviewHeading t={props.t} onAnchor={props.onAnchor} />
      <Card variant="default" padding="lg">
        <GenerativeUIRenderer schema={props.schema} />
      </Card>
    </div>
  );
}

function SchemaPreviewHeading(props: {
  t: SchemaTranslator;
  onAnchor: () => void;
}) {
  return (
    <div className="flex justify-between items-center mb-4">
      <h2 className="text-lg font-semibold text-ink-black">
        {props.t("generativeUi.previewTitle")}
      </h2>
      <Button variant="consent" size="sm" onClick={props.onAnchor}>
        {props.t("generativeUi.anchorBtn")}
      </Button>
    </div>
  );
}

function SchemaJson(
  props: { schema: GenerativeUISchema; t: SchemaTranslator },
) {
  return (
    <div>
      <h2 className="text-lg font-semibold text-ink-black mb-4">
        {props.t("generativeUi.schemaTitle")}
      </h2>
      <Card
        variant="dark"
        padding="md"
        className="font-mono text-xs text-canvas-cream h-[400px] overflow-y-auto"
      >
        <pre>{JSON.stringify(props.schema, null, 2)}</pre>
      </Card>
    </div>
  );
}

export function GenerativePreview(props: {
  schema: GenerativeUISchema;
  t: SchemaTranslator;
  onAnchor: () => void;
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <SchemaPreview {...props} />
      <SchemaJson schema={props.schema} t={props.t} />
    </div>
  );
}
