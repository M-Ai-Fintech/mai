"use client";

import React, { useState, use } from "react";
import Link from "next/link";
import { ApiClient } from "@/lib/api-client";
import { Card } from "@/components/Card/Card";
import { Button } from "@/components/Button/Button";
import { Badge } from "@/components/Badge/Badge";

export default function EnginesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  const [consoleLogs, setConsoleLogs] = useState<string[]>([]);
  const [loading, setLoading] = useState<Record<string, boolean>>({
    onnx: false,
    milp: false,
    ga: false,
  });

  const [onnxInput, setOnnxInput] = useState({
    name: "Target Corp Ltda",
    sector: "SaaS / Fintech",
    ebitda: 4500000,
    revenue: 15000000,
    assets: 20000000,
    liabilities: 12000000,
    cashflow: 3200000,
    volatility: 0.12,
  });

  const [milpInput, setMilpInput] = useState({
    budget: 50,
    riskTolerance: 0.4,
  });

  const [gaInput, setGaInput] = useState({
    valuationMin: 80,
    valuationMax: 120,
    cash: 0.4,
    equity: 0.3,
    earnOut: 0.2,
    escrow: 0.1,
    maxLeverage: 4.0,
    minCoverage: 2.5,
  });

  const addLog = (message: string) => {
    setConsoleLogs((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`]);
  };

  const handleRunONNX = async () => {
    setLoading((prev) => ({ ...prev, onnx: true }));
    addLog(`Executando ONNX Financial Risk Engine para "${onnxInput.name}"...`);
    try {
      const res = await ApiClient.predictRisk({
        name: onnxInput.name,
        sector: onnxInput.sector,
        ebitda: onnxInput.ebitda,
        revenue: onnxInput.revenue,
        assets: onnxInput.assets,
        liabilities: onnxInput.liabilities,
        cashflow: onnxInput.cashflow,
        volatility: onnxInput.volatility,
      });

      addLog(`Inferência ONNX concluída!`);
      addLog(`Risco de Insolvência: ${(res.metrics.insolvencyRisk * 100).toFixed(2)}%`);
      addLog(`Classificação Altman Z-Score: ${res.metrics.zScore}`);
      addLog(`Categoria de Risco DCF: ${res.dcfRiskLabel}`);
    } catch (err: any) {
      addLog(`ERRO ao executar ONNX: ${err.message}`);
    } finally {
      setLoading((prev) => ({ ...prev, onnx: false }));
    }
  };

  const handleRunMILP = async () => {
    setLoading((prev) => ({ ...prev, milp: true }));
    addLog(`Executando Otimizador MILP... Budget: R$ ${milpInput.budget}M, Tolerância: ${milpInput.riskTolerance}`);
    try {
      const res = await ApiClient.optimizePortfolio({
        budget: milpInput.budget,
        riskTolerance: milpInput.riskTolerance,
      });

      addLog(`Otimização MILP concluída! Status: ${res.optimization.status.toUpperCase()}`);
      addLog(`Score Total de Sinergia: ${res.totalSynergy}`);
      addLog(`Custo Alocado Total: R$ ${res.totalCost}M`);
    } catch (err: any) {
      addLog(`ERRO ao executar MILP: ${err.message}`);
    } finally {
      setLoading((prev) => ({ ...prev, milp: false }));
    }
  };

  const handleRunGA = async () => {
    setLoading((prev) => ({ ...prev, ga: true }));
    addLog(`Executando Algoritmo Genético de Cláusulas e Constraints...`);
    try {
      const res = await ApiClient.optimizeTermSheet({
        valuationMin: gaInput.valuationMin,
        valuationMax: gaInput.valuationMax,
        preferences: {
          cash: gaInput.cash,
          equity: gaInput.equity,
          earnOut: gaInput.earnOut,
          escrow: gaInput.escrow,
        },
        maxLeverage: gaInput.maxLeverage,
        minCoverage: gaInput.minCoverage,
      });

      addLog(`Otimização Genética concluída! Geradas ${res.length} propostas viáveis.`);
      res.forEach((alt: any, idx: number) => {
        addLog(`Alternativa ${idx + 1}: Valuation R$ ${alt.valuation.toFixed(2)}M (Fitness: ${alt.fitness.toFixed(4)})`);
      });
    } catch (err: any) {
      addLog(`ERRO ao executar GA: ${err.message}`);
    } finally {
      setLoading((prev) => ({ ...prev, ga: false }));
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto text-left">
      <header className="mb-8">
        <div className="flex items-center gap-2 mb-1">
          <span className="w-2 h-2 rounded-full bg-signal-orange"></span>
          <p className="text-xs font-bold text-slate-gray uppercase tracking-wider">
            MOTOES ANALÍTICOS DE M&A
          </p>
        </div>
        <h1 className="text-3xl font-medium text-ink-black tracking-tight">
          Painel de Motores & Insights (MAI-52)
        </h1>
        <p className="text-slate-gray mt-1 text-sm">
          Simulação e auditoria de risco para o deal:{" "}
          <span className="font-semibold text-ink-black">{id}</span>
        </p>
      </header>

      {/* Tabs */}
      <div className="mb-6 flex gap-4 border-b border-dust-taupe pb-3">
        <Link href={`/deals/${id}`} className="text-slate-gray hover:text-ink-black font-semibold text-sm">
          Overview / Sourcing
        </Link>
        <Link href={`/deals/${id}/engines`} className="text-ink-black font-bold text-sm border-b-2 border-ink-black pb-3 -mb-[13px] flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-signal-orange"></span>
          Due Diligence & Engines
        </Link>
        <Link href={`/deals/${id}/chat`} className="text-slate-gray hover:text-ink-black font-semibold text-sm">
          RAG Orchestrator
        </Link>
      </div>

      {/* 3 Engine Cards (High Contrast White 8px Radius Cards) */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-8">
        {/* ONNX Risk Engine */}
        <Card variant="default" padding="lg" className="flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-2">
              <h2 className="text-lg font-semibold text-ink-black">ONNX Risk Engine</h2>
              <Badge variant="orange">• WASM INFERENCE</Badge>
            </div>
            <p className="text-xs text-slate-gray mb-6">
              Classificador neural treinado no Colab e compilado para WASM
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-gray uppercase mb-1">
                  Empresa Target
                </label>
                <input
                  type="text"
                  value={onnxInput.name}
                  onChange={(e) => setOnnxInput((p) => ({ ...p, name: e.target.value }))}
                  className="w-full bg-canvas-cream border border-dust-taupe rounded-lg px-3 py-2 text-sm text-ink-black focus:outline-none focus:ring-2 focus:ring-ink-black"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-gray uppercase mb-1">
                    EBITDA (R$)
                  </label>
                  <input
                    type="number"
                    value={onnxInput.ebitda}
                    onChange={(e) => setOnnxInput((p) => ({ ...p, ebitda: Number(e.target.value) }))}
                    className="w-full bg-canvas-cream border border-dust-taupe rounded-lg px-3 py-2 text-sm text-ink-black focus:outline-none focus:ring-2 focus:ring-ink-black"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-gray uppercase mb-1">
                    Receita (R$)
                  </label>
                  <input
                    type="number"
                    value={onnxInput.revenue}
                    onChange={(e) => setOnnxInput((p) => ({ ...p, revenue: Number(e.target.value) }))}
                    className="w-full bg-canvas-cream border border-dust-taupe rounded-lg px-3 py-2 text-sm text-ink-black focus:outline-none focus:ring-2 focus:ring-ink-black"
                  />
                </div>
              </div>
            </div>
          </div>

          <Button
            variant="primary"
            onClick={handleRunONNX}
            disabled={loading.onnx}
            className="w-full mt-6 justify-center"
          >
            {loading.onnx ? "Executando..." : "Executar Predição de Risco"}
          </Button>
        </Card>

        {/* MILP Portfolio Optimizer */}
        <Card variant="default" padding="lg" className="flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-2">
              <h2 className="text-lg font-semibold text-ink-black">MILP Valuation</h2>
              <Badge variant="dark">• HIGHS SOLVER</Badge>
            </div>
            <p className="text-xs text-slate-gray mb-6">
              Otimização de alocação sob restrições lineares de orçamento
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-gray uppercase mb-1">
                  Alocação Máxima (R$ M)
                </label>
                <input
                  type="number"
                  value={milpInput.budget}
                  onChange={(e) => setMilpInput((p) => ({ ...p, budget: Number(e.target.value) }))}
                  className="w-full bg-canvas-cream border border-dust-taupe rounded-lg px-3 py-2 text-sm text-ink-black focus:outline-none focus:ring-2 focus:ring-ink-black"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-gray uppercase mb-1">
                  Limite de Risco (0.0 a 1.0)
                </label>
                <input
                  type="number"
                  step="0.05"
                  value={milpInput.riskTolerance}
                  onChange={(e) =>
                    setMilpInput((p) => ({ ...p, riskTolerance: Number(e.target.value) }))
                  }
                  className="w-full bg-canvas-cream border border-dust-taupe rounded-lg px-3 py-2 text-sm text-ink-black focus:outline-none focus:ring-2 focus:ring-ink-black"
                />
              </div>
            </div>
          </div>

          <Button
            variant="primary"
            onClick={handleRunMILP}
            disabled={loading.milp}
            className="w-full mt-6 justify-center"
          >
            {loading.milp ? "Otimizando..." : "Executar Otimização MILP"}
          </Button>
        </Card>

        {/* Genetic Algorithm Optimizer */}
        <Card variant="default" padding="lg" className="flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-2">
              <h2 className="text-lg font-semibold text-ink-black">Genetic Term Sheet</h2>
              <Badge variant="default">• GA + CONSTRAINTS</Badge>
            </div>
            <p className="text-xs text-slate-gray mb-6">
              Evolução genética de estrutura de cláusulas (Cash/Equity/Escrow)
            </p>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-gray uppercase mb-1">
                    Val. Min (R$ M)
                  </label>
                  <input
                    type="number"
                    value={gaInput.valuationMin}
                    onChange={(e) =>
                      setGaInput((p) => ({ ...p, valuationMin: Number(e.target.value) }))
                    }
                    className="w-full bg-canvas-cream border border-dust-taupe rounded-lg px-3 py-2 text-sm text-ink-black focus:outline-none focus:ring-2 focus:ring-ink-black"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-gray uppercase mb-1">
                    Val. Max (R$ M)
                  </label>
                  <input
                    type="number"
                    value={gaInput.valuationMax}
                    onChange={(e) =>
                      setGaInput((p) => ({ ...p, valuationMax: Number(e.target.value) }))
                    }
                    className="w-full bg-canvas-cream border border-dust-taupe rounded-lg px-3 py-2 text-sm text-ink-black focus:outline-none focus:ring-2 focus:ring-ink-black"
                  />
                </div>
              </div>
            </div>
          </div>

          <Button
            variant="primary"
            onClick={handleRunGA}
            disabled={loading.ga}
            className="w-full mt-6 justify-center"
          >
            {loading.ga ? "Evoluindo..." : "Executar Otimizador Genético"}
          </Button>
        </Card>
      </div>

      {/* Output Console Log Container */}
      <Card variant="dark" padding="md" className="font-mono text-xs text-canvas-cream h-60 overflow-y-auto">
        <div className="text-signal-orange mb-2 font-bold">// Console de Execução dos Motores</div>
        <div>{`> Motores prontos para o deal: ${id}...`}</div>
        {consoleLogs.map((log, idx) => (
          <div key={idx} className="mt-1 opacity-90">
            {log}
          </div>
        ))}
      </Card>
    </div>
  );
}
