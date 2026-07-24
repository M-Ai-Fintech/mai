import { z } from "zod";
import { domainAreaSchema } from "../../../../shared/schemas/domain-area.ts";

export const conditionsprecedentSchema = z.object({
  dealId: z.string().describe("Unique transaction ID."),
  conditions: z.array(
    z.object({
      id: z.string().describe("Condition ID."),
      description: z.string().describe("Condition description."),
      category: domainAreaSchema.describe("Domain area of the condition."),
      responsibleParty: z.enum(["buyer", "seller", "mutual"]).describe(
        "Party responsible for fulfilling the condition.",
      ),
      status: z.enum(["pending", "fulfilled", "waived"]).describe(
        "Current status of the condition.",
      ),
      deadline: z.string().optional().describe("Condition deadline date."),
      comments: z.string().optional().describe("Additional comments."),
    }),
  ).describe("List of precedent conditions."),
  allFulfilled: z.boolean().describe(
    "Whether all conditions have been fulfilled.",
  ),
});
