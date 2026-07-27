"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { Badge } from "@/components/Badge/Badge";
import { Button } from "@/components/Button/Button";
import { Card } from "@/components/Card/Card";
import { Translation } from "./engine-workbench-model";
import {
  GeneticFields,
  MilpFields,
  OnnxRiskFields,
} from "./engine-workbench-fields";
import { EngineWorkbenchState } from "./use-engines-workbench";

type EnginesWorkbenchViewProps = {
  dealId: string;
  t: Translation;
  workbench: EngineWorkbenchState;
};

type EngineCardProps = {
  actionLabel: string;
  badge: ReactNode;
  children: ReactNode;
  description: string;
  disabled: boolean;
  onRun: () => void;
  title: string;
};

export function EnginesWorkbenchView(
  { dealId, t, workbench }: EnginesWorkbenchViewProps,
) {
  return (
    <div className="p-8 max-w-7xl mx-auto text-left">
      <EnginesHeader dealId={dealId} t={t} />
      <EnginesTabs dealId={dealId} t={t} />
      <EngineCardsGrid t={t} workbench={workbench} />
      <EngineConsole dealId={dealId} logs={workbench.consoleLogs} t={t} />
    </div>
  );
}

function EnginesHeader({ dealId, t }: { dealId: string; t: Translation }) {
  return (
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
        <span className="font-semibold text-ink-black">{dealId}</span>
      </p>
    </header>
  );
}

function EnginesTabs({ dealId, t }: { dealId: string; t: Translation }) {
  return (
    <div className="mb-6 flex gap-4 border-b border-dust-taupe pb-3">
      <EnginesTab
        href={`/deals/${dealId}`}
        label={t("engines.tabs.overview")}
      />
      <ActiveEnginesTab dealId={dealId} label={t("engines.tabs.engines")} />
      <EnginesTab
        href={`/deals/${dealId}/chat`}
        label={t("engines.tabs.rag")}
      />
    </div>
  );
}

function ActiveEnginesTab(
  { dealId, label }: { dealId: string; label: string },
) {
  return (
    <Link
      href={`/deals/${dealId}/engines`}
      className="text-ink-black font-bold text-sm border-b-2 border-ink-black pb-3 -mb-[13px] flex items-center gap-1.5"
    >
      <span className="w-1.5 h-1.5 rounded-full bg-signal-orange"></span>
      {label}
    </Link>
  );
}

function EnginesTab({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="text-slate-gray hover:text-ink-black font-semibold text-sm"
    >
      {label}
    </Link>
  );
}

function EngineCardsGrid(
  { t, workbench }: { t: Translation; workbench: EngineWorkbenchState },
) {
  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-8">
      <OnnxRiskCard t={t} workbench={workbench} />
      <MilpPortfolioCard t={t} workbench={workbench} />
      <GeneticOptimizerCard t={t} workbench={workbench} />
    </div>
  );
}

function OnnxRiskCard(
  { t, workbench }: { t: Translation; workbench: EngineWorkbenchState },
) {
  return (
    <EngineCard
      actionLabel={actionLabel(t, workbench.loading.onnx, "onnx")}
      badge={<Badge variant="orange">{t("engines.onnx.badge")}</Badge>}
      disabled={workbench.loading.onnx}
      onRun={workbench.runOnnx}
      title={t("engines.onnx.title")}
      description={t("engines.onnx.description")}
    >
      <OnnxRiskFields
        input={workbench.onnxInput}
        setInput={workbench.setOnnxInput}
        t={t}
      />
    </EngineCard>
  );
}

function MilpPortfolioCard(
  { t, workbench }: { t: Translation; workbench: EngineWorkbenchState },
) {
  return (
    <EngineCard
      actionLabel={actionLabel(t, workbench.loading.milp, "milp")}
      badge={<Badge variant="dark">{t("engines.milp.badge")}</Badge>}
      disabled={workbench.loading.milp}
      onRun={workbench.runMilp}
      title={t("engines.milp.title")}
      description={t("engines.milp.description")}
    >
      <MilpFields
        input={workbench.milpInput}
        setInput={workbench.setMilpInput}
        t={t}
      />
    </EngineCard>
  );
}

function GeneticOptimizerCard(
  { t, workbench }: { t: Translation; workbench: EngineWorkbenchState },
) {
  return (
    <EngineCard
      actionLabel={actionLabel(t, workbench.loading.ga, "ga")}
      badge={<Badge variant="default">{t("engines.ga.badge")}</Badge>}
      disabled={workbench.loading.ga}
      onRun={workbench.runGa}
      title={t("engines.ga.title")}
      description={t("engines.ga.description")}
    >
      <GeneticFields
        input={workbench.gaInput}
        setInput={workbench.setGaInput}
        t={t}
      />
    </EngineCard>
  );
}

function EngineCard(props: EngineCardProps) {
  return (
    <Card
      variant="default"
      padding="lg"
      className="flex flex-col justify-between"
    >
      <EngineCardBody {...props} />
      <EngineRunButton {...props} />
    </Card>
  );
}

function EngineCardBody(
  { badge, children, description, title }: EngineCardProps,
) {
  return (
    <div>
      <EngineCardHeading badge={badge} title={title} />
      <p className="text-xs text-slate-gray mb-6">{description}</p>
      {children}
    </div>
  );
}

function EngineRunButton(
  { actionLabel, disabled, onRun }: EngineCardProps,
) {
  return (
    <Button
      variant="primary"
      onClick={onRun}
      disabled={disabled}
      className="w-full mt-6 justify-center"
    >
      {actionLabel}
    </Button>
  );
}

function EngineCardHeading(
  { badge, title }: { badge: ReactNode; title: string },
) {
  return (
    <div className="flex justify-between items-center mb-2">
      <h2 className="text-lg font-semibold text-ink-black">{title}</h2>
      {badge}
    </div>
  );
}

function EngineConsole(
  { dealId, logs, t }: { dealId: string; logs: string[]; t: Translation },
) {
  return (
    <Card
      variant="dark"
      padding="md"
      className="font-mono text-xs text-canvas-cream h-60 overflow-y-auto"
    >
      <div className="text-signal-orange mb-2 font-bold">
        {t("engines.console.title")}
      </div>
      <div>{t("engines.console.ready", { id: dealId })}</div>
      {logs.map((log, index) => (
        <ConsoleLogLine key={`${index}-${log}`} log={log} />
      ))}
    </Card>
  );
}

function ConsoleLogLine({ log }: { log: string }) {
  return <div className="mt-1 opacity-90">{log}</div>;
}

function actionLabel(
  t: Translation,
  loading: boolean,
  key: "onnx" | "milp" | "ga",
): string {
  return loading ? t(`engines.${key}.running`) : t(`engines.${key}.runBtn`);
}
