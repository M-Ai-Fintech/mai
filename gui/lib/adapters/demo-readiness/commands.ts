import { requestV1, type V1RequestOptions } from "@/lib/api-client/v1";
import { z } from "zod";

const demoExecutionSchema = z.object({
  datasetId: z.string().min(1),
  datasetDigest: z.string().regex(/^[0-9a-f]{64}$/),
  auditEventId: z.string().min(1),
  labels: z.object({
    synthetic: z.literal(true),
    customerData: z.literal(false),
    provider: z.literal("managed_local"),
    persistence: z.literal("postgres_context_records"),
  }),
  authority: z.object({
    agentDecisionRejected: z.literal(true),
    humanDecisionRecordId: z.string().min(1),
  }),
  artifact: z.object({
    deliverableId: z.string().min(1),
    versionId: z.string().min(1),
    sourceSnapshotId: z.string().min(1),
    sourceChecksums: z.array(z.string().regex(/^[0-9a-f]{64}$/)).min(1),
  }),
});

export type DemoExecutionReceipt = z.infer<typeof demoExecutionSchema>;

/** Executes the human-authorized demo command without a fixture fallback.
 *
 * @example await executeDemoReadiness({ idempotencyKey, headers })
 */
export async function executeDemoReadiness(
  options: V1RequestOptions & { readonly idempotencyKey: string },
): Promise<DemoExecutionReceipt> {
  const response = await requestV1(
    "/commands/demo-readiness/execute",
    demoExecutionSchema,
    { ...options, method: "POST" },
  );
  return response.data;
}
