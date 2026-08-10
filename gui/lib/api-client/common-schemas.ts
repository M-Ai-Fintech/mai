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

export const validationIssueCodeSchema = z.enum([
  "REQUIRED",
  "INVALID_TYPE",
  "TOO_LONG",
]);

export const validationIssueSchema = z.object({
  field: z.string().refine((value) => value.trim().length > 0),
  code: validationIssueCodeSchema,
  message: z.string().refine((value) => value.trim().length > 0),
});

const structuredFieldErrorsSchema = z.array(validationIssueSchema).readonly();
const legacyFieldErrorsSchema = z.array(z.string()).readonly();

/** Accepts the structured v1 contract while retaining legacy string messages. */
export const fieldErrorsSchema = z.record(
  z.string(),
  z.union([structuredFieldErrorsSchema, legacyFieldErrorsSchema]),
);

export type ValidationIssue = z.infer<typeof validationIssueSchema>;
export type FieldError = ValidationIssue | string;
export type FieldErrors = Readonly<Record<string, readonly FieldError[]>>;

export const errorEnvelopeSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    fieldErrors: fieldErrorsSchema.optional(),
    retryable: z.boolean().optional(),
  }),
});
