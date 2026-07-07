import { z } from "zod";

export const outputSchema = z.object({
  success: z.boolean(),
  response: z.string(),
  redFlags: z.array(z.string()).optional(),
  timestamp: z.string(),
});
