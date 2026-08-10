import { z } from "zod";

export const idSchema = z.string().uuid();
export const timestampSchema = z.string().datetime({ offset: true });

export type JsonValue = string | number | boolean | null | JsonValue[] | {
  [key: string]: JsonValue;
};

export const jsonValueSchema: z.ZodType<JsonValue> = z.lazy(() =>
  z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.null(),
    z.array(jsonValueSchema),
    z.record(z.string(), jsonValueSchema),
  ])
);

export const jsonObjectSchema = z.record(z.string(), jsonValueSchema);

export const moneySchema = z.object({
  amountMinor: z.string().regex(/^\d+$/),
  currency: z.enum(["BRL", "USD", "EUR"]),
});

export const paginationMetaSchema = z.object({
  page: z.number().int().positive(),
  pageSize: z.number().int().positive(),
  total: z.number().int().nonnegative(),
  totalPages: z.number().int().nonnegative(),
});

export const fieldErrorsSchema = z.record(z.string(), z.array(z.string()));

export const errorEnvelopeSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    fieldErrors: fieldErrorsSchema.optional(),
    retryable: z.boolean().optional(),
  }),
});
