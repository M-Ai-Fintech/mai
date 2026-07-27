"use client";

import type { Dispatch, ReactNode, SetStateAction } from "react";
import {
  GaInput,
  MilpInput,
  OnnxInput,
  Translation,
} from "./engine-workbench-model";

type StateSetter<T> = Dispatch<SetStateAction<T>>;

type TextInputProps = {
  label: string;
  value: string;
  onValueChange: (value: string) => void;
};

type NumberInputProps = {
  label: string;
  value: number;
  onValueChange: (value: number) => void;
  step?: string;
};

export function OnnxRiskFields(
  { input, setInput, t }: {
    input: OnnxInput;
    setInput: StateSetter<OnnxInput>;
    t: Translation;
  },
) {
  return (
    <div className="space-y-3">
      <OnnxNameField input={input} setInput={setInput} t={t} />
      <OnnxMetricFields input={input} setInput={setInput} t={t} />
    </div>
  );
}

function OnnxNameField(
  { input, setInput, t }: {
    input: OnnxInput;
    setInput: StateSetter<OnnxInput>;
    t: Translation;
  },
) {
  return (
    <TextInput
      label={t("engines.onnx.targetCorp")}
      value={input.name}
      onValueChange={(value) => patchDraftField(setInput, "name", value)}
    />
  );
}

function OnnxMetricFields(
  { input, setInput, t }: {
    input: OnnxInput;
    setInput: StateSetter<OnnxInput>;
    t: Translation;
  },
) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <OnnxEbitdaField input={input} setInput={setInput} t={t} />
      <OnnxRevenueField input={input} setInput={setInput} t={t} />
    </div>
  );
}

function OnnxEbitdaField(
  { input, setInput, t }: {
    input: OnnxInput;
    setInput: StateSetter<OnnxInput>;
    t: Translation;
  },
) {
  return (
    <NumberInput
      label={t("engines.onnx.ebitda")}
      value={input.ebitda}
      onValueChange={(value) => patchDraftField(setInput, "ebitda", value)}
    />
  );
}

function OnnxRevenueField(
  { input, setInput, t }: {
    input: OnnxInput;
    setInput: StateSetter<OnnxInput>;
    t: Translation;
  },
) {
  return (
    <NumberInput
      label={t("engines.onnx.revenue")}
      value={input.revenue}
      onValueChange={(value) => patchDraftField(setInput, "revenue", value)}
    />
  );
}

export function MilpFields(
  { input, setInput, t }: {
    input: MilpInput;
    setInput: StateSetter<MilpInput>;
    t: Translation;
  },
) {
  return (
    <div className="space-y-3">
      <MilpBudgetField input={input} setInput={setInput} t={t} />
      <MilpRiskField input={input} setInput={setInput} t={t} />
    </div>
  );
}

function MilpBudgetField(
  { input, setInput, t }: {
    input: MilpInput;
    setInput: StateSetter<MilpInput>;
    t: Translation;
  },
) {
  return (
    <NumberInput
      label={t("engines.milp.budget")}
      value={input.budget}
      onValueChange={(value) => patchDraftField(setInput, "budget", value)}
    />
  );
}

function MilpRiskField(
  { input, setInput, t }: {
    input: MilpInput;
    setInput: StateSetter<MilpInput>;
    t: Translation;
  },
) {
  return (
    <NumberInput
      label={t("engines.milp.riskTolerance")}
      step="0.05"
      value={input.riskTolerance}
      onValueChange={(value) =>
        patchDraftField(setInput, "riskTolerance", value)}
    />
  );
}

export function GeneticFields(
  { input, setInput, t }: {
    input: GaInput;
    setInput: StateSetter<GaInput>;
    t: Translation;
  },
) {
  return (
    <div className="space-y-3">
      <ValuationRangeFields input={input} setInput={setInput} t={t} />
    </div>
  );
}

function ValuationRangeFields(
  { input, setInput, t }: {
    input: GaInput;
    setInput: StateSetter<GaInput>;
    t: Translation;
  },
) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <ValuationMinField input={input} setInput={setInput} t={t} />
      <ValuationMaxField input={input} setInput={setInput} t={t} />
    </div>
  );
}

function ValuationMinField(
  { input, setInput, t }: {
    input: GaInput;
    setInput: StateSetter<GaInput>;
    t: Translation;
  },
) {
  return (
    <NumberInput
      label={t("engines.ga.valMin")}
      value={input.valuationMin}
      onValueChange={(value) =>
        patchDraftField(setInput, "valuationMin", value)}
    />
  );
}

function ValuationMaxField(
  { input, setInput, t }: {
    input: GaInput;
    setInput: StateSetter<GaInput>;
    t: Translation;
  },
) {
  return (
    <NumberInput
      label={t("engines.ga.valMax")}
      value={input.valuationMax}
      onValueChange={(value) =>
        patchDraftField(setInput, "valuationMax", value)}
    />
  );
}

function TextInput({ label, value, onValueChange }: TextInputProps) {
  return (
    <EngineInputShell label={label}>
      <input
        type="text"
        value={value}
        onChange={(event) => onValueChange(event.target.value)}
        className={engineInputClassName}
      />
    </EngineInputShell>
  );
}

function NumberInput(props: NumberInputProps) {
  return (
    <EngineInputShell label={props.label}>
      <input
        type="number"
        step={props.step}
        value={props.value}
        onChange={(event) => props.onValueChange(Number(event.target.value))}
        className={engineInputClassName}
      />
    </EngineInputShell>
  );
}

function EngineInputShell(
  { children, label }: { children: ReactNode; label: string },
) {
  return (
    <div>
      <InputLabel label={label} />
      {children}
    </div>
  );
}

function InputLabel({ label }: { label: string }) {
  return (
    <label className="block text-xs font-bold text-slate-gray uppercase mb-1">
      {label}
    </label>
  );
}

function patchDraftField<TDraft, TKey extends keyof TDraft>(
  setDraft: StateSetter<TDraft>,
  field: TKey,
  value: TDraft[TKey],
): void {
  setDraft((current) => ({ ...current, [field]: value }));
}

const engineInputClassName =
  "w-full bg-canvas-cream border border-dust-taupe rounded-lg px-3 py-2 text-sm text-ink-black focus:outline-none focus:ring-2 focus:ring-ink-black";
