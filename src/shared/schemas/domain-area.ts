import { z } from "zod";

export const domainAreaSchema = z.enum([
  "corporate",
  "financial",
  "tax",
  "labor",
  "civil",
  "regulatory",
  "environmental",
  "operational",
  "tech",
  "commercial",
]);

export type DomainArea = z.infer<typeof domainAreaSchema>;

const LEGACY_MAPPINGS: Record<string, DomainArea> = {
  corporate: "corporate",
  finance: "financial",
  financial: "financial",
  tax: "tax",
  labor: "labor",
  labour: "labor",
  civil: "civil",
  regulatory: "regulatory",
  environmental: "environmental",
  operational: "operational",
  operations: "operational",
  tech: "tech",
  technology: "tech",
  commercial: "commercial",
};

export function normalizeLegacyDomainArea(value: unknown): DomainArea {
  if (typeof value !== "string") {
    throw new Error(
      `Invalid DomainArea input: expected string, received ${typeof value} (${
        JSON.stringify(value)
      })`,
    );
  }

  const normalizedKey = value.trim().toLowerCase();

  if (normalizedKey === "legal" || normalizedKey === "third-party-consent") {
    throw new Error(
      `Ambiguous or non-domain category '${value}' cannot be normalized automatically to a DomainArea. Express 'legal' via precise domain (e.g. corporate, civil, regulatory) and 'third-party-consent' via condition-kind fields.`,
    );
  }

  const mapped = LEGACY_MAPPINGS[normalizedKey];
  if (!mapped) {
    throw new Error(
      `Unknown legacy DomainArea '${value}'. Supported legacy values include Corporate, Finance, Financial, Tax, Labor, Labour, Civil, Regulatory, Environmental, Operational, Operations, Tech, Technology, Commercial.`,
    );
  }

  return mapped;
}
