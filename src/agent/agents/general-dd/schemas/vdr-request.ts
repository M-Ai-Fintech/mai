import { z } from "zod";

export const vdrrequestSchema = z.object({
  dealId: z.string().describe("Unique identifier of the deal/transaction."),
  requester: z.string().describe(
    "Identity of the requesting agent or service (e.g., LegalDueDiligenceAgent).",
  ),
  requestedCategories: z.array(z.string()).describe(
    "List of general requested categories (e.g., ['tax', 'labor']).",
  ),
  items: z.array(
    z.object({
      categoryId: z.string().describe("VDR folder or category ID."),
      documentName: z.string().describe(
        "Name or precise description of the requested document (e.g., CNDT, Articles of Incorporation).",
      ),
      urgency: z.enum(["low", "medium", "high"]).describe(
        "Priority level for document analysis.",
      ),
      status: z.enum(["requested", "received", "rejected"]).describe(
        "Current delivery status by the seller in the VDR.",
      ),
      uploadedAt: z.string().optional().describe(
        "Date of document submission in ISO format (YYYY-MM-DD) if already received.",
      ),
      notes: z.string().optional().describe(
        "Observations or justifications for rejection or delay.",
      ),
    }),
  ).describe(
    "Individualized detail of each information item requested from the VDR.",
  ),
});
