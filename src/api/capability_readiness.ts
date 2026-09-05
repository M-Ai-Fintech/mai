import {
  capabilityDefinitions,
  type CapabilityFamily,
  type CapabilityReadiness,
  type CapabilityReadinessSnapshot,
} from "./contracts/capability_readiness.ts";

export type ExecutableCapabilityDependency =
  | "workspaceShell"
  | "demoReadiness"
  | "dealManagement"
  | "workManagement"
  | "notifications"
  | "evidenceKnowledge"
  | "documents"
  | "valuation"
  | "matching"
  | "negotiation"
  | "closing"
  | "deliverables"
  | "governance";

export type ExecutableCapabilityDependencies = Readonly<
  Record<ExecutableCapabilityDependency, boolean>
>;

export interface CapabilityProbeInput {
  readonly dependencies: ExecutableCapabilityDependencies;
  readonly acceptingTraffic: boolean;
  readonly failedFamilies?: Readonly<Partial<Record<CapabilityFamily, true>>>;
}

const dependencyByFamily: Readonly<
  Partial<Record<CapabilityFamily, ExecutableCapabilityDependency>>
> = {
  "application-shell": "workspaceShell",
  "command-center": "demoReadiness",
  "deals-portfolio": "demoReadiness",
  "tasks-approvals": "demoReadiness",
  "deal-overview": "demoReadiness",
  "documents-vdr": "demoReadiness",
  "diligence-decision-room": "demoReadiness",
  "valuation-lab": "demoReadiness",
  "matching-universe": "demoReadiness",
  "negotiation-room": "demoReadiness",
};

/** Reports only capability chains present in the executable router.
 *
 * @example capabilityReadinessSnapshot({ dependencies, acceptingTraffic: true })
 */
export function capabilityReadinessSnapshot(
  input: CapabilityProbeInput,
): CapabilityReadinessSnapshot {
  return {
    schemaVersion: 1,
    capabilities: capabilityDefinitions.map((definition) =>
      readinessFor(definition, input)
    ),
  };
}

function readinessFor(
  definition: (typeof capabilityDefinitions)[number],
  input: CapabilityProbeInput,
): CapabilityReadiness {
  if (input.failedFamilies?.[definition.family]) {
    return failedReadiness(definition);
  }
  const dependency = dependencyByFamily[definition.family];
  if (dependency === undefined || !input.dependencies[dependency]) {
    return deferredReadiness(definition);
  }
  if (!input.acceptingTraffic) return degradedReadiness(definition);
  return enabledReadiness(definition);
}

function enabledReadiness(
  definition: (typeof capabilityDefinitions)[number],
): CapabilityReadiness {
  return {
    family: definition.family,
    name: definition.name,
    state: "enabled",
    detail: `${definition.name} has an executable v1 dependency chain.`,
    action: "Open the capability.",
  };
}

function degradedReadiness(
  definition: (typeof capabilityDefinitions)[number],
): CapabilityReadiness {
  return {
    family: definition.family,
    name: definition.name,
    state: "degraded",
    detail:
      `${definition.name} is composed, but a local dependency is not ready.`,
    action: "Retry after local API readiness recovers.",
  };
}

function deferredReadiness(
  definition: (typeof capabilityDefinitions)[number],
): CapabilityReadiness {
  return {
    family: definition.family,
    name: definition.name,
    state: "deferred",
    detail: `${definition.name} is not enabled in this executable.`,
    action: definition.ownerAction,
  };
}

function failedReadiness(
  definition: (typeof capabilityDefinitions)[number],
): CapabilityReadiness {
  return {
    family: definition.family,
    name: definition.name,
    state: "failed",
    detail: `${definition.name} failed during executable composition.`,
    action:
      "Inspect the API composition log, restore the dependency, and retry.",
  };
}
