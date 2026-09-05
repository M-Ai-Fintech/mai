import type { CorrelationId } from "../platform/api/v1.ts";
import {
  handleHealthRequest,
  type RuntimeReadiness,
} from "../platform/operations/health.ts";
import {
  capabilityReadinessSnapshot,
  type ExecutableCapabilityDependencies,
} from "./capability_readiness.ts";
import { handleCapabilityReadinessRoute } from "./capability_readiness_routes.ts";
import type { CapabilityFamily } from "./contracts/capability_readiness.ts";
import { jsonResponse, withCorrelationId } from "./server_runtime.ts";

interface OperationalRouteInput {
  readonly dependencies: ExecutableCapabilityDependencies;
  readonly failures: Readonly<Partial<Record<CapabilityFamily, true>>>;
}

/** Handles health, capability readiness, and draining before domain routes.
 * @example handleOperationalRoute(request, readiness, input, correlation, headers)
 */
export function handleOperationalRoute(
  request: Request,
  readiness: RuntimeReadiness,
  input: OperationalRouteInput,
  correlationId: CorrelationId,
  headers: Headers,
): Response | undefined {
  const health = handleHealthRequest(request, readiness);
  if (health) return withCorrelationId(health, correlationId);
  const capability = capabilityResponse(
    request,
    readiness,
    input,
    correlationId,
    headers,
  );
  if (capability) return withCorrelationId(capability, correlationId);
  return drainingResponse(readiness, correlationId, headers);
}

function capabilityResponse(
  request: Request,
  readiness: RuntimeReadiness,
  input: OperationalRouteInput,
  correlationId: CorrelationId,
  headers: Headers,
): Response | undefined {
  return handleCapabilityReadinessRoute(
    request,
    capabilityReadinessSnapshot({
      dependencies: input.dependencies,
      acceptingTraffic: readiness.isAcceptingTraffic(),
      failedFamilies: input.failures,
    }),
    correlationId,
    headers,
  );
}

function drainingResponse(
  readiness: RuntimeReadiness,
  correlationId: CorrelationId,
  headers: Headers,
): Response | undefined {
  if (readiness.isAcceptingTraffic()) return undefined;
  return withCorrelationId(
    jsonResponse({ error: "api_draining" }, headers, 503),
    correlationId,
  );
}
