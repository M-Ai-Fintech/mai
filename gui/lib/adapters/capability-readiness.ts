import { z } from "zod";

import {
  capabilityDefinitions,
  capabilityFamilies,
  capabilityStates,
  type CapabilityFamily,
  type CapabilityReadiness,
  type CapabilityReadinessSnapshot,
} from "../../../src/api/contracts/capability_readiness";
import { requestV1 } from "@/lib/api-client/v1";
import type {
  AdapterFailure,
  AdapterReadModel,
  AdapterResult,
} from "./contracts";
import { adapterFamilyForRoute } from "./screen-data";

const readinessSchema = z.object({
  family: z.enum(capabilityFamilies),
  name: z.string().min(1),
  state: z.enum(capabilityStates),
  detail: z.string().min(1),
  action: z.string().min(1),
});

const snapshotSchema = z.object({
  schemaVersion: z.literal(1),
  capabilities: z.array(readinessSchema).readonly(),
});

/** Reads and validates the executable capability snapshot.
 * @example await readCapabilityReadiness(headers)
 */
export async function readCapabilityReadiness(
  headers?: HeadersInit,
): Promise<CapabilityReadinessSnapshot> {
  try {
    const response = await requestV1(
      "/api/v1/capabilities",
      snapshotSchema,
      { headers },
    );
    return hasExactCatalog(response.data)
      ? response.data
      : failedCapabilityReadinessSnapshot();
  } catch {
    return failedCapabilityReadinessSnapshot();
  }
}

/** Returns a stable failed snapshot when the probe itself cannot be trusted.
 * @example failedCapabilityReadinessSnapshot()
 */
export function failedCapabilityReadinessSnapshot(): CapabilityReadinessSnapshot {
  return {
    schemaVersion: 1,
    capabilities: capabilityDefinitions.map(({ family, name }) => ({
      family,
      name,
      state: "failed",
      detail: "Current capability readiness could not be verified.",
      action: "Restore the capability probe and retry.",
    })),
  };
}

/** Finds the governed readiness entry for one family.
 * @example capabilityReadinessForFamily(snapshot, "command-center")
 */
export function capabilityReadinessForFamily(
  snapshot: CapabilityReadinessSnapshot,
  family: CapabilityFamily,
): CapabilityReadiness {
  return snapshot.capabilities.find((entry) => entry.family === family) ??
    failedReadiness(family);
}

/** Resolves the direct route and its navigation entry from one snapshot.
 * @example capabilityReadinessForRoute(snapshot, "global.home")
 */
export function capabilityReadinessForRoute(
  snapshot: CapabilityReadinessSnapshot,
  routeId: string,
): CapabilityReadiness | undefined {
  const family = adapterFamilyForRoute(routeId);
  return family === undefined
    ? undefined
    : capabilityReadinessForFamily(snapshot, family);
}

/** Refines an enabled catalog entry with the selected adapter outcome.
 * @example capabilityReadinessForAdapter(readiness, adapter)
 */
export function capabilityReadinessForAdapter(
  readiness: CapabilityReadiness,
  adapter?: AdapterResult<AdapterReadModel>,
): CapabilityReadiness {
  if (readiness.state !== "enabled" || adapter === undefined) return readiness;
  if (
    adapter.state === "ready" || adapter.state === "empty" ||
    adapter.state === "sensitive" || adapter.state === "long-content"
  ) return readiness;
  if (adapter.state === "restricted") {
    return restrictedReadiness(readiness, adapter.failure);
  }
  if (
    adapter.state === "stale" || adapter.state === "unavailable" ||
    adapter.state === "loading"
  ) {
    return changedReadiness(readiness, "degraded", "Retry when the service recovers.");
  }
  return changedReadiness(
    readiness,
    "failed",
    "Restore the capability contract and retry.",
  );
}

function hasExactCatalog(snapshot: CapabilityReadinessSnapshot): boolean {
  if (snapshot.capabilities.length !== capabilityFamilies.length) return false;
  const families = new Set(snapshot.capabilities.map(({ family }) => family));
  return capabilityFamilies.every((family) => families.has(family));
}

function failedReadiness(family: CapabilityFamily): CapabilityReadiness {
  const definition = capabilityDefinitions.find((item) => item.family === family);
  if (definition === undefined) throw new Error(`Unknown capability family: ${family}`);
  return {
    family,
    name: definition.name,
    state: "failed",
    detail: "Current capability readiness could not be verified.",
    action: "Restore the capability probe and retry.",
  };
}

function restrictedReadiness(
  readiness: CapabilityReadiness,
  failure: AdapterFailure,
): CapabilityReadiness {
  const protectedMissing = failure.code === "PROTECTED_NOT_FOUND";
  return changedReadiness(
    readiness,
    protectedMissing ? "protected-not-found" : "forbidden",
    protectedMissing ? "Return to an authorized workspace." : "Request the required permission.",
  );
}

function changedReadiness(
  readiness: CapabilityReadiness,
  state: CapabilityReadiness["state"],
  action: string,
): CapabilityReadiness {
  return {
    ...readiness,
    state,
    detail: state === "protected-not-found"
      ? "The protected capability was not found or is not visible."
      : state === "forbidden"
      ? "You do not have permission to use this capability."
      : state === "degraded"
      ? "The capability is temporarily degraded."
      : "The capability failed to load safely.",
    action,
  };
}
