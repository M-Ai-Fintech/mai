import { z } from "zod";

const textSchema = z.string().trim().min(1);

export const sourceVersionReferenceSchema = z.object({
  sourceType: textSchema,
  sourceId: textSchema,
  version: z.union([z.string().trim().min(1), z.number().int().positive()]),
  checksum: z.string().regex(/^[0-9a-f]{64}$/).optional(),
}).superRefine((reference, context) => {
  if (
    reference.sourceType !== "document_version" ||
    reference.checksum !== undefined
  ) return;
  context.addIssue({
    code: z.ZodIssueCode.custom,
    path: ["checksum"],
    message:
      `Source version receipt "${reference.sourceType}:${reference.sourceId}@${reference.version}" is missing a checksum; expected a lowercase 64-hex SHA-256 checksum for document_version.`,
  });
});

export type AgentSourceVersionReference = z.infer<
  typeof sourceVersionReferenceSchema
>;
