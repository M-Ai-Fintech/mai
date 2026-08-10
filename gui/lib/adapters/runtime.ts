import { z } from "zod";

import { APIError } from "@/lib/api-client/errors";
import {
  requestV1,
  type V1RequestOptions,
  type V1Response,
} from "@/lib/api-client/v1";
import { adapterDescriptorFor, type AdapterFamily } from "./catalog";
import {
  type AdapterReadModel,
  adapterReadModelSchemaFor,
  type AdapterResult,
} from "./contracts";
import { adapterCanaryFor } from "./feature-flags";
import {
  failedAdapterResult,
  previousAdapterMissingResult,
  unavailableAdapterResult,
} from "./states";

export interface AdapterReadOptions extends V1RequestOptions {
  readonly environment?: Readonly<Record<string, string | undefined>>;
  readonly routeParameters?: Readonly<Record<string, string>>;
}

export async function readAdapter<T>(
  family: AdapterFamily,
  schema: z.ZodType<T>,
  options: AdapterReadOptions = {},
  previousAdapter?: () => Promise<AdapterResult<T>>,
): Promise<AdapterResult<T>> {
  const { environment, routeParameters, ...requestOptions } = options;
  const descriptor = adapterDescriptorFor(family);
  const canary = adapterCanaryFor(family, environment);
  if (canary.activation === "previous") {
    return previousAdapter === undefined
      ? previousAdapterMissingResult()
      : previousAdapter();
  }
  if (canary.activation === "off") {
    return unavailableAdapterResult(
      "ROUTE_UNAVAILABLE",
      `${descriptor.readModel} is unavailable until ${descriptor.route} is registered and configured.`,
    );
  }
  try {
    const response = await requestV1(
      bindRoute(descriptor.route, routeParameters),
      schema,
      requestOptions,
    );
    return readyResult(response);
  } catch (error) {
    if (error instanceof APIError) return failedAdapterResult(error);
    if (error instanceof RouteParameterError) {
      return unavailableAdapterResult(error.code, error.message);
    }
    throw error;
  }
}

export function readFamilyAdapter(
  family: AdapterFamily,
  options: AdapterReadOptions = {},
  previousAdapter?: () => Promise<AdapterResult<AdapterReadModel>>,
): Promise<AdapterResult<AdapterReadModel>> {
  return readAdapter(
    family,
    adapterReadModelSchemaFor(family),
    options,
    previousAdapter,
  );
}

function bindRoute(
  route: string,
  parameters: Readonly<Record<string, string>> = {},
): string {
  return route.replace(/:([a-zA-Z][a-zA-Z0-9]*)/g, (_, name: string) => {
    const value = parameters[name];
    if (value === undefined) {
      throw new RouteParameterError(
        `Route parameter ${name} is missing; expected a value for ${route}.`,
      );
    }
    return encodeURIComponent(value);
  });
}

class RouteParameterError extends Error {
  readonly code = "ROUTE_PARAMETER_MISSING";

  constructor(message: string) {
    super(message);
    this.name = "RouteParameterError";
  }
}

function readyResult<T>(response: V1Response<T>): AdapterResult<T> {
  const freshness = response.meta.freshness;
  if (freshness !== "current" && freshness !== "stale") {
    const received = freshness ?? "missing";
    return unavailableAdapterResult(
      "FRESHNESS_UNKNOWN",
      `The v1 response freshness "${received}" is not current; expected "current" or "stale" metadata.`,
    );
  }
  return {
    source: "v1",
    state: freshness === "stale" ? "stale" : "ready",
    data: response.data,
    meta: response.meta,
    etag: response.etag,
  };
}
