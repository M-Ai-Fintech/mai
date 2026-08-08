import { closingBlockerId } from "./ids.ts";
import type { ClosingBlocker } from "./model.ts";

export function createBlocker(input: {
  readonly blockerId: string;
  readonly sourceType: string;
  readonly sourceId: string;
  readonly title: string;
  readonly consequence: string;
  readonly severity: ClosingBlocker["severity"];
  readonly ownerId: string;
}): ClosingBlocker {
  return Object.freeze({
    blockerId: closingBlockerId(input.blockerId),
    sourceType: input.sourceType,
    sourceId: input.sourceId,
    title: input.title,
    consequence: input.consequence,
    severity: input.severity,
    ownerId: input.ownerId,
    state: "open",
  });
}

export function resolveBlocker(
  blocker: ClosingBlocker,
  resolvedBy: string,
  resolution: string,
  resolvedAt: string,
): ClosingBlocker {
  if (blocker.state === "resolved") {
    throw new Error(
      `Closing blocker "${blocker.blockerId}" is already resolved; expected an open or reopened blocker.`,
    );
  }
  return Object.freeze({
    ...blocker,
    state: "resolved",
    resolvedBy,
    resolution,
    resolvedAt,
  });
}

export function reopenBlocker(blocker: ClosingBlocker): ClosingBlocker {
  if (blocker.state !== "resolved") {
    throw new Error(
      `Closing blocker "${blocker.blockerId}" cannot reopen from state "${blocker.state}"; expected resolved.`,
    );
  }
  return Object.freeze({
    ...blocker,
    state: "reopened",
    resolution: undefined,
    resolvedBy: undefined,
    resolvedAt: undefined,
  });
}
