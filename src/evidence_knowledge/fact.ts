import type { Fact, FactStatus, FactVersion } from "./model.ts";

export function approveFactVersion(version: FactVersion): FactVersion {
  if (version.status !== "proposed") {
    throw new Error(
      `Fact version status "${version.status}" is invalid; expected proposed before approval.`,
    );
  }
  return Object.freeze({ ...version, status: "approved" });
}

export function supersedeFactVersion(
  version: FactVersion,
  replacement: FactVersion,
): FactVersion {
  if (version.status !== "approved") {
    throw new Error(
      `Fact version status "${version.status}" is invalid; expected approved before supersession.`,
    );
  }
  if (replacement.factId !== version.factId) {
    throw new Error(
      `Fact replacement "${replacement.factId}" does not match original fact "${version.factId}".`,
    );
  }
  if (replacement.versionNumber <= version.versionNumber) {
    throw new Error(
      `Fact replacement version "${replacement.versionNumber}" is invalid; expected greater than "${version.versionNumber}".`,
    );
  }
  return Object.freeze({ ...version, status: "superseded" });
}

export function assertFactStatusTransition(
  from: FactStatus,
  to: FactStatus,
): void {
  if (
    (from === "proposed" && to === "approved") ||
    (from === "approved" && to === "superseded")
  ) return;
  throw new Error(
    `Fact status transition "${from}" to "${to}" is invalid; expected proposed->approved->superseded.`,
  );
}

export type { Fact, FactVersion };
