import {
  adapterDescriptorFor,
  adapterFamilies,
  type AdapterFamily,
  type RouteReadiness,
} from "./catalog";

export type AdapterMode = "v1" | "previous" | "off";
export type AdapterActivation = "v1" | "previous" | "off";
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
  const mode = configuredMode(family, environment);
  return {
    mode,
    activation: activationFor(mode, descriptor.routeReadiness),
    routeReadiness: descriptor.routeReadiness,
  };
}

function configuredMode(
  family: AdapterFamily,
  environment: Readonly<Record<string, string | undefined>>,
): AdapterMode {
  const raw = environment[CANARY_MAP_ENV];
  if (raw === undefined) return "v1";
  const values = parseCanaryMap(raw);
  if (values === undefined) return "off";
  return values[family] ?? "v1";
}

function parseCanaryMap(
  raw: string,
): Partial<Record<AdapterFamily, AdapterMode>> | undefined {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed)) return undefined;
    if (hasInvalidFamilyMode(parsed)) return undefined;
    return Object.fromEntries(
      adapterFamilies.flatMap((family) =>
        parsed[family] === "previous" || parsed[family] === "v1" ||
          parsed[family] === "off"
          ? [[family, parsed[family]]]
          : []
      ),
    ) as Partial<Record<AdapterFamily, AdapterMode>>;
  } catch {
    return undefined;
  }
}

function hasInvalidFamilyMode(values: Record<string, unknown>): boolean {
  return Object.entries(values).some(([family, value]) =>
    !adapterFamilies.includes(family as AdapterFamily) ||
    (value !== "previous" && value !== "v1" && value !== "off")
  );
}

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
