import { handleHealthRequest, RuntimeReadiness } from "../operations/health.ts";
import {
  logOperationalEvent,
  safeErrorCode,
} from "../operations/diagnostics.ts";

export interface WorkerProcess {
  executeOne(
    workerId: string,
    leaseMilliseconds: number,
    signal?: AbortSignal,
  ): Promise<{ readonly status: string }>;
  /** Proves the worker dependencies and executor registration are usable. */
  ready?(): Promise<void>;
  readonly registeredJobTypes?: readonly string[];
  close?(): Promise<void>;
}

export interface WorkerLoopOptions {
  readonly workerId: string;
  readonly leaseMilliseconds: number;
  readonly pollMilliseconds: number;
  readonly readinessProbe?: () => Promise<void>;
  readonly onReadinessChange?: (ready: boolean) => void;
}

export type Sleep = (milliseconds: number) => Promise<void>;
export type WorkerFactory = () => WorkerProcess | Promise<WorkerProcess>;

export async function runWorkerLoop(
  worker: WorkerProcess,
  options: WorkerLoopOptions,
  signal: AbortSignal,
  sleep: Sleep = delay,
): Promise<void> {
  assertWorkerOptions(options);
  while (!signal.aborted) {
    if (options.readinessProbe !== undefined) {
      try {
        await options.readinessProbe();
        options.onReadinessChange?.(true);
      } catch (error) {
        options.onReadinessChange?.(false);
        logOperationalEvent("worker.readiness.failed", {
          errorCode: safeErrorCode(error),
        });
        await sleep(options.pollMilliseconds);
        continue;
      }
    }
    if (signal.aborted) break;
    const outcome = await worker.executeOne(
      options.workerId,
      options.leaseMilliseconds,
      signal,
    );
    logOperationalEvent("worker.iteration", {
      workerId: options.workerId,
      status: outcome.status,
    });
    if (outcome.status === "idle") await sleep(options.pollMilliseconds);
  }
}

export async function loadConfiguredWorker(
  moduleSpecifier: string,
  load: (specifier: string) => Promise<unknown> = dynamicImport,
): Promise<WorkerProcess> {
  const module = await load(moduleSpecifier);
  const factory = configuredFactory(module);
  const worker = await factory();
  if (isWorkerProcess(worker)) return worker;
  throw new Error(
    `Worker module "${moduleSpecifier}" returned an invalid worker; expected executeOne(workerId, leaseMilliseconds).`,
  );
}

export function assertWorkerReadinessContract(
  moduleSpecifier: string,
  worker: WorkerProcess,
): void {
  if (
    worker.registeredJobTypes !== undefined &&
    worker.registeredJobTypes.length > 0 && worker.ready !== undefined
  ) return;
  throw new Error(
    `Worker module "${moduleSpecifier}" has no dependency-backed readiness and executor registration; expected ready() and registered job types.`,
  );
}

export function workerProcessOptions(
  environment: Readonly<Record<string, string | undefined>>,
): WorkerLoopOptions {
  return {
    workerId: requiredEnvironment(environment, "MAI_WORKER_ID"),
    leaseMilliseconds: positiveEnvironmentInteger(
      environment,
      "MAI_WORKER_LEASE_MS",
      60_000,
    ),
    pollMilliseconds: positiveEnvironmentInteger(
      environment,
      "MAI_WORKER_POLL_MS",
      1_000,
    ),
  };
}

export async function startConfiguredWorkerProcess(): Promise<void> {
  const environment = Deno.env.toObject();
  const moduleSpecifier = requiredEnvironment(environment, "MAI_WORKER_MODULE");
  const worker = await loadConfiguredWorker(moduleSpecifier);
  assertWorkerReadinessContract(moduleSpecifier, worker);
  const controller = new AbortController();
  const readiness = new RuntimeReadiness("worker");
  readiness.setDatabaseState(false);
  const healthServer = startWorkerHealthServer(
    readiness,
    positiveEnvironmentInteger(environment, "MAI_WORKER_HEALTH_PORT", 8001),
  );
  const removeSignals = installShutdownSignals(controller, readiness);
  try {
    const options = {
      ...workerProcessOptions(environment),
      readinessProbe: async () => {
        await worker.ready?.();
      },
      onReadinessChange: (ready: boolean) => readiness.setDatabaseState(ready),
    } satisfies WorkerLoopOptions;
    await runWorkerLoop(
      worker,
      options,
      controller.signal,
    );
  } catch (error) {
    logOperationalEvent("worker.failed", { errorCode: safeErrorCode(error) });
    throw error;
  } finally {
    readiness.markStopped();
    await worker.close?.();
    removeSignals();
    await healthServer.shutdown();
  }
}

function assertWorkerOptions(options: WorkerLoopOptions): void {
  if (
    options.workerId.trim() && options.leaseMilliseconds > 0 &&
    options.pollMilliseconds > 0
  ) return;
  throw new Error(
    `Worker options for "${options.workerId}" are invalid; expected a non-empty worker ID and positive lease/poll milliseconds.`,
  );
}

function requiredEnvironment(
  environment: Readonly<Record<string, string | undefined>>,
  name: string,
): string {
  const value = environment[name]?.trim();
  if (value) return value;
  throw new Error(
    `Worker environment "${name}" is "${
      String(environment[name])
    }"; expected a non-empty configured value.`,
  );
}

function positiveEnvironmentInteger(
  environment: Readonly<Record<string, string | undefined>>,
  name: string,
  fallback: number,
): number {
  const rawValue = environment[name];
  if (rawValue === undefined) return fallback;
  const value = Number(rawValue);
  if (Number.isSafeInteger(value) && value > 0) return value;
  throw new Error(
    `Worker environment "${name}" is "${rawValue}"; expected a positive integer.`,
  );
}

function configuredFactory(module: unknown): WorkerFactory {
  if (typeof module === "function") return module as WorkerFactory;
  if (isRecord(module) && typeof module.createWorker === "function") {
    return module.createWorker as WorkerFactory;
  }
  throw new Error(
    "Worker module export is invalid; expected a function or createWorker function.",
  );
}

function isWorkerProcess(value: unknown): value is WorkerProcess {
  return isRecord(value) && typeof value.executeOne === "function";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function installShutdownSignals(
  controller: AbortController,
  readiness: RuntimeReadiness,
): () => void {
  const handlers = new Map<"SIGTERM" | "SIGINT", () => void>();
  for (const signal of ["SIGTERM", "SIGINT"] as const) {
    const handler = (): void => {
      readiness.beginDrain();
      controller.abort();
      logOperationalEvent("worker.drain.started", { signal });
    };
    handlers.set(signal, handler);
    Deno.addSignalListener(signal, handler);
  }
  return () => {
    for (const [signal, handler] of handlers) {
      Deno.removeSignalListener(signal, handler);
    }
  };
}

function startWorkerHealthServer(
  readiness: RuntimeReadiness,
  port: number,
): Deno.HttpServer {
  return Deno.serve(
    { port },
    (request) =>
      handleHealthRequest(request, readiness) ??
        new Response("Not Found", { status: 404 }),
  );
}

function dynamicImport(specifier: string): Promise<unknown> {
  if (specifier.startsWith(".") || specifier.startsWith("/")) {
    const path = specifier.startsWith("/")
      ? specifier
      : `${Deno.cwd()}/${specifier}`;
    return import(pathToFileUrl(path));
  }
  return import(specifier);
}

function pathToFileUrl(path: string): string {
  return new URL(`file://${path}`).href;
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

if (import.meta.main) await startConfiguredWorkerProcess();
