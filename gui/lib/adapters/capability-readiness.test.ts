import { describe, expect, it } from "vitest";

import {
  capabilityDefinitions,
  capabilityFamilies,
  type CapabilityReadiness,
} from "../../../src/api/contracts/capability_readiness";
import type { AdapterReadModel, AdapterResult } from "./contracts";
import {
  capabilityReadinessForAdapter,
  failedCapabilityReadinessSnapshot,
} from "./capability-readiness";

const enabled: CapabilityReadiness = {
  family: "command-center",
  name: "Command Center",
  state: "enabled",
  detail: "The executable contract is available.",
  action: "Open the capability.",
};

describe("capability readiness", () => {
  it("uses the shared 25-family catalog for fail-closed probe state", () => {
    const snapshot = failedCapabilityReadinessSnapshot();

    expect(snapshot.capabilities).toHaveLength(25);
    expect(snapshot.capabilities.map(({ family }) => family)).toEqual(
      capabilityFamilies,
    );
    expect(snapshot.capabilities.every(({ state }) => state === "failed"))
      .toBe(true);
    expect(capabilityDefinitions).toHaveLength(25);
  });

  it.each([
    [readyAdapter(), "enabled"],
    [failedAdapter("empty", "NO_ITEMS"), "enabled"],
    [failedAdapter("restricted", "ACTION_FORBIDDEN"), "forbidden"],
    [failedAdapter("restricted", "PROTECTED_NOT_FOUND"), "protected-not-found"],
    [failedAdapter("unavailable", "DEPENDENCY_UNAVAILABLE"), "degraded"],
    [failedAdapter("partial-failure", "CONTRACT_INVALID"), "failed"],
  ] as const)("maps adapter outcome to %s", (adapter, expected) => {
    expect(capabilityReadinessForAdapter(enabled, adapter).state).toBe(expected);
  });

  it("preserves catalog deferred state without calling it enabled", () => {
    const deferred = { ...enabled, state: "deferred" as const };
    expect(capabilityReadinessForAdapter(deferred, readyAdapter()).state)
      .toBe("deferred");
  });
});

function readyAdapter(): AdapterResult<AdapterReadModel> {
  return {
    source: "v1",
    state: "ready",
    data: { family: "command-center", items: [] },
    meta: { correlationId: "hidden" },
  };
}

function failedAdapter(
  state: "restricted" | "unavailable" | "partial-failure" | "empty",
  code: string,
): AdapterResult<AdapterReadModel> {
  return {
    source: "v1",
    state,
    failure: { code, message: "opaque backend detail", retryable: false },
  };
}
