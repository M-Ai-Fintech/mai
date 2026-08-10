import { z } from "zod";

import type { V1Meta } from "@/lib/api-client/v1";
import { type AdapterFamily } from "./catalog";

export interface AdapterReadItem {
  readonly id: string;
  readonly title: string;
  readonly summary: string;
  readonly status: string;
}

export interface AdapterReadModel {
  readonly family: AdapterFamily;
  readonly items: readonly AdapterReadItem[];
  readonly selectedItemId?: string;
}

const adapterReadItemSchema = z.object({
  id: z.string().min(1),
  title: z.string(),
  summary: z.string(),
  status: z.string(),
});

export function adapterReadModelSchemaFor(
  family: AdapterFamily,
): z.ZodType<AdapterReadModel> {
  return z.object({
    family: z.literal(family),
    items: z.array(adapterReadItemSchema),
    selectedItemId: z.string().min(1).optional(),
  });
}

export type AdapterState =
  | "ready"
  | "loading"
  | "empty"
  | "partial-failure"
  | "restricted"
  | "unavailable"
  | "stale"
  | "sensitive"
  | "long-content"
  | "previous";

export interface AdapterFailure {
  readonly code: string;
  readonly message: string;
  readonly retryable: boolean;
}

export type AdapterResult<T> =
  | {
    readonly source: "v1";
    readonly state: "ready" | "stale";
    readonly data: T;
    readonly meta: V1Meta;
    readonly etag?: string;
  }
  | {
    readonly source: "v1" | "previous";
    readonly state: Exclude<AdapterState, "ready">;
    readonly failure: AdapterFailure;
  };

export interface AdapterReadContext {
  readonly family: AdapterFamily;
  readonly routeId: string;
  readonly routeParameters: Readonly<Record<string, string>>;
  readonly permissions: readonly string[];
}
