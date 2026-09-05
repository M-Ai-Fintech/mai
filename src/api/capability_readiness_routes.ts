import {
  type CorrelationId,
  createSuccessEnvelope,
} from "../platform/api/v1.ts";
import type { CapabilityReadinessSnapshot } from "./contracts/capability_readiness.ts";
import { jsonResponse } from "./server_runtime.ts";

const CAPABILITY_READINESS_PATH = "/api/v1/capabilities";

/** Publishes the executable router's current capability snapshot.
 *
 * @example handleCapabilityReadinessRoute(request, snapshot, correlationId)
 */
export function handleCapabilityReadinessRoute(
  request: Request,
  snapshot: CapabilityReadinessSnapshot,
  correlationId: CorrelationId,
  headers: Headers,
): Response | undefined {
  if (new URL(request.url).pathname !== CAPABILITY_READINESS_PATH) {
    return undefined;
  }
  if (request.method !== "GET") {
    return new Response("Not Found", { status: 404, headers });
  }
  return jsonResponse(
    createSuccessEnvelope(snapshot, { correlationId, freshness: "current" }),
    headers,
  );
}
