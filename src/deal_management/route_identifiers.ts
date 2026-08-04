import { dealId } from "./ids.ts";
import { RequestInputError } from "./http_shared.ts";
import type { DealId } from "./ids.ts";

/**
 * Parses a Deal identifier supplied by an HTTP route.
 *
 * The parser reports the received value and canonical wire shape while
 * leaving resource existence to the authorization-before-load boundary.
 *
 * @example const id = parseDealRouteId("deal_target-1");
 */
export function parseDealRouteId(value: string | undefined): DealId {
  if (value === undefined) {
    throw new RequestInputError(
      'dealId is missing; expected a canonical identifier beginning with "deal_".',
    );
  }
  try {
    return dealId(value);
  } catch {
    throw new RequestInputError(
      `dealId "${value}" is invalid; expected a canonical identifier beginning with "deal_".`,
    );
  }
}
