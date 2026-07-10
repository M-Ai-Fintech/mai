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
    <div className="p-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Engines & Due Diligence</h1>
        <p className="text-slate-400 mt-2">Motores preditivos e otimização para o deal {id}</p>
      </header>

      <div className="mb-6 flex gap-4 border-b border-dark-border pb-4">
        <Link href={`/deals/${id}`} className="text-slate-400 hover:text-slate-200 pb-4">
          Overview / Sourcing
        </Link>
        <Link href={`/deals/${id}/engines`} className="text-teal-400 font-semibold border-b-2 border-teal-400 pb-4 -mb-[17px]">
          Due Diligence & Engines
        </Link>
        <Link href={`/deals/${id}/chat`} className="text-slate-400 hover:text-slate-200 pb-4">
          RAG Orchestrator
        </Link>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* ONNX Card */}
        <div className="bg-dark-surface p-6 rounded-lg border border-dark-border flex flex-col justify-between">
          <div>
            <h2 className="text-xl font-semibold mb-2 text-yellow-400">ONNX Financial Risk Engine</h2>
            <p className="text-xs text-slate-400 mb-6">Executa o modelo preditivo WASM em C++/Rust exportado pelo Google Colab.</p>
            
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Empresa Alvo</label>
                <input type="text" value={onnxInput.name} onChange={e => setOnnxInput(p => ({ ...p, name: e.target.value }))} className="w-full bg-slate-900 border border-dark-border rounded px-3 py-2 text-sm text-slate-200" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Setor</label>
                <input type="text" value={onnxInput.sector} onChange={e => setOnnxInput(p => ({ ...p, sector: e.target.value }))} className="w-full bg-slate-900 border border-dark-border rounded px-3 py-2 text-sm text-slate-200" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">EBITDA ($)</label>
                  <input type="number" value={onnxInput.ebitda} onChange={e => setOnnxInput(p => ({ ...p, ebitda: Number(e.target.value) }))} className="w-full bg-slate-900 border border-dark-border rounded px-3 py-2 text-sm text-slate-200" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Receita ($)</label>
                  <input type="number" value={onnxInput.revenue} onChange={e => setOnnxInput(p => ({ ...p, revenue: Number(e.target.value) }))} className="w-full bg-slate-900 border border-dark-border rounded px-3 py-2 text-sm text-slate-200" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Ativos ($)</label>
                  <input type="number" value={onnxInput.assets} onChange={e => setOnnxInput(p => ({ ...p, assets: Number(e.target.value) }))} className="w-full bg-slate-900 border border-dark-border rounded px-3 py-2 text-sm text-slate-200" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Passivos ($)</label>
                  <input type="number" value={onnxInput.liabilities} onChange={e => setOnnxInput(p => ({ ...p, liabilities: Number(e.target.value) }))} className="w-full bg-slate-900 border border-dark-border rounded px-3 py-2 text-sm text-slate-200" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Caixa Op ($)</label>
                  <input type="number" value={onnxInput.cashflow} onChange={e => setOnnxInput(p => ({ ...p, cashflow: Number(e.target.value) }))} className="w-full bg-slate-900 border border-dark-border rounded px-3 py-2 text-sm text-slate-200" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Volatilidade (0-1)</label>
                  <input type="number" step="0.01" value={onnxInput.volatility} onChange={e => setOnnxInput(p => ({ ...p, volatility: Number(e.target.value) }))} className="w-full bg-slate-900 border border-dark-border rounded px-3 py-2 text-sm text-slate-200" />
                </div>
              </div>
            </div>
          </div>
          <button onClick={handleRunONNX} disabled={loading.onnx} className="w-full py-3 bg-yellow-600/20 text-yellow-400 border border-yellow-600/50 rounded-md font-semibold hover:bg-yellow-600/30 disabled:opacity-50 transition-colors">
            {loading.onnx ? "Running Inference..." : "Run Prediction"}
          </button>
        </div>

        {/* MILP Card */}
        <div className="bg-dark-surface p-6 rounded-lg border border-dark-border flex flex-col justify-between">
          <div>
            <h2 className="text-xl font-semibold mb-2 text-cyan-accent">MILP Valuation Optimizer</h2>
            <p className="text-xs text-slate-400 mb-6">Otimizador de portfólio e valuation usando restrições lineares (Highs).</p>
            
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Max Capital Allocation ($M)</label>
                <input type="number" value={milpInput.budget} onChange={e => setMilpInput(p => ({ ...p, budget: Number(e.target.value) }))} className="w-full bg-slate-900 border border-dark-border rounded px-3 py-2 text-sm text-slate-200" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Risk Tolerance Limit (0.0 to 1.0)</label>
                <input type="number" step="0.05" value={milpInput.riskTolerance} onChange={e => setMilpInput(p => ({ ...p, riskTolerance: Number(e.target.value) }))} className="w-full bg-slate-900 border border-dark-border rounded px-3 py-2 text-sm text-slate-200" />
              </div>
            </div>
          </div>
          <button onClick={handleRunMILP} disabled={loading.milp} className="w-full py-3 bg-cyan-600/20 text-cyan-400 border border-cyan-600/50 rounded-md font-semibold hover:bg-cyan-600/30 disabled:opacity-50 transition-colors">
            {loading.milp ? "Optimizing Portfolio..." : "Run Optimization"}
          </button>
        </div>

        {/* GA Card */}
        <div className="bg-dark-surface p-6 rounded-lg border border-dark-border flex flex-col justify-between">
          <div>
            <h2 className="text-xl font-semibold mb-2 text-teal-accent">GA Clause & Constraints Optimizer</h2>
            <p className="text-xs text-slate-400 mb-6">Otimizador de Term Sheet por Algoritmo Genético refinado por constraints.</p>
            
            <div className="space-y-4 mb-6">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Val Min ($M)</label>
                  <input type="number" value={gaInput.valuationMin} onChange={e => setGaInput(p => ({ ...p, valuationMin: Number(e.target.value) }))} className="w-full bg-slate-900 border border-dark-border rounded px-3 py-2 text-sm text-slate-200" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Val Max ($M)</label>
                  <input type="number" value={gaInput.valuationMax} onChange={e => setGaInput(p => ({ ...p, valuationMax: Number(e.target.value) }))} className="w-full bg-slate-900 border border-dark-border rounded px-3 py-2 text-sm text-slate-200" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Max Alavancagem</label>
                  <input type="number" step="0.5" value={gaInput.maxLeverage} onChange={e => setGaInput(p => ({ ...p, maxLeverage: Number(e.target.value) }))} className="w-full bg-slate-900 border border-dark-border rounded px-3 py-2 text-sm text-slate-200" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Min Cobertura</label>
                  <input type="number" step="0.5" value={gaInput.minCoverage} onChange={e => setGaInput(p => ({ ...p, minCoverage: Number(e.target.value) }))} className="w-full bg-slate-900 border border-dark-border rounded px-3 py-2 text-sm text-slate-200" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Pref. Caixa (0-1)</label>
                  <input type="number" step="0.1" value={gaInput.cash} onChange={e => setGaInput(p => ({ ...p, cash: Number(e.target.value) }))} className="w-full bg-slate-900 border border-dark-border rounded px-3 py-2 text-sm text-slate-200" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Pref. Ações (0-1)</label>
                  <input type="number" step="0.1" value={gaInput.equity} onChange={e => setGaInput(p => ({ ...p, equity: Number(e.target.value) }))} className="w-full bg-slate-900 border border-dark-border rounded px-3 py-2 text-sm text-slate-200" />
                </div>
              </div>
            </div>
          </div>
          <button onClick={handleRunGA} disabled={loading.ga} className="w-full py-3 bg-teal-600/20 text-teal-400 border border-teal-600/50 rounded-md font-semibold hover:bg-teal-600/30 disabled:opacity-50 transition-colors">
            {loading.ga ? "Evolving Clauses..." : "Run Clause Optimizer"}
          </button>
        </div>
      </div>
      
      {/* Console area */}
      <div className="mt-8 bg-black/85 border border-dark-border rounded-lg p-6 font-mono text-xs text-slate-400 h-64 overflow-y-auto">
        <div className="text-teal-400 mb-2">// Engine Console Output</div>
        <div>{`> Ready to execute engines for deal: ${id}...`}</div>
        {consoleLogs.map((log, idx) => (
          <div key={idx} className="mt-1">{log}</div>
        ))}
      </div>
    </div>
  );
}
