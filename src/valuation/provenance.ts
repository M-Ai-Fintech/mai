import type { ActorReference } from "../platform/authz/v1.ts";
import type { RequestOrigin } from "../shared/contracts/request_context.ts";
import { ValuationError } from "./errors.ts";

export type ValuationInputSource =
  | "evidence_knowledge"
  | "human_entered"
  | "imported";

export interface ValuationInputProvenance {
  readonly source: ValuationInputSource;
  readonly actor: ActorReference;
  readonly origin: RequestOrigin;
  readonly capturedAt: Date;
  readonly note?: string;
}

export function createValuationInputProvenance(
  input: ValuationInputProvenance,
): ValuationInputProvenance {
  if (input.source === "imported" && input.origin === "http") {
    throw new ValuationError(
      "INVALID_INPUT",
      `Valuation provenance source "${input.source}" cannot use HTTP origin; expected an explicit import or internal origin.`,
    );
  }
  if (input.actor.state !== "active") {
    throw new ValuationError(
      "ACTOR_DENIED",
      `Valuation provenance actor "${input.actor.id}" is "${input.actor.state}"; expected an active actor.`,
    );
  }
  if (
    !(input.capturedAt instanceof Date) ||
    Number.isNaN(input.capturedAt.getTime())
  ) {
    throw new ValuationError(
      "INVALID_INPUT",
      `Valuation provenance timestamp "${
        String(input.capturedAt)
      }" is invalid; expected a valid Date.`,
    );
  }
  if (input.note !== undefined && input.note.length > 1024) {
    throw new ValuationError(
      "INVALID_INPUT",
      `Valuation provenance note exceeds 1024 characters; received "${input.note}".`,
    );
  }
  return Object.freeze({
    ...input,
    actor: Object.freeze({ ...input.actor }),
    capturedAt: new Date(input.capturedAt),
  });
}
