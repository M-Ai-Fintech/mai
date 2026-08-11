import { z } from "zod";
import type {
  DemoReadinessResult,
  DemoScreenReadModel,
  DemoShellReadModel,
} from "./contracts.ts";

const checksumSchema = z.string().regex(/^[0-9a-f]{64}$/);
const identifierSchema = z.string().min(1);
const documentVersionSchema = z.object({
  documentId: identifierSchema,
  documentVersionId: identifierSchema,
  sourceId: identifierSchema,
  checksum: checksumSchema,
});
const processingRunSchema = z.object({
  processingRunId: identifierSchema,
  documentVersionId: identifierSchema,
  state: z.literal("succeeded"),
  processorVersion: z.literal("synthetic-plaintext-v1"),
});
const citationSchema = z.object({
  citationId: identifierSchema,
  documentVersionId: identifierSchema,
  checksum: checksumSchema,
  location: z.object({
    kind: z.literal("line"),
    startLine: z.number().int().positive(),
    endLine: z.number().int().positive(),
  }),
  excerpt: z.string().min(1),
  processingVersion: z.literal("synthetic-plaintext-v1"),
});

export const demoReadinessResultSchema: z.ZodType<DemoReadinessResult> = z
  .object({
    environment: z.enum(["local-demo", "test"]),
    databaseName: z.literal("mai_demo_readiness"),
    datasetId: identifierSchema,
    datasetDigest: checksumSchema,
    auditEventId: identifierSchema,
    labels: z.object({
      synthetic: z.literal(true),
      customerData: z.literal(false),
      provider: z.literal("managed_local"),
      calculation: z.literal("deterministic"),
      persistence: z.enum(["process_local", "postgres_context_records"]),
    }),
    documentVersions: z.array(documentVersionSchema).readonly(),
    processingRuns: z.array(processingRunSchema).readonly(),
    evidenceIds: z.array(identifierSchema).readonly(),
    citations: z.array(citationSchema).readonly(),
    missingCategories: z.array(z.string()).readonly(),
    limitations: z.array(z.string()).readonly(),
    finding: z.object({ id: identifierSchema, state: z.literal("proposed") }),
    calculation: z.object({
      id: identifierSchema,
      enterpriseValueBrl: z.number().finite(),
      equityValueBrl: z.number().finite(),
      algorithmVersion: identifierSchema,
    }),
    authority: z.object({
      agentDecisionRejected: z.literal(true),
      humanDecisionRecordId: identifierSchema,
    }),
    artifact: z.object({
      deliverableId: identifierSchema,
      versionId: identifierSchema,
      sourceSnapshotId: identifierSchema,
      sourceChecksums: z.array(checksumSchema).min(1).readonly(),
    }),
  });

const screenFamilySchema = z.enum([
  "command-center",
  "deals-portfolio",
  "deal-overview",
  "documents-vdr",
  "diligence-decision-room",
  "valuation-lab",
  "matching-universe",
  "negotiation-room",
  "tasks-approvals",
  "deal-activity-audit",
  "deliverables-exports",
]);

export const demoScreenReadModelSchema: z.ZodType<DemoScreenReadModel> = z
  .object({
    family: screenFamilySchema,
    items: z.array(z.object({
      id: identifierSchema,
      title: z.string(),
      summary: z.string(),
      status: z.string(),
    })).readonly(),
    selectedItemId: identifierSchema.optional(),
  });

export const demoShellReadModelSchema: z.ZodType<DemoShellReadModel> = z.object(
  {
    organization: z.object({ id: identifierSchema, name: z.string().min(1) }),
    deal: z.object({
      id: identifierSchema,
      name: z.string().min(1),
      phase: z.string().min(1),
    }),
    permissions: z.tuple([z.literal("workspace"), z.literal("deal")]),
    counts: z.object({
      tasks: z.number().int().nonnegative(),
      approvals: z.number().int().nonnegative(),
      notifications: z.number().int().nonnegative(),
    }),
  },
);

const apiMetaSchema = z.object({
  correlationId: z.string().regex(/^cor_[a-z0-9]+(?:-[a-z0-9]+)*$/),
  freshness: z.literal("current"),
});

/** Parses a successful demo API envelope without trusting unchecked JSON. */
export function parseDemoEnvelope<T>(
  value: unknown,
  schema: z.ZodType<T>,
): T {
  const envelope = z.object({ data: z.unknown(), meta: apiMetaSchema }).parse(
    value,
  );
  return schema.parse(envelope.data);
}
