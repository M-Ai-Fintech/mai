import { z } from "zod";

export const inputSchema = z.object({
  dealId: z.string(),
  query: z.string(),
  context: z.record(z.any()).optional(),
});
