import { z, type ZodTypeAny } from "zod";

const approvedZodValidatorOwnKeys = new Set([
  ...Object.keys(z.any()),
  ...Object.keys(z.unknown()),
  ...Object.keys(z.object({})),
  ...Object.keys(z.number()),
  ...Object.keys(z.bigint()),
  ...Object.keys(z.function()),
]);
const sensitiveValidatorKeys = new Set([
  "apiKey",
  "providerClient",
  "rawClient",
  "secret",
  "secrets",
]);

export const validatorSchema = z.custom<ZodTypeAny>(isZodValidator);

function isZodValidator(value: unknown): value is ZodTypeAny {
  if (!(value instanceof z.ZodType)) return false;
  return Object.keys(value).every((key) =>
    approvedZodValidatorOwnKeys.has(key) && !sensitiveValidatorKeys.has(key)
  );
}
