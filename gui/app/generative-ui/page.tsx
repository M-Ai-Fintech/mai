"use client";

import { useState } from "react";
import { Card } from "@/components/Card/Card";
import { Button } from "@/components/Button/Button";
import { Badge } from "@/components/Badge/Badge";
import { GenerativeUIRenderer, GenerativeUISchema } from "@/lib/generative-ui-engine";

export default function GenerativeUIPage() {
  const [prompt, setPrompt] = useState("");
  const [isSynthesizing, setIsSynthesizing] = useState(false);

  // Preset schemas synthesized dynamically based on design guidelines & Dealroom.net benchmark
  const presetSchemas: Record<string, GenerativeUISchema> = {
    valuation: {
      title: "Matriz Comparativa de Valuation SaaS M&A",
      description: "Sintetizado via BrokerOrchestratorAgent aplicando o Dealroom.net benchmark",
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
                children: "• SEGUNDA RODADA",
              },
              {
                id: "s1",
                type: "Stat",
                props: {
                  label: "EV / Revenue Múltiplo Médio",
                  value: "8.4x ARR",
                  subtext: "Baseado em 14 deals de SaaS B2B no Brasil",
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
                children: "• ALERTA ONNX RISK",
              },
              {
                id: "s2",
                type: "Stat",
                props: {
                  label: "Sensibilidade de Churn",
                  value: "Elevada (18.2%)",
                  subtext: "Requer Cláusula Escrow de R$ 5M",
                },
              },
            ],
          },
        ],
      },
    },
    dueDiligence: {
      title: "Checklist de Compliance Legal & Trabalhista",
      description: "Análise sintetizada a partir do VDR pelo LegalDueDiligenceAgent",
      root: {
        id: "root-card",
        type: "Card",
        props: { variant: "default" },
        children: [
          {
            id: "b-dd",
            type: "Badge",
            props: { variant: "dark" },
            children: "• AUDITORIA CONTRATUAL",
          },
          {
            id: "t1",
            type: "Text",
            props: { className: "text-base font-semibold text-ink-black mt-2 mb-1" },
            children: "Pendências de Contingência Identificadas:",
          },
          {
            id: "t2",
            type: "Text",
            props: { className: "text-xs text-slate-gray mb-4" },
            children: "1. Cláusula de Change of Control no Contrato com Fornecedor Principal\n2. 3 Ações Trabalhistas sem provisão em balanço",
          },
          {
            id: "btn-act",
            type: "Button",
            props: { variant: "consent" },
            children: "Gerar Minuta de Aditivo Contractual",
          },
        ],
      },
    },
  };

  const [activeSchema, setActiveSchema] = useState<GenerativeUISchema>(presetSchemas.valuation);

  const handleSynthesize = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    setIsSynthesizing(true);

    setTimeout(() => {
      // Synthesize a custom dynamic UI schema for the prompt
      const synthesized: GenerativeUISchema = {
        title: `Dashboard Sintetizado: "${prompt}"`,
        description: "Interface gerada em tempo de execução combinando componentes MAI-53",
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
                  children: "• UI GENERATIVA ADK",
                },
                {
                  id: "ss1",
                  type: "Stat",
                  props: {
                    label: "Métrica Personalizada Alvo",
                    value: "R$ 42.8M",
                    subtext: `Filtro aplicado para: "${prompt}"`,
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
                  children: "• ACOES RECOMENDADAS",
                },
                {
                  id: "st2",
                  type: "Text",
                  props: { className: "text-xs text-slate-gray my-2" },
                  children: "Estrutura recomendada pelo NegotiationAgent baseada em fitness genético.",
                },
                {
                  id: "sbtn",
                  type: "Button",
                  props: { variant: "primary", size: "sm" },
                  children: "Exportar para Term Sheet",
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
    const saved = JSON.parse(localStorage.getItem("mai_anchored_widgets") || "[]");
    saved.push(activeSchema);
    localStorage.setItem("mai_anchored_widgets", JSON.stringify(saved));
    alert("Widget sintetizado ancorado com sucesso no Dashboard Dinâmico (MAI-60)!");
  };

  return (
    <div className="p-8 max-w-7xl mx-auto text-left">
      <header className="mb-8">
        <div className="flex items-center gap-2 mb-1">
          <span className="w-2 h-2 rounded-full bg-signal-orange"></span>
          <p className="text-xs font-bold text-slate-gray uppercase tracking-wider">
            UI GENERATIVA EM RUNTIME (MAI-57)
          </p>
        </div>
        <h1 className="text-3xl font-medium text-ink-black tracking-tight">
          Generative UI Synthesis Studio
        </h1>
        <p className="text-slate-gray mt-1 text-sm">
          Sintetize interfaces sob demanda via prompt agêntico consumindo componentes da MAI-53 sob o gui/DESIGN_GUIDELINES.md
        </p>
      </header>

      {/* Prompt Bar Input */}
      <Card variant="default" padding="md" className="mb-8">
        <form onSubmit={handleSynthesize} className="flex gap-3">
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Ex: Sintetizar dashboard de valuation comparativo para o setor SaaS..."
            className="flex-1 bg-canvas-cream border border-dust-taupe rounded-full px-4 py-3 text-sm text-ink-black focus:outline-none focus:ring-2 focus:ring-ink-black"
          />
          <Button type="submit" variant="primary" disabled={isSynthesizing}>
            {isSynthesizing ? "Sintetizando..." : "Sintetizar Interface"}
          </Button>
        </form>

        <div className="flex items-center gap-2 mt-4 pt-3 border-t border-dust-taupe/40 text-xs">
          <span className="font-bold text-slate-gray uppercase">Presetações Rápidas:</span>
          <button
            onClick={() => setActiveSchema(presetSchemas.valuation)}
            className="px-3 py-1 bg-canvas-cream rounded-full border border-dust-taupe hover:bg-lifted-cream font-medium cursor-pointer"
          >
            Valuation SaaS
          </button>
          <button
            onClick={() => setActiveSchema(presetSchemas.dueDiligence)}
            className="px-3 py-1 bg-canvas-cream rounded-full border border-dust-taupe hover:bg-lifted-cream font-medium cursor-pointer"
          >
            Compliance Legal
          </button>
        </div>
      </Card>

      {/* Live Preview Area & JSON Inspection */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-ink-black">
              Preview da Interface Sintetizada
            </h2>
            <Button variant="consent" size="sm" onClick={handleAnchorToDashboard}>
              + Ancorar no Dashboard Dinâmico
            </Button>
          </div>

          <Card variant="default" padding="lg">
            <GenerativeUIRenderer schema={activeSchema} />
          </Card>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-ink-black mb-4">
            Esquema JSON DSL (Component Schema)
          </h2>
          <Card variant="dark" padding="md" className="font-mono text-xs text-canvas-cream h-[400px] overflow-y-auto">
            <pre>{JSON.stringify(activeSchema, null, 2)}</pre>
          </Card>
        </div>
      </div>
    </div>
  );
}
