import {
  adapterDescriptorFor,
  adapterFamilies,
  type AdapterFamily,
  type RouteReadiness,
} from "./catalog";

export type AdapterMode = "v1" | "previous" | "off";
export type AdapterActivation = "v1" | "previous" | "off";
export type AdapterCanaryKey = AdapterFamily | "financial-risk";
export interface AdapterCanary {
  readonly mode: AdapterMode;
  readonly activation: AdapterActivation;
  readonly routeReadiness: RouteReadiness;
}

const CANARY_MAP_ENV = "NEXT_PUBLIC_ADAPTER_CANARY_MAP";

export function adapterCanaryFor(
  family: AdapterFamily,
  environment: Readonly<Record<string, string | undefined>> =
    runtimeEnvironment(),
): AdapterCanary {
  const descriptor = adapterDescriptorFor(family);
  const mode = adapterCanaryModeFor(family, environment);
  return {
    mode,
    activation: activationFor(mode, descriptor.routeReadiness),
    routeReadiness: descriptor.routeReadiness,
  };
}

export function adapterCanaryModeFor(
  key: AdapterCanaryKey,
  environment: Readonly<Record<string, string | undefined>> =
    runtimeEnvironment(),
): AdapterMode {
  return configuredMode(key, environment);
}

function configuredMode(
  key: AdapterCanaryKey,
  environment: Readonly<Record<string, string | undefined>>,
): AdapterMode {
  const raw = environment[CANARY_MAP_ENV];
  if (raw === undefined) return "v1";
  const values = parseCanaryMap(raw);
  if (values === undefined) return "off";
  return values[key] ?? "v1";
}

function parseCanaryMap(
  raw: string,
): Partial<Record<AdapterCanaryKey, AdapterMode>> | undefined {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed)) return undefined;
    if (hasInvalidFamilyMode(parsed)) return undefined;
    return Object.fromEntries(
      canaryKeys.flatMap((family) =>
        parsed[family] === "previous" || parsed[family] === "v1" ||
          parsed[family] === "off"
          ? [[family, parsed[family]]]
          : []
      ),
    ) as Partial<Record<AdapterCanaryKey, AdapterMode>>;
  } catch {
    return undefined;
  }
}

function hasInvalidFamilyMode(values: Record<string, unknown>): boolean {
  return Object.entries(values).some(([family, value]) =>
    !canaryKeys.includes(family as AdapterCanaryKey) ||
    (value !== "previous" && value !== "v1" && value !== "off")
  );
}

const canaryKeys: readonly AdapterCanaryKey[] = [
  ...adapterFamilies,
  "financial-risk",
];

function activationFor(
  mode: AdapterMode,
  readiness: RouteReadiness,
): AdapterActivation {
  if (mode === "previous") return "previous";
  if (mode === "off") return "off";
  return readiness === "registered" ? "v1" : "off";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function runtimeEnvironment(): Readonly<Record<string, string | undefined>> {
  return typeof process === "undefined" ? {} : process.env;
}
