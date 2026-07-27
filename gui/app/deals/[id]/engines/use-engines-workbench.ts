"use client";

import { useCallback, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import {
  defaultGaInput,
  defaultMilpInput,
  defaultOnnxInput,
  EngineKey,
  EngineLoading,
  errorMessage,
  GaInput,
  gaResultLogs,
  initialEngineLoading,
  MilpInput,
  milpResultLogs,
  OnnxInput,
  OnnxPredictionResult,
  onnxRequestFromInput,
  onnxResultLogs,
  PortfolioOptimizationResult,
  portfolioRequestFromInput,
  TermSheetAlternative,
  termSheetRequestFromInput,
  timestampConsoleLog,
  Translation,
} from "./engine-workbench-model";

type StateSetter<T> = Dispatch<SetStateAction<T>>;

export type EngineClient = {
  predictRisk: (input: OnnxInput) => Promise<OnnxPredictionResult>;
  optimizePortfolio: (
    input: MilpInput,
  ) => Promise<PortfolioOptimizationResult>;
  optimizeTermSheet: (
    input: ReturnType<typeof termSheetRequestFromInput>,
  ) => Promise<TermSheetAlternative[]>;
};

export type EngineWorkbenchState = {
  consoleLogs: string[];
  loading: EngineLoading;
  onnxInput: OnnxInput;
  setOnnxInput: StateSetter<OnnxInput>;
  milpInput: MilpInput;
  setMilpInput: StateSetter<MilpInput>;
  gaInput: GaInput;
  setGaInput: StateSetter<GaInput>;
  runOnnx: () => Promise<void>;
  runMilp: () => Promise<void>;
  runGa: () => Promise<void>;
};

type EngineWorkbenchConfig = {
  client: EngineClient;
  t: Translation;
  now?: () => Date;
};

type EngineRunContext = EngineWorkbenchConfig & {
  addLog: (message: string) => void;
  setLoading: StateSetter<EngineLoading>;
};

type EngineDraftState = {
  onnxInput: OnnxInput;
  setOnnxInput: StateSetter<OnnxInput>;
  milpInput: MilpInput;
  setMilpInput: StateSetter<MilpInput>;
  gaInput: GaInput;
  setGaInput: StateSetter<GaInput>;
};

export function useEnginesWorkbench(
  config: EngineWorkbenchConfig,
): EngineWorkbenchState {
  const [consoleLogs, setConsoleLogs] = useState<string[]>([]);
  const [loading, setLoading] = useState<EngineLoading>(initialEngineLoading);
  const drafts = useEngineDrafts();
  const addLog = useTimestampedLog(setConsoleLogs, config.now);
  const context = { ...config, addLog, setLoading };
  const actions = useEngineActions(context, drafts);
  return buildWorkbenchState(consoleLogs, loading, { ...drafts, ...actions });
}

function useEngineDrafts(): EngineDraftState {
  const [onnxInput, setOnnxInput] = useState(defaultOnnxInput);
  const [milpInput, setMilpInput] = useState(defaultMilpInput);
  const [gaInput, setGaInput] = useState(defaultGaInput);
  return {
    onnxInput,
    setOnnxInput,
    milpInput,
    setMilpInput,
    gaInput,
    setGaInput,
  };
}

function useTimestampedLog(
  setConsoleLogs: StateSetter<string[]>,
  now: (() => Date) | undefined,
): (message: string) => void {
  return useCallback((message: string) => {
    const date = now ? now() : new Date();
    setConsoleLogs((logs) => [...logs, timestampConsoleLog(message, date)]);
  }, [now, setConsoleLogs]);
}

function useEngineActions(
  context: EngineRunContext,
  drafts: EngineDraftState,
) {
  return {
    runOnnx: useOnnxAction(context, drafts.onnxInput),
    runMilp: useMilpAction(context, drafts.milpInput),
    runGa: useGaAction(context, drafts.gaInput),
  };
}

function useOnnxAction(
  context: EngineRunContext,
  input: OnnxInput,
): () => Promise<void> {
  return useCallback(
    () => runOnnxEngine(context, input),
    [context, input],
  );
}

function useMilpAction(
  context: EngineRunContext,
  input: MilpInput,
): () => Promise<void> {
  return useCallback(
    () => runMilpEngine(context, input),
    [context, input],
  );
}

function useGaAction(
  context: EngineRunContext,
  input: GaInput,
): () => Promise<void> {
  return useCallback(
    () => runGaEngine(context, input),
    [context, input],
  );
}

async function runOnnxEngine(
  context: EngineRunContext,
  input: OnnxInput,
): Promise<void> {
  context.addLog(context.t("engines.onnx.logs.running", { name: input.name }));
  await runEngineJob("onnx", context.setLoading, async () => {
    const result = await context.client.predictRisk(
      onnxRequestFromInput(input),
    );
    onnxResultLogs(context.t, result).forEach(context.addLog);
  }, (cause) => {
    context.addLog(context.t("engines.onnx.logs.error", {
      msg: errorMessage(cause),
    }));
  });
}

async function runMilpEngine(
  context: EngineRunContext,
  input: MilpInput,
): Promise<void> {
  context.addLog(context.t("engines.milp.logs.running", {
    budget: input.budget,
    tol: input.riskTolerance,
  }));
  await runEngineJob("milp", context.setLoading, async () => {
    const result = await context.client.optimizePortfolio(
      portfolioRequestFromInput(input),
    );
    milpResultLogs(context.t, result).forEach(context.addLog);
  }, (cause) => {
    context.addLog(context.t("engines.milp.logs.error", {
      msg: errorMessage(cause),
    }));
  });
}

async function runGaEngine(
  context: EngineRunContext,
  input: GaInput,
): Promise<void> {
  context.addLog(context.t("engines.ga.logs.running"));
  await runEngineJob("ga", context.setLoading, async () => {
    const alternatives = await context.client.optimizeTermSheet(
      termSheetRequestFromInput(input),
    );
    gaResultLogs(context.t, alternatives).forEach(context.addLog);
  }, (cause) => {
    context.addLog(context.t("engines.ga.logs.error", {
      msg: errorMessage(cause),
    }));
  });
}

async function runEngineJob(
  key: EngineKey,
  setLoading: StateSetter<EngineLoading>,
  run: () => Promise<void>,
  onError: (cause: unknown) => void,
): Promise<void> {
  setLoading((current) => ({ ...current, [key]: true }));
  try {
    await run();
  } catch (cause: unknown) {
    onError(cause);
  } finally {
    setLoading((current) => ({ ...current, [key]: false }));
  }
}

function buildWorkbenchState(
  consoleLogs: string[],
  loading: EngineLoading,
  state: Omit<EngineWorkbenchState, "consoleLogs" | "loading">,
): EngineWorkbenchState {
  return {
    consoleLogs,
    loading,
    ...state,
  };
}
