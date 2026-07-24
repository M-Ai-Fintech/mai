"use client";

import { useState } from "react";
import { Card } from "@/components/Card/Card";
import { Button } from "@/components/Button/Button";
import { Badge } from "@/components/Badge/Badge";
import {
  GenerativeUIRenderer,
  GenerativeUISchema,
} from "@/lib/generative-ui-engine";
import { useTranslation } from "@/lib/i18n/I18nProvider";

export default function GenerativeUIPage() {
  const { t } = useTranslation();
  const [prompt, setPrompt] = useState("");
  const [isSynthesizing, setIsSynthesizing] = useState(false);

  // Preset schemas synthesized dynamically based on design guidelines & Dealroom.net benchmark
  const presetSchemas: Record<string, GenerativeUISchema> = {
    valuation: {
      title: t("generativeUi.presetData.valuation.title"),
      description: t("generativeUi.presetData.valuation.description"),
      root: {
        id: "root-grid",
        type: "Grid",
        props: { cols: 2 },
        children: [
          {
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
              {
                id: "s1",
                type: "Stat",
                props: {
                  label: t("generativeUi.presetData.valuation.stat1Label"),
                  value: t("generativeUi.presetData.valuation.stat1Value"),
                  subtext: t("generativeUi.presetData.valuation.stat1Sub"),
                },
              },
            ],
          },
          {
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
              {
                id: "s2",
                type: "Stat",
                props: {
                  label: t("generativeUi.presetData.valuation.stat2Label"),
                  value: t("generativeUi.presetData.valuation.stat2Value"),
                  subtext: t("generativeUi.presetData.valuation.stat2Sub"),
                },
              },
            ],
          },
        ],
      },
    },
    dueDiligence: {
      title: t("generativeUi.presetData.dueDiligence.title"),
      description: t("generativeUi.presetData.dueDiligence.description"),
      root: {
        id: "root-card",
        type: "Card",
        props: { variant: "default" },
        children: [
          {
            id: "b-dd",
            type: "Badge",
            props: { variant: "dark" },
            children: t("generativeUi.presetData.dueDiligence.badge"),
          },
          {
            id: "t1",
            type: "Text",
            props: {
              className: "text-base font-semibold text-ink-black mt-2 mb-1",
            },
            children: t("generativeUi.presetData.dueDiligence.text1"),
          },
          {
            id: "t2",
            type: "Text",
            props: { className: "text-xs text-slate-gray mb-4" },
            children: t("generativeUi.presetData.dueDiligence.text2"),
          },
          {
            id: "btn-act",
            type: "Button",
            props: { variant: "consent" },
            children: t("generativeUi.presetData.dueDiligence.btn"),
          },
        ],
      },
    },
  };

  const [activeSchema, setActiveSchema] = useState<GenerativeUISchema>(
    presetSchemas.valuation,
  );

  const handleSynthesize = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    setIsSynthesizing(true);

    setTimeout(() => {
      // Synthesize a custom dynamic UI schema for the prompt
      const synthesized: GenerativeUISchema = {
        title: t("generativeUi.presetData.synthesized.title", { prompt }),
        description: t("generativeUi.presetData.synthesized.description"),
        root: {
          id: "synth-root",
          type: "Grid",
          props: { cols: 2 },
          children: [
            {
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
                {
                  id: "ss1",
                  type: "Stat",
                  props: {
                    label: t("generativeUi.presetData.synthesized.stat1Label"),
                    value: t("generativeUi.presetData.synthesized.stat1Value"),
                    subtext: t("generativeUi.presetData.synthesized.stat1Sub", {
                      prompt,
                    }),
                  },
                },
              ],
            },
            {
              id: "synth-card-2",
              type: "Card",
              props: { variant: "default" },
              children: [
                {
                  id: "sb2",
                  type: "Badge",
                  props: { variant: "dark" },
                  children: t("generativeUi.presetData.synthesized.badge2"),
                },
                {
                  id: "st2",
                  type: "Text",
                  props: { className: "text-xs text-slate-gray my-2" },
                  children: t("generativeUi.presetData.synthesized.text2"),
                },
                {
                  id: "sbtn",
                  type: "Button",
                  props: { variant: "primary", size: "sm" },
                  children: t("generativeUi.presetData.synthesized.btn"),
                },
              ],
            },
          ],
        },
      };

      setActiveSchema(synthesized);
      setIsSynthesizing(false);
    }, 600);
  };

  const handleAnchorToDashboard = () => {
    // Persist to localStorage as dynamic widget anchor for MAI-60
    const saved = JSON.parse(
      localStorage.getItem("mai_anchored_widgets") || "[]",
    );
    saved.push(activeSchema);
    localStorage.setItem("mai_anchored_widgets", JSON.stringify(saved));
    alert(t("generativeUi.successAlert"));
  };

  return (
    <div className="p-8 max-w-7xl mx-auto text-left">
      <header className="mb-8">
        <div className="flex items-center gap-2 mb-1">
          <span className="w-2 h-2 rounded-full bg-signal-orange"></span>
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

      {/* Prompt Bar Input */}
      <Card variant="default" padding="md" className="mb-8">
        <form onSubmit={handleSynthesize} className="flex gap-3">
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={t("generativeUi.placeholder")}
            className="flex-1 bg-canvas-cream border border-dust-taupe rounded-full px-4 py-3 text-sm text-ink-black focus:outline-none focus:ring-2 focus:ring-ink-black"
          />
          <Button type="submit" variant="primary" disabled={isSynthesizing}>
            {isSynthesizing
              ? t("generativeUi.synthesizing")
              : t("generativeUi.synthesizeBtn")}
          </Button>
        </form>

        <div className="flex items-center gap-2 mt-4 pt-3 border-t border-dust-taupe/40 text-xs">
          <span className="font-bold text-slate-gray uppercase">
            {t("generativeUi.presets")}
          </span>
          <button
            onClick={() => setActiveSchema(presetSchemas.valuation)}
            className="px-3 py-1 bg-canvas-cream rounded-full border border-dust-taupe hover:bg-lifted-cream font-medium cursor-pointer"
          >
            {t("generativeUi.presetValuation")}
          </button>
          <button
            onClick={() => setActiveSchema(presetSchemas.dueDiligence)}
            className="px-3 py-1 bg-canvas-cream rounded-full border border-dust-taupe hover:bg-lifted-cream font-medium cursor-pointer"
          >
            {t("generativeUi.presetCompliance")}
          </button>
        </div>
      </Card>

      {/* Live Preview Area & JSON Inspection */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-ink-black">
              {t("generativeUi.previewTitle")}
            </h2>
            <Button
              variant="consent"
              size="sm"
              onClick={handleAnchorToDashboard}
            >
              {t("generativeUi.anchorBtn")}
            </Button>
          </div>

          <Card variant="default" padding="lg">
            <GenerativeUIRenderer schema={activeSchema} />
          </Card>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-ink-black mb-4">
            {t("generativeUi.schemaTitle")}
          </h2>
          <Card
            variant="dark"
            padding="md"
            className="font-mono text-xs text-canvas-cream h-[400px] overflow-y-auto"
          >
            <pre>{JSON.stringify(activeSchema, null, 2)}</pre>
          </Card>
        </div>
      </div>
    </div>
  );
}
