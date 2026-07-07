import { z } from "zod";

export const memorySchema = z.object({
  category: z.enum(["domain_knowledge", "user_preference"]),
  subCategory: z.string(),
  content: z.string(),
  confidence: z.number().min(0).max(1),
  metadata: z.record(z.any()).optional(),
});
