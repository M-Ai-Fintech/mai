import { z } from "zod";

import {
  documentResponseSchema,
  documentSchema,
  kybResponseSchema,
  kybSchema,
  negotiateResponseSchema,
  negotiateSchema,
  portfolioResponseSchema,
  portfolioSchema,
  predictResponseSchema,
  predictSchema,
} from "./resource-schemas";
import { jsonOptions, request } from "./transport";

export async function checkKyb(
  data: z.infer<typeof kybSchema>,
): Promise<z.infer<typeof kybResponseSchema>> {
  const body = kybSchema.parse(data);
  return request("/api/kyb", kybResponseSchema, jsonOptions("POST", body));
}

export async function predictRisk(
  data: z.infer<typeof predictSchema>,
): Promise<z.infer<typeof predictResponseSchema>> {
  const body = predictSchema.parse(data);
  return request(
    "/api/predict",
    predictResponseSchema,
    jsonOptions("POST", body),
  );
}

export async function optimizePortfolio(
  data: z.infer<typeof portfolioSchema>,
): Promise<z.infer<typeof portfolioResponseSchema>> {
  const body = portfolioSchema.parse(data);
  return request(
    "/api/portfolio",
    portfolioResponseSchema,
    jsonOptions("POST", body),
  );
}

export async function optimizeTermSheet(
  data: z.infer<typeof negotiateSchema> = {},
): Promise<z.infer<typeof negotiateResponseSchema>> {
  const body = negotiateSchema.parse(data);
  return request(
    "/api/negotiate",
    negotiateResponseSchema,
    jsonOptions("POST", body),
  );
}

export async function generateDocument(
  data: z.infer<typeof documentSchema>,
): Promise<z.infer<typeof documentResponseSchema>> {
  const body = documentSchema.parse(data);
  return request(
    "/api/document",
    documentResponseSchema,
    jsonOptions("POST", body),
  );
}
