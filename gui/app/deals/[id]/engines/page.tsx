"use client";

import React, { useState, use } from 'react';
import Link from 'next/link';
import { ApiClient } from '@/lib/api-client';

export default function EnginesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  // Console output state
  const [consoleLogs, setConsoleLogs] = useState<string[]>([]);
  const [loading, setLoading] = useState<Record<string, boolean>>({
    onnx: false,
    milp: false,
    ga: false,
  });

  // ONNX Inputs
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

  // MILP Inputs
  const [milpInput, setMilpInput] = useState({
    budget: 50, // in Millions
    riskTolerance: 0.4,
  });

  // GA Inputs
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
    setConsoleLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`]);
  };

  const handleRunONNX = async () => {
    setLoading(prev => ({ ...prev, onnx: true }));
    addLog(`Running ONNX Financial Risk Engine for "${onnxInput.name}"...`);
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

      addLog(`ONNX Inference complete!`);
      addLog(`Insolvency Risk Probability: ${(res.metrics.insolvencyRisk * 100).toFixed(2)}%`);
      addLog(`Altman Z-Score Classification: ${res.metrics.zScore}`);
      addLog(`DCF Valuation Risk Category: ${res.dcfRiskLabel}`);
      addLog(`Embedding Generated: ${res.embeddingsGenerated ? "Yes" : "No"}`);
    } catch (err: any) {
      addLog(`ERROR executing ONNX: ${err.message}`);
    } finally {
      setLoading(prev => ({ ...prev, onnx: false }));
    }
  };

  const handleRunMILP = async () => {
    setLoading(prev => ({ ...prev, milp: true }));
    addLog(`Running MILP Portfolio Optimizer... Budget: $${milpInput.budget}M, Risk Tolerance: ${milpInput.riskTolerance}`);
    try {
      const res = await ApiClient.optimizePortfolio({
        budget: milpInput.budget,
        riskTolerance: milpInput.riskTolerance,
      });

      addLog(`MILP Optimization complete! Status: ${res.optimization.status.toUpperCase()}`);
      addLog(`Total Synergy Score: ${res.totalSynergy}`);
      addLog(`Total Allocated Cost: $${res.totalCost}M`);
      addLog(`Selected Target IDs: ${JSON.stringify(res.optimization.selectedTargetIds)}`);
    } catch (err: any) {
      addLog(`ERROR executing MILP: ${err.message}`);
    } finally {
      setLoading(prev => ({ ...prev, milp: false }));
    }
  };

  const handleRunGA = async () => {
    setLoading(prev => ({ ...prev, ga: true }));
    addLog(`Running Genetic Algorithm Clause Optimizer with KYC & Financial constraints...`);
    try {
      const preferences = {
        cash: gaInput.cash,
        equity: gaInput.equity,
        earnOut: gaInput.earnOut,
        escrow: gaInput.escrow,
      };

      const res = await ApiClient.optimizeTermSheet({
        valuationMin: gaInput.valuationMin,
        valuationMax: gaInput.valuationMax,
        preferences,
        maxLeverage: gaInput.maxLeverage,
        minCoverage: gaInput.minCoverage,
      });

      addLog(`GA Optimization complete! Generated ${res.length} feasible proposals.`);
      res.forEach((alt: any, idx: number) => {
        addLog(`Alternative ${idx + 1}:`);
        addLog(`  - Valuation: $${alt.valuation.toFixed(2)}M`);
        addLog(`  - Cash Upfront: ${(alt.cashPercentage * 100).toFixed(1)}%`);
        addLog(`  - Equity Share: ${(alt.equityPercentage * 100).toFixed(1)}%`);
        addLog(`  - Earn-out met: ${(alt.earnOutPercentage * 100).toFixed(1)}%`);
        addLog(`  - Escrow retention: ${(alt.escrowPercentage * 100).toFixed(1)}%`);
        addLog(`  - Score (Fitness): ${alt.fitness.toFixed(5)}`);
      });
    } catch (err: any) {
      addLog(`ERROR executing GA: ${err.message}`);
    } finally {
      setLoading(prev => ({ ...prev, ga: false }));
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <header className="mb-8">
        <div className="flex items-center gap-2 mb-1.5">
          <span className="w-2 h-2 rounded-full bg-signal-orange"></span>
          <p className="text-xs font-bold text-slate-gray uppercase tracking-wider">M&A ANALYTICS ENGINE</p>
        </div>
        <h1 className="text-4xl font-medium text-ink-black tracking-tight">Engines & Due Diligence</h1>
        <p className="text-slate-gray mt-1 text-sm">Motores preditivos e otimização para o deal: <span className="font-semibold text-ink-black">{id}</span></p>
      </header>

      <div className="mb-6 flex gap-6 border-b border-dark-border pb-4">
        <Link href={`/deals/${id}`} className="text-slate-gray hover:text-ink-black font-semibold pb-4">
          Overview / Sourcing
        </Link>
        <Link href={`/deals/${id}/engines`} className="text-ink-black font-bold border-b-2 border-ink-black pb-4 -mb-[17px] flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-signal-orange"></span>
          Due Diligence & Engines
        </Link>
        <Link href={`/deals/${id}/chat`} className="text-slate-gray hover:text-ink-black font-semibold pb-4">
          RAG Orchestrator
        </Link>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* ONNX Card */}
        <div className="bg-lifted-cream p-8 rounded-[40px] border border-dark-border flex flex-col justify-between shadow-[0_24px_48px_rgba(0,0,0,0.04)] min-h-[550px]">
          <div>
            <h2 className="text-xl font-medium mb-2 text-ink-black flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-light-signal-orange"></span>
              ONNX Financial Risk Engine
            </h2>
            <p className="text-xs text-slate-gray mb-6 leading-relaxed">Executa o modelo preditivo WASM em C++/Rust exportado pelo Google Colab.</p>
            
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-xs font-bold text-slate-gray uppercase mb-1 px-1">Empresa Alvo</label>
                <input type="text" value={onnxInput.name} onChange={e => setOnnxInput(p => ({ ...p, name: e.target.value }))} className="w-full bg-canvas-cream border border-dark-border rounded-full px-4 py-2 text-sm text-ink-black focus:outline-none focus:border-light-signal-orange" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-gray uppercase mb-1 px-1">Setor</label>
                <input type="text" value={onnxInput.sector} onChange={e => setOnnxInput(p => ({ ...p, sector: e.target.value }))} className="w-full bg-canvas-cream border border-dark-border rounded-full px-4 py-2 text-sm text-ink-black focus:outline-none focus:border-light-signal-orange" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-gray uppercase mb-1 px-1">EBITDA ($)</label>
                  <input type="number" value={onnxInput.ebitda} onChange={e => setOnnxInput(p => ({ ...p, ebitda: Number(e.target.value) }))} className="w-full bg-canvas-cream border border-dark-border rounded-full px-4 py-2 text-sm text-ink-black focus:outline-none focus:border-light-signal-orange" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-gray uppercase mb-1 px-1">Receita ($)</label>
                  <input type="number" value={onnxInput.revenue} onChange={e => setOnnxInput(p => ({ ...p, revenue: Number(e.target.value) }))} className="w-full bg-canvas-cream border border-dark-border rounded-full px-4 py-2 text-sm text-ink-black focus:outline-none focus:border-light-signal-orange" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-gray uppercase mb-1 px-1">Ativos ($)</label>
                  <input type="number" value={onnxInput.assets} onChange={e => setOnnxInput(p => ({ ...p, assets: Number(e.target.value) }))} className="w-full bg-canvas-cream border border-dark-border rounded-full px-4 py-2 text-sm text-ink-black focus:outline-none focus:border-light-signal-orange" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-gray uppercase mb-1 px-1">Passivos ($)</label>
                  <input type="number" value={onnxInput.liabilities} onChange={e => setOnnxInput(p => ({ ...p, liabilities: Number(e.target.value) }))} className="w-full bg-canvas-cream border border-dark-border rounded-full px-4 py-2 text-sm text-ink-black focus:outline-none focus:border-light-signal-orange" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-gray uppercase mb-1 px-1">Caixa Op ($)</label>
                  <input type="number" value={onnxInput.cashflow} onChange={e => setOnnxInput(p => ({ ...p, cashflow: Number(e.target.value) }))} className="w-full bg-canvas-cream border border-dark-border rounded-full px-4 py-2 text-sm text-ink-black focus:outline-none focus:border-light-signal-orange" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-gray uppercase mb-1 px-1">Volatilidade (0-1)</label>
                  <input type="number" step="0.01" value={onnxInput.volatility} onChange={e => setOnnxInput(p => ({ ...p, volatility: Number(e.target.value) }))} className="w-full bg-canvas-cream border border-dark-border rounded-full px-4 py-2 text-sm text-ink-black focus:outline-none focus:border-light-signal-orange" />
                </div>
              </div>
            </div>
          </div>
          <button onClick={handleRunONNX} disabled={loading.onnx} className="w-full py-3 bg-ink-black hover:bg-slate-800 text-canvas-cream rounded-full font-bold shadow-md disabled:opacity-50 transition-colors cursor-pointer">
            {loading.onnx ? "Running Inference..." : "Run Prediction"}
          </button>
        </div>

        {/* MILP Card */}
        <div className="bg-lifted-cream p-8 rounded-[40px] border border-dark-border flex flex-col justify-between shadow-[0_24px_48px_rgba(0,0,0,0.04)] min-h-[550px]">
          <div>
            <h2 className="text-xl font-medium mb-2 text-ink-black flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-light-signal-orange"></span>
              MILP Valuation Optimizer
            </h2>
            <p className="text-xs text-slate-gray mb-6 leading-relaxed">Otimizador de portfólio e valuation usando restrições lineares (Highs).</p>
            
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-xs font-bold text-slate-gray uppercase mb-1 px-1">Max Capital Allocation ($M)</label>
                <input type="number" value={milpInput.budget} onChange={e => setMilpInput(p => ({ ...p, budget: Number(e.target.value) }))} className="w-full bg-canvas-cream border border-dark-border rounded-full px-4 py-2 text-sm text-ink-black focus:outline-none focus:border-light-signal-orange" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-gray uppercase mb-1 px-1">Risk Tolerance Limit (0.0 to 1.0)</label>
                <input type="number" step="0.05" value={milpInput.riskTolerance} onChange={e => setMilpInput(p => ({ ...p, riskTolerance: Number(e.target.value) }))} className="w-full bg-canvas-cream border border-dark-border rounded-full px-4 py-2 text-sm text-ink-black focus:outline-none focus:border-light-signal-orange" />
              </div>
            </div>
          </div>
          <button onClick={handleRunMILP} disabled={loading.milp} className="w-full py-3 bg-ink-black hover:bg-slate-800 text-canvas-cream rounded-full font-bold shadow-md disabled:opacity-50 transition-colors cursor-pointer">
            {loading.milp ? "Optimizing Portfolio..." : "Run Optimization"}
          </button>
        </div>

        {/* GA Card */}
        <div className="bg-lifted-cream p-8 rounded-[40px] border border-dark-border flex flex-col justify-between shadow-[0_24px_48px_rgba(0,0,0,0.04)] min-h-[550px]">
          <div>
            <h2 className="text-xl font-medium mb-2 text-ink-black flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-light-signal-orange"></span>
              GA Clause & Constraints Optimizer
            </h2>
            <p className="text-xs text-slate-gray mb-6 leading-relaxed">Otimizador de Term Sheet por Algoritmo Genético refinado por constraints.</p>
            
            <div className="space-y-4 mb-6">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-gray uppercase mb-1 px-1">Val Min ($M)</label>
                  <input type="number" value={gaInput.valuationMin} onChange={e => setGaInput(p => ({ ...p, valuationMin: Number(e.target.value) }))} className="w-full bg-canvas-cream border border-dark-border rounded-full px-4 py-2 text-sm text-ink-black focus:outline-none focus:border-light-signal-orange" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-gray uppercase mb-1 px-1">Val Max ($M)</label>
                  <input type="number" value={gaInput.valuationMax} onChange={e => setGaInput(p => ({ ...p, valuationMax: Number(e.target.value) }))} className="w-full bg-canvas-cream border border-dark-border rounded-full px-4 py-2 text-sm text-ink-black focus:outline-none focus:border-light-signal-orange" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-gray uppercase mb-1 px-1">Max Alavancagem</label>
                  <input type="number" step="0.5" value={gaInput.maxLeverage} onChange={e => setGaInput(p => ({ ...p, maxLeverage: Number(e.target.value) }))} className="w-full bg-canvas-cream border border-dark-border rounded-full px-4 py-2 text-sm text-ink-black focus:outline-none focus:border-light-signal-orange" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-gray uppercase mb-1 px-1">Min Cobertura</label>
                  <input type="number" step="0.5" value={gaInput.minCoverage} onChange={e => setGaInput(p => ({ ...p, minCoverage: Number(e.target.value) }))} className="w-full bg-canvas-cream border border-dark-border rounded-full px-4 py-2 text-sm text-ink-black focus:outline-none focus:border-light-signal-orange" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-gray uppercase mb-1 px-1">Pref. Caixa (0-1)</label>
                  <input type="number" step="0.1" value={gaInput.cash} onChange={e => setGaInput(p => ({ ...p, cash: Number(e.target.value) }))} className="w-full bg-canvas-cream border border-dark-border rounded-full px-4 py-2 text-sm text-ink-black focus:outline-none focus:border-light-signal-orange" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-gray uppercase mb-1 px-1">Pref. Ações (0-1)</label>
                  <input type="number" step="0.1" value={gaInput.equity} onChange={e => setGaInput(p => ({ ...p, equity: Number(e.target.value) }))} className="w-full bg-canvas-cream border border-dark-border rounded-full px-4 py-2 text-sm text-ink-black focus:outline-none focus:border-light-signal-orange" />
                </div>
              </div>
            </div>
          </div>
          <button onClick={handleRunGA} disabled={loading.ga} className="w-full py-3 bg-ink-black hover:bg-slate-800 text-canvas-cream rounded-full font-bold shadow-md disabled:opacity-50 transition-colors cursor-pointer">
            {loading.ga ? "Evolving Clauses..." : "Run Clause Optimizer"}
          </button>
        </div>
      </div>
      
      {/* Console area */}
      <div className="mt-8 bg-ink-black border border-dark-border rounded-[40px] p-8 font-mono text-xs text-canvas-cream h-64 overflow-y-auto shadow-md">
        <div className="text-light-signal-orange mb-2 font-bold">// Console de Execução dos Motores</div>
        <div>{`> Ready to execute engines for deal: ${id}...`}</div>
        {consoleLogs.map((log, idx) => (
          <div key={idx} className="mt-1 opacity-90">{log}</div>
        ))}
      </div>
    </div>
  );
}
