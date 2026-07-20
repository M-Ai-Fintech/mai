import { z } from "zod";

export const domainAreaSchema = z.enum([
  "corporate",
  "financial",
  "tax",
  "labor",
  "civil",
  "operational",
  "legal",
  "regulatory",
  "environmental",
  "tech",
  "third-party-consent"
]);

export type DomainArea = z.infer<typeof domainAreaSchema>;
