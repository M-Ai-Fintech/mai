"use client";

import React, { use, useState } from "react";
import Link from "next/link";
import { ApiClient } from "@/lib/api-client";
import { Card } from "@/components/Card/Card";
import { Button } from "@/components/Button/Button";
import { Badge } from "@/components/Badge/Badge";
import { useTranslation } from "@/lib/i18n/I18nProvider";

export default function EnginesPage(
  { params }: { params: Promise<{ id: string }> },
) {
  const { t } = useTranslation();
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
    setConsoleLogs((
      prev,
    ) => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`]);
  };

  const handleRunONNX = async () => {
    setLoading((prev) => ({ ...prev, onnx: true }));
    addLog(t("engines.onnx.logs.running", { name: onnxInput.name }));
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

      addLog(t("engines.onnx.logs.done"));
      addLog(
        t("engines.onnx.logs.insolvency", {
          risk: (res.metrics.insolvencyRisk * 100).toFixed(2),
        }),
      );
      addLog(t("engines.onnx.logs.zscore", { score: res.metrics.zScore }));
      addLog(t("engines.onnx.logs.dcf", { label: res.dcfRiskLabel }));
    } catch (err: any) {
      addLog(t("engines.onnx.logs.error", { msg: err.message }));
    } finally {
      setLoading((prev) => ({ ...prev, onnx: false }));
    }
  };

  const handleRunMILP = async () => {
    setLoading((prev) => ({ ...prev, milp: true }));
    addLog(
      t("engines.milp.logs.running", {
        budget: milpInput.budget,
        tol: milpInput.riskTolerance,
      }),
    );
    try {
      const res = await ApiClient.optimizePortfolio({
        budget: milpInput.budget,
        riskTolerance: milpInput.riskTolerance,
      });

      addLog(
        t("engines.milp.logs.done", {
          status: res.optimization.status.toUpperCase(),
        }),
      );
      addLog(t("engines.milp.logs.synergy", { score: res.totalSynergy }));
      addLog(t("engines.milp.logs.cost", { cost: res.totalCost }));
    } catch (err: any) {
      addLog(t("engines.milp.logs.error", { msg: err.message }));
    } finally {
      setLoading((prev) => ({ ...prev, milp: false }));
    }
  };

  const handleRunGA = async () => {
    setLoading((prev) => ({ ...prev, ga: true }));
    addLog(t("engines.ga.logs.running"));
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

      addLog(t("engines.ga.logs.done", { len: res.length }));
      res.forEach((alt: any, idx: number) => {
        addLog(
          t("engines.ga.logs.alt", {
            idx: idx + 1,
            val: alt.valuation.toFixed(2),
            fit: alt.fitness.toFixed(4),
          }),
        );
      });
    } catch (err: any) {
      addLog(t("engines.ga.logs.error", { msg: err.message }));
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
            {t("engines.headerBadge")}
          </p>
        </div>
        <h1 className="text-3xl font-medium text-ink-black tracking-tight">
          {t("engines.title")}
        </h1>
        <p className="text-slate-gray mt-1 text-sm">
          {t("engines.description")}
          <span className="font-semibold text-ink-black">{id}</span>
        </p>
      </header>

      {/* Tabs */}
      <div className="mb-6 flex gap-4 border-b border-dust-taupe pb-3">
        <Link
          href={`/deals/${id}`}
          className="text-slate-gray hover:text-ink-black font-semibold text-sm"
        >
          {t("engines.tabs.overview")}
        </Link>
        <Link
          href={`/deals/${id}/engines`}
          className="text-ink-black font-bold text-sm border-b-2 border-ink-black pb-3 -mb-[13px] flex items-center gap-1.5"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-signal-orange"></span>
          {t("engines.tabs.engines")}
        </Link>
        <Link
          href={`/deals/${id}/chat`}
          className="text-slate-gray hover:text-ink-black font-semibold text-sm"
        >
          {t("engines.tabs.rag")}
        </Link>
      </div>

      {/* 3 Engine Cards (High Contrast White 8px Radius Cards) */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-8">
        {/* ONNX Risk Engine */}
        <Card
          variant="default"
          padding="lg"
          className="flex flex-col justify-between"
        >
          <div>
            <div className="flex justify-between items-center mb-2">
              <h2 className="text-lg font-semibold text-ink-black">
                {t("engines.onnx.title")}
              </h2>
              <Badge variant="orange">{t("engines.onnx.badge")}</Badge>
            </div>
            <p className="text-xs text-slate-gray mb-6">
              {t("engines.onnx.description")}
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-gray uppercase mb-1">
                  {t("engines.onnx.targetCorp")}
                </label>
                <input
                  type="text"
                  value={onnxInput.name}
                  onChange={(e) =>
                    setOnnxInput((p) => ({ ...p, name: e.target.value }))}
                  className="w-full bg-canvas-cream border border-dust-taupe rounded-lg px-3 py-2 text-sm text-ink-black focus:outline-none focus:ring-2 focus:ring-ink-black"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-gray uppercase mb-1">
                    {t("engines.onnx.ebitda")}
                  </label>
                  <input
                    type="number"
                    value={onnxInput.ebitda}
                    onChange={(e) =>
                      setOnnxInput((p) => ({
                        ...p,
                        ebitda: Number(e.target.value),
                      }))}
                    className="w-full bg-canvas-cream border border-dust-taupe rounded-lg px-3 py-2 text-sm text-ink-black focus:outline-none focus:ring-2 focus:ring-ink-black"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-gray uppercase mb-1">
                    {t("engines.onnx.revenue")}
                  </label>
                  <input
                    type="number"
                    value={onnxInput.revenue}
                    onChange={(e) =>
                      setOnnxInput((p) => ({
                        ...p,
                        revenue: Number(e.target.value),
                      }))}
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
            {loading.onnx
              ? t("engines.onnx.running")
              : t("engines.onnx.runBtn")}
          </Button>
        </Card>

        {/* MILP Portfolio Optimizer */}
        <Card
          variant="default"
          padding="lg"
          className="flex flex-col justify-between"
        >
          <div>
            <div className="flex justify-between items-center mb-2">
              <h2 className="text-lg font-semibold text-ink-black">
                {t("engines.milp.title")}
              </h2>
              <Badge variant="dark">{t("engines.milp.badge")}</Badge>
            </div>
            <p className="text-xs text-slate-gray mb-6">
              {t("engines.milp.description")}
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-gray uppercase mb-1">
                  {t("engines.milp.budget")}
                </label>
                <input
                  type="number"
                  value={milpInput.budget}
                  onChange={(e) =>
                    setMilpInput((p) => ({
                      ...p,
                      budget: Number(e.target.value),
                    }))}
                  className="w-full bg-canvas-cream border border-dust-taupe rounded-lg px-3 py-2 text-sm text-ink-black focus:outline-none focus:ring-2 focus:ring-ink-black"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-gray uppercase mb-1">
                  {t("engines.milp.riskTolerance")}
                </label>
                <input
                  type="number"
                  step="0.05"
                  value={milpInput.riskTolerance}
                  onChange={(e) =>
                    setMilpInput((p) => ({
                      ...p,
                      riskTolerance: Number(e.target.value),
                    }))}
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
            {loading.milp
              ? t("engines.milp.running")
              : t("engines.milp.runBtn")}
          </Button>
        </Card>

        {/* Genetic Algorithm Optimizer */}
        <Card
          variant="default"
          padding="lg"
          className="flex flex-col justify-between"
        >
          <div>
            <div className="flex justify-between items-center mb-2">
              <h2 className="text-lg font-semibold text-ink-black">
                {t("engines.ga.title")}
              </h2>
              <Badge variant="default">{t("engines.ga.badge")}</Badge>
            </div>
            <p className="text-xs text-slate-gray mb-6">
              {t("engines.ga.description")}
            </p>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-gray uppercase mb-1">
                    {t("engines.ga.valMin")}
                  </label>
                  <input
                    type="number"
                    value={gaInput.valuationMin}
                    onChange={(e) => setGaInput((p) => ({
                      ...p,
                      valuationMin: Number(e.target.value),
                    }))}
                    className="w-full bg-canvas-cream border border-dust-taupe rounded-lg px-3 py-2 text-sm text-ink-black focus:outline-none focus:ring-2 focus:ring-ink-black"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-gray uppercase mb-1">
                    {t("engines.ga.valMax")}
                  </label>
                  <input
                    type="number"
                    value={gaInput.valuationMax}
                    onChange={(e) => setGaInput((p) => ({
                      ...p,
                      valuationMax: Number(e.target.value),
                    }))}
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
            {loading.ga ? t("engines.ga.running") : t("engines.ga.runBtn")}
          </Button>
        </Card>
      </div>

      {/* Output Console Log Container */}
      <Card
        variant="dark"
        padding="md"
        className="font-mono text-xs text-canvas-cream h-60 overflow-y-auto"
      >
        <div className="text-signal-orange mb-2 font-bold">
          {t("engines.console.title")}
        </div>
        <div>{t("engines.console.ready", { id })}</div>
        {consoleLogs.map((log, idx) => (
          <div key={idx} className="mt-1 opacity-90">
            {log}
          </div>
        ))}
      </Card>
    </div>
  );
}
